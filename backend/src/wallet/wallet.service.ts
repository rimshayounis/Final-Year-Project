import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Wallet, WalletDocument } from './schemas/wallet.schema';
import { ConvertPointsDto, WithdrawDto } from './dto/wallet.dto';
import { PointsReward, PointsRewardDocument } from '../points-reward/schemas/points-reward.schema';
import { Doctor, DoctorDocument } from '../doctors/schemas/doctor.schema';

const PKR_PER_POINT = 0.1;
const MIN_WITHDRAWAL = 500;
const MAX_PER_TRANSACTION = 5000;

const MONTHLY_LIMIT: Record<string, number> = {
  free_trial:   0,
  basic:        5_000,
  professional: 10_000,
  premium:      Infinity,
};

@Injectable()
export class WalletService {
  constructor(
    @InjectModel(Wallet.name)
    private walletModel: Model<WalletDocument>,
    @InjectModel(PointsReward.name)
    private pointsRewardModel: Model<PointsRewardDocument>,
    @InjectModel(Doctor.name)
    private doctorModel: Model<DoctorDocument>,
  ) {}

  // ── Get or create wallet ──────────────────────────────────────────────────
  async getOrCreateWallet(doctorId: string): Promise<WalletDocument> {
    const existing = await this.walletModel
      .findOne({ doctorId: new Types.ObjectId(doctorId) })
      .exec();
    if (existing) return existing;
    return new this.walletModel({ doctorId: new Types.ObjectId(doctorId) }).save();
  }

  // ── Get current month's total withdrawn from transactions ─────────────────
  private _monthlyWithdrawn(wallet: WalletDocument): number {
    const yearMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
    return wallet.transactions
      .filter(
        (t) =>
          t.type === 'withdrawal_requested' &&
          t.createdAt.toISOString().slice(0, 7) === yearMonth,
      )
      .reduce((sum, t) => sum + t.amount, 0);
  }

  // ── Get wallet info ───────────────────────────────────────────────────────
  async getWallet(doctorId: string): Promise<any> {
    const wallet = await this.getOrCreateWallet(doctorId);

    const [pointsDoc, doctor] = await Promise.all([
      this.pointsRewardModel
        .findOne({ doctorId: new Types.ObjectId(doctorId) })
        .select('totalPoints')
        .exec(),
      this.doctorModel
        .findById(doctorId)
        .select('subscriptionPlan')
        .exec(),
    ]);

    const plan = (doctor as any)?.subscriptionPlan ?? 'free_trial';
    const monthlyLimit = MONTHLY_LIMIT[plan] ?? 0;
    const monthlyUsed = this._monthlyWithdrawn(wallet);
    const monthlyRemaining = monthlyLimit === Infinity ? null : Math.max(0, monthlyLimit - monthlyUsed);

    return {
      balance: wallet.balance,
      totalEarned: wallet.totalEarned,
      totalWithdrawn: wallet.totalWithdrawn,
      availablePoints: pointsDoc?.totalPoints ?? 0,
      plan,
      limits: {
        minWithdrawal: MIN_WITHDRAWAL,
        maxPerTransaction: MAX_PER_TRANSACTION,
        monthlyLimit: monthlyLimit === Infinity ? null : monthlyLimit,
        monthlyUsed: +monthlyUsed.toFixed(2),
        monthlyRemaining,
      },
      transactions: wallet.transactions
        .slice()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    };
  }

  // ── Convert points → PKR ──────────────────────────────────────────────────
  async convertPoints(dto: ConvertPointsDto): Promise<any> {
    const { doctorId, points } = dto;

    const pointsDoc = await this.pointsRewardModel
      .findOne({ doctorId: new Types.ObjectId(doctorId) })
      .exec();

    if (!pointsDoc) throw new NotFoundException('Points wallet not found');

    if (pointsDoc.totalPoints < points) {
      throw new BadRequestException(
        `Insufficient points. You have ${pointsDoc.totalPoints} points.`,
      );
    }

    const pkrAmount = +(points * PKR_PER_POINT).toFixed(2);

    pointsDoc.totalPoints -= points;
    await pointsDoc.save();

    const wallet = await this.getOrCreateWallet(doctorId);
    wallet.balance = +(wallet.balance + pkrAmount).toFixed(2);
    wallet.totalEarned = +(wallet.totalEarned + pkrAmount).toFixed(2);
    wallet.transactions.push({
      type: 'points_converted',
      amount: pkrAmount,
      pointsUsed: points,
      description: `${points} points converted → PKR ${pkrAmount}`,
      status: null,
      createdAt: new Date(),
    });

    wallet.markModified('transactions');
    await wallet.save();

    return {
      pointsConverted: points,
      pkrAdded: pkrAmount,
      newBalance: wallet.balance,
      remainingPoints: pointsDoc.totalPoints,
    };
  }

  // ── Request withdrawal ────────────────────────────────────────────────────
  async requestWithdrawal(dto: WithdrawDto): Promise<any> {
    const { doctorId, amount } = dto;

    // Get doctor's plan
    const doctor = await this.doctorModel
      .findById(doctorId)
      .select('subscriptionPlan')
      .exec();

    const plan = (doctor as any)?.subscriptionPlan ?? 'free_trial';

    // Block free trial
    if (plan === 'free_trial') {
      throw new ForbiddenException(
        'Withdrawal is not available on the Free Trial plan. Please upgrade your subscription.',
      );
    }

    // Min check
    if (amount < MIN_WITHDRAWAL) {
      throw new BadRequestException(
        `Minimum withdrawal amount is PKR ${MIN_WITHDRAWAL}.`,
      );
    }

    // Per-transaction max check
    if (amount > MAX_PER_TRANSACTION) {
      throw new BadRequestException(
        `Maximum withdrawal per transaction is PKR ${MAX_PER_TRANSACTION}.`,
      );
    }

    const wallet = await this.getOrCreateWallet(doctorId);

    // Balance check
    if (wallet.balance < amount) {
      throw new BadRequestException(
        `Insufficient balance. Your balance is PKR ${wallet.balance.toFixed(2)}.`,
      );
    }

    // Monthly limit check
    const monthlyLimit = MONTHLY_LIMIT[plan];
    if (monthlyLimit !== Infinity) {
      const monthlyUsed = this._monthlyWithdrawn(wallet);
      if (monthlyUsed + amount > monthlyLimit) {
        const remaining = Math.max(0, monthlyLimit - monthlyUsed);
        throw new BadRequestException(
          `Monthly withdrawal limit (PKR ${monthlyLimit}) reached. You can withdraw PKR ${remaining.toFixed(2)} more this month.`,
        );
      }
    }

    wallet.balance = +(wallet.balance - amount).toFixed(2);
    wallet.totalWithdrawn = +(wallet.totalWithdrawn + amount).toFixed(2);
    wallet.transactions.push({
      type: 'withdrawal_requested',
      amount,
      pointsUsed: 0,
      description: `Withdrawal request of PKR ${amount}`,
      status: 'pending',
      createdAt: new Date(),
    });

    wallet.markModified('transactions');
    await wallet.save();

    return {
      amountRequested: amount,
      newBalance: wallet.balance,
      message: 'Withdrawal request submitted. Processing within 3-5 business days.',
    };
  }
}
