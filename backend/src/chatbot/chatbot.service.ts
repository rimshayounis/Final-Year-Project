import { Injectable, BadRequestException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Chat, ChatDocument } from './schemas/chat.schema';
import { SendMessageDto } from './dto/chat.dto';

@Injectable()
export class ChatbotService implements OnModuleInit {
  // The '!' tells TypeScript that these will be initialized in onModuleInit
  private apiKey!: string;
  private url!: string;

  constructor(
    @InjectModel(Chat.name) private chatModel: Model<ChatDocument>,
    private configService: ConfigService,
  ) {}

  onModuleInit() {
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is not defined in environment variables');
    }
this.url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;
    // Gemini API standard structure. We attach the key as a query parameter.
    console.log('✅ Gemini initialized successfully');
  }

  // Send message to chatbot
  async sendMessage(sendMessageDto: SendMessageDto): Promise<{ userMessage: Chat; botResponse: Chat }> {
    try {
      // 1. Get user's recent chat history for context (last 10 completed messages)
      const recentChats = await this.chatModel
        .find({ 
          userId: new Types.ObjectId(sendMessageDto.userId),
          response: { $ne: '' } // Only fetch history where a bot response exists
        })
        .sort({ createdAt: -1 })
        .limit(10)
        .exec();

      // 2. Build conversation history as a single string
      const historyText = recentChats
        .reverse()
        .map(chat => `User: ${chat.message}\nBot: ${chat.response}`)
        .join('\n\n');

      // 3. System prompt for healthcare context
      const systemPrompt = `You are a helpful healthcare assistant for TruHeal-Link, a healthcare application.
Your role is to:
- Provide general health tips and wellness advice
- Answer basic health-related questions
- Suggest when users should consult a doctor
- Be empathetic and supportive
- Never diagnose conditions or prescribe medications
- Always recommend professional medical consultation for serious concerns
- Keep responses concise, friendly, and easy to understand
- Use emojis occasionally to make conversations more engaging

IMPORTANT: Always clarify that you're not a replacement for professional medical advice.`;

      // Combine prompt
      const fullPrompt = `${systemPrompt}\n\n${historyText}\nUser: ${sendMessageDto.message}\nBot:`;

      // 4. Call Gemini API (Corrected Payload Structure)
      const response = await axios.post(
        this.url,
        {
          contents: [
            {
              parts: [{ text: fullPrompt }]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500,
            candidateCount: 1,
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        },
      );

      // 5. Parse Gemini Response (Corrected Parsing Structure)
      const botResponseText = response.data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 
                              'I apologize, but I could not generate a response.';

      // 6. Save user message
      const userMessage = new this.chatModel({
        userId: new Types.ObjectId(sendMessageDto.userId),
        message: sendMessageDto.message,
        response: '',
        imageUrl: sendMessageDto.imageUrl,
        fileUrl: sendMessageDto.fileUrl,
        metadata: {
          model: 'user',
          timestamp: new Date(),
        },
      });

      // 7. Save bot response
      const botResponse = new this.chatModel({
        userId: new Types.ObjectId(sendMessageDto.userId),
        message: sendMessageDto.message,
        response: botResponseText,
        metadata: {
          model: 'gemini-2.5-flash',
          timestamp: new Date(),
        },
      });

      await Promise.all([userMessage.save(), botResponse.save()]);

      return { userMessage, botResponse };
    } catch (error: any) {
      console.error('Gemini API Error:', error.response?.data || error.message);
      throw new BadRequestException('Failed to get response from chatbot. Please try again.');
    }
  }

  // Get chat history for a user
  async getChatHistory(
    userId: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<{ chats: Chat[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;

    const [chats, total] = await Promise.all([
      this.chatModel
        .find({ userId: new Types.ObjectId(userId) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.chatModel.countDocuments({ userId: new Types.ObjectId(userId) }),
    ]);

    return {
      chats: chats.reverse(), // chronological order
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Clear chat history for a user
  async clearChatHistory(userId: string): Promise<void> {
    await this.chatModel.deleteMany({ userId: new Types.ObjectId(userId) });
  }

  // Get chat statistics
  async getChatStats(userId: string): Promise<any> {
    const totalChats = await this.chatModel.countDocuments({ userId: new Types.ObjectId(userId) });

    return { totalMessages: totalChats };
  }
}