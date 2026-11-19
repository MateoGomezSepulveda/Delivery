import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getModelToken } from '@nestjs/mongoose';
import { User } from './schema/users.schema';
import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('UsersService', () => {
  let service: UsersService;

  // 1. "Mockeamos" (Simulamos) los métodos de Mongoose para no tocar la BD real
  const mockUserModel = {
    find: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    select: jest.fn().mockResolvedValue([]),
    countDocuments: jest.fn().mockResolvedValue(0),
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  it('debería lanzar error si el email ya existe al actualizar', async () => {
    // Simulamos que findByEmail encuentra a otro usuario (ID diferente)
    mockUserModel.findOne.mockResolvedValue({ _id: 'otro_id_diferente' });

    const updateData = { email: 'existente@mail.com' };

    // Verificamos que al intentar actualizar, el servicio rechace la operación
    await expect(service.update('mi_id_real', updateData)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('debería ignorar el cambio de rol', async () => {
    // Simulamos que el correo no existe
    mockUserModel.findOne.mockResolvedValue(null);
    // Simulamos el update
    mockUserModel.findByIdAndUpdate.mockReturnValue({
      select: jest.fn().mockResolvedValue({ name: 'Mateo' }),
    });

    const updateData = { role: 'ADMIN' as any }; // Intentamos inyectar el rol
    await service.update('mi_id_real', updateData);

    // Verificamos que la propiedad role fue borrada antes de actualizar
    expect(updateData.role).toBeUndefined();
  });

  it('debería marcar el correo como verificado con markEmailAsVerified', async () => {
    mockUserModel.findByIdAndUpdate.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: 'mi_id_real',
        isEmailVerified: true,
      }),
    });

    const result = await service.markEmailAsVerified('mi_id_real');

    expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'mi_id_real',
      { isEmailVerified: true },
      { new: true },
    );
    expect(result?.isEmailVerified).toBe(true);
  });

  it('debería persistir avatarUrl al actualizar el perfil de usuario', async () => {
    mockUserModel.findByIdAndUpdate.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: 'mi_id_real',
        avatarUrl: 'data:image/jpeg;base64,avatar123',
      }),
    });

    const result = await service.update('mi_id_real', {
      avatarUrl: 'data:image/jpeg;base64,avatar123',
    });

    expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'mi_id_real',
      { avatarUrl: 'data:image/jpeg;base64,avatar123' },
      { new: true },
    );
    expect(result?.avatarUrl).toBe('data:image/jpeg;base64,avatar123');
  });

  it('debería normalizar el celular colombiano a formato E.164 al actualizar y reiniciar isPhoneVerified', async () => {
    mockUserModel.findById.mockReturnValue({
      select: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: 'mi_id_real',
          phone: '+573001112233',
        }),
      }),
    });
    mockUserModel.findByIdAndUpdate.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: 'mi_id_real',
        phone: '+573009998877',
        isPhoneVerified: false,
      }),
    });

    const result = await service.update('mi_id_real', {
      phone: '300 999 8877',
    });

    expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'mi_id_real',
      { phone: '+573009998877', isPhoneVerified: false },
      { new: true },
    );
    expect(result?.phone).toBe('+573009998877');
  });

  it('debería rechazar números de celular con formato inválido al actualizar', async () => {
    await expect(
      service.update('mi_id_real', { phone: '12345' }),
    ).rejects.toThrow(BadRequestException);
  });
});
