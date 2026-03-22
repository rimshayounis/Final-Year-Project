import { Controller, Post, Get, Patch, Body, Param } from '@nestjs/common';
import { ReportService } from './report.service';
import { CreateReportDto } from './dto/create-report.dto';

@Controller('reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post()
  async create(@Body() dto: CreateReportDto) {
    const report = await this.reportService.create(dto);
    return { success: true, message: 'Report submitted successfully', data: report };
  }

  @Get()
  async findAll() {
    const reports = await this.reportService.findAll();
    return { success: true, data: reports };
  }

  @Get('user/:reportedId')
  async findByReported(@Param('reportedId') reportedId: string) {
    const reports = await this.reportService.findByReported(reportedId);
    return { success: true, data: reports };
  }

  @Patch(':id/review')
  async markReviewed(@Param('id') id: string) {
    const report = await this.reportService.markReviewed(id);
    return { success: true, data: report };
  }
}