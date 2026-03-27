import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SubscriptionPlanController } from './subscription-plan.controller';
import { SubscriptionPlanService } from './subscription-plan.service';
import {
  SubscriptionPlanRecord,
  SubscriptionPlanSchema,
} from './schemas/subscription-plan.schema';
import { Doctor, DoctorSchema } from '../doctors/schemas/doctor.schema';
import { Transaction, TransactionSchema } from '../payment/schemas/transaction.schema';
import { PointsRewardModule } from '../points-reward/points-reward.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SubscriptionPlanRecord.name, schema: SubscriptionPlanSchema },
      { name: Doctor.name, schema: DoctorSchema },
      { name: Transaction.name, schema: TransactionSchema },
    ]),
    PointsRewardModule,
  ],
  controllers: [SubscriptionPlanController],
  providers: [SubscriptionPlanService],
  exports: [SubscriptionPlanService],
})
export class SubscriptionPlanModule {}
