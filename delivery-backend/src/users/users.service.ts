import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schema/users.schema';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';


@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) { }

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
      .select('-password')

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

  async create(userData: CreateUserDto) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    const newUser = new this.userModel({
      ...userData,
      password: hashedPassword,
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

    if (updateData.email) {
      const userWithEmail = await this.findByEmail(updateData.email)

      if (userWithEmail && userWithEmail._id.toString() !== id) {
        throw new BadRequestException("Este correo ya esta registrado en otra cuenta")
      }
    }

    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }
    return this.userModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true },
    ).select('-password');
  }

  async remove(id: string) {
    return this.userModel.findByIdAndDelete(id);
  }

  async findByEmail(email: string) {
    return this.userModel.findOne({ email });
  }

}
