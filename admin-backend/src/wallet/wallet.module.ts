import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { Wallet, WalletSchema } from './schemas/wallet.schema';
import { Doctor, DoctorSchema } from './schemas/doctor.schema';
import { UserProfile, UserProfileSchema } from './schemas/user-profile.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Wallet.name,       schema: WalletSchema       },
      { name: Doctor.name,       schema: DoctorSchema       },
      { name: UserProfile.name,  schema: UserProfileSchema  },
    ]),
  ],
  controllers: [WalletController],
  providers:   [WalletService],
})
export class WalletModule {}
