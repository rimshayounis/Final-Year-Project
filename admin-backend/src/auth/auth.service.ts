import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
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
    const { username, password } = loginDto;

    const admin = await this.adminModel.findOne({ username });
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
}
