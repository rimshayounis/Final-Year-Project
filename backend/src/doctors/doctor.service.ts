
import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
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

  // ── Bank Details ───────────────────────────────────────────────────────────

  async getBankDetails(doctorId: string): Promise<any> {
    const doctor = await this.doctorModel
      .findById(doctorId)
      .select('bankDetails')
      .exec();
    if (!doctor) throw new NotFoundException('Doctor not found');
    return { success: true, data: doctor.bankDetails ?? null };
  }

  async saveBankDetails(
    doctorId: string,
    password: string,
    bankName: string,
    accountName: string,
    accountNumber: string,
  ): Promise<any> {
    const doctor = await this.doctorModel.findById(doctorId).exec();
    if (!doctor) throw new NotFoundException('Doctor not found');

    const valid = await bcrypt.compare(password, doctor.password);
    if (!valid) throw new UnauthorizedException('Incorrect password');

    if (!bankName || !accountName || !accountNumber) {
      throw new BadRequestException('All bank detail fields are required');
    }

    doctor.bankDetails = { bankName, accountName, accountNumber, addedAt: new Date() };
    await doctor.save();

    return { success: true, message: 'Bank details saved successfully', data: doctor.bankDetails };
  }

  async deleteBankDetails(doctorId: string, password: string): Promise<any> {
    const doctor = await this.doctorModel.findById(doctorId).exec();
    if (!doctor) throw new NotFoundException('Doctor not found');

    const valid = await bcrypt.compare(password, doctor.password);
    if (!valid) throw new UnauthorizedException('Incorrect password');

    doctor.bankDetails = null;
    await doctor.save();

    return { success: true, message: 'Bank details removed successfully' };
  }

  async getNotificationSettings(doctorId: string): Promise<any> {
    const doctor = await this.doctorModel
      .findById(doctorId)
      .select('notificationSettings')
      .exec();
    if (!doctor) throw new NotFoundException('Doctor not found');
    return { success: true, data: doctor.notificationSettings };
  }

  async updateNotificationSettings(doctorId: string, settings: {
    emailEnabled?: boolean;
    appNotifEnabled?: boolean;
  }): Promise<any> {
    const doctor = await this.doctorModel.findById(doctorId).exec();
    if (!doctor) throw new NotFoundException('Doctor not found');

    const ns = doctor.notificationSettings ?? {} as any;
    if (settings.emailEnabled    !== undefined) ns.emailEnabled    = settings.emailEnabled;
    if (settings.appNotifEnabled !== undefined) ns.appNotifEnabled = settings.appNotifEnabled;

    doctor.notificationSettings = ns;
    doctor.markModified('notificationSettings');
    await doctor.save();
    return { success: true, data: doctor.notificationSettings };
  }

  async savePushToken(doctorId: string, token: string | null): Promise<any> {
    const doctor = await this.doctorModel.findById(doctorId).exec();
    if (!doctor) throw new NotFoundException('Doctor not found');
    doctor.expoPushToken = token;
    await doctor.save();
    return { success: true, message: 'Push token saved' };
  }

  async changePassword(
    doctorId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<any> {
    const doctor = await this.doctorModel.findById(doctorId).exec();
    if (!doctor) throw new NotFoundException('Doctor not found');

    const valid = await bcrypt.compare(oldPassword, doctor.password);
    if (!valid) throw new UnauthorizedException('Current password is incorrect');

    if (newPassword.length < 8)
      throw new BadRequestException('New password must be at least 8 characters');

    doctor.password = await bcrypt.hash(newPassword, 10);
    await doctor.save();
    return { success: true, message: 'Password updated successfully' };
  }

  async changeEmail(
    doctorId: string,
    password: string,
    newEmail: string,
  ): Promise<any> {
    const doctor = await this.doctorModel.findById(doctorId).exec();
    if (!doctor) throw new NotFoundException('Doctor not found');

    const valid = await bcrypt.compare(password, doctor.password);
    if (!valid) throw new UnauthorizedException('Password is incorrect');

    const taken = await this.doctorModel.findOne({ email: newEmail }).exec();
    if (taken) throw new ConflictException('Email is already in use');

    doctor.email = newEmail;
    await doctor.save();
    return { success: true, message: 'Email updated successfully' };
  }
}