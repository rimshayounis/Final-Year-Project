import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { AdminWallet, AdminWalletSchema } from './schemas/admin-wallet.schema';
import { Transaction, TransactionSchema } from './schemas/transaction.schema';
import { SubscriptionPlanModule } from '../subscription-plan/subscription-plan.module';
import {
  BookedAppointment,
  BookedAppointmentSchema,
} from '../booked-appointment/schemas/booked-appointment.schema';
import { Wallet, WalletSchema } from '../wallet/schemas/wallet.schema';
import { Doctor, DoctorSchema } from '../doctors/schemas/doctor.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { NotificationModule } from '../notification/notification.module'; // 👈 NEW

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AdminWallet.name,       schema: AdminWalletSchema },
      { name: Transaction.name,       schema: TransactionSchema },
      { name: BookedAppointment.name, schema: BookedAppointmentSchema },
      { name: Wallet.name,            schema: WalletSchema },
      { name: Doctor.name,            schema: DoctorSchema },
      { name: User.name,              schema: UserSchema },
    ]),
    SubscriptionPlanModule,
    NotificationModule, // 👈 NEW
  ],
  controllers: [PaymentController],
  providers:   [PaymentService],
  exports:     [PaymentService],
})
export class PaymentModule {}