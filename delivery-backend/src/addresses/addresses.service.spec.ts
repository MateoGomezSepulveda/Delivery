import { Test, TestingModule } from '@nestjs/testing';
import { AddressesService } from './addresses.service';
import { getModelToken } from '@nestjs/mongoose';
import { Address } from './schemas/address.schema';
import { NotFoundException } from '@nestjs/common';

describe('AddressesService', () => {
  let service: AddressesService;

  const mockAddress = {
    _id: 'address123',
    userId: 'user123',
    title: 'Casa',
    isDefault: true,
    save: jest.fn().mockResolvedValue(true),
  };

  class MockAddressModel {
    constructor(public data?: any) {}
    save = jest.fn().mockResolvedValue(mockAddress);

    static find = jest.fn().mockReturnThis();
    static findOne = jest.fn().mockReturnThis();
    static sort = jest.fn().mockReturnThis();
    static exec = jest.fn();
    static updateMany = jest.fn();
    static deleteOne = jest.fn();
    static countDocuments = jest.fn();
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddressesService,
        {
          provide: getModelToken(Address.name),
          useValue: MockAddressModel,
        },
      ],
    }).compile();

    service = module.get<AddressesService>(AddressesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should set isDefault to false for other addresses if new address is default', async () => {
      const dto = { title: 'Casa', isDefault: true } as any;
      MockAddressModel.updateMany.mockResolvedValueOnce({} as any);

      const result = await service.create('user123', dto);
      expect(MockAddressModel.updateMany).toHaveBeenCalledWith(
        { userId: 'user123' },
        { isDefault: false },
      );
      expect(result).toBeDefined();
    });

    it('should set isDefault to true if it is the first address created', async () => {
      const dto = { title: 'Casa', isDefault: false } as any;
      MockAddressModel.countDocuments.mockResolvedValueOnce(0);

      const result = await service.create('user123', dto);
      expect(dto.isDefault).toBe(true);
      expect(result).toBeDefined();
    });
  });

  describe('findAllByUser', () => {
    it('should return an array of addresses', async () => {
      MockAddressModel.exec.mockResolvedValueOnce([mockAddress]);
      const result = await service.findAllByUser('user123');
      expect(result).toEqual([mockAddress]);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if address is not found', async () => {
      MockAddressModel.exec.mockResolvedValueOnce(null);
      await expect(service.findOne('invalid', 'user123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return address if found', async () => {
      MockAddressModel.exec.mockResolvedValueOnce(mockAddress);
      const result = await service.findOne('address123', 'user123');
      expect(result).toEqual(mockAddress);
    });
  });

  describe('update', () => {
    it('should update and unset default from others if isDefault is true', async () => {
      const dto = { isDefault: true } as any;
      jest.spyOn(service, 'findOne').mockResolvedValueOnce(mockAddress as any);

      await service.update('address123', 'user123', dto);

      expect(MockAddressModel.updateMany).toHaveBeenCalledWith(
        { userId: 'user123', _id: { $ne: 'address123' } },
        { isDefault: false },
      );
      expect(mockAddress.save).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete and assign new default if deleted address was default', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValueOnce(mockAddress as any);
      MockAddressModel.deleteOne.mockResolvedValueOnce({} as any);

      const mockNextAddress = { ...mockAddress, save: jest.fn() };
      MockAddressModel.exec.mockResolvedValueOnce(mockNextAddress);

      await service.remove('address123', 'user123');

      expect(MockAddressModel.deleteOne).toHaveBeenCalledWith({
        _id: 'address123',
      });
      expect(mockNextAddress.isDefault).toBe(true);
      expect(mockNextAddress.save).toHaveBeenCalled();
    });
  });
});
