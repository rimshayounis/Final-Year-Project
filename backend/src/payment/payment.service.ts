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
import {
  CreatePaymentIntentDto,
  ConfirmPaymentDto,
  CreateAppointmentPaymentDto,
  ConfirmAppointmentPaymentDto,
} from './dto/payment.dto';
import { SubscriptionPlanService } from '../subscription-plan/subscription-plan.service';
import {
  BookedAppointment,
  BookedAppointmentDocument,
} from '../booked-appointment/schemas/booked-appointment.schema';
import { Wallet, WalletDocument } from '../wallet/schemas/wallet.schema';
import { Doctor, DoctorDocument } from '../doctors/schemas/doctor.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

/** Subscription plan prices in PKR */
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

/**
 * Tiered commission rate based on appointment fee and doctor's plan.
 *
 * Fee range      | Basic | Professional (-2%) | Premium (-3%)
 * PKR  500 – 800 |  10%  |        8%          |      7%
 * PKR  801 –1200 |  15%  |       13%          |     12%
 * PKR 1201 –2000 |  20%  |       18%          |     17%
 */
function getCommissionRate(fee: number, plan: string): number {
  let base: number;

  if (fee >= 500 && fee <= 800)        base = 0.10;
  else if (fee >= 801 && fee <= 1200)  base = 0.15;
  else if (fee >= 1201 && fee <= 2000) base = 0.20;
  else if (fee < 500)                  base = 0.10; // below range → lowest tier
  else                                 base = 0.20; // above range → highest tier

  if (plan === 'professional') return +(base - 0.02).toFixed(4);
  if (plan === 'premium')      return +(base - 0.03).toFixed(4);
  return base; // basic or free_trial
}

@Injectable()
export class PaymentService {
  private stripe: Stripe;

