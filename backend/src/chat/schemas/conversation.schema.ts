// ─────────────────────────────────────────────────────────────────────────────
//  src/chat/schemas/conversation.schema.ts
// ─────────────────────────────────────────────────────────────────────────────

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ConversationDocument = Conversation & Document;

@Schema({ timestamps: true })
export class Conversation {
  /** The patient (User) side of the conversation */
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  patientId: Types.ObjectId;

  /** The doctor (Doctor) side of the conversation */
  @Prop({ type: Types.ObjectId, ref: 'Doctor', required: true })
  doctorId: Types.ObjectId;

  @Prop({ default: '' })
  lastMessage: string;

  @Prop({ default: () => new Date() })
  lastMessageAt: Date;

  /** Unread messages for the patient side */
  @Prop({ default: 0 })
  patientUnreadCount: number;

  /** Unread messages for the doctor side */
  @Prop({ default: 0 })
  doctorUnreadCount: number;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

// One conversation per patient-doctor pair
ConversationSchema.index({ patientId: 1, doctorId: 1 }, { unique: true });
