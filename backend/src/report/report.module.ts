import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Report, ReportSchema } from './schemas/report.schema';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Doctor, DoctorSchema } from '../doctors/schemas/doctor.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Report.name,  schema: ReportSchema  },
      { name: User.name,    schema: UserSchema     },
      { name: Doctor.name,  schema: DoctorSchema   },
    ]),
  ],
  controllers: [ReportController],
  providers: [ReportService],
  exports: [ReportService],
})
export class ReportModule {}