  constructor(
    @InjectModel(AdminWallet.name)
    private adminWalletModel: Model<AdminWalletDocument>,
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
    @InjectModel(BookedAppointment.name)
    private appointmentModel: Model<BookedAppointmentDocument>,
    @InjectModel(Wallet.name)
    private walletModel: Model<WalletDocument>,
    @InjectModel(Doctor.name)
    private doctorModel: Model<DoctorDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
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

  // ── Get or create doctor wallet ───────────────────────────────────────────
  private async getDoctorWallet(doctorId: string): Promise<WalletDocument> {
    const existing = await this.walletModel
      .findOne({ doctorId: new Types.ObjectId(doctorId) })
      .exec();
    if (existing) return existing;
    return new this.walletModel({ doctorId: new Types.ObjectId(doctorId) }).save();
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  SUBSCRIPTION PAYMENT
  // ─────────────────────────────────────────────────────────────────────────

  async createPaymentIntent(dto: CreatePaymentIntentDto): Promise<any> {
    const { plan } = dto;
    const amount = PLAN_PRICES[plan];
    if (!amount) throw new BadRequestException(`Invalid plan: ${plan}`);

    try {
      const intent = await this.stripe.paymentIntents.create({
        amount: amount * 100,
        currency: 'pkr',
        payment_method_types: ['card'],
        metadata: { doctorId: dto.doctorId, plan, type: 'subscription' },
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
      throw new InternalServerErrorException(`Stripe error: ${err.message}`);
    }
  }

  async confirmPayment(dto: ConfirmPaymentDto): Promise<any> {
    const { doctorId, plan, paymentIntentId, doctorName } = dto;

    let intent: Stripe.PaymentIntent;
    try {
      intent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (err: any) {
      throw new BadRequestException(`Could not retrieve payment: ${err.message}`);
    }

    if (intent.status !== 'succeeded') {
      throw new BadRequestException(`Payment not completed. Status: ${intent.status}`);
    }

    const existing = await this.transactionModel
      .findOne({ stripePaymentIntentId: paymentIntentId })
      .exec();
    if (existing) return { alreadyProcessed: true, transactionId: existing._id };

    const amount = PLAN_PRICES[plan];

    const transaction = await this.transactionModel.create({
      type: 'subscription_payment',
      doctorId: new Types.ObjectId(doctorId),
      doctorName: doctorName ?? '',
      userId: null,
      appointmentId: null,
      plan,
      description: PLAN_LABELS[plan],
      amount,
      currency: 'PKR',
      stripePaymentIntentId: paymentIntentId,
      status: 'succeeded',
      paymentMethod: 'card',
    });

    const adminWallet = await this.getAdminWallet();
    adminWallet.totalBalance      = +(adminWallet.totalBalance + amount).toFixed(2);
    adminWallet.totalEarned       = +(adminWallet.totalEarned + amount).toFixed(2);
    adminWallet.totalTransactions += 1;
    await adminWallet.save();

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

  // ─────────────────────────────────────────────────────────────────────────
  //  APPOINTMENT PAYMENT
  // ─────────────────────────────────────────────────────────────────────────

  async createAppointmentPaymentIntent(dto: CreateAppointmentPaymentDto): Promise<any> {
    const { appointmentId } = dto;

    const appt = await this.appointmentModel
      .findById(appointmentId)
      .populate('doctorId', 'fullName')
      .exec();

    if (!appt) throw new NotFoundException('Appointment not found');
    if (appt.status !== 'confirmed') throw new BadRequestException('Appointment is not confirmed yet');
    if (appt.paymentStatus !== 'pending_payment') {
      throw new BadRequestException(`Payment already ${appt.paymentStatus}`);
    }

    const amount = appt.consultationFee;
    if (!amount || amount <= 0) throw new BadRequestException('Invalid consultation fee');

    try {
      const intent = await this.stripe.paymentIntents.create({
        amount: amount * 100,
        currency: 'pkr',
        payment_method_types: ['card'],
        metadata: {
          appointmentId,
          doctorId: appt.doctorId.toString(),
          type: 'appointment',
        },
        description: `Appointment with Dr. ${(appt.doctorId as any)?.fullName ?? ''} on ${appt.date}`,
      });

      return {
        clientSecret: intent.client_secret,
        paymentIntentId: intent.id,
        amount,
        currency: 'PKR',
        description: `Appointment on ${appt.date} at ${appt.time}`,
      };
    } catch (err: any) {
      throw new InternalServerErrorException(`Stripe error: ${err.message}`);
    }
  }

  async confirmAppointmentPayment(dto: ConfirmAppointmentPaymentDto): Promise<any> {
    const { appointmentId, paymentIntentId, userId } = dto;

    let intent: Stripe.PaymentIntent;
    try {
      intent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (err: any) {
      throw new BadRequestException(`Could not retrieve payment: ${err.message}`);
    }

    if (intent.status !== 'succeeded') {
      throw new BadRequestException(`Payment not completed. Status: ${intent.status}`);
    }

    // Prevent double processing
    const dupTx = await this.transactionModel
      .findOne({ stripePaymentIntentId: paymentIntentId })
      .exec();
    if (dupTx) return { alreadyProcessed: true, transactionId: dupTx._id };

    const appt = await this.appointmentModel.findById(appointmentId).exec();
    if (!appt) throw new NotFoundException('Appointment not found');

    const amount = appt.consultationFee;

    // Record payment held transaction
    await this.transactionModel.create({
      type: 'appointment_payment',
      doctorId: appt.doctorId,
      doctorName: '',
      userId: userId ? new Types.ObjectId(userId) : null,
      appointmentId: new Types.ObjectId(appointmentId),
      plan: null,
      description: `Appointment payment held — ${appt.date} at ${appt.time}`,
      amount,
      currency: 'PKR',
      stripePaymentIntentId: paymentIntentId,
      status: 'succeeded',
      paymentMethod: 'card',
    });

    // Hold in admin wallet
    const adminWallet = await this.getAdminWallet();
    adminWallet.totalBalance      = +(adminWallet.totalBalance + amount).toFixed(2);
    adminWallet.totalEarned       = +(adminWallet.totalEarned + amount).toFixed(2);
    adminWallet.totalTransactions += 1;
    await adminWallet.save();

    // Mark payment as held on appointment
    appt.paymentStatus   = 'payment_held';
    appt.paymentIntentId = paymentIntentId;
    appt.heldAmount      = amount;
    await appt.save();

    return {
      success: true,
      appointmentId,
      amountHeld: amount,
      message: 'Payment held. Will be released to doctor after session completes.',
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  RELEASE PAYMENT TO DOCTOR (called by scheduler after session ends)
  // ─────────────────────────────────────────────────────────────────────────

  async releaseAppointmentPayment(appointmentId: string): Promise<void> {
    const appt = await this.appointmentModel.findById(appointmentId).exec();
    if (!appt || appt.paymentStatus !== 'payment_held') return;

    const doctorId = appt.doctorId.toString();

    const [doctor, patient] = await Promise.all([
      this.doctorModel.findById(doctorId).select('subscriptionPlan fullName').exec(),
      this.userModel.findById(appt.userId.toString()).select('fullName').exec(),
    ]);

    const plan           = (doctor as any)?.subscriptionPlan ?? 'free_trial';
    const heldAmount     = appt.heldAmount;
    const commissionRate = getCommissionRate(heldAmount, plan);
    const commissionAmt  = +(heldAmount * commissionRate).toFixed(2);
    const doctorEarning  = +(heldAmount - commissionAmt).toFixed(2);
    const patientName    = (patient as any)?.fullName ?? 'Patient';
    const doctorFullName = (doctor as any)?.fullName ?? '';

    // Transfer to doctor wallet
    const doctorWallet = await this.getDoctorWallet(doctorId);
    doctorWallet.balance     = +(doctorWallet.balance + doctorEarning).toFixed(2);
    doctorWallet.totalEarned = +(doctorWallet.totalEarned + doctorEarning).toFixed(2);
    doctorWallet.transactions.push({
      type: 'appointment_earning',
      amount: doctorEarning,
      pointsUsed: 0,
      description: `Appointment fee — ${patientName} · ${appt.date}`,
      status: null,
      createdAt: new Date(),
      patientName,
      doctorName:      doctorFullName,
      sessionDate:     appt.date,
      sessionTime:     appt.time,
      sessionDuration: appt.sessionDuration,
      commissionRate,
      commissionAmount: commissionAmt,
      appointmentId:   appointmentId,
    } as any);
    doctorWallet.markModified('transactions');
    await doctorWallet.save();

    // Update admin wallet — deduct doctor's share, keep commission
    const adminWallet = await this.getAdminWallet();
    adminWallet.totalBalance    = +(adminWallet.totalBalance - doctorEarning).toFixed(2);
    adminWallet.totalCommission = +(adminWallet.totalCommission + commissionAmt).toFixed(2);
    await adminWallet.save();

    // Record release transaction
    await this.transactionModel.create({
      type: 'appointment_release',
      doctorId: new Types.ObjectId(doctorId),
      doctorName: doctorFullName,
      userId: appt.userId,
      appointmentId: new Types.ObjectId(appointmentId),
      plan: null,
      description: `Payment released to Dr. ${doctorFullName} — PKR ${doctorEarning}`,
      amount: doctorEarning,
      commissionRate,
      commissionAmount: commissionAmt,
      currency: 'PKR',
      stripePaymentIntentId: appt.paymentIntentId,
      status: 'succeeded',
      paymentMethod: 'card',
    });

    // Record commission transaction
    await this.transactionModel.create({
      type: 'appointment_commission',
      doctorId: new Types.ObjectId(doctorId),
      doctorName: doctorFullName,
      userId: appt.userId,
      appointmentId: new Types.ObjectId(appointmentId),
      plan: null,
      description: `Commission (${Math.round(commissionRate * 100)}%) from appointment — PKR ${commissionAmt}`,
      amount: commissionAmt,
      commissionRate,
      commissionAmount: commissionAmt,
      currency: 'PKR',
      stripePaymentIntentId: appt.paymentIntentId,
      status: 'succeeded',
      paymentMethod: 'card',
    });

    // Update appointment
    appt.paymentStatus    = 'released';
    appt.doctorEarning    = doctorEarning;
    appt.commissionAmount = commissionAmt;
    appt.commissionRate   = commissionRate;
    await appt.save();
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  ADMIN ENDPOINTS
  // ─────────────────────────────────────────────────────────────────────────

  async getAdminWalletSummary(): Promise<any> {
    const wallet = await this.getAdminWallet();
    return {
      totalBalance:      wallet.totalBalance,
      totalEarned:       wallet.totalEarned,
      totalCommission:   wallet.totalCommission,
      totalTransactions: wallet.totalTransactions,
      currency:          wallet.currency,
    };
  }

  async getAllTransactions(): Promise<any> {
    return this.transactionModel.find().sort({ createdAt: -1 }).exec();
  }
}
