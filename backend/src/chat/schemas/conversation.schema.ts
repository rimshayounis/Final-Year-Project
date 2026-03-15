// ─────────────────────────────────────────────────────────────────────────────
//  src/chat/schemas/conversation.schema.ts
// ─────────────────────────────────────────────────────────────────────────────

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ConversationDocument = Conversation & Document;

@Schema({ timestamps: true })
export class Conversation {
  @Prop({
    type: [{ type: Types.ObjectId, ref: 'User' }],
    required: true,
    validate: (v: Types.ObjectId[]) => v.length === 2,
  })
  participants: Types.ObjectId[];

  @Prop({ default: '' })
  lastMessage: string;

  @Prop({ default: () => new Date() })
  lastMessageAt: Date;

  @Prop({ default: 0 })
  unreadCount: number;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

// Ensure one conversation per pair of users
ConversationSchema.index({ participants: 1 }, { unique: false });
