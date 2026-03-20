import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Report, ReportDocument } from './schemas/report.schema';
import { CreateReportDto } from './dto/create-report.dto';

@Injectable()
export class ReportService {
  constructor(
    @InjectModel(Report.name) private reportModel: Model<ReportDocument>,
  ) {}

  async create(dto: CreateReportDto): Promise<ReportDocument> {
    if (!Types.ObjectId.isValid(dto.reporterId)) {
      throw new BadRequestException('Invalid reporterId');
    }
    if (!Types.ObjectId.isValid(dto.reportedId)) {
      throw new BadRequestException('Invalid reportedId');
    }

    const report = new this.reportModel({
      reporterId:    new Types.ObjectId(dto.reporterId),
      reporterModel: dto.reporterModel ?? 'User',
      reportedId:    new Types.ObjectId(dto.reportedId),
      reportedModel: dto.reportedModel ?? 'User',
      reason:        dto.reason,
    });

    return report.save();
  }

  async findAll(): Promise<ReportDocument[]> {
    return this.reportModel
      .find()
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByReported(reportedId: string): Promise<ReportDocument[]> {
    if (!Types.ObjectId.isValid(reportedId)) {
      throw new BadRequestException('Invalid reportedId');
    }
    return this.reportModel
      .find({ reportedId: new Types.ObjectId(reportedId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  // ── NEW ──
  async markReviewed(id: string): Promise<ReportDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid report id');
    }
    const report = await this.reportModel.findByIdAndUpdate(
      id,
      { status: 'reviewed' },
      { new: true },
    );
    if (!report) throw new NotFoundException('Report not found');
    return report;
  }
}