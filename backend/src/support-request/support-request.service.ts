import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SupportRequest, SupportRequestDocument } from './schemas/support-request.schema';
import { CreateSupportRequestDto } from './dto/create-support-request.dto';

@Injectable()
export class SupportRequestService {
  constructor(
    @InjectModel(SupportRequest.name)
    private readonly model: Model<SupportRequestDocument>,
  ) {}

  async create(dto: CreateSupportRequestDto): Promise<SupportRequestDocument> {
    const request = new this.model({
      userId:      dto.userId,
      userRole:    dto.userRole ?? 'user',
      purpose:     dto.purpose,
      description: dto.description,
    });
    return request.save();
  }

  async findAll(status?: string): Promise<SupportRequestDocument[]> {
    const query: any = {};
    if (status) query.status = status;
    return this.model.find(query).sort({ createdAt: -1 }).exec();
  }

  async findByUser(userId: string): Promise<SupportRequestDocument[]> {
    return this.model.find({ userId }).sort({ createdAt: -1 }).exec();
  }

  async updateStatus(
    id: string,
    status: string,
    adminNote?: string,
  ): Promise<SupportRequestDocument> {
    const update: any = { status };
    if (adminNote !== undefined) update.adminNote = adminNote;

    const doc = await this.model
      .findByIdAndUpdate(id, update, { new: true })
      .exec();

    if (!doc) throw new NotFoundException('Support request not found');
    return doc;
  }
}
