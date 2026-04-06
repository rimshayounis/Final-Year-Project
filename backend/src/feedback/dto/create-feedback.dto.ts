import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class CreateFeedbackDto {
  @IsString()
  appointmentId!: string;

  @IsString()
  userId!: string;

  @IsString()
  doctorId!: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  description?: string;
}
