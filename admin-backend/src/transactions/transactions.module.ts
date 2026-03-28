import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { Transaction, TransactionSchema } from './schemas/transaction.schema';
import { Doctor, DoctorSchema } from '../wallet/schemas/doctor.schema';
import { Wallet, WalletSchema } from '../wallet/schemas/wallet.schema';
import { PointsReward, PointsRewardSchema } from './schemas/points-reward.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Transaction.name,   schema: TransactionSchema   },
      { name: Doctor.name,        schema: DoctorSchema        },
      { name: Wallet.name,        schema: WalletSchema        },
      { name: PointsReward.name,  schema: PointsRewardSchema  },
    ]),
  ],
  controllers: [TransactionsController],
  providers:   [TransactionsService],
})
export class TransactionsModule {}
