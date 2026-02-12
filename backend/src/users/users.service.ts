
import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import {
  RegisterUserDto,
  CreateHealthProfileDto,
  CreateEmergencyContactsDto,
  LoginDto,
} from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async register(registerUserDto: RegisterUserDto): Promise<any> {
    const existingUser = await this.userModel.findOne({
      email: registerUserDto.email,
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(registerUserDto.password, 10);

    const newUser = new this.userModel({
      ...registerUserDto,
      password: hashedPassword,
    });

    const savedUser = await newUser.save();
    const userObject: any = savedUser.toObject();
    delete userObject.password;

    return {
      success: true,
      message: 'User registered successfully',
      user: userObject,
    };
  }

  async login(loginDto: LoginDto): Promise<any> {
    const user = await this.userModel.findOne({
      email: loginDto.email,
    });

    if (!user) {
      throw new NotFoundException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const userObject: any = user.toObject();
    delete userObject.password;

    return {
      success: true,
      message: 'Login successful',
      user: userObject,
    };
  }

  async createHealthProfile(
    userId: string,
    healthProfileDto: CreateHealthProfileDto,
  ): Promise<any> {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.healthProfile = healthProfileDto as any;
    await user.save();

    return {
      success: true,
      message: 'Health profile created successfully',
      healthProfile: user.healthProfile,
    };
  }

  async createEmergencyContacts(
    userId: string,
    emergencyContactsDto: CreateEmergencyContactsDto,
  ): Promise<any> {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.emergencyContacts = emergencyContactsDto.contacts;
    await user.save();

    return {
      success: true,
      message: 'Emergency contacts created successfully',
      emergencyContacts: user.emergencyContacts,
    };
  }

  async getUserById(userId: string): Promise<any> {
    const user = await this.userModel.findById(userId).select('-password');

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      success: true,
      user,
    };
  }

  async getAllUsers(): Promise<any> {
    const users = await this.userModel.find().select('-password');

    return {
      success: true,
      count: users.length,
      users,
    };
  }

  async updateUser(userId: string, updateData: Partial<User>): Promise<any> {
    const user = await this.userModel
      .findByIdAndUpdate(userId, updateData, { new: true })
      .select('-password');

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      success: true,
      message: 'User updated successfully',
      user,
    };
  }

  async deleteUser(userId: string): Promise<any> {
    const user = await this.userModel.findByIdAndDelete(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      success: true,
      message: 'User deleted successfully',
    };
  }
}