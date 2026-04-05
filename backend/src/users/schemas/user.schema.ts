import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ _id: false })
export class UserNotificationSettings {
  @Prop({ default: false }) emailEnabled: boolean;
}

@Schema({ _id: false })
export class HealthProfile {
  @Prop({ required: false }) sleepDuration:    number;
  @Prop({ required: false }) stressLevel:      string;
  @Prop({ required: false }) dietPreference:   string;
  @Prop({ required: false }) additionalNotes?: string;
  @Prop({ type: [String], default: [] }) interests: string[];
}

@Schema({ _id: false })
export class EmergencyContact {
  @Prop({ required: true }) fullName:     string;
  @Prop({ required: true }) relationship: string;
  @Prop({ required: true }) email:        string;
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  fullName: string;

  @Prop({ required: true })
  age: number;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true })
  gender: string;

  @Prop({ required: true })
  userType: string;

  @Prop({ required: false })
  phoneNumber?: string;

  @Prop({ type: String, default: null })
  profileImage: string | null;

  @Prop({ type: HealthProfile, required: false })
  healthProfile?: HealthProfile;

  @Prop({ type: [EmergencyContact], default: undefined, required: false })
  emergencyContacts?: EmergencyContact[];

  @Prop({
    type: UserNotificationSettings,
    default: () => ({ emailEnabled: false }),
  })
  notificationSettings: UserNotificationSettings;

  @Prop({
    type:    String,
    default: 'I need emergency help! Please contact me immediately.',
  })
  sosMessage: string;

  @Prop({ type: Boolean, default: true })
  sosShareProfile: boolean;

  // ── Blocked users ──────────────────────────────────────────────────────
  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  blockedUsers: Types.ObjectId[];

  // ── OTP fields ─────────────────────────────────────────────────────────
  @Prop({ type: String, default: null })
  otpCode: string | null;

  @Prop({ type: Date, default: null })
  otpExpiry: Date | null;
}

export const UserSchema = SchemaFactory.createForClass(User);