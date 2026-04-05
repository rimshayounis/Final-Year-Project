import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BookedAppointmentDocument = BookedAppointment & Document;

export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';
export type PaymentStatus = 'not_required' | 'pending_payment' | 'payment_held' | 'released' | 'refunded';

@Schema({ timestamps: true })
export class BookedAppointment {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Doctor', required: true })
  doctorId: Types.ObjectId;

  @Prop({ required: true })
  date: string; // YYYY-MM-DD

  @Prop({ required: true })
  time: string; // HH:MM (24h)

  @Prop({ required: true, min: 15, max: 120 })
  sessionDuration: number; // minutes

  @Prop({ required: true, min: 0 })
  consultationFee: number; // PKR

  @Prop({ required: true })
  healthConcern: string;

  @Prop({
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    
    default: 'pending',
  })
  status: AppointmentStatus;

  @Prop({ type: Date, default: null })
  confirmedAt: Date | null;

  @Prop({ type: Date, default: null })
  cancelledAt: Date | null;

  @Prop({ type: String, default: null })
  cancelReason: string | null;

  @Prop({ type: Date, default: null })
  completedAt: Date | null;

  // ── Payment fields ────────────────────────────────────────────────────────
  @Prop({
    type: String,
    enum: ['not_required', 'pending_payment', 'payment_held', 'released', 'refunded'],
    default: 'not_required',
  })
  paymentStatus: PaymentStatus;

  @Prop({ type: String, default: null })
  paymentIntentId: string | null;

  /** Full amount paid by user and held by admin */
  @Prop({ type: Number, default: 0 })
  heldAmount: number;

  /** Amount to be released to doctor (after commission) */
  @Prop({ type: Number, default: 0 })
  doctorEarning: number;

  /** Commission amount kept by admin */
  @Prop({ type: Number, default: 0 })
  commissionAmount: number;

  /** Commission rate applied (e.g. 0.20 = 20%) */
  @Prop({ type: Number, default: 0 })
  commissionRate: number;

  /** True once the user has submitted feedback for this completed appointment */
  @Prop({ type: Boolean, default: false })
  hasFeedback: boolean;
}

export const BookedAppointmentSchema = SchemaFactory.createForClass(BookedAppointment);

BookedAppointmentSchema.index({ userId: 1, date: -1 });
BookedAppointmentSchema.index({ doctorId: 1, date: -1 });
BookedAppointmentSchema.index({ doctorId: 1, date: 1, time: 1 });
