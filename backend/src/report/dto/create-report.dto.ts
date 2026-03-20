import { IsString, IsNotEmpty, IsIn, IsOptional } from 'class-validator';

export class CreateReportDto {
  @IsString()
  @IsNotEmpty()
  reporterId: string;

  @IsOptional()
  @IsIn(['User', 'Doctor'])
  reporterModel?: string;

  @IsString()
  @IsNotEmpty()
  reportedId: string;

  @IsOptional()
  @IsIn(['User', 'Doctor'])
  reportedModel?: string;

  @IsString()
  @IsNotEmpty()
  reason: string;
}
