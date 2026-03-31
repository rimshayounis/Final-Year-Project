import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class FriendSuggestionScheduler {
  private readonly logger = new Logger(FriendSuggestionScheduler.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly notificationService: NotificationService,
  ) {}

  // Runs every day at 9 AM
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendFriendSuggestions() {
    this.logger.log('Running daily friend suggestions...');

    const users = await this.userModel
      .find({ userType: 'user', expoPushToken: { $ne: null } })
      .select('_id fullName healthProfile expoPushToken notificationSettings')
      .lean()
      .exec();

    for (const user of users) {
      const pushEnabled = (user as any).notificationSettings?.pushEnabled ?? true;
      if (!pushEnabled) continue;

      const myInterests: string[] = (user as any).healthProfile?.interests ?? [];
      if (myInterests.length === 0) continue;

      // Find up to 3 users sharing at least one interest
      const suggestions = await this.userModel
        .find({
          _id:  { $ne: user._id },
          'healthProfile.interests': { $in: myInterests },
          expoPushToken: { $ne: null },
        })
        .select('fullName healthProfile')
        .limit(3)
        .lean()
        .exec();

      if (suggestions.length === 0) continue;

      const names = suggestions
        .map((s: any) => s.fullName)
        .join(', ');

      const token = (user as any).expoPushToken;
      if (!token) continue;

      await this.notificationService.sendRawPush(
        token,
        '👥 People You Might Know',
        `${names} share your health interests! Open the app to connect.`,
        { screen: 'People' },
      ).catch((e) =>
        this.logger.error(`Push failed for ${(user as any).fullName}: ${e.message}`),
      );
    }

    this.logger.log('Friend suggestion notifications sent.');
  }
}
