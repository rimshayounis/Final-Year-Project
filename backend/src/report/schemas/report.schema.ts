import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReportDocument = Report & Document;

@Schema({ timestamps: true })
export class Report {
  @Prop({ type: String, enum: ['User', 'Doctor'], default: 'User' })
  reporterModel: string;

  @Prop({ type: Types.ObjectId, refPath: 'reporterModel', required: true })
  reporterId: Types.ObjectId;

  @Prop({ type: String, enum: ['User', 'Doctor'], default: 'User' })
  reportedModel: string;

  @Prop({ type: Types.ObjectId, refPath: 'reportedModel', required: true })
  reportedId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  reason: string;

  @Prop({ type: String, enum: ['pending', 'reviewed'], default: 'pending' })
  status: string;
}

export const ReportSchema = SchemaFactory.createForClass(Report);

ReportSchema.index({ reportedId: 1, status: 1 });
ReportSchema.index({ reporterId: 1 });
