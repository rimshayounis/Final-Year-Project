import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationService } from './notification.service';
import { Doctor, DoctorSchema } from '../doctors/schemas/doctor.schema';
import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Doctor.name, schema: DoctorSchema },
      { name: User.name,   schema: UserSchema },
    ]),
  ],
  providers: [NotificationService],
  exports:   [NotificationService],
})
export class NotificationModule {}
