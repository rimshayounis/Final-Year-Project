import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Report, ReportDocument } from './schemas/report.schema';
import { CreateReportDto } from './dto/create-report.dto';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Doctor, DoctorDocument } from '../doctors/schemas/doctor.schema';

@Injectable()
export class ReportService {
  constructor(
    @InjectModel(Report.name)   private reportModel:  Model<ReportDocument>,
    @InjectModel(User.name)     private userModel:    Model<UserDocument>,
    @InjectModel(Doctor.name)   private doctorModel:  Model<DoctorDocument>,
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
      postId:        dto.postId ? new Types.ObjectId(dto.postId) : null,
    });

    return report.save();
  }

  async findAll(): Promise<ReportDocument[]> {
    return this.reportModel
      .find()
      .populate('reporterId', 'fullName email')
      .populate('reportedId', 'fullName email')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByReported(reportedId: string): Promise<ReportDocument[]> {
    if (!Types.ObjectId.isValid(reportedId)) {
      throw new BadRequestException('Invalid reportedId');
    }
    return this.reportModel
      .find({ reportedId: new Types.ObjectId(reportedId) })
      .populate('reporterId', 'fullName email')
      .populate('reportedId', 'fullName email')
      .sort({ createdAt: -1 })
      .exec();
  }

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

  async dismissReport(id: string) {
  const report = await this.reportModel.findByIdAndUpdate(
    id,
    { status: 'dismissed' },
    { new: true },
  );
  if (!report) throw new NotFoundException('Report not found');
  return report;
}

  async banAccount(
    reportId: string,
    reportedId: string,
    reportedModel: 'User' | 'Doctor',
  ): Promise<{ success: boolean }> {
    if (!Types.ObjectId.isValid(reportedId)) throw new BadRequestException('Invalid reportedId');

    if (reportedModel === 'Doctor') {
      await this.doctorModel.findByIdAndUpdate(reportedId, { isBanned: true });
    } else {
      await this.userModel.findByIdAndUpdate(reportedId, { isBanned: true });
    }

    if (Types.ObjectId.isValid(reportId)) {
      await this.reportModel.findByIdAndUpdate(reportId, { status: 'reviewed' });
    }

    return { success: true };
  }

  async unbanAccount(
    reportedId: string,
    reportedModel: 'User' | 'Doctor',
  ): Promise<{ success: boolean }> {
    if (!Types.ObjectId.isValid(reportedId)) throw new BadRequestException('Invalid reportedId');

    if (reportedModel === 'Doctor') {
      await this.doctorModel.findByIdAndUpdate(reportedId, { isBanned: false });
    } else {
      await this.userModel.findByIdAndUpdate(reportedId, { isBanned: false });
    }

    return { success: true };
  }
}