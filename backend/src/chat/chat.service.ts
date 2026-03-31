import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message, MessageDocument } from './schemas/message.schema';
import { Conversation, ConversationDocument } from './schemas/conversation.schema';
import { UserConversation, UserConversationDocument } from './schemas/user-conversation.schema';
import { UserProfile, UserProfileDocument } from '../user-profile/schemas/user-profile.schema';

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

    @InjectModel(UserConversation.name)
    private readonly userConvModel: Model<UserConversationDocument>,

    @InjectModel(UserProfile.name)
    private readonly userProfileModel: Model<UserProfileDocument>,
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

    // Try doctor-patient conversation first, then user-user
    const convId = dto.conversationId;
    const doctorConv = await this.conversationModel.findById(convId).lean();

    if (doctorConv) {
      const senderIsPatient = doctorConv.patientId?.toString() === dto.senderId;
      const unreadField = senderIsPatient ? 'doctorUnreadCount' : 'patientUnreadCount';
      await this.conversationModel.findByIdAndUpdate(convId, {
        lastMessage:   dto.text || dto.fileType || 'File',
        lastMessageAt: new Date(),
        $inc: { [unreadField]: 1 },
      });
    } else {
      const userConv = await this.userConvModel.findById(convId).lean();
      if (userConv) {
        const senderIsUser1 = userConv.user1Id?.toString() === dto.senderId;
        const unreadField = senderIsUser1 ? 'user2UnreadCount' : 'user1UnreadCount';
        await this.userConvModel.findByIdAndUpdate(convId, {
          lastMessage:   dto.text || dto.fileType || 'File',
          lastMessageAt: new Date(),
          $inc: { [unreadField]: 1 },
        });
      }
    }

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

  async getOrCreateConversation(patientId: string, doctorId: string): Promise<ConversationDocument> {
    const pId = new Types.ObjectId(patientId);
    const dId = new Types.ObjectId(doctorId);

    let conv = await this.conversationModel
      .findOne({ patientId: pId, doctorId: dId })
      .exec();

    if (!conv) {
      conv = new this.conversationModel({
        patientId:     pId,
        doctorId:      dId,
        lastMessage:   '',
        lastMessageAt: new Date(),
      });
      await conv.save();
    }

    return conv;
  }

  async getUserConversations(userId: string) {
    return this.conversationModel
      .find({ patientId: new Types.ObjectId(userId) })
      .sort({ lastMessageAt: -1 })
      .populate('patientId', 'fullName')
      .populate('doctorId', 'fullName')
      .lean()
      .exec();
  }

  async getDoctorConversations(doctorId: string) {
    return this.conversationModel
      .find({ doctorId: new Types.ObjectId(doctorId) })
      .sort({ lastMessageAt: -1 })
      .populate('patientId', 'fullName')
      .populate('doctorId', 'fullName')
      .lean()
      .exec();
  }

  // ── User-to-User Conversations ────────────────────────────────────────────
  async getOrCreateUserConversation(userId1: string, userId2: string): Promise<UserConversationDocument> {
    const u1 = new Types.ObjectId(userId1);
    const u2 = new Types.ObjectId(userId2);

    let conv = await this.userConvModel
      .findOne({
        $or: [
          { user1Id: u1, user2Id: u2 },
          { user1Id: u2, user2Id: u1 },
        ],
      })
      .exec();

    if (!conv) {
      conv = new this.userConvModel({
        user1Id:      u1,
        user2Id:      u2,
        lastMessage:  '',
        lastMessageAt: new Date(),
      });
      await conv.save();
    }

    return conv;
  }

  async getUserToUserConversations(userId: string) {
    const uid = new Types.ObjectId(userId);
    const convs = await this.userConvModel
      .find({ $or: [{ user1Id: uid }, { user2Id: uid }] })
      .sort({ lastMessageAt: -1 })
      .populate('user1Id', 'fullName')
      .populate('user2Id', 'fullName')
      .lean()
      .exec();

    // Collect all participant IDs to batch-fetch profile images
    const participantIds = new Set<string>();
    for (const c of convs) {
      if ((c.user1Id as any)?._id) participantIds.add((c.user1Id as any)._id.toString());
      if ((c.user2Id as any)?._id) participantIds.add((c.user2Id as any)._id.toString());
    }

    const profiles = await this.userProfileModel
      .find({
        ownerId:   { $in: [...participantIds].map(id => new Types.ObjectId(id)) },
        ownerType: 'User',
      })
      .select('ownerId profileImage')
      .lean()
      .exec();

    const imageMap: Record<string, string | null> = {};
    for (const p of profiles) {
      imageMap[p.ownerId.toString()] = (p as any).profileImage ?? null;
    }

    // Attach profileImage to each populated user object
    return convs.map(c => ({
      ...c,
      user1Id: c.user1Id
        ? { ...(c.user1Id as any), profileImage: imageMap[(c.user1Id as any)._id?.toString()] ?? null }
        : c.user1Id,
      user2Id: c.user2Id
        ? { ...(c.user2Id as any), profileImage: imageMap[(c.user2Id as any)._id?.toString()] ?? null }
        : c.user2Id,
    }));
  }

  async markUserConversationRead(conversationId: string, userId: string): Promise<void> {
    const conv = await this.userConvModel.findById(conversationId).lean();
    if (!conv) return;
    const isUser1 = conv.user1Id?.toString() === userId;
    const field   = isUser1 ? 'user1UnreadCount' : 'user2UnreadCount';
    await this.userConvModel.findByIdAndUpdate(conversationId, { [field]: 0 });
  }
}
