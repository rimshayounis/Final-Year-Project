import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WalletDocument = Wallet & Document;

export type WalletTxType =
  | 'points_converted'
  | 'appointment_earning'
  | 'withdrawal_requested'
  | 'withdrawal_completed'
  | 'withdrawal_rejected';

export type WithdrawalStatus = 'pending' | 'succeeded' | 'rejected';

@Schema({ timestamps: false })
export class WalletTransaction {
  @Prop({ required: true }) type!: WalletTxType;
  @Prop({ required: true }) amount!: number;
  @Prop({ default: 0 })    pointsUsed!: number;
  @Prop({ required: true }) description!: string;
  @Prop({ type: String, default: null }) status!: WithdrawalStatus | null;
  @Prop({ default: () => new Date() })   createdAt!: Date;
}

@Schema({ timestamps: true, collection: 'doctor_wallet' })
export class Wallet {
  @Prop({ type: Types.ObjectId, ref: 'Doctor', required: true, unique: true })
  doctorId!: Types.ObjectId;

  @Prop({ default: 0 }) balance!: number;
  @Prop({ default: 0 }) totalEarned!: number;
  @Prop({ default: 0 }) totalWithdrawn!: number;

  @Prop({ type: [Object], default: [] })
  transactions!: WalletTransaction[];
}

export const WalletSchema = SchemaFactory.createForClass(Wallet);
