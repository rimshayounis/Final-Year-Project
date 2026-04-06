import { IsString, IsIn, IsOptional } from 'class-validator';

export class CreatePaymentIntentDto {
  @IsString()
  doctorId!: string;

  @IsString()
  @IsIn(['basic', 'professional', 'premium'])
  plan!: 'basic' | 'professional' | 'premium';
}

export class ConfirmPaymentDto {
  @IsString()
  doctorId!: string;

  @IsString()
  @IsIn(['basic', 'professional', 'premium'])
  plan!: 'basic' | 'professional' | 'premium';

  @IsString()
  paymentIntentId!: string;

  @IsString()
  @IsOptional()
  doctorName?: string;
}

export class CreateAppointmentPaymentDto {
  @IsString()
  appointmentId!: string;
}

export class ConfirmAppointmentPaymentDto {
  @IsString()
  appointmentId!: string;

  @IsString()
  paymentIntentId!: string;

  @IsString()
  @IsOptional()
  userId?: string;
}
