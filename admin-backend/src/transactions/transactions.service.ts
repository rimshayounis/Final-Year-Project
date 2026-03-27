import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Transaction, TransactionDocument } from './schemas/transaction.schema';
import { Doctor, DoctorDocument } from '../wallet/schemas/doctor.schema';
import { Wallet, WalletDocument } from '../wallet/schemas/wallet.schema';

const WITHDRAWAL_TYPES = new Set([
  'withdrawal_requested',
  'withdrawal_completed',
  'withdrawal_rejected',
]);

@Injectable()
export class TransactionsService {
  constructor(
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
    @InjectModel(Doctor.name)
    private doctorModel: Model<DoctorDocument>,
    @InjectModel(Wallet.name)
    private walletModel: Model<WalletDocument>,
  ) {}

  async getAll(type?: string, status?: string): Promise<any> {
    const isWithdrawalFilter = type === 'withdrawal';
    const isAllFilter        = !type || type === 'all';

    // ── 1. Regular transactions (payment/commission/etc.) ─────────────────────
    let regularTxs: any[] = [];
    if (!isWithdrawalFilter) {
      const filter: any = {};
      if (type   && type   !== 'all') filter.type   = type;
      if (status && status !== 'all') filter.status = status;

      regularTxs = await this.transactionModel
        .find(filter)
        .sort({ createdAt: -1 })
        .lean()
        .exec();

      // Resolve missing doctor names
      const missingIds = [
        ...new Set(
          regularTxs
            .filter(tx => !tx.doctorName && tx.doctorId)
            .map(tx => tx.doctorId.toString()),
        ),
      ];
      const doctorMap: Record<string, string> = {};
      if (missingIds.length > 0) {
        const objectIds = missingIds.map(id => new Types.ObjectId(id));
        const doctors = await this.doctorModel
          .find({ _id: { $in: objectIds } })
          .select('fullName')
          .lean()
          .exec() as any[];
        for (const d of doctors) {
          doctorMap[d._id.toString()] = d.fullName ?? '';
        }
      }

      regularTxs = regularTxs.map(tx => ({
        ...tx,
        _source: 'payment',
        doctorName:
          tx.doctorName ||
          (tx.doctorId ? doctorMap[tx.doctorId.toString()] : '') ||
          '—',
      }));
    }

    // ── 2. Wallet withdrawal transactions ─────────────────────────────────────
    let withdrawalTxs: any[] = [];
    if (isWithdrawalFilter || isAllFilter) {
      const wallets = await this.walletModel.find().lean().exec() as any[];

      // Fetch all doctor names in one query
      const doctorIds = wallets.map(w => w.doctorId);
      const doctors = await this.doctorModel
        .find({ _id: { $in: doctorIds } })
        .select('fullName')
        .lean()
        .exec() as any[];
      const doctorMap: Record<string, string> = {};
      for (const d of doctors) {
        doctorMap[d._id.toString()] = d.fullName ?? '—';
      }

      for (const wallet of wallets) {
        const name = doctorMap[wallet.doctorId?.toString()] ?? '—';
        for (const tx of (wallet.transactions ?? []) as any[]) {
          if (!WITHDRAWAL_TYPES.has(tx.type)) continue;
          // apply status filter if set
          if (status && status !== 'all' && tx.status !== status) continue;

          const fee    = +(tx.amount * 0.02).toFixed(2);
          const payout = +(tx.amount - fee).toFixed(2);

          withdrawalTxs.push({
            _id:         tx._id?.toString() ?? `${wallet.doctorId}-${tx.createdAt}`,
            _source:     'wallet',
            type:        tx.type,
            doctorId:    wallet.doctorId?.toString(),
            doctorName:  name,
            description: tx.description,
            amount:      tx.amount,
            fee,
            payout,
            commissionRate:   0,
            commissionAmount: 0,
            currency:    'PKR',
            status:      tx.status,
            plan:        null,
            stripePaymentIntentId: null,
            appointmentId: null,
            paymentMethod: 'wallet',
            createdAt:   tx.createdAt,
          });
        }
      }
    }

    const all = [...regularTxs, ...withdrawalTxs].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const total       = all.length;
    const totalAmount = all.reduce((s, t) => s + (t.amount ?? 0), 0);

    const byType: Record<string, number> = {};
    for (const tx of all) {
      byType[tx.type] = (byType[tx.type] ?? 0) + 1;
    }

    // Aggregate withdrawal count under one key for the summary card
    const withdrawalCount =
      (byType['withdrawal_requested']  ?? 0) +
      (byType['withdrawal_completed']  ?? 0) +
      (byType['withdrawal_rejected']   ?? 0);

    return { total, totalAmount, byType, withdrawalCount, transactions: all };
  }
}
