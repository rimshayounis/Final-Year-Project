import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PointsRewardController } from './points-reward.controller';
import { PointsRewardService } from './points-reward.service';
import { PointsReward, PointsRewardSchema } from './schemas/points-reward.schema';
import { Post, PostSchema } from '../posts/schemas/post.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PointsReward.name, schema: PointsRewardSchema },
      { name: Post.name, schema: PostSchema },
    ]),
  ],
  controllers: [PointsRewardController],
  providers: [PointsRewardService],
  exports: [PointsRewardService],
})
export class PointsRewardModule {}
