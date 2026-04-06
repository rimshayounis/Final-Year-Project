import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  BadRequestException,
  HttpException,
} from '@nestjs/common';
import { AppointmentAvailabilityService } from './appointment-availability.service';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { GetAvailableSlotsDto } from './dto/get-available-slots.dto';

@Controller('appointment-availability')
export class AppointmentAvailabilityController {
  constructor(
    private readonly availabilityService: AppointmentAvailabilityService,
  ) {}

  // Create or update availability
  @Post()
  async createOrUpdateAvailability(@Body() createDto: CreateAvailabilityDto) {
    const availability =
      await this.availabilityService.createOrUpdateAvailability(createDto);

    return {
      success: true,
      message: 'Availability settings saved successfully',
      data: availability,
    };
  }

  // ✅ Get available slots (FIXED)
@Get('slots')
async getAvailableSlots(@Query() query: GetAvailableSlotsDto) {
  return {
    success: true,
    data: await this.availabilityService.getAvailableSlots(query),
  };
}

  // Get doctor's OWN availability (regardless of isActive — for schedule tab)
  @Get('doctor/:doctorId/own')
  async getOwnAvailability(@Param('doctorId') doctorId: string) {
    const availability = await this.availabilityService.getOwnAvailability(doctorId);
    return { success: true, data: availability };
  }

  // Get doctor's availability (first-time safe)
@Get('doctor/:doctorId')
async getDoctorAvailability(@Param('doctorId') doctorId: string) {
let availability;
try {
  availability = await this.availabilityService.getDoctorAvailability(doctorId);
} catch (err) {
  // If 404, return null instead of throwing
  if (err instanceof HttpException && err.getStatus() === 404) {
    availability = null;
  } else {
    throw err; // re-throw other errors
  }
}

  return {
    success: true,
    data: availability,
  };
}

  // Update availability
  @Put('doctor/:doctorId')
  async updateAvailability(
    @Param('doctorId') doctorId: string,
    @Body() updateDto: UpdateAvailabilityDto,
  ) {
    const availability =
      await this.availabilityService.updateAvailability(
        doctorId,
        updateDto,
      );

    return {
      success: true,
      message: 'Availability settings updated successfully',
      data: availability,
    };
  }

  // Delete availability
  @Delete('doctor/:doctorId')
  async deleteAvailability(@Param('doctorId') doctorId: string) {
    await this.availabilityService.deleteAvailability(doctorId);

    return {
      success: true,
      message: 'Availability settings deleted successfully',
    };
  }

  // Get all doctors with availability (active only — for patients)
  @Get('doctors')
  async getAllDoctorsWithAvailability() {
    const doctors =
      await this.availabilityService.getAllDoctorsWithAvailability();

    return {
      success: true,
      data: doctors,
    };
  }

  // Admin: get all availability records including inactive
  @Get('doctors/all')
  async getAllDoctorsWithAvailabilityAdmin() {
    const doctors =
      await this.availabilityService.getAllDoctorsWithAvailabilityAdmin();

    return {
      success: true,
      data: doctors,
    };
  }
}