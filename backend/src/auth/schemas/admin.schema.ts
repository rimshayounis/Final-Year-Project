import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AdminDocument = Admin & Document;

@Schema({ timestamps: true })
export class Admin {
  @Prop({ required: true }) fullName!: string;
  @Prop({ required: true, unique: true }) username!: string;
  @Prop({ required: true, unique: true }) email!: string;
  @Prop({ required: true }) password!: string;

  // stored session token (plain, not hashed — used for profile lookup)
  @Prop({ type: String, default: null }) token!: string | null;

  // OTP for forgot-password
  @Prop({ type: String, default: null }) otpCode!: string | null;
  @Prop({ type: Date,   default: null }) otpExpiry!: Date | null;
}

export const AdminSchema = SchemaFactory.createForClass(Admin);
