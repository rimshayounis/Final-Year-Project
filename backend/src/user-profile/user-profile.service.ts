import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserProfile, UserProfileDocument } from './schemas/user-profile.schema';
import { UpdateUserProfileDto } from './dto/user-profile.dto';

@Injectable()
export class UserProfileService {
  constructor(
    @InjectModel(UserProfile.name)
    private profileModel: Model<UserProfileDocument>,
  ) {}

  async getProfile(ownerId: string, ownerType: 'User' | 'Doctor'): Promise<UserProfileDocument | null> {
    return this.profileModel.findOne({
      ownerId: new Types.ObjectId(ownerId),
      ownerType,
    }).exec();
  }

  async upsertProfile(
    ownerId: string,
    ownerType: 'User' | 'Doctor',
    dto: UpdateUserProfileDto,
  ): Promise<UserProfileDocument> {
    return this.profileModel.findOneAndUpdate(
      { ownerId: new Types.ObjectId(ownerId), ownerType },
      { $set: dto },
      { new: true, upsert: true },
    ).exec();
  }

  async getProfileImage(ownerId: string, ownerType: 'User' | 'Doctor'): Promise<string | null> {
    const profile = await this.getProfile(ownerId, ownerType);
    return profile?.profileImage ?? null;
  }
}