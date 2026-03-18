import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { Wallet, WalletSchema } from './schemas/wallet.schema';
import { PointsReward, PointsRewardSchema } from '../points-reward/schemas/points-reward.schema';
import { Doctor, DoctorSchema } from '../doctors/schemas/doctor.schema';
import { BookedAppointment, BookedAppointmentSchema } from '../booked-appointment/schemas/booked-appointment.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Wallet.name, schema: WalletSchema },
      { name: PointsReward.name, schema: PointsRewardSchema },
      { name: Doctor.name, schema: DoctorSchema },
      { name: BookedAppointment.name, schema: BookedAppointmentSchema },
    ]),
  ],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
