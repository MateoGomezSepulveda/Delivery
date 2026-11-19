import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
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
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;

  const mockUsersService = {
    create: jest.fn(),
    findByEmail: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    markEmailAsVerified: jest.fn(),
  };

  const mockMailService = {
    sendEmailVerification: jest.fn(),
    sendOrderStatusEmail: jest.fn(),
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
    it('debe crear el usuario CLIENT sin verificar y enviar correo de verificación', async () => {
      const dto = { name: 'Test', email: 'test@test.com', password: '123456' };
      const created = {
        _id: 'user-123',
        ...dto,
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
        { ...dto, role: 'CLIENT' },
        { isEmailVerified: false },
      );
      expect(mockEmailVerificationModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user: 'user-123',
          email: 'test@test.com',
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
      expect(result.isEmailVerified).toBe(false);
      expect(result).not.toHaveProperty('devVerificationCode');
      expect(result).not.toHaveProperty('emailPreviewUrl');
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
      );
      expect(result.user.isEmailVerified).toBe(true);
      expect(result.access_token).toBe('mock-access-token');
      expect(result.refresh_token).toBeDefined();
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

      expect(result.message).toContain('If the email exists');
      expect(mockPasswordResetModel.create).not.toHaveBeenCalled();
    });

    it('debe crear un token de reset si el email existe', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ _id: 'user-123' });
      mockPasswordResetModel.create.mockResolvedValue({});

      const result = await service.forgotPassword('existe@test.com');

      expect(mockPasswordResetModel.create).toHaveBeenCalled();
      expect(result).toHaveProperty('devToken');
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
});
