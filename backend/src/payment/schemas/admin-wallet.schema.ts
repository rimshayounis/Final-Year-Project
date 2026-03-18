import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AdminWalletDocument = AdminWallet & Document;

@Schema({ timestamps: true, collection: 'admin_wallet' })
export class AdminWallet {
  /** Running total of all successful payments received */
  @Prop({ default: 0 })
  totalBalance: number;

  /** Cumulative earnings (never decreases) */
  @Prop({ default: 0 })
  totalEarned: number;

  /** Total number of successful transactions */
  @Prop({ default: 0 })
  totalTransactions: number;

  /** Currency code */
  @Prop({ default: 'PKR' })
  currency: string;
}

export const AdminWalletSchema = SchemaFactory.createForClass(AdminWallet);
