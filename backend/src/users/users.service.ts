import { Injectable, ConflictException, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import {
  RegisterUserDto,
  RegisterDoctorDto,
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
      message: `${registerUserDto.userType === 'doctor' ? 'Doctor' : 'User'} registered successfully`,
      user: userObject,
    };
  }

  // ✅ NEW - Doctor registration with professional info
  async registerDoctor(registerDoctorDto: RegisterDoctorDto): Promise<any> {
    const existingUser = await this.userModel.findOne({
      email: registerDoctorDto.email,
    });

    if (existingUser) {
      throw new ConflictException('Doctor with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(registerDoctorDto.password, 10);

    const newDoctor = new this.userModel({
      fullName: registerDoctorDto.fullName,
      email: registerDoctorDto.email,
      password: hashedPassword,
      userType: 'doctor',
      doctorProfile: {
        licenseNumber: registerDoctorDto.licenseNumber,
        specialization: registerDoctorDto.specialization,
        certificates: registerDoctorDto.certificates || [],
        isVerified: false,
      },
    });

    const savedDoctor = await newDoctor.save();
    const doctorObject: any = savedDoctor.toObject();
    delete doctorObject.password;

    return {
      success: true,
      message: 'Doctor registered successfully. Account pending verification.',
      user: doctorObject,
    };
  }

  async login(loginDto: LoginDto): Promise<any> {
    const user = await this.userModel.findOne({ 
      email: loginDto.email,
      userType: loginDto.userType,
    });

    if (!user) {
      throw new NotFoundException('Invalid credentials or wrong account type');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);

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

    if (user.userType === 'doctor') {
      throw new BadRequestException('Doctors do not have health profiles');
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

  async getUsersByType(userType: string): Promise<any> {
    const users = await this.userModel.find({ userType }).select('-password');

    return {
      success: true,
      count: users.length,
      userType,
      users,
    };
  }

  async updateUser(userId: string, updateData: Partial<User>): Promise<any> {
    if (updateData.userType) {
      delete updateData.userType;
    }

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