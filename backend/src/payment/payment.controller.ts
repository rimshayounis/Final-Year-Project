import { Controller, Post, Get, Body } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreatePaymentIntentDto, ConfirmPaymentDto } from './dto/payment.dto';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /** Step 1 — frontend calls this first to get clientSecret */
  @Post('create-intent')
  createIntent(@Body() dto: CreatePaymentIntentDto) {
    return this.paymentService.createPaymentIntent(dto);
  }

  /** Step 2 — frontend calls this after Stripe payment sheet succeeds */
  @Post('confirm')
  confirmPayment(@Body() dto: ConfirmPaymentDto) {
    return this.paymentService.confirmPayment(dto);
  }

  /** Admin — wallet summary */
  @Get('admin/wallet')
  getAdminWallet() {
    return this.paymentService.getAdminWalletSummary();
  }

  /** Admin — all transactions */
  @Get('admin/transactions')
  getTransactions() {
    return this.paymentService.getAllTransactions();
  }
}
