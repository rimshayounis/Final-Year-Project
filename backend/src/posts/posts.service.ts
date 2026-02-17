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

  // =========================
  // CREATE POST
  // =========================
  async create(createPostDto: CreatePostDto): Promise<PostDocument> {
    try {
      const post = new this.postModel({
        ...createPostDto,
        userId: new Types.ObjectId(createPostDto.userId),
        status: 'pending',
      });

      return await post.save();
    } catch {
      throw new BadRequestException('Failed to create post');
    }
  }

  // =========================
  // GET APPROVED POSTS
  // =========================
  async getApprovedPosts(
    page = 1,
    limit = 10,
    category?: string,
  ): Promise<{
    posts: PostDocument[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const query: any = { status: 'approved', isActive: true };

    if (category) query.category = category;

    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      this.postModel
        .find(query)
        .populate('userId', 'fullName email profileImage')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.postModel.countDocuments(query),
    ]);

    return {
      posts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // =========================
  // GET USER POSTS
  // =========================
  async getUserPosts(
    userId: string,
    page = 1,
    limit = 10,
  ): Promise<{
    posts: PostDocument[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      this.postModel
        .find({
          userId: new Types.ObjectId(userId),
          isActive: true,
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.postModel.countDocuments({
        userId: new Types.ObjectId(userId),
        isActive: true,
      }),
    ]);

    return {
      posts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // =========================
  // GET PENDING POSTS
  // =========================
  async getPendingPosts(
    page = 1,
    limit = 10,
  ): Promise<{
    posts: PostDocument[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      this.postModel
        .find({ status: 'pending', isActive: true })
        .populate('userId', 'fullName email profileImage')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.postModel.countDocuments({
        status: 'pending',
        isActive: true,
      }),
    ]);

    return {
      posts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // =========================
  // FIND ONE
  // =========================
  async findOne(id: string): Promise<PostDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid post ID');
    }

    const post = await this.postModel
      .findById(id)
      .populate('userId', 'fullName email profileImage')
      .populate('approvedBy', 'fullName email')
      .exec();

    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }

    return post;
  }

  // =========================
  // UPDATE POST
  // =========================
  async update(
    id: string,
    userId: string,
    updatePostDto: UpdatePostDto,
  ): Promise<PostDocument> {
    const post = await this.findOne(id);

    if (post.userId.toString() !== userId) {
      throw new ForbiddenException('You can only edit your own posts');
    }

    if (post.status !== 'pending') {
      throw new BadRequestException('Only pending posts can be edited');
    }

    const updatedPost = await this.postModel
      .findByIdAndUpdate(id, updatePostDto, { new: true })
      .exec();

    if (!updatedPost) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }

    return updatedPost;
  }

  // =========================
  // SOFT DELETE
  // =========================
  async delete(id: string, userId: string): Promise<void> {
    const post = await this.findOne(id);

    if (post.userId.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    if (post.status !== 'pending') {
      throw new BadRequestException('Only pending posts can be deleted');
    }

    await this.postModel
      .findByIdAndUpdate(id, { isActive: false })
      .exec();
  }

  // =========================
  // APPROVE / REJECT
  // =========================
  async approveOrReject(
    id: string,
    approvePostDto: ApprovePostDto,
  ): Promise<PostDocument> {
    const post = await this.findOne(id);

    if (post.status !== 'pending') {
      throw new BadRequestException(
        'This post has already been reviewed',
      );
    }

    const updateData: any = {
      status: approvePostDto.action,
      approvedBy: new Types.ObjectId(approvePostDto.doctorId),
      approvedAt: new Date(),
    };

    if (
      approvePostDto.action === 'rejected' &&
      approvePostDto.rejectionReason
    ) {
      updateData.rejectionReason =
        approvePostDto.rejectionReason;
    }

    const updatedPost = await this.postModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('userId', 'fullName email')
      .populate('approvedBy', 'fullName email')
      .exec();

    if (!updatedPost) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }

    return updatedPost;
  }

  // =========================
  // INCREMENT HELPERS
  // =========================
  async incrementLikes(id: string): Promise<PostDocument> {
    const post = await this.postModel
      .findByIdAndUpdate(id, { $inc: { likes: 1 } }, { new: true })
      .exec();

    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }

    return post;
  }

  async incrementComments(id: string): Promise<PostDocument> {
    const post = await this.postModel
      .findByIdAndUpdate(id, { $inc: { comments: 1 } }, { new: true })
      .exec();

    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }

    return post;
  }

  async incrementShares(id: string): Promise<PostDocument> {
    const post = await this.postModel
      .findByIdAndUpdate(id, { $inc: { shares: 1 } }, { new: true })
      .exec();

    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }

    return post;
  }

  // =========================
  // GET POSTS BY CATEGORY
  // =========================
  async getPostsByCategory(
    category: string,
    page = 1,
    limit = 10,
  ): Promise<{
    posts: PostDocument[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      this.postModel
        .find({ category, status: 'approved', isActive: true })
        .populate('userId', 'fullName email profileImage')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.postModel.countDocuments({
        category,
        status: 'approved',
        isActive: true,
      }),
    ]);

    return {
      posts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}
