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
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class PostsService {
  constructor(
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
    @InjectModel('User') private userModel: Model<any>,
    @InjectModel('Doctor') private doctorModel: Model<any>,
    private readonly pointsRewardService: PointsRewardService,
    private readonly notificationService: NotificationService,
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
      select: 'fullName email profileImage isBanned',
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
        select: 'fullName email profileImage isBanned',
        model: 'Doctor',
      });
    }

    return posts;
  }

  // ── Filter out posts from banned users/doctors ──
  private filterBannedAuthorPosts(posts: PostDocument[]): PostDocument[] {
    return posts.filter((post) => {
      const author = post.userId as any;
      if (!author) return false; // Exclude posts with no author
      return !author.isBanned; // Exclude if author is banned
    });
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

  // ── Interest → post category mapping ─────────────────────────────────────
  private readonly INTEREST_CATEGORY_MAP: Record<string, string[]> = {
    'Skin Care':     ['Hair & Skin'],
    'Hair Care':     ['Hair & Skin'],
    'Weight Loss':   ['Fitness', 'Nutrition'],
    'Weight Gain':   ['Fitness', 'Nutrition'],
    'Mental Health': ['Mental Health'],
    'Fitness':       ['Fitness'],
    'Nutrition':     ['Nutrition'],
    'Sleep Health':  ['General Health'],
  };

  async getRecommendedFeed(
    userId: string,
    page = 1,
    limit = 10,
  ): Promise<{ posts: PostDocument[]; total: number; page: number; totalPages: number; isPersonalized: boolean; matchedCategories: string[] }> {
    // 1. Load user interests
    const user = await this.userModel
      .findById(userId)
      .select('healthProfile')
      .lean()
      .exec();

    const interests: string[] = (user as any)?.healthProfile?.interests ?? [];

    // No interests saved → plain chronological feed
    if (!interests.length) {
      const base = await this.getApprovedPosts(page, limit);
      return { ...base, isPersonalized: false, matchedCategories: [] };
    }

    // 2. Map interests → post categories (deduplicated)
    const matchedCategories = [
      ...new Set(interests.flatMap((i) => this.INTEREST_CATEGORY_MAP[i] ?? [])),
    ];

    // 3. Find other users who share at least one interest (excluding banned users)
    const sameInterestUsers = await this.userModel
      .find({
        'healthProfile.interests': { $in: interests },
        _id: { $ne: new Types.ObjectId(userId) },
        isBanned: false,
      })
      .select('_id')
      .lean()
      .exec();

    const sameInterestUserIds = sameInterestUsers.map((u: any) =>
      new Types.ObjectId(u._id),
    );

    // 4. Aggregate: score each post, sort by score desc then newest
    const skip = (page - 1) * limit;

    const pipeline: any[] = [
      { $match: { status: 'approved', isActive: true } },
      {
        $addFields: {
          _score: {
            $add: [
              // +2 if the post category matches the user's interests
              {
                $cond: [{ $in: ['$category', matchedCategories] }, 2, 0],
              },
              // +1 if the post author shares at least one interest with this user
              {
                $cond: [
                  sameInterestUserIds.length > 0
                    ? { $in: ['$userId', sameInterestUserIds] }
                    : false,
                  1,
                  0,
                ],
              },
            ],
          },
        },
      },
      { $sort: { _score: -1, createdAt: -1 } },
      {
        $facet: {
          paged: [{ $skip: skip }, { $limit: limit }],
          count:  [{ $count: 'n' }],
        },
      },
    ];

    const [agg] = await this.postModel.aggregate(pipeline).exec();
    const total     = agg.count[0]?.n ?? 0;
    const rawPaged  = agg.paged as any[];

    // 5. Re-fetch as proper Mongoose documents (needed for populateAuthors)
    const orderedIds = rawPaged.map((p: any) => p._id);
    const docs = await this.postModel
      .find({ _id: { $in: orderedIds } })
      .exec();

    // Restore the aggregation sort order
    const idStr = orderedIds.map((id: any) => id.toString());
    docs.sort(
      (a, b) => idStr.indexOf(a._id.toString()) - idStr.indexOf(b._id.toString()),
    );

    await this.populateAuthors(docs);
    const filteredPosts = this.filterBannedAuthorPosts(docs);

    return {
      posts: filteredPosts,
      total: filteredPosts.length,
      page,
      totalPages: Math.ceil(filteredPosts.length / limit),
      isPersonalized: true,
      matchedCategories,
    };
  }

  async getApprovedPosts(
    page = 1,
    limit = 10,
    category?: string,
  ): Promise<{ posts: PostDocument[]; total: number; page: number; totalPages: number }> {
    const query: any = { status: 'approved', isActive: true };
    if (category) query.category = category;
    const skip = (page - 1) * limit;

    // Fetch more posts than requested to account for filtering banned users
    const fetchLimit = Math.max(limit * 2, 50);
    const [posts, total] = await Promise.all([
      this.postModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(fetchLimit).exec(),
      this.postModel.countDocuments(query),
    ]);

    await this.populateAuthors(posts);
    const filteredPosts = this.filterBannedAuthorPosts(posts).slice(0, limit);

    return { posts: filteredPosts, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getUserPosts(
    userId: string,
    page = 1,
    limit = 10,
  ): Promise<{ posts: PostDocument[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;

    // Return ALL posts for the owner including private (isActive=false)
    // Hard-deleted posts are gone from DB so no extra filter needed
    const [posts, total] = await Promise.all([
      this.postModel.find({ userId: new Types.ObjectId(userId) }).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.postModel.countDocuments({ userId: new Types.ObjectId(userId) }),
    ]);

    return { posts, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getPendingPosts(
    page = 1,
    limit = 10,
  ): Promise<{ posts: PostDocument[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;

    // Fetch more posts than requested to account for filtering banned users
    const fetchLimit = Math.max(limit * 2, 50);
    const [posts, total] = await Promise.all([
      this.postModel.find({ status: 'pending', isActive: true }).sort({ createdAt: -1 }).skip(skip).limit(fetchLimit).exec(),
      this.postModel.countDocuments({ status: 'pending', isActive: true }),
    ]);

    await this.populateAuthors(posts);
    const filteredPosts = this.filterBannedAuthorPosts(posts).slice(0, limit);

    return { posts: filteredPosts, total, page, totalPages: Math.ceil(total / limit) };
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

    // Content edits (not visibility-only) are subject to status restrictions
    const hasContentUpdate =
      updatePostDto.title !== undefined ||
      updatePostDto.description !== undefined ||
      updatePostDto.category !== undefined ||
      updatePostDto.mediaUrls !== undefined ||
      updatePostDto.backgroundColor !== undefined;

    if (hasContentUpdate) {
      const isDoctor = post.userModel === 'Doctor';
      if (!isDoctor && post.status !== 'pending') {
        throw new ForbiddenException('You can only edit posts that are pending review');
      }
      if (isDoctor && post.status === 'rejected') {
        throw new ForbiddenException('Rejected posts cannot be edited');
      }
    }

    // Strip userId from the fields saved to DB (never update the post owner)
    const { userId: _uid, ...updateFields } = updatePostDto as any;

    const updatedPost = await this.postModel.findByIdAndUpdate(id, updateFields, { new: true }).exec();
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

    await this.postModel.findByIdAndDelete(id).exec();

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

    // Fire-and-forget: notify post author about new like
    this.notificationService.notifyUserPostActivity({
      postAuthorId: (post.userId as any)?.toString() ?? '',
      authorModel:  (post as any).userModel ?? 'User',
      actorName:    'Someone',
      activity:     'liked',
      postTitle:    post.title ?? 'your post',
    }).catch(() => {});

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

    // Fire-and-forget: notify post author about new comment
    this.notificationService.notifyUserPostActivity({
      postAuthorId: (post.userId as any)?.toString() ?? '',
      authorModel:  (post as any).userModel ?? 'User',
      actorName:    userName ?? 'Someone',
      activity:     'commented on',
      postTitle:    post.title ?? 'your post',
    }).catch(() => {});

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

    // Fetch more posts than requested to account for filtering banned users
    const fetchLimit = Math.max(limit * 2, 50);
    const [posts, total] = await Promise.all([
      this.postModel.find({ category, status: 'approved', isActive: true }).sort({ createdAt: -1 }).skip(skip).limit(fetchLimit).exec(),
      this.postModel.countDocuments({ category, status: 'approved', isActive: true }),
    ]);

    await this.populateAuthors(posts);
    const filteredPosts = this.filterBannedAuthorPosts(posts).slice(0, limit);

    return { posts: filteredPosts, total, page, totalPages: Math.ceil(total / limit) };
  }
  // Admin: get all posts including private ones (isActive: false)
  async getAllPostsAdmin(
    page = 1,
    limit = 200,
  ): Promise<{ posts: PostDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const [posts, total] = await Promise.all([
      this.postModel.find().sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.postModel.countDocuments(),
    ]);
    await this.populateAuthors(posts);
    return { posts, total };
  }

  async adminRejectPost(id: string, rejectionReason: string): Promise<PostDocument> {
    const post = await this.postModel
      .findByIdAndUpdate(
        id,
        { status: 'rejected', rejectionReason },
        { new: true },
      )
      .exec();
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  async adminDelete(id: string) {
  const post = await this.postModel.findByIdAndDelete(id);
  if (!post) throw new NotFoundException('Post not found');
  return post;
}
}