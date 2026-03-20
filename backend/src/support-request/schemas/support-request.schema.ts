import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SupportRequestDocument = SupportRequest & Document;

export type SupportRequestStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

@Schema({ timestamps: true })
export class SupportRequest {
  @Prop({ type: String, required: true })
  userId: string;

  @Prop({ type: String, enum: ['user', 'doctor'], default: 'user' })
  userRole: string;

  @Prop({
    type: String,
    enum: ['technical', 'billing', 'account', 'appointment', 'content', 'doctor', 'other'],
    required: true,
  })
  purpose: string;

  @Prop({ type: String, required: true, minlength: 10, maxlength: 1000 })
  description: string;

  @Prop({
    type: String,
    enum: ['open', 'in_progress', 'resolved', 'closed'],
    default: 'open',
  })
  status: SupportRequestStatus;

  @Prop({ type: String, default: null })
  adminNote: string | null;
}

export const SupportRequestSchema = SchemaFactory.createForClass(SupportRequest);

SupportRequestSchema.index({ userId: 1, createdAt: -1 });
SupportRequestSchema.index({ status: 1, createdAt: -1 });
