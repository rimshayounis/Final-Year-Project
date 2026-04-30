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
import { Transaction, TransactionDocument } from '../payment/schemas/transaction.schema';
import { PointsRewardService } from '../points-reward/points-reward.service';

@Injectable()
export class SubscriptionPlanService {
  constructor(
    @InjectModel(SubscriptionPlanRecord.name)
    private subscriptionModel: Model<SubscriptionPlanDocument>,
    @InjectModel(Doctor.name)
    private doctorModel: Model<DoctorDocument>,
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
    private readonly pointsRewardService: PointsRewardService,
  ) {}

  // ── Create / activate a new subscription ─────────────────────────────────
  async createSubscription(dto: CreateSubscriptionDto): Promise<any> {
    const plan = dto.plan as PlanName;
    const config = PLAN_CONFIG[plan];

    if (!config) {
      throw new BadRequestException(`Unknown plan: ${plan}`);
    }

    // ❌ PREVENT: Can't re-use free trial
    if (plan === 'free_trial') {
      const previousTrial = await this.subscriptionModel.findOne({
        doctorId: new Types.ObjectId(dto.doctorId),
        plan: 'free_trial',
        status: { $in: ['expired', 'cancelled'] },
      });

      if (previousTrial) {
        throw new BadRequestException(
          'Free trial can only be used once. Please purchase a paid plan (Basic, Professional, or Premium).',
        );
      }
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
      .lean()
      .exec();

    // Attach stripePaymentIntentId from linked Transaction
    const enriched = await Promise.all(
      history.map(async (sub) => {
        let stripePaymentIntentId: string | null = null;
        if (sub.transactionId) {
          const tx = await this.transactionModel
            .findById(sub.transactionId)
            .select('stripePaymentIntentId')
            .lean()
            .exec();
          stripePaymentIntentId = tx?.stripePaymentIntentId ?? null;
        }
        return { ...sub, stripePaymentIntentId };
      }),
    );

    return {
      success: true,
      count: enriched.length,
      data: enriched,
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

  // ── Check if free trial was already used by doctor ───────────────────────
  async hasUsedFreeTrial(doctorId: string): Promise<boolean> {
    const usedTrial = await this.subscriptionModel.findOne({
      doctorId: new Types.ObjectId(doctorId),
      plan: 'free_trial',
      status: { $in: ['expired', 'cancelled'] },
    });

    return !!usedTrial;
  }

  // ── Check subscription status for login ────────────────────────────────────
  async checkSubscriptionStatusForLogin(doctorId: string): Promise<{
    isExpired: boolean;
    plan?: string;
    endDate?: Date;
  }> {
    const now = new Date();
    const doctorObjectId = new Types.ObjectId(doctorId);

    // Step 1: Check for active subscription that hasn't expired YET
    const validSub = await this.subscriptionModel.findOne({
      doctorId: doctorObjectId,
      status: 'active',
      endDate: { $gte: now },
    });

    if (validSub) {
      console.log(`[SubscriptionService] Doctor ${doctorId} has valid active subscription`);
      return { isExpired: false };
    }

    // Step 2: Check for active subscription with PAST endDate (needs to be marked expired)
    const expiredActiveSub = await this.subscriptionModel.findOne({
      doctorId: doctorObjectId,
      status: 'active',
      endDate: { $lt: now },
    });

    if (expiredActiveSub) {
      console.log(`[SubscriptionService] Found expired active subscription, marking as expired...`);
      
      // Mark as expired in database
      expiredActiveSub.status = 'expired';
      await expiredActiveSub.save();

      // Update doctor plan back to free_trial
      await this.doctorModel.findByIdAndUpdate(doctorId, {
        subscriptionPlan: 'free_trial',
      });

      console.log(`[SubscriptionService] Subscription marked as expired for doctor ${doctorId}`);

      return {
        isExpired: true,
        plan: expiredActiveSub.plan,
        endDate: expiredActiveSub.endDate,
      };
    }

    // Step 3: Check for already expired subscription
    const alreadyExpiredSub = await this.subscriptionModel.findOne({
      doctorId: doctorObjectId,
      status: 'expired',
    }).sort({ endDate: -1 });

    if (alreadyExpiredSub) {
      console.log(`[SubscriptionService] Doctor ${doctorId} has already expired subscription`);
      return {
        isExpired: true,
        plan: alreadyExpiredSub.plan,
        endDate: alreadyExpiredSub.endDate,
      };
    }

    console.log(`[SubscriptionService] No subscription found for doctor ${doctorId}`);
    return { isExpired: false };
  }
}
