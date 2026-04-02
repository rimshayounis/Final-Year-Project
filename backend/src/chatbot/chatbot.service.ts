import { Injectable, BadRequestException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Chat, ChatDocument } from './schemas/chat.schema';
import { SendMessageDto } from './dto/chat.dto';

@Injectable()
export class ChatbotService implements OnModuleInit {
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
    this.url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${this.apiKey}`;
    console.log('✅ Gemini initialized successfully');
  }

  async sendMessage(sendMessageDto: SendMessageDto): Promise<ChatDocument> {
    try {
      // 1. Get recent history for context
      const recentChats = await this.chatModel
        .find({
          userId: new Types.ObjectId(sendMessageDto.userId),
          response: { $ne: '' },
        })
        .sort({ createdAt: -1 })
        .limit(10)
        .exec();

      // 2. Build conversation history string
      const historyText = recentChats
        .reverse()
        .map((chat) => `User: ${chat.message}\nBot: ${chat.response}`)
        .join('\n\n');

      // 3. System prompt
      const systemPrompt = `You are a helpful healthcare assistant for TruHeal-Link, a healthcare application.
Your role is to:
- Provide general health tips and wellness advice
- Answer basic health-related questions
- Help users find doctors from our platform
- Be empathetic and supportive
- Never diagnose conditions or prescribe medications
- Always recommend professional medical consultation for serious concerns
- Keep responses concise, friendly, and easy to understand
- Use emojis occasionally to make conversations more engaging

CRITICAL RULES:
1. NEVER tell users to "Google it", "search online", "look it up online", or "find a doctor yourself". You ALWAYS recommend doctors directly from TruHeal-Link.
2. NEVER say you cannot help find a doctor. Always use the marker below to show doctors.
3. Always clarify that you're not a replacement for professional medical advice.

DOCTOR RECOMMENDATION RULE:
You MUST append the marker below in ALL of these situations:
- Whenever the user mentions ANY health symptom, disease, illness, pain, or medical condition
- Whenever the user asks to "find a doctor", "suggest a doctor", "recommend a doctor", "I need a doctor", "show me doctors", "which doctor", "what doctor", "help me find a doctor", or any similar request
- Whenever the user asks about visiting, consulting, or seeing a doctor
- Whenever the user asks "who should I see" about any health matter

Append EXACTLY this marker on a new line at the very end of your response:
[RECOMMEND_DOCTOR:specialization]

Pick the single best-matching specialization (one word or short phrase, lowercase) from the list below. If no specific condition is mentioned or if the user just asks for a doctor generally, use "general practice".

Specialization mapping:
- Skin rash, acne, eczema, psoriasis, skin infection, skin redness, itchy skin, hives, dermatitis, rosacea, skin allergy, hair loss, nail problems → dermatology
- Depression, anxiety, stress, mental health, mood swings, bipolar, OCD, PTSD, insomnia, panic attacks → psychiatry
- Sadness, loneliness, trauma, emotional distress, grief, burnout → psychology
- Bone pain, joint pain, back pain, fracture, muscle injury, arthritis, knee pain, spine issues, sports injury → orthopedics
- Chest pain, heart palpitations, high blood pressure, shortness of breath, heart disease, cholesterol → cardiology
- Fever, cold, flu, fatigue, weakness, general illness, cough, body ache, weight loss, dizziness → general practice
- Eye pain, blurred vision, redness in eye, eye infection, vision loss, glasses issues → ophthalmology
- Ear pain, hearing loss, ringing in ear, nose bleeding, throat pain, tonsils, sinusitis → ENT
- Stomach pain, nausea, vomiting, diarrhea, constipation, acid reflux, bloating, liver issues, IBS → gastroenterology
- Child illness, pediatric fever, growth issues, child vaccination → pediatrics
- Menstrual issues, pregnancy, PCOS, fertility, vaginal infection, menopause → gynecology
- Diabetes, thyroid, hormonal imbalance, obesity, metabolic disorder → endocrinology
- Frequent urination, kidney stone, UTI, bladder issues, prostate → urology
- Headache, migraine, seizure, memory loss, numbness, stroke, nerve pain, Parkinson's, MS → neurology
- Cough with blood, breathing difficulty, asthma, pneumonia, tuberculosis, lung disease → pulmonology
- Allergy, food intolerance, immune disorder, autoimmune disease → immunology
- Cancer, tumor, chemotherapy → oncology
- Tooth pain, gum disease, cavity, jaw pain, dental issue → dentistry
- Broken bone, severe injury, wound, burn, appendicitis, hernia → surgery
- Blood disorder, anemia, clotting issues → hematology
- Kidney disease, dialysis, renal failure → nephrology

The marker MUST be the very last line of your response with absolutely no text after it.`;

      const fullPrompt = `${systemPrompt}\n\n${historyText}\nUser: ${sendMessageDto.message}\nBot:`;

      // 4. Call Gemini API
      const response = await axios.post(
        this.url,
        {
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500,
            candidateCount: 1,
          },
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        },
      );

      // 5. Parse response
      const botResponseText =
        response.data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
        'I apologize, but I could not generate a response.';

      // 6. Save as ONE combined record (message + response together)
      const chatRecord = new this.chatModel({
        userId: new Types.ObjectId(sendMessageDto.userId),
        message: sendMessageDto.message,
        response: botResponseText,           // ← saved together, no empty record
        imageUrl: sendMessageDto.imageUrl || null,
        fileUrl: sendMessageDto.fileUrl || null,
        metadata: {
          model: 'gemini-2.5-flash',
          timestamp: new Date(),
        },
      });

      await chatRecord.save();

      return chatRecord;
    } catch (error: any) {
      console.error('Gemini API Error:', error.response?.data || error.message);
      throw new BadRequestException(
        'Failed to get response from chatbot. Please try again.',
      );
    }
  }

  async getChatHistory(
    userId: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<{ chats: ChatDocument[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;

    const [chats, total] = await Promise.all([
      this.chatModel
        .find({
          userId: new Types.ObjectId(userId),
          response: { $ne: '' },   // ← only fetch complete records
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.chatModel.countDocuments({
        userId: new Types.ObjectId(userId),
        response: { $ne: '' },
      }),
    ]);

    return {
      chats: chats.reverse(),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async clearChatHistory(userId: string): Promise<void> {
    await this.chatModel.deleteMany({ userId: new Types.ObjectId(userId) });
  }

  async getChatStats(userId: string): Promise<any> {
    const totalChats = await this.chatModel.countDocuments({
      userId: new Types.ObjectId(userId),
    });
    return { totalMessages: totalChats };
  }
}