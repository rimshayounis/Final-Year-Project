import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BookedAppointmentDocument = BookedAppointment & Document;

export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

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
  cancelledAt: Date | null;

  @Prop({ type: String, default: null })
  cancelReason: string | null;
}

export const BookedAppointmentSchema = SchemaFactory.createForClass(BookedAppointment);

// Indexes for common queries
BookedAppointmentSchema.index({ userId: 1, date: -1 });
BookedAppointmentSchema.index({ doctorId: 1, date: -1 });
BookedAppointmentSchema.index({ doctorId: 1, date: 1, time: 1 }, { unique: true }); // prevent double booking