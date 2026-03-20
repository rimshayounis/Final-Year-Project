
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DoctorDocument = Doctor & Document;

// Doctor Professional Info Schema
@Schema({ _id: false })
export class DoctorProfile {
  @Prop({ required: true })
  licenseNumber: string;

  @Prop({ required: true })
  specialization: string;

  @Prop({ type: [String], default: [] })
  certificates: string[];

  @Prop({ default: false })
  isVerified: boolean;

  @Prop({ default: Date.now })
  registeredAt: Date;
}

// Notification Settings Sub-Schema
@Schema({ _id: false })
export class NotificationSettings {
  @Prop({ default: false }) emailEnabled: boolean;
  @Prop({ default: true  }) pushEnabled:  boolean;
}

// Bank Details Sub-Schema
@Schema({ _id: false })
export class BankDetails {
  @Prop({ required: true })
  bankName: string;

  @Prop({ required: true })
  accountName: string;

  @Prop({ required: true })
  accountNumber: string;

  @Prop({ default: Date.now })
  addedAt: Date;
}

export type SubscriptionPlan = 'free_trial' | 'basic' | 'professional' | 'premium';

// Doctor Schema
@Schema({ timestamps: true })
export class Doctor {
  @Prop({ required: true })
  fullName: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ type: DoctorProfile, required: true })
  doctorProfile: DoctorProfile;

  @Prop({ default: 'free_trial' })
  subscriptionPlan: SubscriptionPlan;

  @Prop({ type: BankDetails, default: null })
  bankDetails: BankDetails | null;

  @Prop({
    type: NotificationSettings,
    default: () => ({ emailEnabled: false, pushEnabled: true }),
  })
  notificationSettings: NotificationSettings;

  @Prop({ type: String, default: null })
  expoPushToken: string | null;

  @Prop({ default: 0, min: 0 })
  completedCount: number;

  @Prop({ type: Number, default: 0, min: 0, max: 5 })
  avgRating: number;

  @Prop({ type: Number, default: 0, min: 0 })
  ratingCount: number;
}

export const DoctorSchema = SchemaFactory.createForClass(Doctor);
