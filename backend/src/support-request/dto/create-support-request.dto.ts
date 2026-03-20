import { IsString, IsIn, MinLength, MaxLength, IsOptional } from 'class-validator';

export class CreateSupportRequestDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  @IsIn(['user', 'doctor'])
  userRole?: string;

  @IsString()
  @IsIn(['technical', 'billing', 'account', 'appointment', 'content', 'doctor', 'other'])
  purpose: string;

  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  description: string;
}
