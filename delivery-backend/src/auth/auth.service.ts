import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
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
    const user = await this.userService.findByEmail(email);
    if (!user) {
      // Para evitar email enumeration attacks, retornamos éxito de todos modos
      return { message: 'If the email exists, a reset link was generated.' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15); // Expiración en 15 minutos

    await this.passwordResetModel.create({
      token: resetToken,
      user: user._id,
      expiresAt,
    });

    // TODO: En la fase 5 se implementará el envío real por correo.
    console.log(
      `[DEVELOPMENT ONLY] Password reset token for ${email}: ${resetToken}`,
    );

    return {
      message: 'If the email exists, a reset link was generated.',
      devToken: resetToken,
    };
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
