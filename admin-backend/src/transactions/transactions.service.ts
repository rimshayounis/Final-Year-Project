import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Transaction, TransactionDocument } from './schemas/transaction.schema';
import { Doctor, DoctorDocument } from '../wallet/schemas/doctor.schema';
import { Wallet, WalletDocument } from '../wallet/schemas/wallet.schema';
import { PointsReward, PointsRewardDocument } from './schemas/points-reward.schema';

const WITHDRAWAL_TYPES = new Set([
  'withdrawal_requested',
  'withdrawal_completed',
  'withdrawal_rejected',
]);

// Trust score = badge rank: Bronze=1, Silver=2, Gold=3, Platinum=4
const BADGE_RANK: Record<string, number> = {
  none: 0, bronze: 1, silver: 2, gold: 3, platinum: 4,
};

// Extract badge earned from a trust_badge transaction description.
// Description format: "Post crossed Xlac likes — Trust badge upgraded to {badge}"
function extractBadgeFromDesc(description: string): string {
  const m = (description ?? '').match(/upgraded to (bronze|silver|gold|platinum)/i);
  return m ? m[1].toLowerCase() : 'none';
}

@Injectable()
export class TransactionsService {
  constructor(
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
    @InjectModel(Doctor.name)
    private doctorModel: Model<DoctorDocument>,
    @InjectModel(Wallet.name)
    private walletModel: Model<WalletDocument>,
    @InjectModel(PointsReward.name)
    private pointsRewardModel: Model<PointsRewardDocument>,
  ) {}

  private async buildDoctorMap(ids: string[]): Promise<Record<string, string>> {
    if (!ids.length) return {};
    const objectIds = ids.map(id => new Types.ObjectId(id));
    const doctors = await this.doctorModel
      .find({ _id: { $in: objectIds } })
      .select('fullName')
      .lean()
      .exec() as any[];
    const map: Record<string, string> = {};
    for (const d of doctors) map[d._id.toString()] = d.fullName ?? '—';
    return map;
  }

  async getAll(type?: string, status?: string): Promise<any> {
    const isWithdrawalFilter = type === 'withdrawal';
    const isPointsFilter     = type === 'points';
    const isAllFilter        = !type || type === 'all';

    // ── 1. Regular payment transactions ──────────────────────────────────────
    let regularTxs: any[] = [];
    if (!isWithdrawalFilter && !isPointsFilter) {
      const filter: any = {};
      if (type   && type   !== 'all') filter.type   = type;
      if (status && status !== 'all') filter.status = status;

      const raw = await this.transactionModel
        .find(filter)
        .sort({ createdAt: -1 })
        .lean()
        .exec() as any[];

      const ids = [...new Set(raw.filter(t => t.doctorId).map(t => t.doctorId.toString()))];
      const doctorMap = await this.buildDoctorMap(ids);

      regularTxs = raw.map(tx => ({
        ...tx,
        _source: 'payment',
        doctorName: doctorMap[tx.doctorId?.toString()] || tx.doctorName || '—',
      }));
    }

    // ── 2. Wallet withdrawal transactions ────────────────────────────────────
    let withdrawalTxs: any[] = [];
    if (isWithdrawalFilter || isAllFilter) {
      const wallets = await this.walletModel.find().lean().exec() as any[];
      const ids = [...new Set(wallets.filter(w => w.doctorId).map(w => w.doctorId.toString()))];
      const doctorMap = await this.buildDoctorMap(ids);

      for (const wallet of wallets) {
        const name = doctorMap[wallet.doctorId?.toString()] ?? '—';
        for (const tx of (wallet.transactions ?? []) as any[]) {
          if (!WITHDRAWAL_TYPES.has(tx.type)) continue;
          if (status && status !== 'all' && tx.status !== status) continue;

          const fee    = +(tx.amount * 0.02).toFixed(2);
          const payout = +(tx.amount - fee).toFixed(2);

          withdrawalTxs.push({
            _id:                   tx._id?.toString() ?? `${wallet.doctorId}-${tx.createdAt}`,
            _source:               'wallet',
            type:                  tx.type,
            doctorId:              wallet.doctorId?.toString(),
            doctorName:            name,
            description:           tx.description,
            amount:                tx.amount,
            fee,
            payout,
            commissionRate:        0,
            commissionAmount:      0,
            currency:              'PKR',
            status:                tx.status,
            plan:                  null,
            stripePaymentIntentId: null,
            appointmentId:         null,
            paymentMethod:         'wallet',
            createdAt:             tx.createdAt,
          });
        }
      }
    }

    // ── 3. Points & reward transactions ──────────────────────────────────────
    let pointsTxs: any[] = [];
    if (isPointsFilter || isAllFilter) {
      const [rewards, wallets] = await Promise.all([
        this.pointsRewardModel.find().lean().exec() as Promise<any[]>,
        this.walletModel.find().lean().exec() as Promise<any[]>,
      ]);

      // Build doctor map from both sources
      const allIds = [
        ...new Set([
          ...rewards.filter(r => r.doctorId).map(r => r.doctorId.toString()),
          ...(wallets as any[]).filter(w => w.doctorId).map(w => w.doctorId.toString()),
        ]),
      ];
      const doctorMap = await this.buildDoctorMap(allIds);

      // 3a. Point-earning events from points_rewards
      for (const reward of rewards) {
        const name = doctorMap[reward.doctorId?.toString()] ?? '—';
        const txList = (reward.transactions ?? []) as any[];
        let txIndex = 0;
        for (const tx of txList) {
          if (tx.type === 'wallet_recalculated') continue;

          // Only surface badge/score on trust_badge EARNED transactions.
          // Reversal events contain "reversed"/"dropped below" in description — treat as no badge.
          const isEarned =
            tx.type === 'trust_badge' &&
            !(tx.description ?? '').toLowerCase().includes('reversed') &&
            !(tx.description ?? '').toLowerCase().includes('dropped below');
          const txBadge = isEarned ? extractBadgeFromDesc(tx.description) : null;
          const txScore = txBadge && txBadge !== 'none' ? (BADGE_RANK[txBadge] ?? 0) : null;

          // Use stored _id if present, otherwise build a unique key with doctor + index
          const uniqueId = tx._id?.toString()
            ?? `pts-${reward.doctorId}-${tx.type}-${new Date(tx.createdAt).getTime()}-${txIndex}`;
          txIndex++;

          pointsTxs.push({
            _id:                  uniqueId,
            _source:              'points',
            type:                 tx.type,
            doctorId:             reward.doctorId?.toString(),
            doctorName:           name,
            description:          tx.description,
            amount:               tx.points,
            points:               tx.points,
            trustBadge:           txBadge,
            trustScore:           txScore,
            totalPoints:          reward.totalPoints,
            lifetimePointsEarned: reward.lifetimePointsEarned,
            commissionRate:       0,
            commissionAmount:     0,
            currency:             'pts',
            status:               tx.points >= 0 ? 'earned' : 'deducted',
            plan:                 null,
            stripePaymentIntentId: null,
            appointmentId:        tx.postId?.toString() ?? null,
            paymentMethod:        'points',
            createdAt:            tx.createdAt,
          });
        }
      }

      // 3b. Points-to-cash conversions from doctor_wallet
      for (const wallet of wallets as any[]) {
        const name = doctorMap[wallet.doctorId?.toString()] ?? '—';
        for (const tx of (wallet.transactions ?? []) as any[]) {
          if (tx.type !== 'points_converted') continue;
          pointsTxs.push({
            _id:                  tx._id?.toString() ?? `conv-${wallet.doctorId}-${tx.createdAt}`,
            _source:              'points',
            type:                 'points_converted',
            doctorId:             wallet.doctorId?.toString(),
            doctorName:           name,
            description:          tx.description,
            amount:               tx.pointsUsed,   // points spent shown in amount
            points:               tx.pointsUsed,
            pkrAmount:            tx.amount,        // PKR value
            trustBadge:           null,
            trustScore:           null,
            totalPoints:          null,
            lifetimePointsEarned: null,
            commissionRate:       0,
            commissionAmount:     0,
            currency:             'pts',
            status:               'converted',
            plan:                 null,
            stripePaymentIntentId: null,
            appointmentId:        null,
            paymentMethod:        'points',
            createdAt:            tx.createdAt,
          });
        }
      }

      pointsTxs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    const all = [...regularTxs, ...withdrawalTxs, ...pointsTxs].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    // ── Global counts (always over full dataset) ──────────────────────────────
    const [aggResult, allWallets, allRewards] = await Promise.all([
      this.transactionModel.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]),
      this.walletModel.find().lean().exec() as Promise<any[]>,
      this.pointsRewardModel.find().select('transactions trustBadge totalPoints lifetimePointsEarned').lean().exec() as Promise<any[]>,
    ]);

