import { Injectable, UnauthorizedException, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

import { Admin, AdminDocument } from './schemas/admin.schema';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Admin.name) private adminModel: Model<AdminDocument>,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { fullName, username, email, password } = registerDto;
    const existing = await this.adminModel.findOne({ $or: [{ username }, { email }] });
    if (existing) throw new ConflictException('Username or email already exists');
    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = await this.adminModel.create({ fullName, username, email, password: hashedPassword });
    return { message: 'Admin account created successfully', adminId: admin._id };
  }

  async login(loginDto: LoginDto) {
    const { identifier, password } = loginDto;
    const admin = await this.adminModel.findOne({
      $or: [{ username: identifier }, { email: identifier }],
    });
    if (!admin) throw new UnauthorizedException('Invalid credentials');
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) throw new UnauthorizedException('Invalid credentials');
    const payload = { sub: admin._id, username: admin.username, role: admin.role };
    const access_token = this.jwtService.sign(payload);
    return {
      access_token,
      admin: { id: admin._id, fullName: admin.fullName, username: admin.username, email: admin.email },
    };
  }

  async getProfile(adminId: string) {
    const admin = await this.adminModel.findById(adminId).select('-password');
    if (!admin) throw new UnauthorizedException('Admin not found');
    return admin;
  }

  async updateProfile(adminId: string, body: { fullName?: string; username?: string }) {
    const update: any = {};
    if (body.fullName) update.fullName = body.fullName;
    if (body.username) update.username = body.username;
    const admin = await this.adminModel
      .findByIdAndUpdate(adminId, update, { new: true })
      .select('-password');
    if (!admin) throw new UnauthorizedException('Admin not found');
    return { success: true, data: admin };
  }

  async changePassword(adminId: string, oldPassword: string, newPassword: string) {
    const admin = await this.adminModel.findById(adminId);
    if (!admin) throw new UnauthorizedException('Admin not found');
    const isValid = await bcrypt.compare(oldPassword, admin.password);
    if (!isValid) throw new BadRequestException('Current password is incorrect');
    if (newPassword.length < 8) {
      throw new BadRequestException('New password must be at least 8 characters');
    }
    admin.password = await bcrypt.hash(newPassword, 10);
    await admin.save();
    return { success: true, message: 'Password changed successfully' };
  }

  // ── Forgot Password — send OTP ──
  async forgotPassword(email: string) {
    const admin = await this.adminModel.findOne({ email });
    if (!admin) throw new NotFoundException('No admin account found with this email');

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await this.adminModel.findByIdAndUpdate(admin._id, {
      resetOtp:       otp,
      resetOtpExpiry: otpExpiry,
    });

    await this.sendOtpEmail(admin.email, admin.fullName, otp);

    return { success: true, message: 'OTP sent to your email address' };
  }

  // ── Verify OTP ──
  async verifyOtp(email: string, otp: string) {
    const admin = await this.adminModel.findOne({ email });
    if (!admin) throw new NotFoundException('Admin not found');

    if (!admin.resetOtp || !admin.resetOtpExpiry) {
      throw new BadRequestException('No OTP request found. Please request a new OTP.');
    }
    if (new Date() > new Date(admin.resetOtpExpiry)) {
      throw new BadRequestException('OTP has expired. Please request a new one.');
    }
    if (admin.resetOtp !== otp) {
      throw new BadRequestException('Invalid OTP. Please check and try again.');
    }

    return { success: true, message: 'OTP verified successfully' };
  }

  // ── Reset Password ──
  async resetPassword(email: string, otp: string, newPassword: string) {
    const admin = await this.adminModel.findOne({ email });
    if (!admin) throw new NotFoundException('Admin not found');

    if (!admin.resetOtp || !admin.resetOtpExpiry) {
      throw new BadRequestException('No OTP request found. Please request a new OTP.');
    }
    if (new Date() > new Date(admin.resetOtpExpiry)) {
      throw new BadRequestException('OTP has expired. Please request a new one.');
    }
    if (admin.resetOtp !== otp) {
      throw new BadRequestException('Invalid OTP.');
    }
    if (newPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    admin.password       = await bcrypt.hash(newPassword, 10);
    admin.resetOtp       = null;
    admin.resetOtpExpiry = null;
    await admin.save();

    return { success: true, message: 'Password reset successfully' };
  }

  // ── Send OTP Email ──
  private async sendOtpEmail(email: string, name: string, otp: string) {
    try {
      // ── require inside function — fixes createTransporter error ──
      const nodemailer = require('nodemailer');

      const transporter = nodemailer.createTransport({  // ← createTransport not createTransporter
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER?.trim(),
          pass: process.env.GMAIL_APP_PASSWORD?.trim(),
        },
      });

      await transporter.sendMail({
        from:    `"TruHealLink Admin" <${process.env.GMAIL_USER?.trim()}>`,
        to:      email,
        subject: 'Your Admin Password Reset OTP',
        html: `
          <div style="font-family:'Segoe UI',sans-serif;max-width:480px;margin:0 auto;background:#f6f6fb;padding:32px;border-radius:16px">
            <div style="background:linear-gradient(135deg,#1e1b4b,#4338ca);border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
              <div style="font-size:28px;font-weight:900;color:#fff;letter-spacing:-1px">TruHeal<span style="color:#a5b4fc">Link</span></div>
              <div style="font-size:12px;color:rgba(255,255,255,0.6);margin-top:4px;letter-spacing:2px;text-transform:uppercase">Admin Password Reset</div>
            </div>
            <div style="background:#fff;border-radius:12px;padding:28px">
              <p style="font-size:15px;color:#1e1b4b;font-weight:700;margin-bottom:8px">Hello, ${name} 👋</p>
              <p style="font-size:14px;color:#6b7280;line-height:1.6;margin-bottom:24px">
                We received a request to reset your admin account password. Use the OTP below to proceed. This code expires in <strong>10 minutes</strong>.
              </p>
              <div style="background:#f0f0ff;border:2px dashed #6366f1;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px">
                <div style="font-size:36px;font-weight:900;color:#4338ca;letter-spacing:10px">${otp}</div>
                <div style="font-size:12px;color:#9ca3af;margin-top:8px">One-Time Password · Valid for 10 minutes</div>
              </div>
              <p style="font-size:12px;color:#9ca3af;line-height:1.6">
                If you did not request this, please ignore this email. Your account remains secure.
              </p>
            </div>
            <div style="text-align:center;margin-top:20px;font-size:11px;color:#c4c9d4">
              © ${new Date().getFullYear()} TruHealLink · Admin Control Center
            </div>
          </div>
        `,
      });

      console.log(`✅ OTP email sent to ${email}`);

    } catch (err) {
      console.error('❌ Email send error:', (err as Error).message);
      throw new BadRequestException(
        'Failed to send OTP email. Please verify your Gmail credentials in .env'
      );
    }
  }
}