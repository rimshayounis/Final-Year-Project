import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AdminWalletDocument = AdminWallet & Document;

@Schema({ timestamps: true, collection: 'admin_wallet' })
export class AdminWallet {
  @Prop({ default: 0 })
  totalBalance: number;

  @Prop({ default: 0 })
  totalEarned: number;

  @Prop({ default: 0 })
  totalCommission: number;

  @Prop({ default: 0 })
  heldBalance: number;

  @Prop({ default: 0 })
  totalTransactions: number;

  @Prop({ default: 'PKR' })
  currency: string;
}

export const AdminWalletSchema = SchemaFactory.createForClass(AdminWallet);
