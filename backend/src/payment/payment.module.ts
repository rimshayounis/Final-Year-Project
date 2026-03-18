import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { AdminWallet, AdminWalletSchema } from './schemas/admin-wallet.schema';
import { Transaction, TransactionSchema } from './schemas/transaction.schema';
import { SubscriptionPlanModule } from '../subscription-plan/subscription-plan.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AdminWallet.name, schema: AdminWalletSchema },
      { name: Transaction.name, schema: TransactionSchema },
    ]),
    SubscriptionPlanModule,
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
})
export class PaymentModule {}
