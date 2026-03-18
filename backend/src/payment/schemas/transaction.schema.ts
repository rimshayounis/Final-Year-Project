import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TransactionDocument = Transaction & Document;

@Schema({ timestamps: true, collection: 'transactions' })
export class Transaction {
  /** Doctor who made the payment */
  @Prop({ type: Types.ObjectId, ref: 'Doctor', required: true })
  doctorId: Types.ObjectId;

  /** Doctor's full name (snapshot at time of payment) */
  @Prop({ required: true })
  doctorName: string;

  /** Subscription plan purchased */
  @Prop({ required: true, enum: ['basic', 'professional', 'premium'] })
  plan: string;

  /** Payment description, e.g. "Basic Plan - 1 Month" */
  @Prop({ required: true })
  description: string;

  /** Amount in PKR */
  @Prop({ required: true })
  amount: number;

  /** Currency code */
  @Prop({ default: 'PKR' })
  currency: string;

  /** Stripe PaymentIntent ID (pi_xxx) */
  @Prop({ required: true })
  stripePaymentIntentId: string;

  /** Payment status from Stripe */
  @Prop({ default: 'succeeded', enum: ['succeeded', 'pending', 'failed'] })
  status: string;

  /** Payment method type e.g. "card" */
  @Prop({ default: 'card' })
  paymentMethod: string;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
