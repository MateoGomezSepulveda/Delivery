import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { Role } from './roles.enum';
import { RefreshToken, RefreshTokenDocument } from './schemas/refresh-token.schema';
import { PasswordReset, PasswordResetDocument } from './schemas/password-reset.schema';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectModel(RefreshToken.name) private refreshTokenModel: Model<RefreshTokenDocument>,
    @InjectModel(PasswordReset.name) private passwordResetModel: Model<PasswordResetDocument>,
  ) {}

  async register(registerDto: RegisterDto) {
    return this.userService.create({
      ...registerDto,
      role: Role.CLIENT, // Siempre CLIENT en registro público
    });
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

  async refresh(refreshToken: string) {
    const tokenDoc = await this.refreshTokenModel.findOne({ token: refreshToken });
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
      { token: new_refresh_token, expiresAt }
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
    console.log(`[DEVELOPMENT ONLY] Password reset token for ${email}: ${resetToken}`);
    
    return { message: 'If the email exists, a reset link was generated.', devToken: resetToken };
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
    
    await this.userService.update(resetDoc.user.toString(), { password: newPassword } as any);
    await this.passwordResetModel.deleteOne({ _id: resetDoc._id });

    return { message: 'Password reset successfully' };
  }
}
