import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SupportRequestController } from './support-request.controller';
import { SupportRequestService }    from './support-request.service';
import { SupportRequest, SupportRequestSchema } from './schemas/support-request.schema';

// ── import your existing schemas ──
import { User, UserSchema }     from '../users/schemas/user.schema';
import { Doctor, DoctorSchema } from '../doctors/schemas/doctor.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SupportRequest.name, schema: SupportRequestSchema },
      { name: 'User',   schema: UserSchema   },
      { name: 'Doctor', schema: DoctorSchema },
    ]),
  ],
  controllers: [SupportRequestController],
  providers:   [SupportRequestService],
})
export class SupportRequestModule {}