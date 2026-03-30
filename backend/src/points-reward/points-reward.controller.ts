import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { PointsRewardService } from './points-reward.service';

@Controller('points-reward')
export class PointsRewardController {
  constructor(private readonly pointsRewardService: PointsRewardService) {}

  // GET /points-reward/:doctorId
  // Full wallet summary (points, cash value, trust badge, recent transactions)
  @Get(':doctorId')
  async getWallet(@Param('doctorId') doctorId: string) {
    const wallet = await this.pointsRewardService.getWallet(doctorId);
    return { success: true, data: wallet };
  }

  // GET /points-reward/:doctorId/summary
  // Lightweight summary for profile display
  @Get(':doctorId/summary')
  async getSummary(@Param('doctorId') doctorId: string) {
    const summary = await this.pointsRewardService.getPointsSummary(doctorId);
    return { success: true, data: summary };
  }

  // GET /points-reward/:doctorId/transactions
  // Full transaction history
  @Get(':doctorId/transactions')
  async getTransactions(@Param('doctorId') doctorId: string) {
    const transactions = await this.pointsRewardService.getTransactions(doctorId);
    return { success: true, count: transactions.length, data: transactions };
  }

  // GET /points-reward/:doctorId/verification-slots?plan=basic
  // Current month's verification slot status for a doctor
  @Get(':doctorId/verification-slots')
  async getVerificationSlots(
    @Param('doctorId') doctorId: string,
    @Query('plan') plan: string = 'free_trial',
  ) {
    const info = await this.pointsRewardService.getVerificationSlotsInfo(
      doctorId,
      plan as any,
    );
    return { success: true, data: info };
  }

  // POST /points-reward/:doctorId/recalculate
  // Rebuild wallet from scratch based on current active approved posts
  // Use this to fix stale points after post deletions or test data issues
  @Post(':doctorId/recalculate')
  async recalculate(@Param('doctorId') doctorId: string) {
    const result = await this.pointsRewardService.recalculateWallet(doctorId);
    return { success: true, data: result };
  }

  // GET /points-reward/:doctorId/mentor-level
  @Get(':doctorId/mentor-level')
  async getMentorLevel(@Param('doctorId') doctorId: string) {
    const result = await this.pointsRewardService.getMentorLevel(doctorId);
    return { success: true, data: result };
  }
}
