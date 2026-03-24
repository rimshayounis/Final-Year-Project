import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SubscriptionPlanDocument = SubscriptionPlanRecord & Document;

export type PlanName = 'free_trial' | 'basic' | 'professional' | 'premium';
export type PlanStatus = 'active' | 'expired' | 'cancelled';

// ── Plan pricing and duration config ─────────────────────────────────────────
export const PLAN_CONFIG: Record<PlanName, { pricePKR: number; durationDays: number; label: string }> = {
  free_trial:   { pricePKR: 0,    durationDays: 15, label: 'Free Trial'   },
  basic:        { pricePKR: 1500, durationDays: 30, label: 'Basic'        },
  professional: { pricePKR: 3500, durationDays: 30, label: 'Professional' },
  premium:      { pricePKR: 6000, durationDays: 30, label: 'Premium'      },
};

@Schema({ timestamps: true, collection: 'subscription_plans' })
export class SubscriptionPlanRecord {
  @Prop({ type: Types.ObjectId, ref: 'Doctor', required: true })
  doctorId: Types.ObjectId;

  @Prop({
    type: String,
    enum: ['free_trial', 'basic', 'professional', 'premium'],
    required: true,
  })
  plan: PlanName;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({
    type: String,
    enum: ['active', 'expired', 'cancelled'],
    default: 'active',
  })
  status: PlanStatus;

  @Prop({ default: 0 })
  pricePKR: number;

  // e.g. 'easypaisa' | 'jazzcash' | 'bank_transfer' | null
  @Prop({ default: null })
  paymentMethod: string;

  /** Reference to the Transaction record for this subscription payment */
  @Prop({ type: Types.ObjectId, ref: 'Transaction', default: null })
  transactionId: Types.ObjectId | null;

  @Prop({ default: null })
  cancelledAt: Date;

  @Prop({ default: null })
  cancelReason?: string;
}

export const SubscriptionPlanSchema = SchemaFactory.createForClass(SubscriptionPlanRecord);
SubscriptionPlanSchema.index({ doctorId: 1, status: 1 });
SubscriptionPlanSchema.index({ endDate: 1, status: 1 }); // for expiry checks
