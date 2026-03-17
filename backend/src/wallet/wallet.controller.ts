import { Controller, Get, Post, Body, Param } from '@nestjs/common';
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
}
