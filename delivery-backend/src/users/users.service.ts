import {
  Injectable,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schema/users.schema';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { Role } from 'src/auth/roles.enum';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  async findAll(paginationQuery: PaginationQueryDto) {
    const { page = 1, limit = 10, search } = paginationQuery;

    const skip = (page - 1) * limit;

    const filter = search
      ? {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
          ],
        }
      : {};

    const users = await this.userModel
      .find(filter)
      .limit(limit)
      .skip(skip)
      .select('-password');

    const total = await this.userModel.countDocuments(filter);

    return {
      data: users,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async create(
    userData: CreateUserDto,
    options?: { isEmailVerified?: boolean },
  ) {
    const normalizedEmail = userData.email.trim().toLowerCase();
    const existingUser = await this.findByEmail(normalizedEmail);
    if (existingUser) {
      throw new ConflictException(
        'Ya existe una cuenta registrada con este correo electrónico.',
      );
    }

    const hashedPassword = await bcrypt.hash(userData.password, 10);

    const newUser = new this.userModel({
      ...userData,
      email: normalizedEmail,
      password: hashedPassword,
      isEmailVerified: options?.isEmailVerified ?? true,
    });
    const saved = await newUser.save();
    const { password, ...result } = saved.toObject();
    return result;
  }

  async findOne(id: string) {
    return this.userModel.findById(id).select('-password').exec();
  }

  async update(id: string, updateData: UpdateUserDto) {
    if (updateData.role) {
      delete updateData.role;
    }

    const payloadToUpdate: Record<string, unknown> = { ...updateData };

    if (updateData.email) {
      const normalizedEmail = updateData.email.trim().toLowerCase();
      const userWithEmail = await this.findByEmail(normalizedEmail);

      if (userWithEmail && userWithEmail._id.toString() !== id) {
        throw new BadRequestException(
          'Este correo ya esta registrado en otra cuenta',
        );
      }

      payloadToUpdate.email = normalizedEmail;
      if (!userWithEmail) {
        payloadToUpdate.isEmailVerified = false;
      }
    }

    if (updateData.password) {
      payloadToUpdate.password = await bcrypt.hash(updateData.password, 10);
    }

    return this.userModel
      .findByIdAndUpdate(id, payloadToUpdate, { new: true })
      .select('-password');
  }

  async remove(id: string) {
    return this.userModel.findByIdAndDelete(id);
  }

  async findByEmail(email: string) {
    const normalized = email.trim();
    return this.userModel.findOne({
      email: { $regex: new RegExp(`^${this.escapeRegex(normalized)}$`, 'i') },
    });
  }

  async markEmailAsVerified(id: string) {
    return this.userModel
      .findByIdAndUpdate(id, { isEmailVerified: true }, { new: true })
      .select('-password');
  }

  async changeRole(id: string, role: Role) {
    return this.userModel
      .findByIdAndUpdate(id, { role }, { new: true })
      .select('-password');
  }
}
