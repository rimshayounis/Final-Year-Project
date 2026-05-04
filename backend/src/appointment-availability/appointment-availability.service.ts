import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AppointmentAvailability, AppointmentAvailabilityDocument } from './schemas/appointment-availability.schema';
import { BookedAppointment, BookedAppointmentDocument } from '../booked-appointment/schemas/booked-appointment.schema';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { GetAvailableSlotsDto } from './dto/get-available-slots.dto';

export interface DaySlots {
  date: string;
  dayName: string;
  slots: string[];
  fee: number;
}

export interface AvailableSlotsResponse {
  doctorId: string;
  sessionDuration: number;
  consultationFee: number;
  availableSlots: DaySlots[];
}

@Injectable()
export class AppointmentAvailabilityService {
  constructor(
    @InjectModel(AppointmentAvailability.name)
    private availabilityModel: Model<AppointmentAvailabilityDocument>,
    @InjectModel(BookedAppointment.name)
    private bookedAppointmentModel: Model<BookedAppointmentDocument>,
  ) {}

  // Create or update doctor's availability
  async createOrUpdateAvailability(
    createDto: CreateAvailabilityDto,
  ): Promise<AppointmentAvailability> {
    // ── Validate time slots BEFORE the try/catch so the real error surfaces ──
    this.validateTimeSlots(createDto.specificDates);

    const existingAvailability = await this.availabilityModel.findOne({
      doctorId: new Types.ObjectId(createDto.doctorId),
    });

    if (existingAvailability) {
      existingAvailability.sessionDuration = createDto.sessionDuration;
      existingAvailability.consultationFee = createDto.consultationFee;
      existingAvailability.specificDates   = createDto.specificDates;
      existingAvailability.lastUpdated     = new Date();
      return await existingAvailability.save();
    }

    const availability = new this.availabilityModel({
      doctorId:        new Types.ObjectId(createDto.doctorId),
      sessionDuration: createDto.sessionDuration,
      consultationFee: createDto.consultationFee,
      specificDates:   createDto.specificDates,
    });

    return await availability.save();
  }

  // Get doctor's availability settings (active only — for patient booking)
  async getDoctorAvailability(doctorId: string): Promise<AppointmentAvailability> {
    const availability = await this.availabilityModel
      .findOne({ doctorId: new Types.ObjectId(doctorId), isActive: true })
      .exec();

    if (!availability) {
      throw new NotFoundException(
        `Availability settings not found for doctor ${doctorId}`,
      );
    }

    return availability;
  }

  // Get doctor's own availability (regardless of isActive — for doctor's schedule tab)
  async getOwnAvailability(doctorId: string): Promise<AppointmentAvailability | null> {
    return await this.availabilityModel
      .findOne({ doctorId: new Types.ObjectId(doctorId) })
      .exec();
  }

