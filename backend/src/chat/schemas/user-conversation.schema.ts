import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserConversationDocument = UserConversation & Document;

@Schema({ timestamps: true })
export class UserConversation {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user1Id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user2Id: Types.ObjectId;

  @Prop({ default: '' })
  lastMessage: string;

  @Prop({ default: () => new Date() })
  lastMessageAt: Date;

  @Prop({ default: 0 })
  user1UnreadCount: number;

  @Prop({ default: 0 })
  user2UnreadCount: number;
}

export const UserConversationSchema = SchemaFactory.createForClass(UserConversation);
UserConversationSchema.index({ user1Id: 1, user2Id: 1 }, { unique: true });
