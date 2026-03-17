
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
}

export const DoctorSchema = SchemaFactory.createForClass(Doctor);