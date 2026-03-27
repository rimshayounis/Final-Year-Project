import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { ConvertPointsDto, WithdrawDto } from './dto/wallet.dto';

@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  // GET /wallet/:doctorId
  @Get(':doctorId')
  async getWallet(@Param('doctorId') doctorId: string) {
    const data = await this.walletService.getWallet(doctorId);
    return { success: true, data };
  }

  // POST /wallet/convert
  @Post('convert')
  async convertPoints(@Body() dto: ConvertPointsDto) {
    const data = await this.walletService.convertPoints(dto);
    return { success: true, data };
  }

  // POST /wallet/withdraw
  @Post('withdraw')
  async requestWithdrawal(@Body() dto: WithdrawDto) {
    const data = await this.walletService.requestWithdrawal(dto);
    return { success: true, data };
  }

  // PATCH /wallet/:doctorId/withdrawal/:txId/status  (kept for doctor-app use)
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
