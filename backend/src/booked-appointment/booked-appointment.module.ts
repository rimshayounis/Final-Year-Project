import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';

import {
  BookedAppointment,
  BookedAppointmentSchema,
} from './schemas/booked-appointment.schema';
import { BookedAppointmentService } from './booked-appointment.service';
import { BookedAppointmentController } from './booked-appointment.controller';
import { AppointmentGateway } from './appointment.gateway';
import { AppointmentCompletionScheduler } from './appointment-completion.scheduler';
import { Doctor, DoctorSchema } from '../doctors/schemas/doctor.schema';
import { PointsRewardModule } from '../points-reward/points-reward.module';
import { PaymentModule } from '../payment/payment.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: BookedAppointment.name, schema: BookedAppointmentSchema },
      { name: Doctor.name, schema: DoctorSchema },
    ]),
    PointsRewardModule,
    forwardRef(() => PaymentModule),
    NotificationModule,
  ],
  controllers: [BookedAppointmentController],
  providers: [
    BookedAppointmentService,
    AppointmentGateway,
    AppointmentCompletionScheduler,
  ],
  exports: [BookedAppointmentService],
})
export class BookedAppointmentModule {}
