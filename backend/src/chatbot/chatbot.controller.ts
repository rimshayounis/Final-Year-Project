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

  // Send message to chatbot
  @Post('message')
  async sendMessage(@Body() sendMessageDto: SendMessageDto) {
    const result = await this.chatbotService.sendMessage(sendMessageDto);
    
    const userMsg = result.userMessage as any;
    const botMsg = result.botResponse as any;

    return {
      success: true,
      message: 'Message sent successfully',
      data: {
        userMessage: {
          id: userMsg._id,
          text: userMsg.message,
          isUser: true,
          timestamp: userMsg.createdAt,
          image: userMsg.imageUrl,
        },
        botResponse: {
          id: botMsg._id,
          text: botMsg.response,
          isUser: false,
          timestamp: botMsg.createdAt,
        },
      },
    };
  }

  // Get chat history
  @Get('history/:userId')
  async getChatHistory(
    @Param('userId') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
  ) {
    const result = await this.chatbotService.getChatHistory(userId, page, limit);

    return {
      success: true,
      data: result.chats.map((chat) => {
        const c = chat as any;
        return {
          id: c._id,
          text: c.response || c.message,
          isUser: !c.response,
          timestamp: c.createdAt,
          image: c.imageUrl,
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

  // Clear chat history
  @Delete('history/:userId')
  async clearChatHistory(@Param('userId') userId: string) {
    await this.chatbotService.clearChatHistory(userId);

    return {
      success: true,
      message: 'Chat history cleared successfully',
    };
  }

  // Get chat statistics
  @Get('stats/:userId')
  async getChatStats(@Param('userId') userId: string) {
    const stats = await this.chatbotService.getChatStats(userId);

    return {
      success: true,
      data: stats,
    };
  }
}