// ─────────────────────────────────────────────────────────────────────────────
//  src/chat/chat.service.ts
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message, MessageDocument } from './schemas/message.schema';
import { Conversation, ConversationDocument } from './schemas/conversation.schema';

interface SaveMessageDto {
  conversationId: string;
  senderId: string;
  receiverId: string;
  text?: string;
  fileUrl?: string;
  fileType?: 'image' | 'document' | 'voice';
  fileName?: string;
  duration?: number;
}

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,

    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<ConversationDocument>,
  ) {}

  // ── Save a single message ──────────────────────────────────────────────────
  async saveMessage(dto: SaveMessageDto): Promise<MessageDocument> {
    const msg = new this.messageModel({
      conversationId: new Types.ObjectId(dto.conversationId),
      senderId:       new Types.ObjectId(dto.senderId),
      receiverId:     new Types.ObjectId(dto.receiverId),
      text:           dto.text     ?? null,
      fileUrl:        dto.fileUrl  ?? null,
      fileType:       dto.fileType ?? null,
      fileName:       dto.fileName ?? null,
      duration:       dto.duration ?? 0,
      read:           false,
    });

    const saved = await msg.save();

    // Update the conversation's preview
    await this.conversationModel.findByIdAndUpdate(dto.conversationId, {
      lastMessage:   dto.text || dto.fileType || 'File',
      lastMessageAt: new Date(),
      $inc: { unreadCount: 1 },
    });

    return saved;
  }

  // ── Paginated history ──────────────────────────────────────────────────────
  async getHistory(
    conversationId: string,
    page  = 1,
    limit = 50,
  ) {
    const skip  = (page - 1) * limit;
    const total = await this.messageModel.countDocuments({ conversationId });

    const messages = await this.messageModel
      .find({ conversationId })
      .sort({ createdAt: -1 })   // newest first; frontend reverses
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();

    return {
      success:     true,
      messages,
      total,
      page,
      totalPages:  Math.ceil(total / limit),
    };
  }

  // ── Mark one message as read ───────────────────────────────────────────────
  async markAsRead(messageId: string): Promise<void> {
    await this.messageModel.findByIdAndUpdate(messageId, { read: true });
  }

  // ── Get or create conversation between two users ───────────────────────────
  async getOrCreateConversation(
    userAId: string,
    userBId: string,
  ): Promise<ConversationDocument> {
    const a = new Types.ObjectId(userAId);
    const b = new Types.ObjectId(userBId);

    let conv = await this.conversationModel
      .findOne({ participants: { $all: [a, b] } })
      .exec();

    if (!conv) {
      conv = new this.conversationModel({
        participants:  [a, b],
        lastMessage:   '',
        lastMessageAt: new Date(),
      });
      await conv.save();
    }

    return conv;
  }

  // ── All conversations for a user (sorted by last message) ─────────────────
  async getUserConversations(userId: string) {
    return this.conversationModel
      .find({ participants: new Types.ObjectId(userId) })
      .sort({ lastMessageAt: -1 })
      .populate('participants', 'fullName userType profilePicture')
      .lean()
      .exec();
  }
}
