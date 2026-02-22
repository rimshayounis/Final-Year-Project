import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AppointmentAvailabilityDocument = AppointmentAvailability & Document;

@Schema({ _id: false })
export class TimeSlot {
  @Prop({ required: true })
  start: string; // HH:MM format

  @Prop({ required: true })
  end: string; // HH:MM format
}

export const TimeSlotSchema = SchemaFactory.createForClass(TimeSlot);

@Schema({ _id: false })
export class SpecificDate {
  @Prop({ required: true })
  date: string; // YYYY-MM-DD format

  @Prop({ type: [TimeSlotSchema], required: true })
  timeSlots: TimeSlot[];
}

export const SpecificDateSchema = SchemaFactory.createForClass(SpecificDate);

@Schema({ timestamps: true })
export class AppointmentAvailability {
  @Prop({ type: Types.ObjectId, ref: 'Doctor', required: true, unique: true })
  doctorId: Types.ObjectId;

  @Prop({ required: true, min: 15, max: 120 })
  sessionDuration: number; // in minutes

  @Prop({ required: true, min: 0 })
  consultationFee: number; // in PKR

  @Prop({ type: [SpecificDateSchema], required: true })
  specificDates: SpecificDate[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: Date.now })
  lastUpdated: Date;
}

export const AppointmentAvailabilitySchema = SchemaFactory.createForClass(AppointmentAvailability);

// Indexes for better query performance
AppointmentAvailabilitySchema.index({ doctorId: 1 });
AppointmentAvailabilitySchema.index({ 'specificDates.date': 1 });