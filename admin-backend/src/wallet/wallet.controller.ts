import { Controller, Get, Patch, Param, Query, Body } from '@nestjs/common';
import { WalletService } from './wallet.service';

@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  // GET /wallet/admin/withdrawals?status=pending|succeeded|rejected|all
  @Get('admin/withdrawals')
  async getAllWithdrawals(@Query('status') status?: string) {
    const data = await this.walletService.getAllWithdrawals(status);
    return { success: true, data };
  }

  // PATCH /wallet/:doctorId/withdrawal/:txId/status
  @Patch(':doctorId/withdrawal/:txId/status')
  async updateWithdrawalStatus(
    @Param('doctorId') doctorId: string,
    @Param('txId')     txId: string,
    @Body() body: { status: 'succeeded' | 'rejected' },
  ) {
    const data = await this.walletService.updateWithdrawalStatus(doctorId, txId, body.status);
    return { success: true, data };
  }
}
