import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User, UserSchema } from './schemas/user.schema';
import { UserProfile, UserProfileSchema } from '../user-profile/schemas/user-profile.schema';
import { MailModule } from '../mail/mail.module';
import { NotificationModule } from '../notification/notification.module';
import { FriendSuggestionScheduler } from './friend-suggestion.scheduler';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name,        schema: UserSchema },
      { name: UserProfile.name, schema: UserProfileSchema },
    ]),
    MailModule,
    NotificationModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, FriendSuggestionScheduler],
  exports: [UsersService],
})
export class UsersModule {}
