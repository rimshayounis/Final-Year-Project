import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { DoctorsModule } from './doctors/doctor.module';
import { PostsModule } from './posts/posts.module';
<<<<<<< HEAD
import { ChatbotModule } from './chatbot/chatbot.module';
import { AppointmentAvailabilityModule } from './appointment-availability/appointment-availability.module';
import { BookedAppointmentModule } from './booked-appointment/booked-appointment.module';
import { ChatModule } from './chat/chat.module';
=======
import {ChatbotModule} from './chatbot/chatbot.module'
import {AppointmentAvailabilityModule} from './appointment-availability/appointment-availability.module'
import {BookedAppointmentModule} from './booked-appointment/booked-appointment.module'
import { UserProfileModule } from './user-profile/user-profile.module';
>>>>>>> 714043731280cd7571b1c1852fa910543188330d

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
<<<<<<< HEAD
    ChatModule,
=======
    UserProfileModule,
>>>>>>> 714043731280cd7571b1c1852fa910543188330d
  ],
})
export class AppModule {}