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
import { normalizePhoneNumber } from 'src/common/utils/phone.util';
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

    let normalizedPhone: string | undefined = undefined;
    if (userData.phone !== undefined) {
      const parsedPhone = normalizePhoneNumber(userData.phone);
      if (!parsedPhone) {
        throw new BadRequestException(
          'Ingresa un número de celular válido (ej. 300 123 4567 o +57 300 123 4567).',
        );
      }
      normalizedPhone = parsedPhone;
    }

    const newUser = new this.userModel({
      ...userData,
      ...(normalizedPhone ? { phone: normalizedPhone } : {}),
      email: normalizedEmail,
      password: hashedPassword,
      authProviders: ['local'],
      isEmailVerified: options?.isEmailVerified ?? true,
      isPhoneVerified: false,
    });
    const saved = await newUser.save();
    const { password, ...result } = saved.toObject();
    return result;
  }

  async createOAuthUser(data: {
    name: string;
    email: string;
    provider: 'google' | 'facebook';
    providerId: string;
    avatarUrl?: string | null;
  }) {
    const normalizedEmail = data.email.trim().toLowerCase();
    const providerField =
      data.provider === 'google' ? 'googleId' : 'facebookId';

    const newUser = new this.userModel({
      name: data.name.trim() || 'Usuario DeliveryPro',
      email: normalizedEmail,
      role: Role.CLIENT,
      isEmailVerified: true,
      [providerField]: data.providerId,
      authProviders: [data.provider],
      ...(data.avatarUrl ? { avatarUrl: data.avatarUrl } : {}),
    });

    const saved = await newUser.save();
    const { password, ...result } = saved.toObject();
    return result;
  }

  async findOne(id: string) {
    return this.userModel.findById(id).select('-password').exec();
  }

  async findByIdWithAuth(id: string) {
    return this.userModel.findById(id).exec();
  }

  async findByGoogleId(googleId: string) {
    return this.userModel.findOne({ googleId }).select('-password').exec();
  }

  async findByFacebookId(facebookId: string) {
    return this.userModel.findOne({ facebookId }).select('-password').exec();
  }

  async linkOAuthProvider(
    id: string,
    provider: 'google' | 'facebook',
    providerId: string,
    options?: { avatarUrl?: string | null; markEmailVerified?: boolean },
  ) {
    const providerField = provider === 'google' ? 'googleId' : 'facebookId';
    const setFields: Record<string, unknown> = {
      [providerField]: providerId,
    };

    if (options?.markEmailVerified) {
      setFields.isEmailVerified = true;
    }
    if (options?.avatarUrl) {
      setFields.avatarUrl = options.avatarUrl;
    }

    return this.userModel
      .findByIdAndUpdate(
        id,
        {
          $set: setFields,
          $addToSet: { authProviders: provider },
        },
        { new: true },
      )
      .select('-password');
  }

  async unlinkOAuthProvider(id: string, provider: 'google' | 'facebook') {
    const providerField = provider === 'google' ? 'googleId' : 'facebookId';

    return this.userModel
      .findByIdAndUpdate(
        id,
        {
          $unset: { [providerField]: '' },
          $pull: { authProviders: provider },
        },
        { new: true },
      )
      .select('-password');
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

    if (updateData.phone !== undefined) {
      const normalizedPhone = normalizePhoneNumber(updateData.phone);
      if (!normalizedPhone) {
        throw new BadRequestException(
          'Ingresa un número de celular válido (ej. 300 123 4567 o +57 300 123 4567).',
        );
      }

      const existingUser =
        typeof this.userModel.findById === 'function'
          ? await this.findOne(id)
          : null;
      payloadToUpdate.phone = normalizedPhone;
      if (!existingUser || existingUser.phone !== normalizedPhone) {
        payloadToUpdate.isPhoneVerified = false;
      }
    }

    if (updateData.password) {
      payloadToUpdate.password = await bcrypt.hash(updateData.password, 10);
      return this.userModel
        .findByIdAndUpdate(
          id,
          {
            $set: payloadToUpdate,
            $addToSet: { authProviders: 'local' },
          },
          { new: true },
        )
        .select('-password');
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

  async markEmailAsVerified(
    id: string,
    options?: { markPhoneVerified?: boolean },
  ) {
    const updateFields: Record<string, boolean> = { isEmailVerified: true };
    if (options?.markPhoneVerified) {
      updateFields.isPhoneVerified = true;
    }

    return this.userModel
      .findByIdAndUpdate(id, updateFields, { new: true })
      .select('-password');
  }

  async markPhoneAsVerified(id: string) {
    return this.userModel
      .findByIdAndUpdate(id, { isPhoneVerified: true }, { new: true })
      .select('-password');
  }

  async changeRole(id: string, role: Role) {
    return this.userModel
      .findByIdAndUpdate(id, { role }, { new: true })
      .select('-password');
  }
}
