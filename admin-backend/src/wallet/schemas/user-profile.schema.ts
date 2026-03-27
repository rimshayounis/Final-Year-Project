import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserProfileDocument = UserProfile & Document;

@Schema({ collection: 'userprofiles' })
export class UserProfile {
  @Prop({ type: Types.ObjectId, required: true })
  ownerId: Types.ObjectId;

  @Prop({ type: String, default: null })
  profileImage: string;
}

export const UserProfileSchema = SchemaFactory.createForClass(UserProfile);
