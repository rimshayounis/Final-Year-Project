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
import { PointsRewardService } from '../points-reward/points-reward.service';

@Injectable()
export class PostsService {
  constructor(
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
    @InjectModel('User') private userModel: Model<any>,
    @InjectModel('Doctor') private doctorModel: Model<any>,
    private readonly pointsRewardService: PointsRewardService,
  ) {}

  // ── Populate userId from User first, then Doctor for unpopulated posts ──
  // ── Populate userId using refPath (works for both User and Doctor) ──
  private async populateAuthors(posts: PostDocument[]): Promise<PostDocument[]> {
    // Ensure userModel is set correctly before populating
    // Old posts may have wrong userModel - fix on the fly
    for (const post of posts) {
      if (!(post as any).userModel) {
        (post as any).userModel = 'User';
      }
    }

    // First pass: populate with refPath
    await this.postModel.populate(posts, {
      path: 'userId',
      select: 'fullName email profileImage',
    });

    // Second pass: for any post where userId.fullName is still null,
    // the userModel was wrong — try Doctor collection explicitly
    const stillUnpopulated = posts.filter(
      (p) => p.userId && !(p.userId as any)?.fullName,
    );

    if (stillUnpopulated.length > 0) {
      // Override userModel to Doctor and re-populate
      for (const post of stillUnpopulated) {
        (post as any).userModel = 'Doctor';
      }
      await this.postModel.populate(stillUnpopulated, {
        path: 'userId',
        select: 'fullName email profileImage',
        model: 'Doctor',
      });
    }

    return posts;
  }


  async create(createPostDto: CreatePostDto, mediaUrls: string[] = []): Promise<PostDocument> {
    try {
      const post = new this.postModel({
        ...createPostDto,
        userId: new Types.ObjectId(createPostDto.userId),
        userModel: createPostDto.userModel || 'User', // 'Doctor' for doctor posts
        mediaUrls: mediaUrls,
        status: createPostDto.status || 'pending',
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
      this.postModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.postModel.countDocuments(query),
    ]);

    await this.populateAuthors(posts);

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
      this.postModel.find({ status: 'pending', isActive: true }).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.postModel.countDocuments({ status: 'pending', isActive: true }),
    ]);

    await this.populateAuthors(posts);

    return { posts, total, page, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string): Promise<PostDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid post ID');
    }

    const post = await this.postModel
      .findById(id)
      .populate('approvedBy', 'fullName email')
      .exec();

    if (!post) throw new NotFoundException(`Post with ID ${id} not found`);

    await this.populateAuthors([post]);

    return post;
  }

  async update(id: string, userId: string, updatePostDto: UpdatePostDto): Promise<PostDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid post ID');
    }

    const post = await this.postModel.findById(id).exec();
    if (!post) throw new NotFoundException(`Post with ID ${id} not found`);

    if (!post.userId || post.userId.toString() !== userId) {
      throw new ForbiddenException('You can only edit your own posts');
    }

    const updatedPost = await this.postModel.findByIdAndUpdate(id, updatePostDto, { new: true }).exec();
    if (!updatedPost) throw new NotFoundException(`Post with ID ${id} not found`);
    return updatedPost;
  }

  async delete(id: string, userId: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid post ID');
    }

    const post = await this.postModel.findById(id).exec();
    if (!post) throw new NotFoundException(`Post with ID ${id} not found`);

    if (!post.userId || post.userId.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    await this.postModel.findByIdAndUpdate(id, { isActive: false }).exec();

    // Fire-and-forget: reverse all milestone points earned from this post
    if (post.approvedBy && post.status === 'approved') {
      this.pointsRewardService
        .handlePostDeleted(id, post.approvedBy.toString(), post.likes)
        .catch((err) => console.error('[PointsReward] handlePostDeleted failed:', err?.message));
    }
  }

  async approveOrReject(id: string, approvePostDto: ApprovePostDto): Promise<PostDocument> {
    // ── Slot check: only when approving (rejection doesn't cost a slot) ──
    if (approvePostDto.action === 'approved') {
      const doctor = await this.doctorModel
        .findById(approvePostDto.doctorId)
        .select('subscriptionPlan')
        .exec();

      const plan = (doctor as any)?.subscriptionPlan ?? 'free_trial';
      await this.pointsRewardService.checkAndConsumeVerificationSlot(
        approvePostDto.doctorId,
        plan,
      );
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
      .populate('approvedBy', 'fullName email')
      .exec();

    if (!updatedPost) throw new NotFoundException(`Post with ID ${id} not found`);

    await this.populateAuthors([updatedPost]);

    return updatedPost;
  }

  async incrementLikes(id: string): Promise<PostDocument> {
    const post = await this.postModel
      .findByIdAndUpdate(id, { $inc: { likes: 1 } }, { new: true })
      .exec();
    if (!post) throw new NotFoundException(`Post with ID ${id} not found`);

    // Fire-and-forget: award points/trust badge to the approving doctor
    if (post.approvedBy && post.status === 'approved') {
      this.pointsRewardService
        .handleLikeMilestone(
          post._id.toString(),
          post.likes,
          post.approvedBy.toString(),
        )
        .catch((err) => console.error('[PointsReward] handleLikeMilestone failed:', err?.message));
    }

    return post;
  }

  async decrementLikes(id: string): Promise<PostDocument> {
    const post = await this.postModel
      .findByIdAndUpdate(id, { $inc: { likes: -1 } }, { new: true })
      .exec();
    if (!post) throw new NotFoundException(`Post with ID ${id} not found`);

    // Fire-and-forget: reverse any milestone points that are no longer valid
    if (post.approvedBy && post.status === 'approved') {
      this.pointsRewardService
        .handleLikeDecrement(
          post._id.toString(),
          post.likes,
          post.approvedBy.toString(),
        )
        .catch(() => { /* silent */ });
    }

    return post;
  }

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

    await this.postModel.updateOne(
      { _id: new Types.ObjectId(id), commentsList: { $exists: false } },
      { $set: { commentsList: [] } },
    ).exec();

    const post = await this.postModel
      .findByIdAndUpdate(
        id,
        { $inc: { comments: 1 }, $push: { commentsList: newComment } },
        { new: true },
      )
      .exec();

    if (!post) throw new NotFoundException(`Post with ID ${id} not found`);
    return post;
  }

  async getComments(id: string): Promise<any[]> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid post ID');
    }
    const post = await this.postModel.findById(id).select('commentsList').exec();
    if (!post) throw new NotFoundException(`Post with ID ${id} not found`);
    return post.commentsList || [];
  }

  async countApprovedByDoctor(doctorId: string): Promise<number> {
    if (!Types.ObjectId.isValid(doctorId)) return 0;
    return this.postModel.countDocuments({
      approvedBy: new Types.ObjectId(doctorId),
      status: 'approved',
    }).exec();
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
      this.postModel.find({ category, status: 'approved', isActive: true }).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.postModel.countDocuments({ category, status: 'approved', isActive: true }),
    ]);

    await this.populateAuthors(posts);

    return { posts, total, page, totalPages: Math.ceil(total / limit) };
  }
}