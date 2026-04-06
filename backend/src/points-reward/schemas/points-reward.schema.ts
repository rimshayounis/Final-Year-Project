import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PointsRewardDocument = PointsReward & Document;

// ── Embedded: single point transaction ──────────────────────────────────────
export type TransactionType =
  | 'likes_1k'
  | 'likes_5k'
  | 'likes_10k'
  | 'likes_1k_reversed'
  | 'likes_5k_reversed'
  | 'likes_10k_reversed'
  | 'post_deleted'
  | 'booking_monthly'
  | 'trust_badge'
  | 'wallet_recalculated';

@Schema({ _id: false })
export class PointTransaction {
  @Prop({ required: true })
  type!: TransactionType;

  @Prop({ required: true })
  points!: number; // positive = earned

  @Prop({ required: true })
  description!: string;

  @Prop({ type: Types.ObjectId, default: null })
  postId?: Types.ObjectId;

  @Prop({ default: () => new Date() })
  createdAt!: Date;
}

// ── Embedded: which like milestones a post has already triggered ─────────────
// pointMilestones: '1k' | '5k' | '10k'
// trustMilestones: '1lac' | '2lac' | '5lac' | '10lac'
@Schema({ _id: false })
export class PostMilestone {
  @Prop({ type: Types.ObjectId, required: true })
  postId!: Types.ObjectId;

  @Prop({ type: [String], default: [] })
  pointMilestones!: string[]; // '1k', '5k', '10k'

  @Prop({ type: [String], default: [] })
  trustMilestones!: string[]; // '1lac', '2lac', '5lac', '10lac'
}

// ── Embedded: monthly booking tracking ──────────────────────────────────────
@Schema({ _id: false })
export class MonthlyBooking {
  @Prop({ required: true })
  yearMonth!: string; // '2024-03'

  @Prop({ default: 0 })
  completedCount!: number;

  @Prop({ default: false })
  rewarded!: boolean; // true after +200 pts awarded
}

// ── Embedded: monthly post verification slot tracking ────────────────────────
@Schema({ _id: false })
export class VerificationSlotMonth {
  @Prop({ required: true })
  yearMonth!: string; // '2026-03'

  @Prop({ default: 0 })
  baseSlots!: number; // 3 / 5 / 8 based on plan

  @Prop({ default: 0 })
  usedSlots!: number; // number of posts approved this month

  @Prop({ default: false })
  bonusGranted!: boolean; // true once 30-appt threshold hit

  @Prop({ default: 0 })
  bonusSlots!: number; // same as baseSlots when granted
}

// ── Main collection ──────────────────────────────────────────────────────────
export type TrustBadge = 'none' | 'bronze' | 'silver' | 'gold' | 'platinum';

@Schema({ timestamps: true, collection: 'points_rewards' })
export class PointsReward {
  @Prop({ type: Types.ObjectId, ref: 'Doctor', required: true, unique: true })
  doctorId!: Types.ObjectId;

  @Prop({ default: 0 })
  totalPoints!: number; // spendable balance

  @Prop({ default: 0 })
  lifetimePointsEarned!: number; // never decremented

  @Prop({ default: 0 })
  pointsSpent!: number; // total points converted to cash

  @Prop({ default: 'none' })
  trustBadge!: TrustBadge; // highest badge earned

  @Prop({ default: 0 })
  trustScore!: number; // number of 1-lac milestones crossed (across all posts)

  @Prop({ type: [PostMilestone], default: [] })
  postMilestones!: PostMilestone[];

  @Prop({ type: [MonthlyBooking], default: [] })
  monthlyBookings!: MonthlyBooking[];

  @Prop({ type: [VerificationSlotMonth], default: [] })
  verificationSlots!: VerificationSlotMonth[];

  @Prop({ type: [PointTransaction], default: [] })
  transactions!: PointTransaction[];
}

export const PointsRewardSchema = SchemaFactory.createForClass(PointsReward);
PointsRewardSchema.index({ doctorId: 1 }, { unique: true });
