import { Controller, Post, Get, Body } from '@nestjs/common';
import { PaymentService } from './payment.service';
import {
  CreatePaymentIntentDto,
  ConfirmPaymentDto,
  CreateAppointmentPaymentDto,
  ConfirmAppointmentPaymentDto,
} from './dto/payment.dto';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // ── Subscription ──────────────────────────────────────────────────────────
  @Post('create-intent')
  createIntent(@Body() dto: CreatePaymentIntentDto) {
    return this.paymentService.createPaymentIntent(dto);
  }

  @Post('confirm')
  confirmPayment(@Body() dto: ConfirmPaymentDto) {
    return this.paymentService.confirmPayment(dto);
  }

  // ── Appointment ───────────────────────────────────────────────────────────
  @Post('appointment/create-intent')
  createAppointmentIntent(@Body() dto: CreateAppointmentPaymentDto) {
    return this.paymentService.createAppointmentPaymentIntent(dto);
  }

  @Post('appointment/confirm')
  confirmAppointmentPayment(@Body() dto: ConfirmAppointmentPaymentDto) {
    return this.paymentService.confirmAppointmentPayment(dto);
  }

  // ── Admin ─────────────────────────────────────────────────────────────────
  @Get('admin/wallet')
  getAdminWallet() {
    return this.paymentService.getAdminWalletSummary();
  }

  @Get('admin/transactions')
  getTransactions() {
    return this.paymentService.getAllTransactions();
  }
  @Get('admin/held')
getHeldPayments() {
  return this.paymentService.getHeldPayments();
}
}
