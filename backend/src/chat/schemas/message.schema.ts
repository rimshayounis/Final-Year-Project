// ─────────────────────────────────────────────────────────────────────────────
//  src/chat/schemas/message.schema.ts
// ─────────────────────────────────────────────────────────────────────────────

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MessageDocument = Message & Document;

@Schema({ timestamps: true })
export class Message {
  @Prop({ type: Types.ObjectId, ref: 'Conversation', required: true, index: true })
  conversationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  senderId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  receiverId: Types.ObjectId;

  @Prop({ default: null })
  text: string;

  @Prop({ default: null })
  fileUrl: string;

  @Prop({ enum: ['image', 'document', 'voice'], default: null })
  fileType: string;

  @Prop({ default: null })
  fileName: string;

  // Voice message duration in seconds
  @Prop({ default: 0 })
  duration: number;

  @Prop({ default: false })
  read: boolean;

  // createdAt / updatedAt added automatically by { timestamps: true }
}

export const MessageSchema = SchemaFactory.createForClass(Message);
