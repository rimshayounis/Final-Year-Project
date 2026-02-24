import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Delete,
} from '@nestjs/common';
import { BookedAppointmentService } from './booked-appointment.service';
import {
  CreateBookedAppointmentDto,
  UpdateAppointmentStatusDto,
} from './dto/booked-appointment.dto';

@Controller('booked-appointments')
export class BookedAppointmentController {
  constructor(private readonly bookedAppointmentService: BookedAppointmentService) {}

  // POST /booked-appointments
  // Book a new appointment
  @Post()
  async bookAppointment(@Body() dto: CreateBookedAppointmentDto) {
    return this.bookedAppointmentService.bookAppointment(dto);
  }

  // GET /booked-appointments/:id
  // Get a single appointment
  @Get(':id')
  async getAppointmentById(@Param('id') id: string) {
    return this.bookedAppointmentService.getAppointmentById(id);
  }

  // GET /booked-appointments/user/:userId
  // Get all appointments for a user
  @Get('user/:userId')
  async getUserAppointments(@Param('userId') userId: string) {
    return this.bookedAppointmentService.getUserAppointments(userId);
  }

  // GET /booked-appointments/user/:userId/upcoming
  // Get upcoming appointments for a user
  @Get('user/:userId/upcoming')
  async getUserUpcomingAppointments(@Param('userId') userId: string) {
    return this.bookedAppointmentService.getUserUpcomingAppointments(userId);
  }

  // GET /booked-appointments/doctor/:doctorId
  // Get all appointments for a doctor
  @Get('doctor/:doctorId')
  async getDoctorAppointments(@Param('doctorId') doctorId: string) {
    return this.bookedAppointmentService.getDoctorAppointments(doctorId);
  }

  // GET /booked-appointments/doctor/:doctorId/upcoming
  // Get upcoming appointments for a doctor
  @Get('doctor/:doctorId/upcoming')
  async getDoctorUpcomingAppointments(@Param('doctorId') doctorId: string) {
    return this.bookedAppointmentService.getDoctorUpcomingAppointments(doctorId);
  }

  // PATCH /booked-appointments/:id/status
  // Update appointment status (doctor confirms/cancels, system completes)
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentStatusDto,
  ) {
    return this.bookedAppointmentService.updateStatus(id, dto);
  }

  // DELETE /booked-appointments/:id/cancel
  // Cancel an appointment
  @Delete(':id/cancel')
  async cancelAppointment(
    @Param('id') id: string,
    @Body('cancelReason') cancelReason?: string,
  ) {
    return this.bookedAppointmentService.cancelAppointment(id, cancelReason);
  }
}