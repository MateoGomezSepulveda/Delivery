import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { RefreshToken } from './schemas/refresh-token.schema';
import { PasswordReset } from './schemas/password-reset.schema';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');
describe('AuthService', () => {
  let service: AuthService;

  const mockUsersService = {
    create: jest.fn(),
    findByEmail: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
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
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── register ────────────────────────────────────────────────────────────────
  describe('register', () => {
    it('debe delegar la creación al UsersService con rol CLIENT', async () => {
      const dto = { name: 'Test', email: 'test@test.com', password: '123456' };
      const created = { ...dto, role: 'client' };
      mockUsersService.create.mockResolvedValue(created);

      const result = await service.register(dto as any);

      expect(mockUsersService.create).toHaveBeenCalledWith({
        ...dto,
        role: 'CLIENT',
      });
      expect(result).toEqual(created);
    });
  });

  // ─── login ───────────────────────────────────────────────────────────────────
  describe('login', () => {
    const mockUser = {
      _id: 'user-id-123',
      email: 'test@test.com',
      password: 'hashed-password',
      role: 'client',
    };

    it('debe retornar access_token y refresh_token si las credenciales son correctas', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockRefreshTokenModel.create.mockResolvedValue({});

      const result = await service.login('test@test.com', 'password123');

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(mockJwtService.sign).toHaveBeenCalled();
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
      role: 'client',
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
