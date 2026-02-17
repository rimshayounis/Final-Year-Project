import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { ApprovePostDto } from './dto/approve-post.dto';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  // Create new post with media upload
  @Post()
  @UseInterceptors(
    FilesInterceptor('media', 5, {
      storage: diskStorage({
        destination: './uploads/posts',
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `post-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
          return callback(new BadRequestException('Only image files are allowed'), false);
        }
        callback(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  async create(
    @Body() createPostDto: CreatePostDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (files && files.length > 0) {
      createPostDto.mediaUrls = files.map((file) => `/uploads/posts/${file.filename}`);
    }

    const post = await this.postsService.create(createPostDto);

    return {
      success: true,
      message: 'Post created successfully and is pending approval',
      data: post,
    };
  }

  // Get approved posts for feed
  @Get('feed')
  async getFeed(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('category') category?: string,
  ) {
    const result = await this.postsService.getApprovedPosts(page, limit, category);

    return {
      success: true,
      data: result.posts,
      pagination: {
        page: result.page,
        limit: Number(limit),
        total: result.total,
        totalPages: result.totalPages,
      },
    };
  }

  // Get user's own posts (all statuses)
  @Get('user/:userId')
  async getUserPosts(
    @Param('userId') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    const result = await this.postsService.getUserPosts(userId, page, limit);

    return {
      success: true,
      data: result.posts,
      pagination: {
        page: result.page,
        limit: Number(limit),
        total: result.total,
        totalPages: result.totalPages,
      },
    };
  }

  // Get pending posts (for doctors)
  @Get('pending')
  async getPendingPosts(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    const result = await this.postsService.getPendingPosts(page, limit);

    return {
      success: true,
      data: result.posts,
      pagination: {
        page: result.page,
        limit: Number(limit),
        total: result.total,
        totalPages: result.totalPages,
      },
    };
  }

  // Get single post
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const post = await this.postsService.findOne(id);

    return {
      success: true,
      data: post,
    };
  }

  // Update post (only pending posts by owner)
  @Patch(':id')
  @UseInterceptors(
    FilesInterceptor('media', 5, {
      storage: diskStorage({
        destination: './uploads/posts',
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `post-${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  async update(
    @Param('id') id: string,
    @Body() updatePostDto: UpdatePostDto & { userId: string },
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (files && files.length > 0) {
      updatePostDto.mediaUrls = files.map((file) => `/uploads/posts/${file.filename}`);
    }

    const post = await this.postsService.update(id, updatePostDto.userId, updatePostDto);

    return {
      success: true,
      message: 'Post updated successfully',
      data: post,
    };
  }

  // Delete post (only pending posts by owner)
  @Delete(':id/:userId')
  async delete(@Param('id') id: string, @Param('userId') userId: string) {
    await this.postsService.delete(id, userId);

    return {
      success: true,
      message: 'Post deleted successfully',
    };
  }

  // Doctor approves or rejects post
  @Post(':id/review')
  async reviewPost(@Param('id') id: string, @Body() approvePostDto: ApprovePostDto) {
    const post = await this.postsService.approveOrReject(id, approvePostDto);

    return {
      success: true,
      message: `Post ${approvePostDto.action} successfully`,
      data: post,
    };
  }

  // Like post
  @Post(':id/like')
  async likePost(@Param('id') id: string) {
    const post = await this.postsService.incrementLikes(id);

    return {
      success: true,
      data: post,
    };
  }

  // Comment on post (increment counter)
  @Post(':id/comment')
  async commentPost(@Param('id') id: string) {
    const post = await this.postsService.incrementComments(id);

    return {
      success: true,
      data: post,
    };
  }

  // Share post (increment counter)
  @Post(':id/share')
  async sharePost(@Param('id') id: string) {
    const post = await this.postsService.incrementShares(id);

    return {
      success: true,
      data: post,
    };
  }

  // Get posts by category
  @Get('category/:category')
  async getByCategory(
    @Param('category') category: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    const result = await this.postsService.getPostsByCategory(category, page, limit);

    return {
      success: true,
      data: result.posts,
      pagination: {
        page: result.page,
        limit: Number(limit),
        total: result.total,
        totalPages: result.totalPages,
      },
    };
  }
}