  // Get available time slots for booking
  async getAvailableSlots(query: {
    doctorId: string;
    date?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<AvailableSlotsResponse> {
    const availability = await this.getDoctorAvailability(query.doctorId);

    const startDate = query.startDate ? new Date(query.startDate) : new Date();
    const endDate   = query.endDate
      ? new Date(query.endDate)
      : new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Fetch all active bookings for this doctor in the date range
    const bookedSlots = await this.bookedAppointmentModel
      .find({
        doctorId: new Types.ObjectId(query.doctorId),
        date:     { $gte: this.formatDate(startDate), $lte: this.formatDate(endDate) },
        status:   { $in: ['pending', 'confirmed'] },
      })
      .select('date time')
      .lean()
      .exec();

    const bookedSet = new Set(
      bookedSlots.map((b: any) => `${b.date}|${b.time}`),
    );

    const availableSlots: DaySlots[] = [];

    for (
      let d = new Date(startDate);
      d <= endDate;
      d.setDate(d.getDate() + 1)
    ) {
      const dateStr  = this.formatDate(d);
      const dayName  = d.toLocaleDateString('en-US', { weekday: 'long' });
      const specific = availability.specificDates.find(sd => sd.date === dateStr);

      if (specific) {
        const allSlots = this.generateTimeSlots(
          specific.timeSlots,
          availability.sessionDuration,
        );
        const slots = allSlots.filter(
          (time) => !bookedSet.has(`${dateStr}|${time}`),
        );
        if (slots.length > 0) {
          availableSlots.push({
            date: dateStr,
            dayName,
            slots,
            fee: availability.consultationFee,
          });
        }
      }
    }

    return {
      doctorId:        query.doctorId,
      sessionDuration: availability.sessionDuration,
      consultationFee: availability.consultationFee,
      availableSlots,
    };
  }

  // Update availability
  async updateAvailability(
    doctorId: string,
    updateDto: UpdateAvailabilityDto,
  ): Promise<AppointmentAvailability> {
    const availability = await this.availabilityModel.findOne({
      doctorId: new Types.ObjectId(doctorId),
    });

    if (!availability) {
      throw new NotFoundException(
        `Availability settings not found for doctor ${doctorId}`,
      );
    }

    if (updateDto.specificDates) {
      this.validateTimeSlots(updateDto.specificDates);
    }

    // Only assign fields that are explicitly provided (not undefined)
    for (const key of Object.keys(updateDto) as (keyof typeof updateDto)[]) {
      if (updateDto[key] !== undefined) {
        (availability as any)[key] = updateDto[key];
      }
    }
    availability.lastUpdated = new Date();
    return await availability.save();
  }

  // Delete availability
  async deleteAvailability(doctorId: string): Promise<void> {
    const result = await this.availabilityModel.deleteOne({
      doctorId: new Types.ObjectId(doctorId),
    });

    if (result.deletedCount === 0) {
      throw new NotFoundException(
        `Availability settings not found for doctor ${doctorId}`,
      );
    }
  }

  // Get all doctors with availability (includes subscriptionPlan + completedCount)
  async getAllDoctorsWithAvailability(): Promise<any[]> {
    const records = await this.availabilityModel
      .find({ isActive: true })
      .populate('doctorId', 'fullName email profileImage doctorProfile subscriptionPlan completedCount avgRating ratingCount isBanned')
      .exec();

    return records.map(r => r.toObject());
  }

  // Admin: get all availability records regardless of isActive
  async getAllDoctorsWithAvailabilityAdmin(): Promise<any[]> {
    const records = await this.availabilityModel
      .find()
      .populate('doctorId', 'fullName email profileImage doctorProfile subscriptionPlan')
      .exec();

    return records.map(r => r.toObject());
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private validateTimeSlots(specificDates: any[]): void {
    if (!specificDates || specificDates.length === 0) {
      throw new BadRequestException('At least one date with time slots is required');
    }

    for (const dateData of specificDates) {
      if (!dateData.date) {
        throw new BadRequestException('Each entry must have a date in YYYY-MM-DD format');
      }

      if (!dateData.timeSlots || dateData.timeSlots.length === 0) {
        throw new BadRequestException(
          `Date ${dateData.date} must have at least one time slot`,
        );
      }

      for (const slot of dateData.timeSlots) {
        if (!slot.start || !slot.end) {
          throw new BadRequestException(
            `Time slot on ${dateData.date} is missing start or end time`,
          );
        }

        if (!this.isValidTimeFormat(slot.start) || !this.isValidTimeFormat(slot.end)) {
          throw new BadRequestException(
            `Time slot on ${dateData.date} has invalid format. Use HH:MM (e.g. 09:00)`,
          );
        }

        if (!this.isValidTimeSlot(slot.start, slot.end)) {
          throw new BadRequestException(
            `Invalid time slot on ${dateData.date}: ${slot.start} - ${slot.end}. End time must be after start time`,
          );
        }
      }
    }
  }

  private isValidTimeFormat(time: string): boolean {
    return /^\d{2}:\d{2}$/.test(time);
  }

  private isValidTimeSlot(start: string, end: string): boolean {
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour,   endMin]   = end.split(':').map(Number);
    return endHour * 60 + endMin > startHour * 60 + startMin;
  }

  private generateTimeSlots(timeSlots: any[], sessionDuration: number): string[] {
    const slots: string[] = [];

    for (const slot of timeSlots) {
      const [startHour, startMin] = slot.start.split(':').map(Number);
      const [endHour,   endMin]   = slot.end.split(':').map(Number);

      let currentMinutes = startHour * 60 + startMin;
      const endMinutes   = endHour   * 60 + endMin;

      while (currentMinutes + sessionDuration <= endMinutes) {
        const h   = Math.floor(currentMinutes / 60);
        const m   = currentMinutes % 60;
        slots.push(
          `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`,
        );
        currentMinutes += sessionDuration;
      }
    }

    return slots;
  }

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}