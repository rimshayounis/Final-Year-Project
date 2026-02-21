import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Post, PostDocument } from './schemas/post.schema';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { ApprovePostDto } from './dto/approve-post.dto';

@Injectable()
export class PostsService {
  constructor(
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
  ) {}

  async create(createPostDto: CreatePostDto, mediaUrls: string[] = []): Promise<PostDocument> {
    try {
      const post = new this.postModel({
        ...createPostDto,
        userId: new Types.ObjectId(createPostDto.userId),
        mediaUrls: mediaUrls,
        status: 'pending',
      });
      return await post.save();
    } catch (error) {
      throw new BadRequestException('Failed to create post');
    }
  }

  async getApprovedPosts(
    page = 1,
    limit = 10,
    category?: string,
  ): Promise<{ posts: PostDocument[]; total: number; page: number; totalPages: number }> {
    const query: any = { status: 'approved', isActive: true };
    if (category) query.category = category;
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      this.postModel.find(query).populate('userId', 'fullName email profileImage').sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.postModel.countDocuments(query),
    ]);

    return { posts, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getUserPosts(
    userId: string,
    page = 1,
    limit = 10,
  ): Promise<{ posts: PostDocument[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      this.postModel.find({ userId: new Types.ObjectId(userId), isActive: true }).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.postModel.countDocuments({ userId: new Types.ObjectId(userId), isActive: true }),
    ]);

    return { posts, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getPendingPosts(
    page = 1,
    limit = 10,
  ): Promise<{ posts: PostDocument[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      this.postModel.find({ status: 'pending', isActive: true }).populate('userId', 'fullName email profileImage').sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.postModel.countDocuments({ status: 'pending', isActive: true }),
    ]);

    return { posts, total, page, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string): Promise<PostDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid post ID');
    }

    const post = await this.postModel
      .findById(id)
      .populate('userId', 'fullName email profileImage')
      .populate('approvedBy', 'fullName email')
      .exec();

    if (!post) throw new NotFoundException(`Post with ID ${id} not found`);
    return post;
  }

  async update(id: string, userId: string, updatePostDto: UpdatePostDto): Promise<PostDocument> {
    const post = await this.findOne(id);

    if (post.userId.toString() !== userId) {
      throw new ForbiddenException('You can only edit your own posts');
    }
    if (post.status !== 'pending') {
      throw new BadRequestException('Only pending posts can be edited');
    }

    const updatedPost = await this.postModel.findByIdAndUpdate(id, updatePostDto, { new: true }).exec();
    if (!updatedPost) throw new NotFoundException(`Post with ID ${id} not found`);
    return updatedPost;
  }

  async delete(id: string, userId: string): Promise<void> {
    const post = await this.findOne(id);

    if (post.userId.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own posts');
    }
    if (post.status !== 'pending') {
      throw new BadRequestException('Only pending posts can be deleted');
    }

    await this.postModel.findByIdAndUpdate(id, { isActive: false }).exec();
  }

  async approveOrReject(id: string, approvePostDto: ApprovePostDto): Promise<PostDocument> {
    const post = await this.findOne(id);

    if (post.status !== 'pending') {
      throw new BadRequestException('This post has already been reviewed');
    }

    const updateData: any = {
      status: approvePostDto.action,
      approvedBy: new Types.ObjectId(approvePostDto.doctorId),
      approvedAt: new Date(),
    };

    if (approvePostDto.action === 'rejected' && approvePostDto.rejectionReason) {
      updateData.rejectionReason = approvePostDto.rejectionReason;
    }

    const updatedPost = await this.postModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('userId', 'fullName email')
      .populate('approvedBy', 'fullName email')
      .exec();

    if (!updatedPost) throw new NotFoundException(`Post with ID ${id} not found`);
    return updatedPost;
  }

  async incrementLikes(id: string): Promise<PostDocument> {
    const post = await this.postModel
      .findByIdAndUpdate(id, { $inc: { likes: 1 } }, { new: true })
      .exec();
    if (!post) throw new NotFoundException(`Post with ID ${id} not found`);
    return post;
  }

  // ── FIXED: two-step update to handle missing commentsList on old posts ──
  async addComment(
    id: string,
    userId: string,
    text: string,
    userName?: string,
  ): Promise<PostDocument> {
    const newComment = {
      _id: new Types.ObjectId(),
      userId: new Types.ObjectId(userId),
      userName: userName && userName.trim() !== '' ? userName : 'User',
      text,
      createdAt: new Date(),
    };

    // Step 1: initialize commentsList if it doesn't exist on this document
    await this.postModel.updateOne(
      { _id: new Types.ObjectId(id), commentsList: { $exists: false } },
      { $set: { commentsList: [] } },
    ).exec();

    // Step 2: push new comment and increment counter
    const post = await this.postModel
      .findByIdAndUpdate(
        id,
        {
          $inc: { comments: 1 },
          $push: { commentsList: newComment },
        },
        { new: true },
      )
      .exec();

    if (!post) throw new NotFoundException(`Post with ID ${id} not found`);
    return post;
  }

  // ── Fetch comments list for a post ──────────────────────────────
  async getComments(id: string): Promise<any[]> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid post ID');
    }
    const post = await this.postModel
      .findById(id)
      .select('commentsList')
      .exec();
    if (!post) throw new NotFoundException(`Post with ID ${id} not found`);
    return post.commentsList || [];
  }

  async incrementShares(id: string): Promise<PostDocument> {
    const post = await this.postModel
      .findByIdAndUpdate(id, { $inc: { shares: 1 } }, { new: true })
      .exec();
    if (!post) throw new NotFoundException(`Post with ID ${id} not found`);
    return post;
  }

  async getPostsByCategory(
    category: string,
    page = 1,
    limit = 10,
  ): Promise<{ posts: PostDocument[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      this.postModel.find({ category, status: 'approved', isActive: true }).populate('userId', 'fullName email profileImage').sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.postModel.countDocuments({ category, status: 'approved', isActive: true }),
    ]);

    return { posts, total, page, totalPages: Math.ceil(total / limit) };
  }
}