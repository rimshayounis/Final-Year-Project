import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Admin, AdminDocument } from './schemas/admin.schema';
import { RegisterAdminDto } from './dto/register-admin.dto';
import { LoginAdminDto } from './dto/login-admin.dto';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Admin.name) private adminModel: Model<AdminDocument>,
    private mailService: MailService,
  ) {}

  // ── Register ──────────────────────────────────────────────────────────────
  async register(dto: RegisterAdminDto) {
    const existing = await this.adminModel.findOne({
      $or: [{ username: dto.username }, { email: dto.email.toLowerCase() }],
    });
    if (existing) throw new ConflictException('Username or email already exists');

    const hashed = await bcrypt.hash(dto.password, 10);
    const admin = await this.adminModel.create({
      fullName: dto.fullName,
      username: dto.username,
      email:    dto.email.toLowerCase(),
      password: hashed,
    });
    const { password, otpCode, otpExpiry, token, ...result } = admin.toObject();
    return { success: true, admin: result };
  }

  // ── Login ─────────────────────────────────────────────────────────────────
  async login(dto: LoginAdminDto) {
    const admin = await this.adminModel.findOne({
      $or: [
        { username: dto.identifier },
        { email: dto.identifier.toLowerCase() },
      ],
    });
    if (!admin) throw new UnauthorizedException('No admin account found with these credentials');

    const isMatch = await bcrypt.compare(dto.password, admin.password);
    if (!isMatch) throw new UnauthorizedException('Incorrect password');

    // generate a random session token and persist it
    const accessToken = crypto.randomBytes(32).toString('hex');
    admin.token = accessToken;
    await admin.save();

    const { password, otpCode, otpExpiry, token, ...adminData } = admin.toObject();
    return { access_token: accessToken, admin: adminData };
  }

  // ── Profile (verify token) ────────────────────────────────────────────────
  async getProfile(bearerToken: string) {
    const admin = await this.adminModel.findOne({ token: bearerToken });
    if (!admin) throw new UnauthorizedException('Invalid or expired session');
    const { password, otpCode, otpExpiry, token, ...result } = admin.toObject();
    return result;
  }

  // ── Forgot Password — send OTP ────────────────────────────────────────────
  async forgotPassword(email: string) {
    const admin = await this.adminModel.findOne({ email: email.toLowerCase() });
    if (!admin) throw new NotFoundException('No admin account with this email');

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    admin.otpCode   = otp;
    admin.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    await admin.save();

    await this.mailService.sendOtpEmail(admin.email, otp, admin.fullName);
    return { success: true, message: 'OTP sent to your email' };
  }

  // ── Verify OTP ────────────────────────────────────────────────────────────
  async verifyOtp(email: string, otp: string) {
    const admin = await this.adminModel.findOne({ email: email.toLowerCase() });
    if (!admin || !admin.otpCode || !admin.otpExpiry)
      throw new BadRequestException('OTP not requested or already used');

    if (admin.otpCode !== otp)
      throw new BadRequestException('Invalid OTP');

    if (new Date() > admin.otpExpiry)
      throw new BadRequestException('OTP has expired');

    return { success: true };
  }

  // ── Reset Password ────────────────────────────────────────────────────────
  async resetPassword(email: string, otp: string, newPassword: string) {
    const admin = await this.adminModel.findOne({ email: email.toLowerCase() });
    if (!admin || !admin.otpCode || !admin.otpExpiry)
      throw new BadRequestException('OTP not requested or already used');

    if (admin.otpCode !== otp)
      throw new BadRequestException('Invalid OTP');

    if (new Date() > admin.otpExpiry)
      throw new BadRequestException('OTP has expired');

    admin.password  = await bcrypt.hash(newPassword, 10);
    admin.otpCode   = null;
    admin.otpExpiry = null;
    admin.token     = null; // invalidate existing sessions
    await admin.save();

    return { success: true, message: 'Password reset successfully' };
  }
}
