import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { Address } from './schemas/address.schema';

@Injectable()
export class AddressesService {
  constructor(
    @InjectModel(Address.name) private readonly addressModel: Model<Address>,
  ) {}

  async create(userId: string, createAddressDto: CreateAddressDto) {
    if (createAddressDto.isDefault) {
      // Si la nueva es por defecto, quitamos el por defecto a las anteriores
      await this.addressModel.updateMany({ userId }, { isDefault: false });
    } else {
      // Si es la primera dirección que crea, la hacemos por defecto automáticamente
      const count = await this.addressModel.countDocuments({ userId });
      if (count === 0) {
        createAddressDto.isDefault = true;
      }
    }

    const newAddress = new this.addressModel({
      ...createAddressDto,
      userId,
    });
    return newAddress.save();
  }

  async findAllByUser(userId: string) {
    // Ordenamos para que la dirección por defecto siempre salga primero
    return this.addressModel
      .find({ userId })
      .sort({ isDefault: -1, createdAt: -1 })
      .exec();
  }

  async findOne(id: string, userId: string) {
    const address = await this.addressModel.findOne({ _id: id, userId }).exec();
    if (!address) {
      throw new NotFoundException(`Address with ID "${id}" not found`);
    }
    return address;
  }

  async update(id: string, userId: string, updateAddressDto: UpdateAddressDto) {
    const address = await this.findOne(id, userId);

    if (updateAddressDto.isDefault) {
      // Quitamos el por defecto a todas las demás
      await this.addressModel.updateMany(
        { userId, _id: { $ne: id } },
        { isDefault: false },
      );
    }

    Object.assign(address, updateAddressDto);
    return address.save();
  }

  async remove(id: string, userId: string) {
    const address = await this.findOne(id, userId);
    await this.addressModel.deleteOne({ _id: id });

    // Si borró su dirección por defecto, hagamos que la más reciente sea la nueva por defecto
    if (address.isDefault) {
      const nextAddress = await this.addressModel
        .findOne({ userId })
        .sort({ createdAt: -1 })
        .exec();
      if (nextAddress) {
        nextAddress.isDefault = true;
        await nextAddress.save();
      }
    }

    return { success: true };
  }
}
