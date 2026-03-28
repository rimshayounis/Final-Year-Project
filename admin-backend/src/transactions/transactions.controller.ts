import { Controller, Get, Query } from '@nestjs/common';
import { TransactionsService } from './transactions.service';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  // GET /transactions/admin/all?type=subscription_payment&status=succeeded
  @Get('admin/all')
  async getAll(
    @Query('type')   type?:   string,
    @Query('status') status?: string,
  ) {
    const data = await this.transactionsService.getAll(type, status);
    return { success: true, data };
  }

  // GET /transactions/admin/points-payout
  @Get('admin/points-payout')
  async getPointsPayoutTotal() {
    const data = await this.transactionsService.getPointsPayoutTotal();
    return { success: true, data };
  }
}
