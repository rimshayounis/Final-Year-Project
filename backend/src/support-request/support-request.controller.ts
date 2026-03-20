import { Controller, Post, Get, Patch, Body, Param, Query } from '@nestjs/common';
import { SupportRequestService } from './support-request.service';
import { CreateSupportRequestDto } from './dto/create-support-request.dto';

@Controller('support-requests')
export class SupportRequestController {
  constructor(private readonly service: SupportRequestService) {}

  /** User submits a support request */
  @Post()
  async create(@Body() dto: CreateSupportRequestDto) {
    const data = await this.service.create(dto);
    return { success: true, data };
  }

  /** Admin: list all requests, optionally filter by status */
  @Get()
  async findAll(@Query('status') status?: string) {
    const data = await this.service.findAll(status);
    return { success: true, data };
  }

  /** Get requests submitted by a specific user */
  @Get('user/:userId')
  async findByUser(@Param('userId') userId: string) {
    const data = await this.service.findByUser(userId);
    return { success: true, data };
  }

  /** Admin: update status / add note */
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Body('adminNote') adminNote?: string,
  ) {
    const data = await this.service.updateStatus(id, status, adminNote);
    return { success: true, data };
  }
}