    const byType: Record<string, number> = {};
    for (const r of aggResult) byType[r._id] = r.count;

    let withdrawalCount = 0;
    for (const w of allWallets as any[]) {
      for (const tx of (w.transactions ?? []) as any[]) {
        if (WITHDRAWAL_TYPES.has(tx.type)) {
          byType[tx.type] = (byType[tx.type] ?? 0) + 1;
          withdrawalCount++;
        }
      }
    }

    let pointsCount = 0;
    for (const r of allRewards as any[]) {
      pointsCount += (r.transactions ?? []).filter((t: any) => t.type !== 'wallet_recalculated').length;
    }
    for (const w of allWallets as any[]) {
      pointsCount += (w.transactions ?? []).filter((t: any) => t.type === 'points_converted').length;
    }

    const totalAmount = [...regularTxs, ...withdrawalTxs]
      .reduce((s, t) => s + (t.amount ?? 0), 0);

    const grandTotal = Object.values(byType).reduce((s, c) => s + c, 0) + withdrawalCount + pointsCount;

    let totalCurrentPoints  = 0;
    let totalLifetimeEarned = 0;
    for (const r of allRewards as any[]) {
      totalCurrentPoints  += r.totalPoints          ?? 0;
      totalLifetimeEarned += r.lifetimePointsEarned ?? 0;
    }

    return {
      total:               all.length,
      totalAmount,
      byType,
      withdrawalCount,
      pointsCount,
      grandTotal,
      totalCurrentPoints,
      totalLifetimeEarned,
      transactions:        all,
    };
  }

  // Total PKR and points paid out by platform via points-to-cash conversions
  async getPointsPayoutTotal(): Promise<{ total: number; totalPoints: number }> {
    const wallets = await this.walletModel.find().lean().exec() as any[];
    let total = 0;
    let totalPoints = 0;
    for (const wallet of wallets) {
      for (const tx of (wallet.transactions ?? []) as any[]) {
        if (tx.type === 'points_converted') {
          total       += tx.amount     ?? 0; // PKR value
          totalPoints += tx.pointsUsed ?? 0; // points spent
        }
      }
    }
    return { total: +total.toFixed(2), totalPoints };
  }
}
