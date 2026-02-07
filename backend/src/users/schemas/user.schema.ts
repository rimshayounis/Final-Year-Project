
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

// Health Profile Schema (only for users)
@Schema({ _id: false })
export class HealthProfile {
  @Prop({ required: false })
  sleepDuration: number;

  @Prop({ required: false })
  stressLevel: string;

  @Prop({ required: false })
  dietPreference: string;

  @Prop({ required: false })
  additionalNotes?: string;
}

// Emergency Contact Schema
@Schema({ _id: false })
export class EmergencyContact {
  @Prop({ required: true })
  fullName: string;

  @Prop({ required: true })
  phoneNumber: string;

  @Prop({ required: true })
  relationship: string;
}

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

// Main User Schema
@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  fullName: string;

  @Prop({ required: false }) // Not required for doctors
  age?: number;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: false }) // Not required for doctors
  gender?: string;

  @Prop({ required: true, enum: ['user', 'doctor'], default: 'user' })
  userType: string;

  // ✅ For regular users ONLY
  @Prop({ type: HealthProfile, required: false })
  healthProfile?: HealthProfile;

  // ✅ UPDATED - Only for regular users, NOT for doctors
  @Prop({ 
    type: [EmergencyContact], 
    default: undefined, // Changed from [] to undefined
    required: false 
  })
  emergencyContacts?: EmergencyContact[];

  // ✅ For doctors ONLY
  @Prop({ type: DoctorProfile, required: false })
  doctorProfile?: DoctorProfile;
}

export const UserSchema = SchemaFactory.createForClass(User);