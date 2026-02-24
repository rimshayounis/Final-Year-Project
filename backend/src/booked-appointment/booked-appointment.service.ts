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

@Injectable()
export class BookedAppointmentService {
  constructor(
    @InjectModel(BookedAppointment.name)
    private bookedAppointmentModel: Model<BookedAppointmentDocument>,
  ) {}

  // Book a new appointment
  async bookAppointment(dto: CreateBookedAppointmentDto): Promise<any> {
    // Check if this slot is already booked
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

    // Prevent invalid status transitions
    if (appointment.status === 'completed' || appointment.status === 'cancelled') {
      throw new BadRequestException(
        `Cannot update a ${appointment.status} appointment`,
      );
    }

    appointment.status = dto.status;

    if (dto.status === 'cancelled') {
      appointment.cancelledAt = new Date();
      appointment.cancelReason = dto.cancelReason || null;
    }

    const updated = await appointment.save();

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
}