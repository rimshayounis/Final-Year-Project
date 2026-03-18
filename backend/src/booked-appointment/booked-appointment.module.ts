// src/booked-appointment/booked-appointment.module.ts
import { Module } from '@nestjs/common';
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

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: BookedAppointment.name, schema: BookedAppointmentSchema },
      { name: Doctor.name, schema: DoctorSchema },
    ]),
    PointsRewardModule,
  ],
  controllers: [BookedAppointmentController],
  providers: [
    BookedAppointmentService,
    AppointmentGateway,
    AppointmentCompletionScheduler,
  ],
})
export class BookedAppointmentModule {}