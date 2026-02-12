
import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { Doctor, DoctorDocument } from './schemas/doctor.schema';
import { RegisterDoctorDto, LoginDoctorDto } from './dto/doctor.dto';

@Injectable()
export class DoctorsService {
  constructor(
    @InjectModel(Doctor.name) private doctorModel: Model<DoctorDocument>,
  ) {}

  async register(registerDoctorDto: RegisterDoctorDto): Promise<any> {
    const existingDoctor = await this.doctorModel.findOne({
      email: registerDoctorDto.email,
    });

    if (existingDoctor) {
      throw new ConflictException('Doctor with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(registerDoctorDto.password, 10);

    const newDoctor = new this.doctorModel({
      fullName: registerDoctorDto.fullName,
      email: registerDoctorDto.email,
      password: hashedPassword,
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
      doctor: doctorObject,
    };
  }

  async login(loginDoctorDto: LoginDoctorDto): Promise<any> {
    const doctor = await this.doctorModel.findOne({
      email: loginDoctorDto.email,
    });

    if (!doctor) {
      throw new NotFoundException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDoctorDto.password,
      doctor.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const doctorObject: any = doctor.toObject();
    delete doctorObject.password;

    return {
      success: true,
      message: 'Login successful',
      doctor: doctorObject,
    };
  }

  async getDoctorById(doctorId: string): Promise<any> {
    const doctor = await this.doctorModel.findById(doctorId).select('-password');

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    return {
      success: true,
      doctor,
    };
  }

  async getAllDoctors(): Promise<any> {
    const doctors = await this.doctorModel.find().select('-password');

    return {
      success: true,
      count: doctors.length,
      doctors,
    };
  }

  async getVerifiedDoctors(): Promise<any> {
    const doctors = await this.doctorModel
      .find({ 'doctorProfile.isVerified': true })
      .select('-password');

    return {
      success: true,
      count: doctors.length,
      doctors,
    };
  }

  async updateDoctor(doctorId: string, updateData: Partial<Doctor>): Promise<any> {
    const doctor = await this.doctorModel
      .findByIdAndUpdate(doctorId, updateData, { new: true })
      .select('-password');

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    return {
      success: true,
      message: 'Doctor updated successfully',
      doctor,
    };
  }

  async verifyDoctor(doctorId: string): Promise<any> {
    const doctor = await this.doctorModel
      .findByIdAndUpdate(
        doctorId,
        { 'doctorProfile.isVerified': true },
        { new: true },
      )
      .select('-password');

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    return {
      success: true,
      message: 'Doctor verified successfully',
      doctor,
    };
  }

  async deleteDoctor(doctorId: string): Promise<any> {
    const doctor = await this.doctorModel.findByIdAndDelete(doctorId);

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    return {
      success: true,
      message: 'Doctor deleted successfully',
    };
  }
}