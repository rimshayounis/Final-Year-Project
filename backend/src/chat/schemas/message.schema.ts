import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MessageDocument = Message & Document & { createdAt: Date; updatedAt: Date };

@Schema({ timestamps: true })
export class Message {
  @Prop({ type: Types.ObjectId, ref: 'Conversation', required: true, index: true })
  conversationId: Types.ObjectId;

  // Sender/receiver can be either a User or a Doctor — no single ref
  @Prop({ type: Types.ObjectId, required: true })
  senderId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  receiverId: Types.ObjectId;

  @Prop({ default: null })
  text: string;

  @Prop({ default: null })
  fileUrl: string;

  @Prop({ enum: ['image', 'video', 'document', 'voice', null], default: null })
  fileType: string;

  @Prop({ default: null })
  fileName: string;

  @Prop({ default: 0 })
  duration: number;

  @Prop({ default: false })
  read: boolean;

  // ✅ New: track if message was edited
  @Prop({ default: false })
  edited: boolean;

  // ✅ New: emoji reactions — array of { emoji, userId }
  @Prop({
    type: [{ emoji: String, userId: String }],
    default: [],
  })
  reactions: { emoji: string; userId: string }[];
}

export const MessageSchema = SchemaFactory.createForClass(Message);
