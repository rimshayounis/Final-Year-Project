import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Query,
  Param,
} from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { SendMessageDto } from './dto/chat.dto';

@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post('message')
  async sendMessage(@Body() sendMessageDto: SendMessageDto) {
    const chatRecord = await this.chatbotService.sendMessage(sendMessageDto);
    const c = chatRecord as any;

    return {
      success: true,
      message: 'Message sent successfully',
      data: {
        // Frontend reads response.data.data.botResponse
        botResponse: {
          id: c._id,
          text: c.response,
          isUser: false,
          timestamp: c.createdAt,
        },
      },
    };
  }

  @Get('history/:userId')
  async getChatHistory(
    @Param('userId') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
  ) {
    const result = await this.chatbotService.getChatHistory(userId, page, limit);

    return {
      success: true,
      // Frontend reads response.data.data — array of items with .message and .response
      data: result.chats.map((chat) => {
        const c = chat as any;
        return {
          _id: c._id,
          message: c.message,       // ← frontend checks item.message for user bubble
          response: c.response,     // ← frontend checks item.response for bot bubble
          imageUrl: c.imageUrl,
          createdAt: c.createdAt,
        };
      }),
      pagination: {
        page: result.page,
        limit: Number(limit),
        total: result.total,
        totalPages: result.totalPages,
      },
    };
  }

  @Delete('history/:userId')
  async clearChatHistory(@Param('userId') userId: string) {
    await this.chatbotService.clearChatHistory(userId);
    return {
      success: true,
      message: 'Chat history cleared successfully',
    };
  }

  @Get('stats/:userId')
  async getChatStats(@Param('userId') userId: string) {
    const stats = await this.chatbotService.getChatStats(userId);
    return { success: true, data: stats };
  }
}