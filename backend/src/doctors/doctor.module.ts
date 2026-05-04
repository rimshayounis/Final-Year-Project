import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { DoctorsController } from './doctor.controller';
import { DoctorsService } from './doctor.service';
import { Doctor, DoctorSchema } from './schemas/doctor.schema';
import { Post, PostSchema } from '../posts/schemas/post.schema';
import { MailModule } from '../mail/mail.module';
import { SubscriptionPlanModule } from '../subscription-plan/subscription-plan.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Doctor.name, schema: DoctorSchema },
      { name: Post.name,   schema: PostSchema },
    ]),
    MulterModule.register({ dest: './uploads/certificates' }),
    MailModule,
    SubscriptionPlanModule,
  ],
  controllers: [DoctorsController],
  providers: [DoctorsService],
  exports: [DoctorsService],
})
export class DoctorsModule {}