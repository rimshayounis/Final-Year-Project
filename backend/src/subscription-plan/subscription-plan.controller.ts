import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { SubscriptionPlanService } from './subscription-plan.service';
import { CreateSubscriptionDto, CancelSubscriptionDto } from './dto/subscription-plan.dto';

@Controller('subscriptions')
export class SubscriptionPlanController {
  constructor(private readonly subscriptionPlanService: SubscriptionPlanService) {}

  // GET /subscriptions/plans
  // All plan details with pricing (for display in app)
  @Get('plans')
  getPlans() {
    return this.subscriptionPlanService.getPlanDetails();
  }

  // POST /subscriptions
  // Activate a new subscription for a doctor
  @Post()
  async create(@Body() dto: CreateSubscriptionDto) {
    return this.subscriptionPlanService.createSubscription(dto);
  }

  // GET /subscriptions/:doctorId/active
  // Get current active subscription
  @Get(':doctorId/active')
  async getActive(@Param('doctorId') doctorId: string) {
    return this.subscriptionPlanService.getActiveSubscription(doctorId);
  }

  // GET /subscriptions/:doctorId/history
  // Full subscription history
  @Get(':doctorId/history')
  async getHistory(@Param('doctorId') doctorId: string) {
    return this.subscriptionPlanService.getSubscriptionHistory(doctorId);
  }

  // DELETE /subscriptions/:doctorId/cancel
  // Cancel active subscription
  @Delete(':doctorId/cancel')
  async cancel(
    @Param('doctorId') doctorId: string,
    @Body() dto: CancelSubscriptionDto,
  ) {
    return this.subscriptionPlanService.cancelSubscription(doctorId, dto);
  }

  // GET /subscriptions/:doctorId/has-used-trial
  // Check if doctor already used free trial
  @Get(':doctorId/has-used-trial')
  async checkUsedTrial(@Param('doctorId') doctorId: string) {
    const hasUsed = await this.subscriptionPlanService.hasUsedFreeTrial(doctorId);
    return {
      success: true,
      doctorId,
      hasUsedFreeTrial: hasUsed,
    };
  }

  // POST /subscriptions/expire-overdue
  // Expire all subscriptions past their endDate (call from cron or admin)
  @Post('expire-overdue')
  async expireOverdue() {
    return this.subscriptionPlanService.expireOverdueSubscriptions();
  }
}
