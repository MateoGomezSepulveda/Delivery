import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schema/users.schema';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}
  findAll() {
    return this.userModel.find().select('-password');
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
