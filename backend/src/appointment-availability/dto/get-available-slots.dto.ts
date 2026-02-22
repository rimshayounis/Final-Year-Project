import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetAvailableSlotsDto {
  @IsNotEmpty()
  @IsString()
  doctorId!: string;

  @IsOptional()
  @IsString()
  date?: string; // YYYY-MM-DD, if not provided returns next 30 days

  @IsOptional()
  @IsString()
  startDate?: string; // YYYY-MM-DD

  @IsOptional()
  @IsString()
  endDate?: string; // YYYY-MM-DD
}