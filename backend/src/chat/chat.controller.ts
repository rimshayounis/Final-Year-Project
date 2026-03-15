// ─────────────────────────────────────────────────────────────────────────────
//  src/chat/chat.controller.ts
// ─────────────────────────────────────────────────────────────────────────────

import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UploadedFile,
  UseInterceptors,
  ParseIntPipe,
  DefaultValuePipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // ── GET /chat/history/:conversationId?page=1&limit=50 ──────────────────────
  @Get('history/:conversationId')
  getHistory(
    @Param('conversationId') conversationId: string,
    @Query('page',  new DefaultValuePipe(1),  ParseIntPipe) page:  number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.chatService.getHistory(conversationId, page, limit);
  }

  // ── GET /chat/conversations/:userId ───────────────────────────────────────
  @Get('conversations/:userId')
  getConversations(@Param('userId') userId: string) {
    return this.chatService.getUserConversations(userId);
  }

  // ── POST /chat/conversation  { doctorId, patientId } ──────────────────────
  @Post('conversation')
  @HttpCode(HttpStatus.OK)
  getOrCreate(
    @Body() body: { doctorId: string; patientId: string },
  ) {
    return this.chatService.getOrCreateConversation(body.doctorId, body.patientId);
  }

  // ── POST /chat/upload ──────────────────────────────────────────────────────
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, _file, cb) => {
          const type = (req.body?.fileType as string) || 'misc';
          const dir  = join(process.cwd(), 'uploads', 'chat', type);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `${unique}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 50 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const blocked = ['.exe', '.bat', '.sh', '.cmd', '.msi'];
        if (blocked.includes(extname(file.originalname).toLowerCase())) {
          return cb(new Error('File type not allowed'), false);
        }
        cb(null, true);
      },
    }),
  )
  uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: {
      conversationId: string;
      receiverId: string;
      fileType: string;
      duration?: string;
    },
  ) {
    if (!file) {
      return { success: false, message: 'No file received' };
    }

    const appUrl  = process.env.APP_URL || 'http://192.168.100.47:3000';
    const fileUrl = `${appUrl}/uploads/chat/${body.fileType}/${file.filename}`;

    return {
      success:  true,
      fileUrl,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      duration: body.duration ? Number(body.duration) : 0,
    };
  }
}
