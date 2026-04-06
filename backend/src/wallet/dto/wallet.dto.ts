import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ConvertPointsDto {
  @IsString()
  @IsNotEmpty()
  doctorId!: string;

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  points!: number;
}

export class WithdrawDto {
  @IsString()
  @IsNotEmpty()
  doctorId!: string;

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  amount!: number;
}
