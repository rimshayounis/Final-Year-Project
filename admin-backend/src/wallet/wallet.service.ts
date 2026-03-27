import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Wallet, WalletDocument } from './schemas/wallet.schema';
import { Doctor, DoctorDocument } from './schemas/doctor.schema';
import { UserProfile, UserProfileDocument } from './schemas/user-profile.schema';

@Injectable()
export class WalletService {
  constructor(
    @InjectModel(Wallet.name)       private walletModel:       Model<WalletDocument>,
    @InjectModel(Doctor.name)       private doctorModel:       Model<DoctorDocument>,
    @InjectModel(UserProfile.name)  private userProfileModel:  Model<UserProfileDocument>,
  ) {}

  // ── Get all withdrawal transactions across all doctors ────────────────────
  async getAllWithdrawals(statusFilter?: string): Promise<any[]> {
    const wallets = await this.walletModel.find().exec();
    const results: any[] = [];

    for (const wallet of wallets) {
      const doctor = await this.doctorModel
        .findById(wallet.doctorId)
        .select('fullName email bankDetails')
        .exec();

      const profile = await this.userProfileModel
        .findOne({ ownerId: wallet.doctorId })
        .select('profileImage')
        .exec();

      const withdrawals = (wallet.transactions as any[]).filter((tx) => {
        const isW = ['withdrawal_requested', 'withdrawal_completed', 'withdrawal_rejected'].includes(tx.type);
        if (!isW) return false;
        if (statusFilter && statusFilter !== 'all') return tx.status === statusFilter;
        return true;
      });

      for (const tx of withdrawals) {
        const fee    = +(tx.amount * 0.02).toFixed(2);
        const payout = +(tx.amount - fee).toFixed(2);
        results.push({
          txId:          tx._id?.toString(),
          doctorId:      wallet.doctorId.toString(),
          doctorName:    (doctor as any)?.fullName                    ?? 'Unknown',
          doctorEmail:   (doctor as any)?.email                       ?? '',
          doctorPhoto:   (profile as any)?.profileImage               ?? null,
          bankName:      (doctor as any)?.bankDetails?.bankName       ?? null,
          accountName:   (doctor as any)?.bankDetails?.accountName    ?? null,
          accountNumber: (doctor as any)?.bankDetails?.accountNumber  ?? null,
          amount:        tx.amount,
          fee,
          payout,
          status:        tx.status,
          createdAt:     tx.createdAt,
        });
      }
    }

    return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // ── Update withdrawal status ──────────────────────────────────────────────
  async updateWithdrawalStatus(doctorId: string, txId: string, status: 'succeeded' | 'rejected'): Promise<any> {
    const wallet = await this.walletModel
      .findOne({ doctorId: new Types.ObjectId(doctorId) })
      .exec();
    if (!wallet) throw new NotFoundException('Wallet not found');

    const tx = (wallet.transactions as any[]).find(t => t._id?.toString() === txId);
    if (!tx) throw new NotFoundException('Transaction not found');
    if (!['withdrawal_requested', 'withdrawal_completed', 'withdrawal_rejected'].includes(tx.type))
      throw new BadRequestException('Not a withdrawal transaction');
    if (tx.status !== 'pending')
      throw new BadRequestException(`Withdrawal is already ${tx.status}`);

    tx.status = status;
    tx.type   = status === 'succeeded' ? 'withdrawal_completed' : 'withdrawal_rejected';

    if (status === 'rejected') {
      wallet.balance        = +(wallet.balance        + tx.amount).toFixed(2);
      wallet.totalWithdrawn = +(wallet.totalWithdrawn - tx.amount).toFixed(2);
    }

    wallet.markModified('transactions');
    await wallet.save();

    return { txId, status, newBalance: wallet.balance };
  }
}
