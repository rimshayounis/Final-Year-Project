import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  SubscriptionPlanRecord,
  SubscriptionPlanDocument,
  PlanName,
  PLAN_CONFIG,
} from './schemas/subscription-plan.schema';
import { CreateSubscriptionDto, CancelSubscriptionDto } from './dto/subscription-plan.dto';
import { Doctor, DoctorDocument, SubscriptionPlan } from '../doctors/schemas/doctor.schema';
import { PointsRewardService } from '../points-reward/points-reward.service';

@Injectable()
export class SubscriptionPlanService {
  constructor(
    @InjectModel(SubscriptionPlanRecord.name)
    private subscriptionModel: Model<SubscriptionPlanDocument>,
    @InjectModel(Doctor.name)
    private doctorModel: Model<DoctorDocument>,
    private readonly pointsRewardService: PointsRewardService,
  ) {}

  // ── Create / activate a new subscription ─────────────────────────────────
  async createSubscription(dto: CreateSubscriptionDto): Promise<any> {
    const plan = dto.plan as PlanName;
    const config = PLAN_CONFIG[plan];

    if (!config) {
      throw new BadRequestException(`Unknown plan: ${plan}`);
    }

    // Cancel any currently active subscription for this doctor
    await this.subscriptionModel.updateMany(
      {
        doctorId: new Types.ObjectId(dto.doctorId),
        status: 'active',
      },
      {
        $set: {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelReason: 'Replaced by new subscription',
        },
      },
    );

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + config.durationDays);

    const subscription = new this.subscriptionModel({
      doctorId: new Types.ObjectId(dto.doctorId),
      plan,
      startDate,
      endDate,
      status: 'active',
      pricePKR: config.pricePKR,
      paymentMethod: dto.paymentMethod ?? null,
      transactionId: dto.transactionId ? new Types.ObjectId(dto.transactionId) : null,
    });

    const saved = await subscription.save();

    // Sync subscriptionPlan field on Doctor document
    await this.doctorModel.findByIdAndUpdate(dto.doctorId, {
      subscriptionPlan: plan,
    });

    // Reset verification slot credits for this month to match the new plan
    await this.pointsRewardService.resetSlotsOnPlanChange(dto.doctorId, plan as SubscriptionPlan);

    return {
      success: true,
      message: `${config.label} plan activated successfully`,
      data: saved,
    };
  }

  // ── Get active subscription for a doctor ──────────────────────────────────
  async getActiveSubscription(doctorId: string): Promise<any> {
    const sub = await this.subscriptionModel
      .findOne({
        doctorId: new Types.ObjectId(doctorId),
        status: 'active',
      })
      .sort({ startDate: -1 })
      .exec();

    // Auto-expire if past endDate
    if (sub && new Date() > sub.endDate) {
      sub.status = 'expired';
      await sub.save();

      // Reset doctor plan to free_trial on expiry
      await this.doctorModel.findByIdAndUpdate(doctorId, {
        subscriptionPlan: 'free_trial',
      });

      return {
        success: true,
        data: null,
        message: 'Subscription has expired',
      };
    }

    return {
      success: true,
      data: sub ?? null,
    };
  }

  // ── Get full subscription history for a doctor ────────────────────────────
  async getSubscriptionHistory(doctorId: string): Promise<any> {
    const history = await this.subscriptionModel
      .find({ doctorId: new Types.ObjectId(doctorId) })
      .sort({ startDate: -1 })
      .exec();

    return {
      success: true,
      count: history.length,
      data: history,
    };
  }

  // ── Cancel active subscription ────────────────────────────────────────────
  async cancelSubscription(
    doctorId: string,
    dto: CancelSubscriptionDto,
  ): Promise<any> {
    const sub = await this.subscriptionModel.findOne({
      doctorId: new Types.ObjectId(doctorId),
      status: 'active',
    });

    if (!sub) {
      throw new NotFoundException('No active subscription found for this doctor');
    }

    sub.status = 'cancelled';
    sub.cancelledAt = new Date();
    sub.cancelReason = dto.cancelReason ?? undefined;
    await sub.save();

    // Reset doctor plan to free_trial
    await this.doctorModel.findByIdAndUpdate(doctorId, {
      subscriptionPlan: 'free_trial',
    });

    return {
      success: true,
      message: 'Subscription cancelled',
      data: sub,
    };
  }

  // ── Get plan pricing info (for display in app) ────────────────────────────
  getPlanDetails(): any {
    return {
      success: true,
      data: Object.entries(PLAN_CONFIG).map(([key, config]) => ({
        plan: key,
        ...config,
      })),
    };
  }

  // ── Mark expired subscriptions (can be called by a cron job) ─────────────
  async expireOverdueSubscriptions(): Promise<any> {
    const now = new Date();

    const expired = await this.subscriptionModel
      .find({ status: 'active', endDate: { $lt: now } })
      .exec();

    for (const sub of expired) {
      sub.status = 'expired';
      await sub.save();

      await this.doctorModel.findByIdAndUpdate(sub.doctorId.toString(), {
        subscriptionPlan: 'free_trial',
      });
    }

    return {
      success: true,
      expiredCount: expired.length,
    };
  }
}
