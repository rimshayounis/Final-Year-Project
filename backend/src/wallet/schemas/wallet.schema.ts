import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WalletDocument = Wallet & Document;

export type WalletTxType =
  | 'points_converted'
  | 'appointment_earning'
  | 'withdrawal_requested'
  | 'withdrawal_completed'
  | 'withdrawal_rejected';
export type WithdrawalStatus = 'pending' | 'completed' | 'rejected';

@Schema({ _id: false })
export class WalletTransaction {
  @Prop({ required: true })
  type: WalletTxType;

  @Prop({ required: true })
  amount: number; // PKR

  @Prop({ default: 0 })
  pointsUsed: number; // only for points_converted

  @Prop({ required: true })
  description: string;

  @Prop({ type: String, default: null })
  status: WithdrawalStatus | null; // only for withdrawal entries

  @Prop({ default: () => new Date() })
  createdAt: Date;

  // ── Appointment earning fields (optional) ─────────────────────────────────
  @Prop({ type: String, default: null }) patientName?:     string | null;
  @Prop({ type: String, default: null }) doctorName?:      string | null;
  @Prop({ type: String, default: null }) sessionDate?:     string | null;
  @Prop({ type: String, default: null }) sessionTime?:     string | null;
  @Prop({ type: Number, default: null }) sessionDuration?: number | null;
  @Prop({ type: Number, default: null }) commissionRate?:  number | null;
  @Prop({ type: Number, default: null }) commissionAmount?: number | null;
  @Prop({ type: String, default: null }) appointmentId?:   string | null;
}

@Schema({ timestamps: true, collection: 'user_wallet' })
export class Wallet {
  @Prop({ type: Types.ObjectId, ref: 'Doctor', required: true, unique: true })
  doctorId: Types.ObjectId;

  @Prop({ default: 0 })
  balance: number; // PKR available balance

  @Prop({ default: 0 })
  totalEarned: number; // lifetime PKR earned via conversions

  @Prop({ default: 0 })
  totalWithdrawn: number; // lifetime PKR withdrawn

  @Prop({ type: [Object], default: [] })
  transactions: WalletTransaction[];
}

export const WalletSchema = SchemaFactory.createForClass(Wallet);
WalletSchema.index({ doctorId: 1 }, { unique: true });
