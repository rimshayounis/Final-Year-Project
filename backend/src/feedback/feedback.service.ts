import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Feedback, FeedbackDocument } from './schemas/feedback.schema';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectModel(Feedback.name) private feedbackModel: Model<FeedbackDocument>,
    @InjectModel('BookedAppointment') private appointmentModel: Model<any>,
    @InjectModel('Doctor') private doctorModel: Model<any>,
  ) {}

  async create(dto: CreateFeedbackDto): Promise<FeedbackDocument> {
    if (!Types.ObjectId.isValid(dto.appointmentId)) {
      throw new BadRequestException('Invalid appointmentId');
    }

    const appointment = await this.appointmentModel.findById(dto.appointmentId).exec();
    if (!appointment) throw new NotFoundException('Appointment not found');
    if (appointment.status !== 'completed') {
      throw new BadRequestException('Feedback can only be given for completed appointments');
    }
    if (appointment.hasFeedback) {
      throw new ConflictException('Feedback already submitted for this appointment');
    }

    const feedback = new this.feedbackModel({
      appointmentId: new Types.ObjectId(dto.appointmentId),
      userId:        new Types.ObjectId(dto.userId),
      doctorId:      new Types.ObjectId(dto.doctorId),
      rating:        dto.rating,
      description:   dto.description ?? '',
    });

    await feedback.save();

    await this.appointmentModel.findByIdAndUpdate(dto.appointmentId, { hasFeedback: true }).exec();

    const doctor = await this.doctorModel
      .findById(dto.doctorId)
      .select('avgRating ratingCount')
      .exec();

    if (doctor) {
      const oldCount = doctor.ratingCount ?? 0;
      const oldAvg   = doctor.avgRating   ?? 0;
      const newCount = oldCount + 1;
      const newAvg   = parseFloat(((oldAvg * oldCount + dto.rating) / newCount).toFixed(2));
      await this.doctorModel.findByIdAndUpdate(dto.doctorId, {
        avgRating:   newAvg,
        ratingCount: newCount,
      }).exec();
    }

    return feedback;
  }

  // ── ADDED: get all feedbacks for admin dashboard ──
  async getAll(): Promise<FeedbackDocument[]> {
  return this.feedbackModel
    .find()
    .sort({ createdAt: -1 })
    .populate('userId', 'fullName')
    .populate('doctorId', 'fullName email doctorProfile')  // ← add this
    .exec();
}
   async getDoctorFeedbacks(doctorId: string): Promise<{
  avgRating: number;
  ratingCount: number;
  feedbacks: FeedbackDocument[];
}> {
  if (!Types.ObjectId.isValid(doctorId)) {
    throw new BadRequestException('Invalid doctorId');
  }

  const [feedbacks, doctor] = await Promise.all([
    this.feedbackModel
      .find({ doctorId: new Types.ObjectId(doctorId) })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('userId', 'fullName')
      .populate('doctorId', 'fullName email doctorProfile')  // ← add this
      .exec(),
    this.doctorModel.findById(doctorId).select('avgRating ratingCount fullName').exec(),
  ]);

  return {
    avgRating:   doctor?.avgRating   ?? 0,
    ratingCount: doctor?.ratingCount ?? 0,
    feedbacks,
  };
}

 
}