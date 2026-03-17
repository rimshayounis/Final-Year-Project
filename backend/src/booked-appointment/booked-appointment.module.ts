import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BookedAppointmentController } from './booked-appointment.controller';
import { BookedAppointmentService } from './booked-appointment.service';
import { BookedAppointment, BookedAppointmentSchema } from './schemas/booked-appointment.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Doctor, DoctorSchema } from '../doctors/schemas/doctor.schema';
import { PointsRewardModule } from '../points-reward/points-reward.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BookedAppointment.name, schema: BookedAppointmentSchema },
      { name: User.name, schema: UserSchema },
      { name: Doctor.name, schema: DoctorSchema },
    ]),
    PointsRewardModule,
  ],
  controllers: [BookedAppointmentController],
  providers: [BookedAppointmentService],
  exports: [BookedAppointmentService],
})
export class BookedAppointmentModule {}