import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AdminDocument = Admin & Document;

@Schema({ timestamps: true })
export class Admin {
  @Prop({ required: true })
  fullName: string;

  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ default: 'admin' })
  role: string;

  // ← explicit type: String fixes the error
  @Prop({ type: String, default: null })
  resetOtp: string | null;

  // ← explicit type: Date fixes the error
  @Prop({ type: Date, default: null })
  resetOtpExpiry: Date | null;
}

export const AdminSchema = SchemaFactory.createForClass(Admin);