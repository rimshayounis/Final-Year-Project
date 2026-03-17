import { Injectable } from '@nestjs/common';
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
  fileType?: 'image' | 'video' | 'document' | 'voice';
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

    await this.conversationModel.findByIdAndUpdate(dto.conversationId, {
      lastMessage:   dto.text || dto.fileType || 'File',
      lastMessageAt: new Date(),
      $inc: { unreadCount: 1 },
    });

    return saved;
  }

  async getHistory(conversationId: string, page = 1, limit = 50) {
    const skip      = (page - 1) * limit;
    const convObjId = new Types.ObjectId(conversationId);

    const total = await this.messageModel
      .countDocuments({ conversationId: convObjId });

    const messages = await this.messageModel
      .find({ conversationId: convObjId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();

    const serialized = messages.map(m => ({
      ...m,
      _id:            m._id.toString(),
      conversationId: m.conversationId.toString(),
      senderId:       m.senderId.toString(),
      receiverId:     m.receiverId.toString(),
    }));

    return {
      success:    true,
      messages:   serialized,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async markAsRead(messageId: string): Promise<void> {
    await this.messageModel.findByIdAndUpdate(messageId, { read: true });
  }

  // ── Edit message ─────────────────────────────────────────────────────────
  async editMessage(messageId: string, text: string): Promise<void> {
    await this.messageModel.findByIdAndUpdate(messageId, {
      text,
      edited: true,
    });
  }

  // ── Delete message ────────────────────────────────────────────────────────
  async deleteMessage(messageId: string): Promise<void> {
    await this.messageModel.findByIdAndDelete(messageId);
  }

  // ── React to message ──────────────────────────────────────────────────────
  async reactToMessage(messageId: string, emoji: string, userId: string): Promise<void> {
    const message = await this.messageModel.findById(messageId);
    if (!message) return;

    const reactions = (message as any).reactions || [];
    const existingIndex = reactions.findIndex(
      (r: any) => r.userId === userId && r.emoji === emoji,
    );

    if (existingIndex >= 0) {
      // Toggle off — remove reaction
      reactions.splice(existingIndex, 1);
    } else {
      // Add reaction
      reactions.push({ emoji, userId });
    }

    await this.messageModel.findByIdAndUpdate(messageId, { reactions });
  }

  async getOrCreateConversation(userAId: string, userBId: string): Promise<ConversationDocument> {
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

  async getUserConversations(userId: string) {
    return this.conversationModel
      .find({ participants: new Types.ObjectId(userId) })
      .sort({ lastMessageAt: -1 })
      .populate('participants', 'fullName userType profilePicture')
      .lean()
      .exec();
  }
}
