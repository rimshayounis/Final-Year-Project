import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserProfile, UserProfileSchema } from './schemas/user-profile.schema';
import { UserProfileService } from './user-profile.service';
import { UserProfileController } from './user-profile.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserProfile.name, schema: UserProfileSchema },
    ]),
  ],
  controllers: [UserProfileController],
  providers: [UserProfileService],
  exports: [UserProfileService],
})
export class UserProfileModule {}