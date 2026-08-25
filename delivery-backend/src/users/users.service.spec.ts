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
});
