import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { FacebookAuthDto } from './dto/facebook-auth.dto';
import { Role } from './roles.enum';
import {
  RefreshToken,
  RefreshTokenDocument,
} from './schemas/refresh-token.schema';
import {
  PasswordReset,
  PasswordResetDocument,
} from './schemas/password-reset.schema';
import {
  EmailVerification,
  EmailVerificationDocument,
} from './schemas/email-verification.schema';

const EMAIL_VERIFICATION_TTL_MINUTES = 15;
const MAX_VERIFICATION_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    @InjectModel(RefreshToken.name)
    private refreshTokenModel: Model<RefreshTokenDocument>,
    @InjectModel(PasswordReset.name)
    private passwordResetModel: Model<PasswordResetDocument>,
    @InjectModel(EmailVerification.name)
    private emailVerificationModel: Model<EmailVerificationDocument>,
  ) {}

  private getFrontendUrl(): string {
    const explicit = this.configService.get<string>('FRONTEND_URL')?.trim();
    if (explicit) {
      return explicit.replace(/\/+$/, '');
    }

    const allowedOrigins = this.configService.get<string>('ALLOWED_ORIGINS');
    if (allowedOrigins) {
      const origins = allowedOrigins
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);
      const frontendOrigin =
        origins.find((origin) => origin.includes('5173')) ||
        origins.find((origin) => !origin.includes(':3000')) ||
        origins[0];
      if (frontendOrigin) {
        return frontendOrigin.replace(/\/+$/, '');
      }
    }

    return 'http://localhost:5173';
  }

  private async issueTokensForUser(user: {
    _id: Types.ObjectId | string;
    email: string;
    role: Role;
  }) {
    const payload = {
      sub: user._id,
      email: user.email,
      role: user.role,
    };

    const access_token = this.jwtService.sign(payload);
    const refresh_token = crypto.randomBytes(40).toString('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expiración en 7 días

    await this.refreshTokenModel.create({
      token: refresh_token,
      user: user._id,
      expiresAt,
    });

    return {
      access_token,
      refresh_token,
    };
  }

  private async createAndSendEmailVerification(
    userId: string,
    email: string,
    name: string,
  ) {
    await this.emailVerificationModel.deleteMany({ user: userId });

    const code = crypto.randomInt(100000, 1000000).toString();
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(
      Date.now() + EMAIL_VERIFICATION_TTL_MINUTES * 60 * 1000,
    );

    await this.emailVerificationModel.create({
      user: userId,
      email: email.trim().toLowerCase(),
      code,
      token,
      attempts: 0,
      expiresAt,
    });

    const verificationUrl = `${this.getFrontendUrl()}/verify-email?token=${token}`;
    const mailResult = await this.mailService.sendEmailVerification(
      email,
      name,
      code,
      verificationUrl,
    );

    return {
      code,
      token,
      previewUrl: mailResult?.previewUrl,
      sent: mailResult?.sent ?? false,
    };
  }

  async register(registerDto: RegisterDto) {
    const createdUser = await this.userService.create(
      {
        ...registerDto,
        role: Role.CLIENT, // Siempre CLIENT en registro público
      },
      { isEmailVerified: false },
    );

    await this.createAndSendEmailVerification(
      createdUser._id.toString(),
      createdUser.email,
      createdUser.name,
    );

    return {
      ...createdUser,
      requiresEmailVerification: true,
      message:
        'Cuenta creada con éxito. Te enviamos un código y un enlace de verificación a tu correo electrónico.',
    };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const token = dto.token?.trim();
    const email = dto.email?.trim().toLowerCase();
    const code = dto.code?.trim();

    if (!token && (!email || !code)) {
      throw new BadRequestException(
        'Debes ingresar el código de 6 dígitos junto con tu correo, o usar el enlace de verificación.',
      );
    }

    const verificationDoc = token
      ? await this.emailVerificationModel.findOne({ token })
      : await this.emailVerificationModel.findOne({ email, code });

    if (!verificationDoc) {
      if (email && code) {
        const existingUser = await this.userService.findByEmail(email);
        if (existingUser?.isEmailVerified) {
          throw new BadRequestException(
            'Este correo electrónico ya fue verificado. Ya puedes iniciar sesión.',
          );
        }

        const activeDoc = await this.emailVerificationModel.findOne({ email });
        if (activeDoc) {
          const nextAttempts = (activeDoc.attempts ?? 0) + 1;
          if (nextAttempts >= MAX_VERIFICATION_ATTEMPTS) {
            await this.emailVerificationModel.deleteOne({ _id: activeDoc._id });
            throw new BadRequestException(
              'Demasiados intentos fallidos. Solicita un nuevo código de verificación.',
            );
          }
          await this.emailVerificationModel.updateOne(
            { _id: activeDoc._id },
            { attempts: nextAttempts },
          );
          throw new BadRequestException(
            'El código de verificación es incorrecto. Verifica e intenta de nuevo.',
          );
        }
      }

      throw new BadRequestException(
        'El código o enlace de verificación es inválido o ya fue utilizado.',
      );
    }

    if (verificationDoc.expiresAt < new Date()) {
      await this.emailVerificationModel.deleteOne({ _id: verificationDoc._id });
      throw new BadRequestException(
        'El código o enlace de verificación ha expirado. Solicita uno nuevo.',
      );
    }

    const verifiedUser = await this.userService.markEmailAsVerified(
      verificationDoc.user.toString(),
    );

    if (!verifiedUser) {
      await this.emailVerificationModel.deleteOne({ _id: verificationDoc._id });
      throw new BadRequestException('La cuenta asociada ya no existe.');
    }

    await this.emailVerificationModel.deleteMany({
      user: verificationDoc.user,
    });

    const tokens = await this.issueTokensForUser(verifiedUser);

    return {
      message: '¡Correo electrónico verificado con éxito!',
      user: verifiedUser,
      ...tokens,
    };
  }

  async resendVerification(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.userService.findByEmail(normalizedEmail);

    if (!user) {
      return {
        message:
          'Si el correo está registrado y pendiente de verificación, enviamos un nuevo código.',
      };
    }

    if (user.isEmailVerified === true) {
      return {
        alreadyVerified: true,
        message:
          'Este correo electrónico ya está verificado. Ya puedes iniciar sesión.',
      };
    }

    await this.createAndSendEmailVerification(
      user._id.toString(),
      user.email,
      user.name,
    );

    return {
      message:
        'Te enviamos un nuevo código y enlace de verificación a tu correo electrónico.',
    };
  }

  async login(email: string, password: string) {
    const user = await this.userService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.password) {
      throw new UnauthorizedException(
        'Esta cuenta usa inicio de sesión con Google o Facebook. Ingresa con tu proveedor o configura una contraseña desde tu perfil.',
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.isEmailVerified === false) {
      throw new ForbiddenException({
        statusCode: HttpStatus.FORBIDDEN,
        code: 'EMAIL_NOT_VERIFIED',
        email: user.email,
        message:
          'Debes verificar tu correo electrónico antes de iniciar sesión.',
      });
    }

    return this.issueTokensForUser(user);
  }

  private async verifyGoogleCredentials(dto: GoogleAuthDto): Promise<{
    providerId: string;
    email?: string;
    name: string;
    avatarUrl?: string | null;
  }> {
    const idToken = dto.idToken?.trim();
    const accessToken = dto.accessToken?.trim();

    if (!idToken && !accessToken) {
      throw new BadRequestException(
        'Debes proporcionar un token válido de Google.',
      );
    }

    const googleClientId = this.configService
      .get<string>('GOOGLE_CLIENT_ID')
      ?.trim();

    if (idToken) {
      const response = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
      );
      if (!response.ok) {
        throw new UnauthorizedException(
          'El token de Google es inválido o expiró. Intenta de nuevo.',
        );
      }

      const data = (await response.json()) as {
        sub?: string;
        aud?: string;
        email?: string;
        email_verified?: string | boolean;
        name?: string;
        picture?: string;
      };

      if (!data.sub) {
        throw new UnauthorizedException(
          'No se pudo verificar tu identidad con Google.',
        );
      }
      if (googleClientId && data.aud !== googleClientId) {
        throw new UnauthorizedException(
          'El token de Google no corresponde a esta aplicación.',
        );
      }
      if (
        data.email &&
        data.email_verified !== true &&
        data.email_verified !== 'true'
      ) {
        throw new UnauthorizedException(
          'Tu correo de Google no está verificado.',
        );
      }

      return {
        providerId: data.sub,
        email: data.email?.trim().toLowerCase(),
        name:
          data.name?.trim() ||
          data.email?.split('@')[0] ||
          'Usuario de Google',
        avatarUrl: data.picture || null,
      };
    }

    // Validación con OAuth2 Access Token de Google Identity Services
    if (googleClientId) {
      const tokenInfoRes = await fetch(
        `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(accessToken!)}`,
      );
      if (!tokenInfoRes.ok) {
        throw new UnauthorizedException(
          'El token de Google es inválido o expiró. Intenta de nuevo.',
        );
      }
      const tokenInfo = (await tokenInfoRes.json()) as { aud?: string };
      if (tokenInfo.aud && tokenInfo.aud !== googleClientId) {
        throw new UnauthorizedException(
          'El token de Google no corresponde a esta aplicación.',
        );
      }
    }

    const userInfoRes = await fetch(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!userInfoRes.ok) {
      throw new UnauthorizedException(
        'No se pudo obtener tu perfil desde Google. Intenta nuevamente.',
      );
    }

    const userInfo = (await userInfoRes.json()) as {
      sub?: string;
      email?: string;
      email_verified?: boolean;
      name?: string;
      picture?: string;
    };

    if (!userInfo.sub) {
      throw new UnauthorizedException(
        'No se pudo verificar tu identidad con Google.',
      );
    }

    return {
      providerId: userInfo.sub,
      email: userInfo.email?.trim().toLowerCase(),
      name:
        userInfo.name?.trim() ||
        userInfo.email?.split('@')[0] ||
        'Usuario de Google',
      avatarUrl: userInfo.picture || null,
    };
  }

  private async verifyFacebookCredentials(dto: FacebookAuthDto): Promise<{
    providerId: string;
    email?: string;
    name: string;
    avatarUrl?: string | null;
  }> {
    const appId = this.configService.get<string>('FACEBOOK_APP_ID')?.trim();
    const appSecret = this.configService
      .get<string>('FACEBOOK_APP_SECRET')
      ?.trim();

    let accessToken = dto.accessToken?.trim();

    if (!accessToken && dto.code?.trim()) {
      if (!appId || !appSecret) {
        throw new BadRequestException(
          'Facebook Login aún no está configurado en el servidor (faltan FACEBOOK_APP_ID y FACEBOOK_APP_SECRET).',
        );
      }
      if (!dto.redirectUri?.trim()) {
        throw new BadRequestException(
          'Falta redirectUri para completar el inicio de sesión con Facebook.',
        );
      }

      const tokenUrl = new URL(
        'https://graph.facebook.com/v20.0/oauth/access_token',
      );
      tokenUrl.searchParams.set('client_id', appId);
      tokenUrl.searchParams.set('client_secret', appSecret);
      tokenUrl.searchParams.set('redirect_uri', dto.redirectUri.trim());
      tokenUrl.searchParams.set('code', dto.code.trim());

      const exchangeRes = await fetch(tokenUrl.toString());
      if (!exchangeRes.ok) {
        throw new UnauthorizedException(
          'El código de autorización de Facebook es inválido o expiró.',
        );
      }
      const exchangeData = (await exchangeRes.json()) as {
        access_token?: string;
      };
      accessToken = exchangeData.access_token?.trim();
    }

    if (!accessToken) {
      throw new BadRequestException(
        'Debes proporcionar un token o código de autorización de Facebook.',
      );
    }

    if (appId && appSecret) {
      const debugUrl = new URL('https://graph.facebook.com/v20.0/debug_token');
      debugUrl.searchParams.set('input_token', accessToken);
      debugUrl.searchParams.set('access_token', `${appId}|${appSecret}`);

      const debugRes = await fetch(debugUrl.toString());
      if (!debugRes.ok) {
        throw new UnauthorizedException(
          'No se pudo validar el token de Facebook.',
        );
      }
      const debugData = (await debugRes.json()) as {
        data?: { is_valid?: boolean; app_id?: string };
      };
      if (
        !debugData.data?.is_valid ||
        String(debugData.data.app_id) !== appId
      ) {
        throw new UnauthorizedException(
          'El token de Facebook es inválido o no pertenece a esta aplicación.',
        );
      }
    }

    const meUrl = new URL('https://graph.facebook.com/v20.0/me');
    meUrl.searchParams.set('fields', 'id,name,email,picture.type(large)');
    meUrl.searchParams.set('access_token', accessToken);

    const meRes = await fetch(meUrl.toString());
    if (!meRes.ok) {
      throw new UnauthorizedException(
        'No se pudo obtener tu perfil desde Facebook. Intenta nuevamente.',
      );
    }

    const meData = (await meRes.json()) as {
      id?: string;
      name?: string;
      email?: string;
      picture?: { data?: { url?: string } };
    };

    if (!meData.id) {
      throw new UnauthorizedException(
        'No se pudo verificar tu identidad con Facebook.',
      );
    }

    return {
      providerId: String(meData.id),
      email: meData.email?.trim().toLowerCase(),
      name:
        meData.name?.trim() ||
        meData.email?.split('@')[0] ||
        'Usuario de Facebook',
      avatarUrl: meData.picture?.data?.url || null,
    };
  }

  private async loginOrRegisterWithOAuth(
    provider: 'google' | 'facebook',
    profile: {
      providerId: string;
      email?: string;
      name: string;
      avatarUrl?: string | null;
    },
  ) {
    const providerLabel = provider === 'google' ? 'Google' : 'Facebook';
    const existingByProvider =
      provider === 'google'
        ? await this.userService.findByGoogleId(profile.providerId)
        : await this.userService.findByFacebookId(profile.providerId);

    if (existingByProvider) {
      let userDoc = existingByProvider;
      if (userDoc.isEmailVerified === false) {
        const verified = await this.userService.markEmailAsVerified(
          userDoc._id.toString(),
        );
        if (verified) userDoc = verified;
      }

      const tokens = await this.issueTokensForUser(userDoc);
      return {
        ...tokens,
        user: userDoc,
        isNewUser: false,
        linkedExistingAccount: false,
      };
    }

    if (!profile.email) {
      throw new BadRequestException(
        `Tu cuenta de ${providerLabel} no compartió un correo electrónico. Permite el acceso a tu correo o regístrate manualmente.`,
      );
    }

    const existingByEmail = await this.userService.findByEmail(profile.email);
    if (existingByEmail) {
      const linkedUser = await this.userService.linkOAuthProvider(
        existingByEmail._id.toString(),
        provider,
        profile.providerId,
        {
          markEmailVerified: true,
          avatarUrl: existingByEmail.avatarUrl ? undefined : profile.avatarUrl,
        },
      );

      if (!linkedUser) {
        throw new BadRequestException(
          'No se pudo vincular tu cuenta existente.',
        );
      }

      const tokens = await this.issueTokensForUser(linkedUser);
      return {
        ...tokens,
        user: linkedUser,
        isNewUser: false,
        linkedExistingAccount: true,
      };
    }

    const createdUser = await this.userService.createOAuthUser({
      name: profile.name,
      email: profile.email,
      provider,
      providerId: profile.providerId,
      avatarUrl: profile.avatarUrl,
    });

    const tokens = await this.issueTokensForUser(createdUser);
    return {
      ...tokens,
      user: createdUser,
      isNewUser: true,
      linkedExistingAccount: false,
    };
  }

  async loginWithGoogle(dto: GoogleAuthDto) {
    const profile = await this.verifyGoogleCredentials(dto);
    return this.loginOrRegisterWithOAuth('google', profile);
  }

  async loginWithFacebook(dto: FacebookAuthDto) {
    const profile = await this.verifyFacebookCredentials(dto);
    return this.loginOrRegisterWithOAuth('facebook', profile);
  }

  private async linkOAuthAccount(
    userId: string,
    provider: 'google' | 'facebook',
    profile: {
      providerId: string;
      email?: string;
      name: string;
      avatarUrl?: string | null;
    },
  ) {
    const providerLabel = provider === 'google' ? 'Google' : 'Facebook';
    const currentUser = await this.userService.findOne(userId);
    if (!currentUser) {
      throw new UnauthorizedException('Usuario no encontrado.');
    }

    const existingOwner =
      provider === 'google'
        ? await this.userService.findByGoogleId(profile.providerId)
        : await this.userService.findByFacebookId(profile.providerId);

    if (existingOwner && existingOwner._id.toString() !== userId) {
      throw new ConflictException(
        `Esta cuenta de ${providerLabel} ya está vinculada a otro usuario.`,
      );
    }

    const updatedUser = await this.userService.linkOAuthProvider(
      userId,
      provider,
      profile.providerId,
      {
        avatarUrl: currentUser.avatarUrl ? undefined : profile.avatarUrl,
        markEmailVerified: Boolean(
          profile.email &&
            profile.email.toLowerCase() === currentUser.email.toLowerCase(),
        ),
      },
    );

    return {
      message: `Cuenta de ${providerLabel} vinculada correctamente.`,
      user: updatedUser,
    };
  }

  async linkGoogle(userId: string, dto: GoogleAuthDto) {
    const profile = await this.verifyGoogleCredentials(dto);
    return this.linkOAuthAccount(userId, 'google', profile);
  }

  async linkFacebook(userId: string, dto: FacebookAuthDto) {
    const profile = await this.verifyFacebookCredentials(dto);
    return this.linkOAuthAccount(userId, 'facebook', profile);
  }

  async unlinkProvider(userId: string, providerParam: string) {
    const normalizedProvider = providerParam.trim().toLowerCase();
    if (normalizedProvider !== 'google' && normalizedProvider !== 'facebook') {
      throw new BadRequestException(
        'Proveedor inválido. Solo puedes desvincular google o facebook.',
      );
    }

    const providerLabel =
      normalizedProvider === 'google' ? 'Google' : 'Facebook';
    const user = await this.userService.findByIdWithAuth(userId);

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado.');
    }

    const isLinked =
      normalizedProvider === 'google'
        ? Boolean(user.googleId)
        : Boolean(user.facebookId);

    if (!isLinked) {
      throw new BadRequestException(
        `Tu cuenta no tiene ${providerLabel} vinculado.`,
      );
    }

    const hasPassword = Boolean(user.password);
    const hasOtherSocial =
      normalizedProvider === 'google'
        ? Boolean(user.facebookId)
        : Boolean(user.googleId);

    if (!hasPassword && !hasOtherSocial) {
      throw new BadRequestException(
        'No puedes desvincular tu único método de acceso. Configura primero una contraseña en Seguridad y Contraseña.',
      );
    }

    const updatedUser = await this.userService.unlinkOAuthProvider(
      userId,
      normalizedProvider,
    );

    return {
      message: `Cuenta de ${providerLabel} desvinculada correctamente.`,
      user: updatedUser,
    };
  }

  async refresh(refreshToken: string) {
    const tokenDoc = await this.refreshTokenModel.findOne({
      token: refreshToken,
    });
    if (!tokenDoc) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (tokenDoc.expiresAt < new Date()) {
      await this.refreshTokenModel.deleteOne({ _id: tokenDoc._id });
      throw new UnauthorizedException('Refresh token expired');
    }

    const user = await this.userService.findOne(tokenDoc.user.toString());
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    const payload = {
      sub: user._id,
      email: user.email,
      role: user.role,
    };

    const access_token = this.jwtService.sign(payload);

    // Rotate refresh token
    const new_refresh_token = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.refreshTokenModel.updateOne(
      { _id: tokenDoc._id },
      { token: new_refresh_token, expiresAt },
    );

    return {
      access_token,
      refresh_token: new_refresh_token,
    };
  }

  async logout(refreshToken: string) {
    await this.refreshTokenModel.deleteOne({ token: refreshToken });
    return { success: true };
  }

  async forgotPassword(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const genericResponse = {
      message:
        'Si el correo está registrado, enviamos un enlace para restablecer tu contraseña. Revisa tu bandeja de entrada o spam (válido por 15 minutos).',
    };

    const user = await this.userService.findByEmail(normalizedEmail);
    if (!user) {
      // Para evitar email enumeration attacks, retornamos éxito de todos modos
      return genericResponse;
    }

    await this.passwordResetModel.deleteMany({ user: user._id });

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15); // Expiración en 15 minutos

    await this.passwordResetModel.create({
      token: resetToken,
      user: user._id,
      expiresAt,
    });

    const resetUrl = `${this.getFrontendUrl()}/reset-password?token=${resetToken}`;
    await this.mailService.sendPasswordResetEmail(
      user.email,
      user.name,
      resetUrl,
    );

    return genericResponse;
  }

  async resetPassword(token: string, newPassword: string) {
    const resetDoc = await this.passwordResetModel.findOne({ token });
    if (!resetDoc) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    if (resetDoc.expiresAt < new Date()) {
      await this.passwordResetModel.deleteOne({ _id: resetDoc._id });
      throw new BadRequestException('Invalid or expired password reset token');
    }

    await this.userService.update(resetDoc.user.toString(), {
      password: newPassword,
    } as any);
    await this.passwordResetModel.deleteOne({ _id: resetDoc._id });

    return { message: 'Password reset successfully' };
  }
}
