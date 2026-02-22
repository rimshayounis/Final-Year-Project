import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AppointmentAvailability, AppointmentAvailabilityDocument } from './schemas/appointment-availability.schema';
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
  ) {}

  // Create or update doctor's availability
  async createOrUpdateAvailability(createDto: CreateAvailabilityDto): Promise<AppointmentAvailability> {
    try {
      // Validate time slots
      this.validateTimeSlots(createDto.specificDates);

      const existingAvailability = await this.availabilityModel.findOne({
        doctorId: new Types.ObjectId(createDto.doctorId),
      });

      if (existingAvailability) {
        // Update existing
        existingAvailability.sessionDuration = createDto.sessionDuration;
        existingAvailability.consultationFee = createDto.consultationFee;
        existingAvailability.specificDates = createDto.specificDates;
        existingAvailability.lastUpdated = new Date();
        
        return await existingAvailability.save();
      } else {
        // Create new
        const availability = new this.availabilityModel({
          doctorId: new Types.ObjectId(createDto.doctorId),
          sessionDuration: createDto.sessionDuration,
          consultationFee: createDto.consultationFee,
          specificDates: createDto.specificDates,
        });

        return await availability.save();
      }
    } catch (error) {
      throw new BadRequestException('Failed to save availability settings');
    }
  }

  // Get doctor's availability settings
  async getDoctorAvailability(doctorId: string): Promise<AppointmentAvailability> {
    const availability = await this.availabilityModel
      .findOne({ doctorId: new Types.ObjectId(doctorId), isActive: true })
      .exec();

    if (!availability) {
      throw new NotFoundException(`Availability settings not found for doctor ${doctorId}`);
    }

    return availability;
  }

  // Get available time slots for booking
  async getAvailableSlots(query: {
    doctorId: string;
    date?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<AvailableSlotsResponse> {
    const availability = await this.getDoctorAvailability(query.doctorId);

    const startDate = query.startDate 
      ? new Date(query.startDate) 
      : new Date();
    
    const endDate = query.endDate
      ? new Date(query.endDate)
      : new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    const availableSlots: DaySlots[] = [];

    // Loop through each day in the range
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = this.formatDate(d);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });

      // Check if there's a specific date
      const specificDate = availability.specificDates.find(sd => sd.date === dateStr);

      if (specificDate) {
        const slots = this.generateTimeSlots(specificDate.timeSlots, availability.sessionDuration);
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
      doctorId: query.doctorId,
      sessionDuration: availability.sessionDuration,
      consultationFee: availability.consultationFee,
      availableSlots,
    };
  }

  // Update availability
  async updateAvailability(doctorId: string, updateDto: UpdateAvailabilityDto): Promise<AppointmentAvailability> {
    const availability = await this.availabilityModel.findOne({
      doctorId: new Types.ObjectId(doctorId),
    });

    if (!availability) {
      throw new NotFoundException(`Availability settings not found for doctor ${doctorId}`);
    }

    if (updateDto.specificDates) {
      this.validateTimeSlots(updateDto.specificDates);
    }

    Object.assign(availability, updateDto);
    availability.lastUpdated = new Date();

    return await availability.save();
  }

  // Delete availability
  async deleteAvailability(doctorId: string): Promise<void> {
    const result = await this.availabilityModel.deleteOne({
      doctorId: new Types.ObjectId(doctorId),
    });

    if (result.deletedCount === 0) {
      throw new NotFoundException(`Availability settings not found for doctor ${doctorId}`);
    }
  }

  // Helper: Validate time slots
  private validateTimeSlots(specificDates: any[]): void {
    for (const dateData of specificDates) {
      for (const slot of dateData.timeSlots) {
        if (!this.isValidTimeSlot(slot.start, slot.end)) {
          throw new BadRequestException(`Invalid time slot for ${dateData.date}: ${slot.start} - ${slot.end}`);
        }
      }
    }
  }

  // Helper: Check if time slot is valid
  private isValidTimeSlot(start: string, end: string): boolean {
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    return endMinutes > startMinutes;
  }

  // Helper: Generate time slots based on duration
  private generateTimeSlots(timeSlots: any[], sessionDuration: number): string[] {
    const slots: string[] = [];

    for (const slot of timeSlots) {
      const [startHour, startMin] = slot.start.split(':').map(Number);
      const [endHour, endMin] = slot.end.split(':').map(Number);

      let currentMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      while (currentMinutes + sessionDuration <= endMinutes) {
        const hours = Math.floor(currentMinutes / 60);
        const minutes = currentMinutes % 60;
        const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        slots.push(timeStr);
        currentMinutes += sessionDuration;
      }
    }

    return slots;
  }

  // Helper: Format date to YYYY-MM-DD
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Get all doctors with availability
  async getAllDoctorsWithAvailability(): Promise<AppointmentAvailability[]> {
    return await this.availabilityModel
      .find({ isActive: true })
      .populate('doctorId', 'fullName specialization profileImage email')
      .exec();
  }
}