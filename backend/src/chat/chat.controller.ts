import {
  Controller, Get, Post, Param, Query, Body, Req,
  UploadedFile, UseInterceptors, ParseIntPipe,
  DefaultValuePipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';
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
      body.patientId,
      body.doctorId,
    );
    return {
      _id:           conv._id.toString(),
      patientId:     conv.patientId.toString(),
      doctorId:      conv.doctorId.toString(),
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

  // ✅ SINGLE @Post('upload') — no duplicates
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        // ✅ Save to temp first — fileType is not reliably available in multer's
        // destination callback because multer runs BEFORE NestJS parses the query
        destination: (_req, _file, cb) => {
          const dir = join(process.cwd(), 'uploads', 'chat', 'temp');
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `${unique}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 100 * 1024 * 1024 },
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
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File,
    @Query('fileType') fileType: string,
    @Body() body: {
      conversationId: string;
      receiverId:     string;
      duration?:      string;
    },
  ) {
    if (!file) return { success: false, message: 'No file received' };

    // ✅ fileType is now properly parsed by NestJS before this runs
    const type = fileType || 'misc';

    // ✅ Move file from temp folder to the correct folder
    const targetDir  = join(process.cwd(), 'uploads', 'chat', type);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

    const targetPath = join(targetDir, file.filename);
    fs.renameSync(file.path, targetPath);

    const appUrl  = `${req.protocol}://${req.get('host')}`;
    const fileUrl = `${appUrl}/uploads/chat/${type}/${file.filename}`;

    console.log(`[Upload] ✅ fileType : ${type}`);
    console.log(`[Upload] ✅ Disk path: ${targetPath}`);
    console.log(`[Upload] ✅ URL      : ${fileUrl}`);

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