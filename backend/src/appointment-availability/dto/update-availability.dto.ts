import { IsOptional, IsNumber, IsArray, IsBoolean, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { SpecificDateDto } from './create-availability.dto';

export class UpdateAvailabilityDto {
  @IsOptional()
  @IsNumber()
  @Min(15)
  @Max(120)
  sessionDuration?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  consultationFee?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SpecificDateDto)
  specificDates?: SpecificDateDto[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}