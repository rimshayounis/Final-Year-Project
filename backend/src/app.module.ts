import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { DoctorsModule } from './doctors/doctor.module';
import { PostsModule } from './posts/posts.module';
import { ChatbotModule } from './chatbot/chatbot.module';
import { AppointmentAvailabilityModule } from './appointment-availability/appointment-availability.module';
import { BookedAppointmentModule } from './booked-appointment/booked-appointment.module';
import { ChatModule } from './chat/chat.module';

import { UserProfileModule } from './user-profile/user-profile.module';
import { PointsRewardModule } from './points-reward/points-reward.module';
import { SubscriptionPlanModule } from './subscription-plan/subscription-plan.module';
import { WalletModule } from './wallet/wallet.module';
import { PaymentModule } from './payment/payment.module';
import { NotificationModule } from './notification/notification.module';


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/truheal-link'
    ),
    UsersModule,
    DoctorsModule,
    PostsModule,
    ChatbotModule,
    AppointmentAvailabilityModule,
    BookedAppointmentModule,
    ChatModule,
    UserProfileModule,
    PointsRewardModule,
    SubscriptionPlanModule,
    WalletModule,
    PaymentModule,
    NotificationModule,
  ],
})
export class AppModule {}