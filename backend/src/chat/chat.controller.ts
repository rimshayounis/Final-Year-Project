import {
  Controller, Get, Post, Param, Query, Body,
  UploadedFile, UseInterceptors, ParseIntPipe,
  DefaultValuePipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('history/:conversationId')
  getHistory(
    @Param('conversationId') conversationId: string,
    @Query('page',  new DefaultValuePipe(1),  ParseIntPipe) page:  number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.chatService.getHistory(conversationId, page, limit);
  }

  @Get('conversations/:userId')
  getConversations(@Param('userId') userId: string) {
    return this.chatService.getUserConversations(userId);
  }

  @Post('conversation')
  @HttpCode(HttpStatus.OK)
  async getOrCreate(@Body() body: { doctorId: string; patientId: string }) {
    const conv = await this.chatService.getOrCreateConversation(
      body.doctorId,
      body.patientId,
    );
    return {
      _id:           conv._id.toString(),
      participants:  (conv.participants as any[]).map(p => p.toString()),
      lastMessage:   conv.lastMessage,
      lastMessageAt: (conv as any).lastMessageAt,
    };
  }

  @Get('test-upload-path')
  testPath() {
    const uploadPath = join(process.cwd(), 'uploads');
    const voicePath  = join(uploadPath, 'chat', 'voice');
    const imagePath  = join(uploadPath, 'chat', 'image');

    let voiceFiles: string[] = [];
    let imageFiles: string[] = [];

    try { voiceFiles = fs.readdirSync(voicePath); }
    catch (e) { voiceFiles = [`ERROR: ${(e as any).message}`]; }

    try { imageFiles = fs.readdirSync(imagePath); }
    catch (e) { imageFiles = [`ERROR: ${(e as any).message}`]; }

    return { cwd: process.cwd(), uploadPath, voicePath, imagePath, voiceFiles, imageFiles };
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, _file, cb) => {
          const type = (req.query?.fileType as string) || 'misc';
          const dir  = join(process.cwd(), 'uploads', 'chat', type);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          console.log(`[Upload] fileType="${type}" dir="${dir}"`);
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `${unique}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 100 * 1024 * 1024 },
      // ✅ Only block executables — allow all image/video/audio/document types
      fileFilter: (_req, file, cb) => {
        const blocked = ['.exe', '.bat', '.sh', '.cmd', '.msi', '.dll', '.vbs'];
        const fileExt = extname(file.originalname).toLowerCase();
        if (blocked.includes(fileExt)) {
          return cb(new Error('File type not allowed'), false);
        }
        cb(null, true);
      },
    }),
  )
  uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Query('fileType') fileType: string,
    @Body() body: {
      conversationId: string;
      receiverId:     string;
      duration?:      string;
    },
  ) {
    if (!file) return { success: false, message: 'No file received' };

    const type    = fileType || 'misc';
    const appUrl  = process.env.APP_URL || 'http://192.168.100.47:3000';
    const fileUrl = `${appUrl}/uploads/chat/${type}/${file.filename}`;

    console.log(`[Upload] ✅ Disk path : ${file.path}`);
    console.log(`[Upload] ✅ Public URL: ${fileUrl}`);

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