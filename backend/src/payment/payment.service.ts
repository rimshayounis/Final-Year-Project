import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import Stripe from 'stripe';
import { AdminWallet, AdminWalletDocument } from './schemas/admin-wallet.schema';
import { Transaction, TransactionDocument } from './schemas/transaction.schema';
import { CreatePaymentIntentDto, ConfirmPaymentDto } from './dto/payment.dto';
import { SubscriptionPlanService } from '../subscription-plan/subscription-plan.service';

/** Plan prices in PKR */
const PLAN_PRICES: Record<string, number> = {
  basic:        1500,
  professional: 3500,
  premium:      6000,
};

const PLAN_LABELS: Record<string, string> = {
  basic:        'Basic Plan — 1 Month',
  professional: 'Professional Plan — 1 Month',
  premium:      'Premium Plan — 1 Month',
};

@Injectable()
export class PaymentService {
  private stripe: Stripe;

  constructor(
    @InjectModel(AdminWallet.name)
    private adminWalletModel: Model<AdminWalletDocument>,
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
    private subscriptionPlanService: SubscriptionPlanService,
  ) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-02-25.clover',
    });
  }

  // ── Get or create the single admin wallet doc ─────────────────────────────
  private async getAdminWallet(): Promise<AdminWalletDocument> {
    const existing = await this.adminWalletModel.findOne().exec();
    if (existing) return existing;
    return new this.adminWalletModel({}).save();
  }

  // ── Step 1: Create PaymentIntent → return clientSecret to frontend ─────────
  async createPaymentIntent(dto: CreatePaymentIntentDto): Promise<any> {
    const { plan } = dto;
    const amount = PLAN_PRICES[plan];

    if (!amount) {
      throw new BadRequestException(`Invalid plan: ${plan}`);
    }

    try {
      // Stripe amount in smallest unit. PKR uses paisas (1 PKR = 100 paisas)
      const intent = await this.stripe.paymentIntents.create({
        amount: amount * 100, // paisas
        currency: 'pkr',
        payment_method_types: ['card'],
        metadata: {
          doctorId: dto.doctorId,
          plan,
        },
        description: PLAN_LABELS[plan],
      });

      return {
        clientSecret: intent.client_secret,
        paymentIntentId: intent.id,
        amount,
        currency: 'PKR',
        plan,
        description: PLAN_LABELS[plan],
      };
    } catch (err: any) {
      throw new InternalServerErrorException(
        `Stripe error: ${err.message}`,
      );
    }
  }

  // ── Step 2: Confirm payment, activate subscription, record transaction ──────
  async confirmPayment(dto: ConfirmPaymentDto): Promise<any> {
    const { doctorId, plan, paymentIntentId, doctorName } = dto;

    // Verify the PaymentIntent with Stripe
    let intent: Stripe.PaymentIntent;
    try {
      intent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (err: any) {
      throw new BadRequestException(`Could not retrieve payment: ${err.message}`);
    }

    if (intent.status !== 'succeeded') {
      throw new BadRequestException(
        `Payment not completed. Status: ${intent.status}`,
      );
    }

    // Prevent double-recording the same intent
    const existing = await this.transactionModel
      .findOne({ stripePaymentIntentId: paymentIntentId })
      .exec();
    if (existing) {
      // Already processed — just make sure subscription is active
      return { alreadyProcessed: true, transactionId: existing._id };
    }

    const amount = PLAN_PRICES[plan];

    // Record transaction
    const transaction = await this.transactionModel.create({
      doctorId: new Types.ObjectId(doctorId),
      doctorName,
      plan,
      description: PLAN_LABELS[plan],
      amount,
      currency: 'PKR',
      stripePaymentIntentId: paymentIntentId,
      status: 'succeeded',
      paymentMethod: 'card',
    });

    // Update admin wallet
    const adminWallet = await this.getAdminWallet();
    adminWallet.totalBalance     = +(adminWallet.totalBalance + amount).toFixed(2);
    adminWallet.totalEarned      = +(adminWallet.totalEarned  + amount).toFixed(2);
    adminWallet.totalTransactions += 1;
    await adminWallet.save();

    // Activate subscription via existing service
    await this.subscriptionPlanService.createSubscription({
      doctorId,
      plan,
      paymentMethod: 'card',
      transactionId: transaction._id.toString(),
    });

    return {
      success: true,
      transactionId: transaction._id,
      plan,
      amount,
      description: PLAN_LABELS[plan],
    };
  }

  // ── Admin: get wallet summary ─────────────────────────────────────────────
  async getAdminWalletSummary(): Promise<any> {
    const wallet = await this.getAdminWallet();
    return {
      totalBalance: wallet.totalBalance,
      totalEarned: wallet.totalEarned,
      totalTransactions: wallet.totalTransactions,
      currency: wallet.currency,
    };
  }

  // ── Admin: get all transactions ───────────────────────────────────────────
  async getAllTransactions(): Promise<any> {
    return this.transactionModel
      .find()
      .sort({ createdAt: -1 })
      .exec();
  }
}
