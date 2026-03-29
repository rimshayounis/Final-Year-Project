import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SosController } from './sos.controller';
import { SosService } from './sos.service';
import { User, UserSchema } from '../users/schemas/user.schema';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
    ]),
    MailModule,
  ],
  controllers: [SosController],
  providers:   [SosService],
})
export class SosModule {}