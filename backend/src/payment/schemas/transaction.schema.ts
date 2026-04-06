import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TransactionDocument = Transaction & Document;

@Schema({ timestamps: true, collection: 'transactions' })
export class Transaction {
  /**
   * Type of transaction:
   *  - subscription_payment  → doctor buys a plan
   *  - appointment_payment   → user pays for appointment (held by admin)
   *  - appointment_release   → admin releases held payment to doctor wallet
   *  - appointment_commission→ commission portion kept by admin
   */
  @Prop({
    required: true,
    enum: ['subscription_payment', 'appointment_payment', 'appointment_release', 'appointment_commission', 'withdrawal_fee'],
    default: 'subscription_payment',
  })
  type!: string;

  /** Doctor involved in the transaction */
  @Prop({ type: Types.ObjectId, ref: 'Doctor', required: true })
  doctorId!: Types.ObjectId;

  /** Doctor's full name (snapshot) */
  @Prop({ default: '' })
  doctorName!: string;

  /** User who made the appointment payment (null for subscription) */
  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  userId!: Types.ObjectId | null;

  /** Appointment reference (null for subscription) */
  @Prop({ type: Types.ObjectId, ref: 'BookedAppointment', default: null })
  appointmentId!: Types.ObjectId | null;

  /** Subscription plan purchased (only for subscription_payment) */
  @Prop({ type: String, default: null })
  plan!: string | null;

  /** Human-readable description */
  @Prop({ required: true })
  description!: string;

  /** Amount in PKR */
  @Prop({ required: true })
  amount!: number;

  /** Commission rate applied (for release/commission types) */
  @Prop({ default: 0 })
  commissionRate!: number;

  /** Commission amount in PKR */
  @Prop({ default: 0 })
  commissionAmount!: number;

  /** Currency code */
  @Prop({ default: 'PKR' })
  currency!: string;

  /** Stripe PaymentIntent ID */
  @Prop({ type: String, default: null })
  stripePaymentIntentId!: string | null;

  /** Payment status */
  @Prop({ default: 'succeeded', enum: ['succeeded', 'pending', 'failed'] })
  status!: string;

  /** Payment method type */
  @Prop({ default: 'card' })
  paymentMethod!: string;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
