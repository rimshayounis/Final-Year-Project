
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ _id: false })
export class UserNotificationSettings {
  @Prop({ default: true  }) pushEnabled:  boolean;
  @Prop({ default: false }) emailEnabled: boolean;
}

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

// User Schema (regular users only)
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

  // TODO: redundant — this collection IS the user type. Remove once auth JWT no longer embeds this field.
  @Prop({ required: true })
  userType: string;


  @Prop({ type: HealthProfile, required: false })
  healthProfile?: HealthProfile;

  @Prop({
    type: [EmergencyContact],
    default: undefined,
    required: false
  })
  emergencyContacts?: EmergencyContact[];

  @Prop({
    type: UserNotificationSettings,
    default: () => ({ pushEnabled: true, emailEnabled: false }),
  })
  notificationSettings: UserNotificationSettings;

  @Prop({ type: String, default: null })
  expoPushToken: string | null;
}

export const UserSchema = SchemaFactory.createForClass(User);