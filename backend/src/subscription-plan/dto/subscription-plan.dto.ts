import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateSubscriptionDto {
  @IsString()
  doctorId!: string;

  @IsEnum(['free_trial', 'basic', 'professional', 'premium'])
  plan!: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  transactionId?: string;
}

export class CancelSubscriptionDto {
  @IsOptional()
  @IsString()
  cancelReason?: string;
}
