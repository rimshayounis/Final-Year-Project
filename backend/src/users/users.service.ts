import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { UserProfile, UserProfileDocument } from '../user-profile/schemas/user-profile.schema';
import { MailService } from '../mail/mail.service';
import {
  RegisterUserDto,
  LoginDto,
  CreateHealthProfileDto,
  CreateEmergencyContactsDto,
  ForgotPasswordDto,
  VerifyOtpDto,
  ResetPasswordDto,
} from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)        private userModel:    Model<UserDocument>,
    @InjectModel(UserProfile.name) private profileModel: Model<UserProfileDocument>,
    private readonly mailService: MailService,
  ) {}

  // ── Register ───────────────────────────────────────────────────────────────
  async register(dto: RegisterUserDto) {
    const existing = await this.userModel.findOne({
      email: dto.email.toLowerCase(),
    });
    if (existing) throw new ConflictException('Email already registered');

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = new this.userModel({
      ...dto,
      email:    dto.email.toLowerCase(),
      password: hashedPassword,
    });
    const saved = await user.save();
    const { password, otpCode, otpExpiry, ...result } = saved.toObject();
    return { success: true, user: result };
  }

  // ── Login ──────────────────────────────────────────────────────────────────
  async login(dto: LoginDto) {
    const user = await this.userModel.findOne({
      email: dto.email.toLowerCase(),
    });
    if (!user) throw new NotFoundException('No account found with this email');

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) throw new BadRequestException('Incorrect password');

    const { password, otpCode, otpExpiry, ...result } = user.toObject();
    return { success: true, user: result };
  }

  // ── Forgot Password — Step 1 ───────────────────────────────────────────────
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.userModel.findOne({
      email: dto.email.toLowerCase(),
    });
    if (!user) throw new NotFoundException('No account found with this email');

    const otpCode  = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await this.userModel.updateOne(
      { _id: user._id },
      { otpCode, otpExpiry },
    );

    await this.mailService.sendOtpEmail(user.email, otpCode, user.fullName);
    return { success: true, message: 'OTP sent to your email' };
  }

  // ── Forgot Password — Step 2 ───────────────────────────────────────────────
  async verifyOtp(dto: VerifyOtpDto) {
    const user = await this.userModel.findOne({
      email: dto.email.toLowerCase(),
    });
    if (!user) throw new NotFoundException('No account found with this email');

    if (!user.otpCode || !user.otpExpiry)
      throw new BadRequestException('No OTP requested. Please request a new one');

    if (new Date() > user.otpExpiry) {
      await this.userModel.updateOne(
        { _id: user._id },
        { otpCode: null, otpExpiry: null },
      );
      throw new BadRequestException('OTP has expired. Please request a new one');
    }

    if (user.otpCode !== dto.otpCode)
      throw new BadRequestException('Invalid OTP. Please check and try again');

    return { success: true, message: 'OTP verified successfully' };
  }

  // ── Forgot Password — Step 3 ───────────────────────────────────────────────
  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.userModel.findOne({
      email: dto.email.toLowerCase(),
    });
    if (!user) throw new NotFoundException('No account found with this email');

    if (!user.otpCode || !user.otpExpiry)
      throw new BadRequestException('No OTP requested. Please request a new one');

    if (new Date() > user.otpExpiry) {
      await this.userModel.updateOne(
        { _id: user._id },
        { otpCode: null, otpExpiry: null },
      );
      throw new BadRequestException('OTP has expired. Please request a new one');
    }

    if (user.otpCode !== dto.otpCode)
      throw new BadRequestException('Invalid OTP');

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
    await this.userModel.updateOne(
      { _id: user._id },
      { password: hashedPassword, otpCode: null, otpExpiry: null },
    );

    return { success: true, message: 'Password reset successfully' };
  }

  // ── Health Profile ─────────────────────────────────────────────────────────
  async createHealthProfile(userId: string, dto: CreateHealthProfileDto) {
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { healthProfile: dto },
      { new: true },
    );
    if (!user) throw new NotFoundException('User not found');
    return { success: true, user };
  }

  // ── Emergency Contacts ─────────────────────────────────────────────────────
  async createEmergencyContacts(
    userId: string,
    dto: CreateEmergencyContactsDto,
  ) {
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { emergencyContacts: dto.contacts },
      { new: true },
    );
    if (!user) throw new NotFoundException('User not found');
    return { success: true, user };
  }

  // ── SOS Message ────────────────────────────────────────────────────────────
  async updateSosMessage(userId: string, sosMessage: string) {
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { sosMessage },
      { new: true },
    ).select('-password -otpCode -otpExpiry');
    if (!user) throw new NotFoundException('User not found');
    return { success: true, sosMessage: user.sosMessage };
  }

  async updateSosShareProfile(userId: string, sosShareProfile: boolean) {
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { sosShareProfile },
      { new: true },
    ).select('-password -otpCode -otpExpiry');
    if (!user) throw new NotFoundException('User not found');
    return { success: true, sosShareProfile: user.sosShareProfile };
  }

  // ── CRUD ───────────────────────────────────────────────────────────────────
  async getUserById(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('-password -otpCode -otpExpiry');
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async getAllUsers() {
    const users = await this.userModel
      .find()
      .select('-password -otpCode -otpExpiry');
    return { users };
  }

  // ── Bulk fetch profile images from UserProfile collection ────────────────
  private async bulkGetProfileImages(userIds: string[]): Promise<Record<string, string | null>> {
    const objIds = userIds.map(id => new Types.ObjectId(id));
    const profiles = await this.profileModel
      .find({ ownerId: { $in: objIds }, ownerType: 'User' })
      .select('ownerId profileImage')
      .lean()
      .exec();
    const map: Record<string, string | null> = {};
    for (const p of profiles) {
      map[p.ownerId.toString()] = (p as any).profileImage ?? null;
    }
    return map;
  }

  // ── Friend suggestions based on shared health interests ──────────────────
  async getFriendSuggestions(userId: string, limit = 10) {
    const me = await this.userModel
      .findById(userId)
      .select('healthProfile blockedUsers')
      .lean()
      .exec();

    const myInterests: string[]  = (me as any)?.healthProfile?.interests ?? [];
    const myBlockedIds: string[] = ((me as any)?.blockedUsers ?? []).map((id: any) => id.toString());

    // Find who has blocked me
    const whoBlockedMe   = await this.userModel.find({ blockedUsers: new Types.ObjectId(userId) }).select('_id').lean();
    const blockedByOthers = whoBlockedMe.map((u: any) => u._id.toString());
    const allExcluded    = [...new Set([userId, ...myBlockedIds, ...blockedByOthers])];

    let suggestions: any[];

    const baseFilter: any = { _id: { $nin: allExcluded }, userType: 'user' };

    if (myInterests.length > 0) {
      // Find users sharing at least one interest
      suggestions = await this.userModel
        .find({ ...baseFilter, 'healthProfile.interests': { $in: myInterests } })
        .select('fullName gender age healthProfile profileImage')
        .limit(limit)
        .lean()
        .exec();
    } else {
      // Fallback: return recent users
      suggestions = await this.userModel
        .find(baseFilter)
        .select('fullName gender age healthProfile profileImage')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean()
        .exec();
    }

    // Fetch profile images from UserProfile collection
    const ids = suggestions.map((u: any) => u._id.toString());
    const imageMap = await this.bulkGetProfileImages(ids);

    // Count shared interests for each suggestion
    const result = suggestions.map((u: any) => {
      const uid = u._id.toString();
      const theirInterests: string[] = u.healthProfile?.interests ?? [];
      const shared = myInterests.filter(i => theirInterests.includes(i));
      return {
        _id:             uid,
        fullName:        u.fullName,
        gender:          u.gender,
        age:             u.age,
        profileImage:    imageMap[uid] ?? null,
        interests:       theirInterests,
        sharedInterests: shared,
      };
    });

    return { success: true, data: result };
  }

  // ── Search users by name ──────────────────────────────────────────────────
  async searchUsers(query: string, excludeUserId: string) {
    const users = await this.userModel
      .find({
        _id:      { $ne: excludeUserId },
        fullName: { $regex: query, $options: 'i' },
        userType: 'user',
      })
      .select('fullName gender age healthProfile profileImage')
      .limit(20)
      .lean()
      .exec();

    const ids = users.map((u: any) => u._id.toString());
    const imageMap = await this.bulkGetProfileImages(ids);

    return {
      success: true,
      data: users.map((u: any) => {
        const uid = u._id.toString();
        return {
          _id:          uid,
          fullName:     u.fullName,
          gender:       u.gender,
          age:          u.age,
          profileImage: imageMap[uid] ?? null,
          interests:    u.healthProfile?.interests ?? [],
        };
      }),
    };
  }

  // ── Block / Unblock ───────────────────────────────────────────────────────
  async blockUser(userId: string, targetId: string) {
    if (userId === targetId) throw new BadRequestException('Cannot block yourself');
    const targetObjId = new Types.ObjectId(targetId);
    await this.userModel.findByIdAndUpdate(userId, {
      $addToSet: { blockedUsers: targetObjId },
    });
    return { success: true, message: 'User blocked' };
  }

  async unblockUser(userId: string, targetId: string) {
    const targetObjId = new Types.ObjectId(targetId);
    await this.userModel.findByIdAndUpdate(userId, {
      $pull: { blockedUsers: targetObjId },
    });
    return { success: true, message: 'User unblocked' };
  }

  async getBlockedUsers(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('blockedUsers')
      .lean();
    return { success: true, blockedUsers: (user as any)?.blockedUsers?.map((id: any) => id.toString()) ?? [] };
  }

  async isBlockedBetween(userId: string, targetId: string): Promise<{ blockedByMe: boolean; blockedByThem: boolean }> {
    const [me, them] = await Promise.all([
      this.userModel.findById(userId).select('blockedUsers').lean(),
      this.userModel.findById(targetId).select('blockedUsers').lean(),
    ]);
    const myBlocked   = ((me   as any)?.blockedUsers ?? []).map((id: any) => id.toString());
    const theirBlocked = ((them as any)?.blockedUsers ?? []).map((id: any) => id.toString());
    return {
      blockedByMe:   myBlocked.includes(targetId),
      blockedByThem: theirBlocked.includes(userId),
    };
  }

  async updateUser(userId: string, updateData: any) {
    const user = await this.userModel
      .findByIdAndUpdate(userId, updateData, { new: true })
      .select('-password -otpCode -otpExpiry');
    if (!user) throw new NotFoundException('User not found');
    return { success: true, user };
  }

  async deleteUser(userId: string) {
    const user = await this.userModel.findByIdAndDelete(userId);
    if (!user) throw new NotFoundException('User not found');
    return { success: true, message: 'User deleted' };
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch)
      throw new BadRequestException('Current password is incorrect');
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    return { success: true, message: 'Password changed successfully' };
  }

  async changeEmail(userId: string, password: string, newEmail: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new BadRequestException('Incorrect password');
    const existing = await this.userModel.findOne({
      email: newEmail.toLowerCase(),
    });
    if (existing) throw new ConflictException('Email already in use');
    user.email = newEmail.toLowerCase();
    await user.save();
    return { success: true, message: 'Email updated successfully' };
  }

  async getNotificationSettings(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('notificationSettings');
    if (!user) throw new NotFoundException('User not found');
    return user.notificationSettings;
  }

  async updateNotificationSettings(
    userId: string,
    settings: { pushEnabled?: boolean; emailEnabled?: boolean },
  ) {
    const user = await this.userModel
      .findByIdAndUpdate(
        userId,
        {
          $set: {
            'notificationSettings.pushEnabled':  settings.pushEnabled,
            'notificationSettings.emailEnabled': settings.emailEnabled,
          },
        },
        { new: true },
      )
      .select('notificationSettings');
    if (!user) throw new NotFoundException('User not found');
    return user.notificationSettings;
  }

  async savePushToken(userId: string, token: string | null) {
    await this.userModel.updateOne({ _id: userId }, { expoPushToken: token });
    return { success: true };
  }
}