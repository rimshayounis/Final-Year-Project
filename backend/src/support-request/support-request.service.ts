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
    @InjectModel('User')   private readonly userModel:   Model<any>,
    @InjectModel('Doctor') private readonly doctorModel: Model<any>,
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

  async findAll(status?: string): Promise<any[]> {
    const query: any = {};
    if (status) query.status = status;
    const tickets = await this.model.find(query).sort({ createdAt: -1 }).exec();

    const enriched = await Promise.all(
      tickets.map(async (t) => {
        const obj: any  = t.toObject();
        try {
          if (t.userRole === 'doctor') {
            const doc = await this.doctorModel.findById(t.userId).select('fullName email').exec();
            obj.userName  = doc?.fullName || null;
            obj.userEmail = doc?.email    || null;
          } else {
            const user = await this.userModel.findById(t.userId).select('fullName email').exec();
            obj.userName  = user?.fullName || null;
            obj.userEmail = user?.email    || null;
          }
        } catch { /* userId might not be a valid ObjectId */ }
        return obj;
      })
    );

    return enriched;
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