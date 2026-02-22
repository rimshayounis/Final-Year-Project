import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppointmentAvailabilityController } from './appointment-availability.controller';
import { AppointmentAvailabilityService } from './appointment-availability.service';
import { AppointmentAvailability, AppointmentAvailabilitySchema } from './schemas/appointment-availability.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AppointmentAvailability.name, schema: AppointmentAvailabilitySchema },
    ]),
  ],
  controllers: [AppointmentAvailabilityController],
  providers: [AppointmentAvailabilityService],
  exports: [AppointmentAvailabilityService],
})
export class AppointmentAvailabilityModule {}