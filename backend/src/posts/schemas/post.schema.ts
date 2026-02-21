import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PostDocument = Post & Document;

// ── Comment Sub-Schema ──────────────────────────────────────────
@Schema({ _id: true, timestamps: true })
export class Comment {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ default: 'User' })
  userName: string;

  @Prop({ required: true })
  text: string;

  @Prop({ default: () => new Date() })
  createdAt: Date;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);

// ── Post Schema ─────────────────────────────────────────────────
@Schema({ timestamps: true })
export class Post {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  category: string;

  @Prop({ type: [String], default: [] })
  mediaUrls: string[];

  @Prop({ default: null })
  backgroundColor: string;

  @Prop({
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  })
  status: string;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  approvedBy: Types.ObjectId;

  @Prop({ default: null })
  approvedAt: Date;

  @Prop({ default: null })
  rejectionReason: string;

  @Prop({ default: 0 })
  likes: number;

  @Prop({ default: 0 })
  comments: number;

  @Prop({ default: 0 })
  shares: number;

  @Prop({ type: [CommentSchema], default: [] })   // ← NEW
  commentsList: Comment[];

  @Prop({ default: true })
  isActive: boolean;
}

export const PostSchema = SchemaFactory.createForClass(Post);

PostSchema.index({ userId: 1, status: 1 });
PostSchema.index({ status: 1, createdAt: -1 });
PostSchema.index({ category: 1, status: 1 });