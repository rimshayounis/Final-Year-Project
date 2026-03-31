// ─────────────────────────────────────────────────────────────────────────────
//  src/chat/chat.module.ts
// ─────────────────────────────────────────────────────────────────────────────

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';

import { ChatGateway }    from './chat.gateway';
import { ChatService }    from './chat.service';
import { ChatController } from './chat.controller';

import { Message,          MessageSchema }          from './schemas/message.schema';
import { Conversation,     ConversationSchema }     from './schemas/conversation.schema';
import { UserConversation, UserConversationSchema } from './schemas/user-conversation.schema';
import { UserProfile,      UserProfileSchema }      from '../user-profile/schemas/user-profile.schema';

@Module({
  imports: [
    // Register Mongoose models
    MongooseModule.forFeature([
      { name: Message.name,          schema: MessageSchema          },
      { name: Conversation.name,     schema: ConversationSchema     },
      { name: UserConversation.name, schema: UserConversationSchema },
      { name: UserProfile.name,      schema: UserProfileSchema      },
    ]),

    // Multer (file uploads) – destination set per-request in controller
    MulterModule.register({ dest: './uploads' }),
  ],
  providers:   [ChatGateway, ChatService],
  controllers: [ChatController],
  exports:     [ChatService],
})
export class ChatModule {}
