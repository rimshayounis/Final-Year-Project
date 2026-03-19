import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  BookedAppointment,
  BookedAppointmentDocument,
} from './schemas/booked-appointment.schema';
import {
  CreateBookedAppointmentDto,
  UpdateAppointmentStatusDto,
} from './dto/booked-appointment.dto';
import { PointsRewardService } from '../points-reward/points-reward.service';
import { Doctor, DoctorDocument } from '../doctors/schemas/doctor.schema';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class BookedAppointmentService {
  constructor(
    @InjectModel(BookedAppointment.name)
    private bookedAppointmentModel: Model<BookedAppointmentDocument>,
    @InjectModel(Doctor.name)
    private doctorModel: Model<DoctorDocument>,
    private readonly pointsRewardService: PointsRewardService,
    private readonly notificationService: NotificationService,
  ) {}

  // Book a new appointment
  async bookAppointment(dto: CreateBookedAppointmentDto): Promise<any> {
    const existing = await this.bookedAppointmentModel.findOne({
      doctorId: new Types.ObjectId(dto.doctorId),
      date: dto.date,
      time: dto.time,
      status: { $in: ['pending', 'confirmed'] },
    });

    if (existing) {
      throw new ConflictException(
        'This time slot is already booked. Please choose another slot.',
      );
    }

    const appointment = new this.bookedAppointmentModel({
      userId: new Types.ObjectId(dto.userId),
      doctorId: new Types.ObjectId(dto.doctorId),
      date: dto.date,
      time: dto.time,
      sessionDuration: dto.sessionDuration,
      consultationFee: dto.consultationFee,
      healthConcern: dto.healthConcern,
    });

    const saved = await appointment.save();

    // Send notification to doctor (fire-and-forget)
    this.notificationService.notifyDoctorNewAppointment({
      doctorId:        dto.doctorId,
      userId:          dto.userId,
      date:            dto.date,
      time:            dto.time,
      sessionDuration: dto.sessionDuration,
      consultationFee: dto.consultationFee,
      healthConcern:   dto.healthConcern,
    }).catch((e) => console.error('[Notification] Failed:', e.message));

    return {
      success: true,
      message: 'Appointment booked successfully',
      data: saved,
    };
  }

  // Get all appointments for a user
  async getUserAppointments(userId: string): Promise<any> {
    const appointments = await this.bookedAppointmentModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate('userId', 'fullName email')
      .populate('doctorId', 'fullName email doctorProfile')
      .sort({ date: -1, time: -1 })
      .exec();

    return {
      success: true,
      count: appointments.length,
      data: appointments,
    };
  }

  // Get all appointments for a doctor
  async getDoctorAppointments(doctorId: string): Promise<any> {
    const appointments = await this.bookedAppointmentModel
      .find({ doctorId: new Types.ObjectId(doctorId) })
      .populate('userId', 'fullName email profileImage')
      .sort({ date: -1, time: -1 })
      .exec();

    return {
      success: true,
      count: appointments.length,
      data: appointments,
    };
  }

  // Get a single appointment by ID
  async getAppointmentById(appointmentId: string): Promise<any> {
    const appointment = await this.bookedAppointmentModel
      .findById(appointmentId)
      .populate('doctorId', 'fullName email doctorProfile')
      .populate('userId', 'fullName email profileImage')
      .exec();

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    return {
      success: true,
      data: appointment,
    };
  }

  // Update appointment status (confirm / cancel / complete)
  async updateStatus(
    appointmentId: string,
    dto: UpdateAppointmentStatusDto,
  ): Promise<any> {
    const appointment = await this.bookedAppointmentModel.findById(appointmentId);

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.status === 'completed' || appointment.status === 'cancelled') {
      throw new BadRequestException(
        `Cannot update a ${appointment.status} appointment`,
      );
    }

    appointment.status = dto.status;

    if (dto.status === 'confirmed') {
      // Doctor confirmed → user must now pay
      appointment.paymentStatus = 'pending_payment';
    }

    if (dto.status === 'cancelled') {
      appointment.cancelledAt = new Date();
      appointment.cancelReason = dto.cancelReason || null;
      if (appointment.paymentStatus === 'payment_held') {
        appointment.paymentStatus = 'refunded';
      }
    }

    // ── SET completedAt when status becomes completed ──
    if (dto.status === 'completed') {
      appointment.completedAt = new Date();
    }

    const updated = await appointment.save();

    // Increment persisted completedCount on doctor doc
    if (dto.status === 'completed') {
      this.doctorModel
        .updateOne({ _id: appointment.doctorId }, { $inc: { completedCount: 1 } })
        .exec()
        .catch(() => { /* silent */ });
    }

    // Award monthly booking points + bonus slots when appointment is completed
    if (dto.status === 'completed') {
      const yearMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
      const doctor = await this.doctorModel
        .findById(appointment.doctorId)
        .select('subscriptionPlan')
        .exec();
      const plan = (doctor as any)?.subscriptionPlan ?? 'free_trial';
      this.pointsRewardService
        .handleBookingCompleted(appointment.doctorId.toString(), yearMonth, plan)
        .catch(() => { /* silent — never block the status update */ });
    }

    return {
      success: true,
      message: `Appointment ${dto.status} successfully`,
      data: updated,
    };
  }

  // Cancel appointment
  async cancelAppointment(
    appointmentId: string,
    cancelReason?: string,
  ): Promise<any> {
    return this.updateStatus(appointmentId, {
      status: 'cancelled',
      cancelReason,
    });
  }

  // Get upcoming appointments for a user
  async getUserUpcomingAppointments(userId: string): Promise<any> {
    const today = new Date().toISOString().split('T')[0];

    const appointments = await this.bookedAppointmentModel
      .find({
        userId: new Types.ObjectId(userId),
        date: { $gte: today },
        status: { $in: ['pending', 'confirmed'] },
      })
      .populate('doctorId', 'fullName email doctorProfile')
      .sort({ date: 1, time: 1 })
      .exec();

    return {
      success: true,
      count: appointments.length,
      data: appointments,
    };
  }

  // Get upcoming appointments for a doctor
  async getDoctorUpcomingAppointments(doctorId: string): Promise<any> {
    const today = new Date().toISOString().split('T')[0];

    const appointments = await this.bookedAppointmentModel
      .find({
        doctorId: new Types.ObjectId(doctorId),
        date: { $gte: today },
        status: { $in: ['pending', 'confirmed'] },
      })
      .populate('userId', 'fullName email profileImage')
      .sort({ date: 1, time: 1 })
      .exec();

    return {
      success: true,
      count: appointments.length,
      data: appointments,
    };
  }

  // ── AUTO-COMPLETE: called by the scheduler every minute ──
  async autoCompleteExpired(): Promise<void> {
    const now = new Date();

    // Find all confirmed appointments where date+time+duration has passed
    const confirmed = await this.bookedAppointmentModel
      .find({ status: 'confirmed' })
      .exec();

    for (const appt of confirmed) {
      // Build a JS Date from the stored "YYYY-MM-DD" + "HH:MM" strings
      const [hours, minutes] = appt.time.split(':').map(Number);
      const apptStart = new Date(appt.date);
      apptStart.setHours(hours, minutes, 0, 0);

      const apptEnd = new Date(
        apptStart.getTime() + appt.sessionDuration * 60 * 1000,
      );

      if (now >= apptEnd) {
        appt.status = 'completed';
        appt.completedAt = now;
        await appt.save();
        this.doctorModel
          .updateOne({ _id: appt.doctorId }, { $inc: { completedCount: 1 } })
          .exec()
          .catch(() => { /* silent */ });
      }
    }
  }
}