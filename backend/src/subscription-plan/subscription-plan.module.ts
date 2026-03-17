import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SubscriptionPlanController } from './subscription-plan.controller';
import { SubscriptionPlanService } from './subscription-plan.service';
import {
  SubscriptionPlanRecord,
  SubscriptionPlanSchema,
} from './schemas/subscription-plan.schema';
import { Doctor, DoctorSchema } from '../doctors/schemas/doctor.schema';
import { PointsRewardModule } from '../points-reward/points-reward.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SubscriptionPlanRecord.name, schema: SubscriptionPlanSchema },
      { name: Doctor.name, schema: DoctorSchema },
    ]),
    PointsRewardModule,
  ],
  controllers: [SubscriptionPlanController],
  providers: [SubscriptionPlanService],
  exports: [SubscriptionPlanService],
})
export class SubscriptionPlanModule {}
