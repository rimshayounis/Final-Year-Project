import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserProfileDocument = UserProfile & Document;

@Schema({ timestamps: true })
export class UserProfile {
  @Prop({ type: Types.ObjectId, required: true, refPath: 'ownerType' })
  ownerId!: Types.ObjectId;

  @Prop({ type: String, required: true, enum: ['User', 'Doctor'] })
  ownerType!: string;

  @Prop({ type: String, default: null })
  bio: string | null = null;

  @Prop({ type: String, default: null })
  profileImage: string | null = null;
}

export const UserProfileSchema = SchemaFactory.createForClass(UserProfile);

UserProfileSchema.index({ ownerId: 1, ownerType: 1 }, { unique: true });