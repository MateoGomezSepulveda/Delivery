import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { SmsService } from '../sms/sms.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { RefreshToken } from './schemas/refresh-token.schema';
import { PasswordReset } from './schemas/password-reset.schema';
import { EmailVerification } from './schemas/email-verification.schema';
import {
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;

  const mockUsersService = {
    create: jest.fn(),
    createOAuthUser: jest.fn(),
    findByEmail: jest.fn(),
    findOne: jest.fn(),
    findByIdWithAuth: jest.fn(),
    findByGoogleId: jest.fn(),
    findByFacebookId: jest.fn(),
    linkOAuthProvider: jest.fn(),
    unlinkOAuthProvider: jest.fn(),
    update: jest.fn(),
    markEmailAsVerified: jest.fn(),
  };

  const mockMailService = {
    sendEmailVerification: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
    sendOrderStatusEmail: jest.fn(),
  };

  const mockSmsService = {
    sendVerificationSms: jest.fn(),
    checkVerificationCode: jest.fn(),
    isConfigured: jest.fn().mockReturnValue(false),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-access-token'),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockRefreshTokenModel = {
    create: jest.fn(),
    findOne: jest.fn(),
    deleteOne: jest.fn(),
    updateOne: jest.fn(),
  };

  const mockPasswordResetModel = {
    create: jest.fn(),
    findOne: jest.fn(),
    deleteOne: jest.fn(),
    deleteMany: jest.fn(),
  };

  const mockEmailVerificationModel = {
    create: jest.fn(),
    findOne: jest.fn(),
    deleteOne: jest.fn(),
    deleteMany: jest.fn(),
    updateOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: MailService, useValue: mockMailService },
        { provide: SmsService, useValue: mockSmsService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        {
          provide: getModelToken(RefreshToken.name),
          useValue: mockRefreshTokenModel,
        },
        {
          provide: getModelToken(PasswordReset.name),
          useValue: mockPasswordResetModel,
        },
        {
          provide: getModelToken(EmailVerification.name),
          useValue: mockEmailVerificationModel,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'NODE_ENV') return 'development';
      if (key === 'FRONTEND_URL') return 'http://localhost:5173';
      return undefined;
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── register ────────────────────────────────────────────────────────────────
  describe('register', () => {
    it('debe crear el usuario CLIENT con celular obligatorio y enviar correo de verificación', async () => {
      const dto = {
        name: 'Test',
        email: 'test@test.com',
        password: '123456',
        phone: '3001234567',
      };
      const created = {
        _id: 'user-123',
        name: dto.name,
        email: dto.email,
        phone: '+573001234567',
        role: 'CLIENT',
        isEmailVerified: false,
      };
      mockUsersService.create.mockResolvedValue(created);
      mockEmailVerificationModel.deleteMany.mockResolvedValue({});
      mockEmailVerificationModel.create.mockResolvedValue({});
      mockMailService.sendEmailVerification.mockResolvedValue({
        sent: true,
        previewUrl: 'https://ethereal.email/message/mock',
        provider: 'ethereal',
      });

      const result = await service.register(dto as any);

      expect(mockUsersService.create).toHaveBeenCalledWith(
        {
          name: 'Test',
          email: 'test@test.com',
          password: '123456',
          phone: '+573001234567',
          role: 'CLIENT',
        },
        { isEmailVerified: false },
      );
      expect(mockEmailVerificationModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user: 'user-123',
          email: 'test@test.com',
          phone: '+573001234567',
          channel: 'email',
          code: expect.stringMatching(/^\d{6}$/),
          token: expect.any(String),
        }),
      );
      expect(mockMailService.sendEmailVerification).toHaveBeenCalledWith(
        'test@test.com',
        'Test',
        expect.stringMatching(/^\d{6}$/),
        expect.stringContaining('http://localhost:5173/verify-email?token='),
      );
      expect(result.requiresEmailVerification).toBe(true);
      expect(result.verificationChannel).toBe('email');
      expect(result.isEmailVerified).toBe(false);
      expect(result).not.toHaveProperty('devVerificationCode');
      expect(result).not.toHaveProperty('emailPreviewUrl');
    });

    it('debe enviar verificación por SMS cuando verificationChannel es sms (y respaldo email si Twilio no está configurado)', async () => {
      const dto = {
        name: 'Test SMS',
        email: 'sms@test.com',
        password: '123456',
        phone: '+573001234567',
        verificationChannel: 'sms',
      };
      mockUsersService.create.mockResolvedValue({
        _id: 'user-sms-1',
        name: dto.name,
        email: dto.email,
        phone: '+573001234567',
        role: 'CLIENT',
        isEmailVerified: false,
      });
      mockEmailVerificationModel.deleteMany.mockResolvedValue({});
      mockEmailVerificationModel.create.mockResolvedValue({});
      mockSmsService.sendVerificationSms.mockResolvedValue({
        sent: false,
        provider: 'console',
      });
      mockMailService.sendEmailVerification.mockResolvedValue({
        sent: true,
        provider: 'smtp',
      });

      const result = await service.register(dto as any);

      expect(mockSmsService.sendVerificationSms).toHaveBeenCalledWith(
        '+573001234567',
        expect.stringMatching(/^\d{6}$/),
      );
      expect(mockMailService.sendEmailVerification).toHaveBeenCalled();
      expect(result.verificationChannel).toBe('sms');
      expect(result.smsDelivered).toBe(false);
      expect(result.fallbackEmailSent).toBe(true);
    });

    it('debe rechazar registro si el celular es inválido o falta', async () => {
      await expect(
        service.register({
          name: 'Sin Tel',
          email: 'sintel@test.com',
          password: '123456',
          phone: '123',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── verifyEmail ─────────────────────────────────────────────────────────────
  describe('verifyEmail', () => {
    const futureDate = new Date(Date.now() + 15 * 60 * 1000);
    const pastDate = new Date(Date.now() - 1000);

    const mockVerificationDoc = {
      _id: 'verif-1',
      user: 'user-123',
      email: 'test@test.com',
      code: '482913',
      token: 'valid-hex-token',
      attempts: 0,
      expiresAt: futureDate,
    };

    const verifiedUser = {
      _id: 'user-123',
      name: 'Test',
      email: 'test@test.com',
      role: 'CLIENT',
      isEmailVerified: true,
    };

    it('debe verificar el correo con email y código de 6 dígitos y emitir tokens', async () => {
      mockEmailVerificationModel.findOne.mockResolvedValue(mockVerificationDoc);
      mockUsersService.markEmailAsVerified.mockResolvedValue(verifiedUser);
      mockEmailVerificationModel.deleteMany.mockResolvedValue({});
      mockRefreshTokenModel.create.mockResolvedValue({});

      const result = await service.verifyEmail({
        email: 'TEST@test.com',
        code: '482913',
      });

      expect(mockEmailVerificationModel.findOne).toHaveBeenCalledWith({
        email: 'test@test.com',
        code: '482913',
      });
      expect(mockUsersService.markEmailAsVerified).toHaveBeenCalledWith(
        'user-123',
        { markPhoneVerified: false },
      );
      expect(result.user.isEmailVerified).toBe(true);
      expect(result.access_token).toBe('mock-access-token');
      expect(result.refresh_token).toBeDefined();
    });

    it('debe verificar por código SMS y marcar isPhoneVerified: true', async () => {
      mockEmailVerificationModel.findOne.mockResolvedValue({
        ...mockVerificationDoc,
        phone: '+573001234567',
        channel: 'sms',
      });
      mockUsersService.markEmailAsVerified.mockResolvedValue({
        ...verifiedUser,
        phone: '+573001234567',
        isPhoneVerified: true,
      });
      mockEmailVerificationModel.deleteMany.mockResolvedValue({});
      mockRefreshTokenModel.create.mockResolvedValue({});

      const result = await service.verifyEmail({
        phone: '3001234567',
        code: '482913',
      });

      expect(mockEmailVerificationModel.findOne).toHaveBeenCalledWith({
        phone: '+573001234567',
        code: '482913',
      });
      expect(mockUsersService.markEmailAsVerified).toHaveBeenCalledWith(
        'user-123',
        { markPhoneVerified: true },
      );
      expect(result.user.isPhoneVerified).toBe(true);
    });

    it('debe validar código OTP vía Twilio Verify cuando verificationMode es twilio-verify', async () => {
      mockEmailVerificationModel.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          ...mockVerificationDoc,
          phone: '+573001234567',
          channel: 'sms',
          verificationMode: 'twilio-verify',
          code: 'TWILIO_VERIFY_MANAGED',
        });
      mockSmsService.checkVerificationCode.mockResolvedValue(true);
      mockUsersService.markEmailAsVerified.mockResolvedValue({
        ...verifiedUser,
        phone: '+573001234567',
        isPhoneVerified: true,
      });
      mockEmailVerificationModel.deleteMany.mockResolvedValue({});
      mockRefreshTokenModel.create.mockResolvedValue({});

      const result = await service.verifyEmail({
        email: 'test@test.com',
        code: '987654',
      });

      expect(mockSmsService.checkVerificationCode).toHaveBeenCalledWith(
        '+573001234567',
        '987654',
      );
      expect(mockUsersService.markEmailAsVerified).toHaveBeenCalledWith(
        'user-123',
        { markPhoneVerified: true },
      );
      expect(result.user.isPhoneVerified).toBe(true);
    });

    it('debe verificar el correo usando el token del enlace', async () => {
      mockEmailVerificationModel.findOne.mockResolvedValue(mockVerificationDoc);
      mockUsersService.markEmailAsVerified.mockResolvedValue(verifiedUser);
      mockEmailVerificationModel.deleteMany.mockResolvedValue({});
      mockRefreshTokenModel.create.mockResolvedValue({});

      const result = await service.verifyEmail({ token: 'valid-hex-token' });

      expect(mockEmailVerificationModel.findOne).toHaveBeenCalledWith({
        token: 'valid-hex-token',
      });
      expect(result.user.isEmailVerified).toBe(true);
      expect(result.access_token).toBe('mock-access-token');
    });

    it('debe lanzar BadRequestException e incrementar intentos si el código es incorrecto', async () => {
      mockEmailVerificationModel.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ ...mockVerificationDoc, attempts: 1 });
      mockUsersService.findByEmail.mockResolvedValue({
        _id: 'user-123',
        isEmailVerified: false,
      });
      mockEmailVerificationModel.updateOne.mockResolvedValue({});

      await expect(
        service.verifyEmail({ email: 'test@test.com', code: '000000' }),
      ).rejects.toThrow(BadRequestException);

      expect(mockEmailVerificationModel.updateOne).toHaveBeenCalledWith(
        { _id: 'verif-1' },
        { attempts: 2 },
      );
    });

    it('debe invalidar el código después de 5 intentos fallidos', async () => {
      mockEmailVerificationModel.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ ...mockVerificationDoc, attempts: 4 });
      mockUsersService.findByEmail.mockResolvedValue({
        _id: 'user-123',
        isEmailVerified: false,
      });
      mockEmailVerificationModel.deleteOne.mockResolvedValue({});

      await expect(
        service.verifyEmail({ email: 'test@test.com', code: '000000' }),
      ).rejects.toThrow(BadRequestException);

      expect(mockEmailVerificationModel.deleteOne).toHaveBeenCalledWith({
        _id: 'verif-1',
      });
    });

    it('debe lanzar BadRequestException si el código está vencido', async () => {
      mockEmailVerificationModel.findOne.mockResolvedValue({
        ...mockVerificationDoc,
        expiresAt: pastDate,
      });
      mockEmailVerificationModel.deleteOne.mockResolvedValue({});

      await expect(
        service.verifyEmail({ token: 'valid-hex-token' }),
      ).rejects.toThrow(BadRequestException);

      expect(mockEmailVerificationModel.deleteOne).toHaveBeenCalledWith({
        _id: 'verif-1',
      });
    });
  });

  // ─── resendVerification ──────────────────────────────────────────────────────
  describe('resendVerification', () => {
    it('debe retornar mensaje genérico si el correo no existe', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      const result = await service.resendVerification('noexiste@test.com');

      expect(result.message).toContain('Si el correo está registrado');
      expect(mockMailService.sendEmailVerification).not.toHaveBeenCalled();
    });

    it('debe indicar alreadyVerified si el usuario ya está verificado', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        _id: 'user-123',
        email: 'ok@test.com',
        isEmailVerified: true,
      });

      const result = await service.resendVerification('ok@test.com');

      expect(result.alreadyVerified).toBe(true);
      expect(mockMailService.sendEmailVerification).not.toHaveBeenCalled();
    });

    it('debe reenviar un nuevo código y enlace si el usuario está pendiente', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        _id: 'user-123',
        name: 'Test',
        email: 'pendiente@test.com',
        isEmailVerified: false,
      });
      mockEmailVerificationModel.deleteMany.mockResolvedValue({});
      mockEmailVerificationModel.create.mockResolvedValue({});
      mockMailService.sendEmailVerification.mockResolvedValue({
        sent: true,
        previewUrl: 'https://ethereal.email/message/new',
        provider: 'ethereal',
      });

      const result = await service.resendVerification('pendiente@test.com');

      expect(mockMailService.sendEmailVerification).toHaveBeenCalled();
      expect(result.message).toContain('nuevo código');
      expect(result).not.toHaveProperty('devVerificationCode');
    });
  });

  // ─── login ───────────────────────────────────────────────────────────────────
  describe('login', () => {
    const mockUser = {
      _id: 'user-id-123',
      email: 'test@test.com',
      password: 'hashed-password',
      role: 'CLIENT',
      isEmailVerified: true,
    };

    it('debe retornar access_token y refresh_token si las credenciales son correctas y el correo está verificado', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockRefreshTokenModel.create.mockResolvedValue({});

      const result = await service.login('test@test.com', 'password123');

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(mockJwtService.sign).toHaveBeenCalled();
    });

    it('debe lanzar ForbiddenException con código EMAIL_NOT_VERIFIED si el correo no está verificado', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        ...mockUser,
        isEmailVerified: false,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(
        service.login('test@test.com', 'password123'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe lanzar UnauthorizedException si el usuario no existe', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(service.login('no@existe.com', 'pass')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('debe lanzar UnauthorizedException si la contraseña es incorrecta', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login('test@test.com', 'wrong')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ─── refresh ─────────────────────────────────────────────────────────────────
  describe('refresh', () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const pastDate = new Date(Date.now() - 1000);

    const mockTokenDoc = {
      _id: 'token-id',
      token: 'valid-refresh-token',
      user: 'user-id-123',
      expiresAt: futureDate,
    };

    const mockUser = {
      _id: 'user-id-123',
      email: 'test@test.com',
      role: 'CLIENT',
    };

    it('debe retornar nuevos tokens si el refresh token es válido', async () => {
      mockRefreshTokenModel.findOne.mockResolvedValue(mockTokenDoc);
      mockUsersService.findOne.mockResolvedValue(mockUser);
      mockRefreshTokenModel.updateOne.mockResolvedValue({});

      const result = await service.refresh('valid-refresh-token');

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
    });

    it('debe lanzar UnauthorizedException si el refresh token no existe', async () => {
      mockRefreshTokenModel.findOne.mockResolvedValue(null);

      await expect(service.refresh('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('debe lanzar UnauthorizedException si el refresh token está vencido', async () => {
      mockRefreshTokenModel.findOne.mockResolvedValue({
        ...mockTokenDoc,
        expiresAt: pastDate,
      });
      mockRefreshTokenModel.deleteOne.mockResolvedValue({});

      await expect(service.refresh('expired-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('debe lanzar UnauthorizedException si el usuario del token no existe', async () => {
      mockRefreshTokenModel.findOne.mockResolvedValue(mockTokenDoc);
      mockUsersService.findOne.mockResolvedValue(null);

      await expect(service.refresh('valid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ─── logout ──────────────────────────────────────────────────────────────────
  describe('logout', () => {
    it('debe eliminar el refresh token y retornar success', async () => {
      mockRefreshTokenModel.deleteOne.mockResolvedValue({ deletedCount: 1 });

      const result = await service.logout('any-refresh-token');

      expect(mockRefreshTokenModel.deleteOne).toHaveBeenCalledWith({
        token: 'any-refresh-token',
      });
      expect(result).toEqual({ success: true });
    });
  });

  // ─── forgotPassword ──────────────────────────────────────────────────────────
  describe('forgotPassword', () => {
    it('debe retornar mensaje genérico si el email no existe (anti-enumeration)', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      const result = await service.forgotPassword('noexiste@test.com');

      expect(result.message).toContain('Si el correo está registrado');
      expect(result).not.toHaveProperty('devToken');
      expect(mockPasswordResetModel.create).not.toHaveBeenCalled();
      expect(mockMailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('debe crear un token de reset, enviarlo por correo SMTP y no exponer devToken', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        _id: 'user-123',
        name: 'Mateo',
        email: 'existe@test.com',
      });
      mockPasswordResetModel.deleteMany.mockResolvedValue({});
      mockPasswordResetModel.create.mockResolvedValue({});
      mockMailService.sendPasswordResetEmail.mockResolvedValue({
        sent: true,
        provider: 'smtp',
      });

      const result = await service.forgotPassword('EXISTE@test.com');

      expect(mockPasswordResetModel.deleteMany).toHaveBeenCalledWith({
        user: 'user-123',
      });
      expect(mockPasswordResetModel.create).toHaveBeenCalled();
      expect(mockMailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'existe@test.com',
        'Mateo',
        expect.stringContaining('http://localhost:5173/reset-password?token='),
      );
      expect(result).not.toHaveProperty('devToken');
    });
  });

  // ─── resetPassword ───────────────────────────────────────────────────────────
  describe('resetPassword', () => {
    const futureDate = new Date(Date.now() + 15 * 60 * 1000);
    const pastDate = new Date(Date.now() - 1000);

    const mockResetDoc = {
      _id: 'reset-id',
      token: 'valid-reset-token',
      user: 'user-id-123',
      expiresAt: futureDate,
    };

    it('debe actualizar la contraseña si el token es válido', async () => {
      mockPasswordResetModel.findOne.mockResolvedValue(mockResetDoc);
      mockUsersService.update.mockResolvedValue({});
      mockPasswordResetModel.deleteOne.mockResolvedValue({});

      const result = await service.resetPassword(
        'valid-reset-token',
        'NewPass123!',
      );

      expect(mockUsersService.update).toHaveBeenCalled();
      expect(result.message).toBe('Password reset successfully');
    });

    it('debe lanzar BadRequestException si el token no existe', async () => {
      mockPasswordResetModel.findOne.mockResolvedValue(null);

      await expect(
        service.resetPassword('invalid-token', 'NewPass123!'),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar BadRequestException si el token está vencido', async () => {
      mockPasswordResetModel.findOne.mockResolvedValue({
        ...mockResetDoc,
        expiresAt: pastDate,
      });
      mockPasswordResetModel.deleteOne.mockResolvedValue({});

      await expect(
        service.resetPassword('expired-token', 'NewPass123!'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── OAuth Social (Google & Facebook) ────────────────────────────────────────
  describe('OAuth Social (Google & Facebook)', () => {
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('debe crear un usuario nuevo verificado al iniciar sesión con Google por primera vez', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'GOOGLE_CLIENT_ID') return 'google-client-id-123';
        return undefined;
      });
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ aud: 'google-client-id-123' }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            sub: 'google-sub-99',
            email: 'nuevo@gmail.com',
            email_verified: true,
            name: 'Mateo Google',
            picture: 'https://lh3.googleusercontent.com/avatar.jpg',
          }),
        } as Response);

      mockUsersService.findByGoogleId.mockResolvedValue(null);
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.createOAuthUser.mockResolvedValue({
        _id: 'user-google-1',
        name: 'Mateo Google',
        email: 'nuevo@gmail.com',
        role: 'CLIENT',
        googleId: 'google-sub-99',
        authProviders: ['google'],
        isEmailVerified: true,
      });
      mockRefreshTokenModel.create.mockResolvedValue({});

      const result = await service.loginWithGoogle({
        accessToken: 'valid-google-access-token',
      });

      expect(mockUsersService.createOAuthUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'nuevo@gmail.com',
          provider: 'google',
          providerId: 'google-sub-99',
        }),
      );
      expect(result.isNewUser).toBe(true);
      expect(result.access_token).toBe('mock-access-token');
    });

    it('debe vincular automáticamente Google a una cuenta local existente con el mismo correo', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sub: 'google-sub-existing',
          email: 'mateo@gmail.com',
          email_verified: true,
          name: 'Mateo',
        }),
      } as Response);

      mockUsersService.findByGoogleId.mockResolvedValue(null);
      mockUsersService.findByEmail.mockResolvedValue({
        _id: 'local-user-1',
        email: 'mateo@gmail.com',
        role: 'CLIENT',
      });
      mockUsersService.linkOAuthProvider.mockResolvedValue({
        _id: 'local-user-1',
        email: 'mateo@gmail.com',
        role: 'CLIENT',
        googleId: 'google-sub-existing',
        authProviders: ['local', 'google'],
        isEmailVerified: true,
      });
      mockRefreshTokenModel.create.mockResolvedValue({});

      const result = await service.loginWithGoogle({
        accessToken: 'google-token',
      });

      expect(mockUsersService.linkOAuthProvider).toHaveBeenCalledWith(
        'local-user-1',
        'google',
        'google-sub-existing',
        expect.objectContaining({ markEmailVerified: true }),
      );
      expect(result.linkedExistingAccount).toBe(true);
      expect(result.isNewUser).toBe(false);
    });

    it('debe autenticar con Facebook intercambiando el authorization code', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'FACEBOOK_APP_ID') return 'fb-app-1';
        if (key === 'FACEBOOK_APP_SECRET') return 'fb-secret-1';
        return undefined;
      });
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'fb-user-access-token' }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { is_valid: true, app_id: 'fb-app-1' },
          }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'fb-id-777',
            name: 'Laura FB',
            email: 'laura@fb.com',
            picture: { data: { url: 'https://graph.facebook.com/pic.jpg' } },
          }),
        } as Response);

      mockUsersService.findByFacebookId.mockResolvedValue({
        _id: 'user-fb-1',
        name: 'Laura FB',
        email: 'laura@fb.com',
        role: 'CLIENT',
        facebookId: 'fb-id-777',
        authProviders: ['facebook'],
        isEmailVerified: true,
      });
      mockRefreshTokenModel.create.mockResolvedValue({});

      const result = await service.loginWithFacebook({
        code: 'fb-oauth-code',
        redirectUri: 'http://localhost:5173/auth/facebook/callback',
      });

      expect(result.user.facebookId).toBe('fb-id-777');
      expect(result.access_token).toBe('mock-access-token');
    });

    it('debe rechazar linkGoogle con ConflictException si esa cuenta de Google ya pertenece a otro usuario', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sub: 'google-taken-id',
          email: 'otro@gmail.com',
          name: 'Otro',
        }),
      } as Response);

      mockUsersService.findOne.mockResolvedValue({
        _id: 'mi-user-id',
        email: 'yo@gmail.com',
      });
      mockUsersService.findByGoogleId.mockResolvedValue({
        _id: 'otro-user-id',
        googleId: 'google-taken-id',
      });

      await expect(
        service.linkGoogle('mi-user-id', { accessToken: 'token' }),
      ).rejects.toThrow(ConflictException);
    });

    it('debe impedir desvincular el único método de inicio de sesión si el usuario no tiene contraseña', async () => {
      mockUsersService.findByIdWithAuth.mockResolvedValue({
        _id: 'social-only-user',
        googleId: 'g-1',
        facebookId: undefined,
        password: undefined,
      });

      await expect(
        service.unlinkProvider('social-only-user', 'google'),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe desvincular Google correctamente si el usuario tiene contraseña local', async () => {
      mockUsersService.findByIdWithAuth.mockResolvedValue({
        _id: 'hybrid-user',
        googleId: 'g-1',
        password: 'hashed-password',
      });
      mockUsersService.unlinkOAuthProvider.mockResolvedValue({
        _id: 'hybrid-user',
        authProviders: ['local'],
      });

      const result = await service.unlinkProvider('hybrid-user', 'google');

      expect(mockUsersService.unlinkOAuthProvider).toHaveBeenCalledWith(
        'hybrid-user',
        'google',
      );
      expect(result.message).toContain('desvinculada');
    });
  });
});
