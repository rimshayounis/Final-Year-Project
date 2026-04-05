import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class FriendSuggestionScheduler {
  private readonly logger = new Logger(FriendSuggestionScheduler.name);

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendFriendSuggestions() {
    // Push notifications removed — friend suggestions no longer sent via push
    this.logger.log('Friend suggestion job ran (push notifications disabled).');
  }
}
