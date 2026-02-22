import { IsNotEmpty, IsString, IsNumber, IsArray, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class TimeSlotDto {
  @IsNotEmpty()
  @IsString()
  start: string; // HH:MM

  @IsNotEmpty()
  @IsString()
  end: string; // HH:MM
}

export class SpecificDateDto {
  @IsNotEmpty()
  @IsString()
  date: string; // YYYY-MM-DD

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeSlotDto)
  timeSlots: TimeSlotDto[];
}

export class CreateAvailabilityDto {
  @IsNotEmpty()
  @IsString()
  doctorId: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(15)
  @Max(120)
  sessionDuration: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  consultationFee: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SpecificDateDto)
  specificDates: SpecificDateDto[];
}