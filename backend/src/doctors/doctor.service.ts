import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { Doctor, DoctorDocument } from './schemas/doctor.schema';
import { MailService } from '../mail/mail.service';
import {
  RegisterDoctorDto,
  LoginDoctorDto,
  ForgotPasswordDto,
  VerifyOtpDto,
  ResetPasswordDto,
} from './dto/doctor.dto';

@Injectable()
export class DoctorsService {
  constructor(
    @InjectModel(Doctor.name) private doctorModel: Model<DoctorDocument>,
    private readonly mailService: MailService,
  ) {}

  // ── Register ───────────────────────────────────────────────────────────────
  async register(dto: RegisterDoctorDto & { certificates?: string[] }) {
    const existing = await this.doctorModel.findOne({ email: dto.email.toLowerCase() });
    if (existing) throw new ConflictException('Email already registered');

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const doctor = new this.doctorModel({
      fullName: dto.fullName,
      email: dto.email.toLowerCase(),
      password: hashedPassword,
      doctorProfile: {
        professionalType: dto.professionalType,
        licenseNumber:    dto.professionalType === 'therapist' ? (dto.licenseNumber || null) : dto.licenseNumber,
        specialization:   dto.specialization,
        certificates:     dto.certificates || [],
        isVerified:       false,
      },
    });

    const saved = await doctor.save();
    const { password, otpCode, otpExpiry, ...result } = saved.toObject();
    return { success: true, doctor: result };
  }

  // ── Login ──────────────────────────────────────────────────────────────────
  async login(dto: LoginDoctorDto) {
    const doctor = await this.doctorModel.findOne({ email: dto.email.toLowerCase() });
    if (!doctor) throw new NotFoundException('No account found with this email');

    const isMatch = await bcrypt.compare(dto.password, doctor.password);
    if (!isMatch) throw new BadRequestException('Incorrect password');

    const { password, otpCode, otpExpiry, ...result } = doctor.toObject();
    return { success: true, doctor: result };
  }

  // ── Forgot Password — Step 1: Send OTP ────────────────────────────────────
  async forgotPassword(dto: ForgotPasswordDto) {
    const doctor = await this.doctorModel.findOne({ email: dto.email.toLowerCase() });
    if (!doctor) throw new NotFoundException('No account found with this email');

    const otpCode   = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await this.doctorModel.updateOne(
      { _id: doctor._id },
      { otpCode, otpExpiry },
    );

    await this.mailService.sendOtpEmail(doctor.email, otpCode, doctor.fullName);

    return { success: true, message: 'OTP sent to your email' };
  }

  // ── Forgot Password — Step 2: Verify OTP ──────────────────────────────────
  async verifyOtp(dto: VerifyOtpDto) {
    const doctor = await this.doctorModel.findOne({ email: dto.email.toLowerCase() });
    if (!doctor) throw new NotFoundException('No account found with this email');

    if (!doctor.otpCode || !doctor.otpExpiry) {
      throw new BadRequestException('No OTP requested. Please request a new one');
    }

    if (new Date() > doctor.otpExpiry) {
      await this.doctorModel.updateOne({ _id: doctor._id }, { otpCode: null, otpExpiry: null });
      throw new BadRequestException('OTP has expired. Please request a new one');
    }

    if (doctor.otpCode !== dto.otpCode) {
      throw new BadRequestException('Invalid OTP. Please check and try again');
    }

    return { success: true, message: 'OTP verified successfully' };
  }

