import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PointsRewardDocument = PointsReward & Document;

@Schema({ timestamps: true, collection: 'points_rewards' })
export class PointsReward {
  @Prop({ type: Types.ObjectId, ref: 'Doctor', required: true, unique: true })
  doctorId!: Types.ObjectId;

  @Prop({ default: 0 }) totalPoints!: number;
  @Prop({ default: 0 }) lifetimePointsEarned!: number;
  @Prop({ default: 0 }) pointsSpent!: number;
  @Prop({ default: 'none' }) trustBadge!: string;
  @Prop({ default: 0 }) trustScore!: number;

  @Prop({ type: [Object], default: [] }) transactions!: any[];
}

export const PointsRewardSchema = SchemaFactory.createForClass(PointsReward);
