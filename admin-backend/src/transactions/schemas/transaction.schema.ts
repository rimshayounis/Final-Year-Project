import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TransactionDocument = Transaction & Document;

@Schema({ timestamps: true, collection: 'transactions' })
export class Transaction {
  @Prop({ required: true })
  type: string;

  @Prop({ type: Types.ObjectId, ref: 'Doctor', required: true })
  doctorId: Types.ObjectId;

  @Prop({ default: '' })
  doctorName: string;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  userId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'BookedAppointment', default: null })
  appointmentId: Types.ObjectId | null;

  @Prop({ type: String, default: null })
  plan: string | null;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ default: 0 })
  commissionRate: number;

  @Prop({ default: 0 })
  commissionAmount: number;

  @Prop({ default: 'PKR' })
  currency: string;

  @Prop({ type: String, default: null })
  stripePaymentIntentId: string | null;

  @Prop({ default: 'succeeded' })
  status: string;

  @Prop({ default: 'card' })
  paymentMethod: string;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