  // ── Forgot Password — Step 3: Reset Password ──────────────────────────────
  async resetPassword(dto: ResetPasswordDto) {
    const doctor = await this.doctorModel.findOne({ email: dto.email.toLowerCase() });
    if (!doctor) throw new NotFoundException('No account found with this email');

    if (!doctor.otpCode || !doctor.otpExpiry) {
      throw new BadRequestException('No OTP requested. Please request a new one');
    }

    if (new Date() > doctor.otpExpiry) {
      await this.doctorModel.updateOne({ _id: doctor._id }, { otpCode: null, otpExpiry: null });
      throw new BadRequestException('OTP has expired. Please request a new one');
    }

    if (doctor.otpCode !== dto.otpCode) {
      throw new BadRequestException('Invalid OTP');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
    await this.doctorModel.updateOne(
      { _id: doctor._id },
      { password: hashedPassword, otpCode: null, otpExpiry: null },
    );

    return { success: true, message: 'Password reset successfully' };
  }

  // ── CRUD ───────────────────────────────────────────────────────────────────
  async getDoctorById(doctorId: string) {
    const doctor = await this.doctorModel.findById(doctorId).select('-password -otpCode -otpExpiry');
    if (!doctor) throw new NotFoundException('Doctor not found');
    return doctor;
  }

  async getVerificationStatus(doctorId: string) {
    const doctor = await this.doctorModel.findById(doctorId)
      .select('doctorProfile.isVerified doctorProfile.isRejected doctorProfile.rejectionReason doctorProfile.licenseNumber doctorProfile.specialization doctorProfile.certificates');
    if (!doctor) throw new NotFoundException('Doctor not found');
    return {
      isVerified: doctor.doctorProfile.isVerified,
      isRejected: doctor.doctorProfile.isRejected,
      rejectionReason: doctor.doctorProfile.rejectionReason ?? null,
      licenseNumber: doctor.doctorProfile.licenseNumber,
      specialization: doctor.doctorProfile.specialization,
      certificatesCount: doctor.doctorProfile.certificates?.length ?? 0,
    };
  }

  async resubmitDoctor(doctorId: string, specialization: string, licenseNumber: string, certificates: string[]) {
    const doctor = await this.doctorModel.findByIdAndUpdate(
      doctorId,
      {
        'doctorProfile.specialization': specialization,
        'doctorProfile.licenseNumber': licenseNumber || null,
        'doctorProfile.certificates': certificates,
        'doctorProfile.isVerified': false,
        'doctorProfile.isRejected': false,
        'doctorProfile.rejectionReason': null,
      },
      { new: true },
    ).select('-password -otpCode -otpExpiry');
    if (!doctor) throw new NotFoundException('Doctor not found');
    return { success: true, doctor };
  }

  async getAllDoctors() {
  const doctors = await this.doctorModel.find().select('-password -otpCode -otpExpiry');
  return { doctors };
}

  async getVerifiedDoctors() {
    return this.doctorModel.find({ 'doctorProfile.isVerified': true }).select('-password -otpCode -otpExpiry');
  }

  async updateDoctor(doctorId: string, updateData: any) {
    const doctor = await this.doctorModel.findByIdAndUpdate(doctorId, updateData, { new: true })
      .select('-password -otpCode -otpExpiry');
    if (!doctor) throw new NotFoundException('Doctor not found');
    return { success: true, doctor };
  }

  async verifyDoctor(doctorId: string) {
    const doctor = await this.doctorModel.findByIdAndUpdate(
      doctorId,
      { 'doctorProfile.isVerified': true },
      { new: true },
    ).select('-password -otpCode -otpExpiry');
    if (!doctor) throw new NotFoundException('Doctor not found');
    return { success: true, doctor };
  }

  async rejectDoctor(doctorId: string, reason: string) {
    const doctor = await this.doctorModel.findByIdAndUpdate(
      doctorId,
      {
        'doctorProfile.isVerified': false,
        'doctorProfile.isRejected': true,
        'doctorProfile.rejectionReason': reason,
      },
      { new: true },
    ).select('-password -otpCode -otpExpiry');
    if (!doctor) throw new NotFoundException('Doctor not found');
    return { success: true, doctor };
  }

  async deleteDoctor(doctorId: string) {
    const doctor = await this.doctorModel.findByIdAndDelete(doctorId);
    if (!doctor) throw new NotFoundException('Doctor not found');
    return { success: true, message: 'Doctor deleted' };
  }

  async getBankDetails(doctorId: string) {
    const doctor = await this.doctorModel.findById(doctorId).select('bankDetails');
    if (!doctor) throw new NotFoundException('Doctor not found');
    return doctor.bankDetails;
  }

  async saveBankDetails(doctorId: string, password: string, bankName: string, accountName: string, accountNumber: string) {
    const doctor = await this.doctorModel.findById(doctorId);
    if (!doctor) throw new NotFoundException('Doctor not found');
    const isMatch = await bcrypt.compare(password, doctor.password);
    if (!isMatch) throw new BadRequestException('Incorrect password');
    doctor.bankDetails = { bankName, accountName, accountNumber, addedAt: new Date() };
    await doctor.save();
    return { success: true, bankDetails: doctor.bankDetails };
  }

  async deleteBankDetails(doctorId: string, password: string) {
    const doctor = await this.doctorModel.findById(doctorId);
    if (!doctor) throw new NotFoundException('Doctor not found');
    const isMatch = await bcrypt.compare(password, doctor.password);
    if (!isMatch) throw new BadRequestException('Incorrect password');
    doctor.bankDetails = null;
    await doctor.save();
    return { success: true, message: 'Bank details removed' };
  }

  async getNotificationSettings(doctorId: string) {
    const doctor = await this.doctorModel.findById(doctorId).select('notificationSettings');
    if (!doctor) throw new NotFoundException('Doctor not found');
    return doctor.notificationSettings;
  }

  async updateNotificationSettings(doctorId: string, settings: { emailEnabled?: boolean; pushEnabled?: boolean }) {
    const doctor = await this.doctorModel.findByIdAndUpdate(
      doctorId,
      { $set: { 'notificationSettings.emailEnabled': settings.emailEnabled, 'notificationSettings.pushEnabled': settings.pushEnabled } },
      { new: true },
    ).select('notificationSettings');
    if (!doctor) throw new NotFoundException('Doctor not found');
    return doctor.notificationSettings;
  }

  async savePushToken(doctorId: string, token: string | null) {
    await this.doctorModel.updateOne({ _id: doctorId }, { expoPushToken: token });
    return { success: true };
  }

  async changePassword(doctorId: string, oldPassword: string, newPassword: string) {
    const doctor = await this.doctorModel.findById(doctorId);
    if (!doctor) throw new NotFoundException('Doctor not found');
    const isMatch = await bcrypt.compare(oldPassword, doctor.password);
    if (!isMatch) throw new BadRequestException('Current password is incorrect');
    doctor.password = await bcrypt.hash(newPassword, 10);
    await doctor.save();
    return { success: true, message: 'Password changed successfully' };
  }

  async changeEmail(doctorId: string, password: string, newEmail: string) {
    const doctor = await this.doctorModel.findById(doctorId);
    if (!doctor) throw new NotFoundException('Doctor not found');
    const isMatch = await bcrypt.compare(password, doctor.password);
    if (!isMatch) throw new BadRequestException('Incorrect password');
    const existing = await this.doctorModel.findOne({ email: newEmail.toLowerCase() });
    if (existing) throw new ConflictException('Email already in use');
    doctor.email = newEmail.toLowerCase();
    await doctor.save();
    return { success: true, message: 'Email updated successfully' };
  }
}