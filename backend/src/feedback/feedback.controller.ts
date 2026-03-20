import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  async create(@Body() dto: CreateFeedbackDto) {
    const feedback = await this.feedbackService.create(dto);
    return { success: true, data: feedback };
  }

  @Get('doctor/:doctorId')
  async getDoctorFeedbacks(@Param('doctorId') doctorId: string) {
    const result = await this.feedbackService.getDoctorFeedbacks(doctorId);
    return { success: true, data: result };
  }
}
