import { IsNotEmpty, IsString, IsIn, IsOptional } from 'class-validator';

export class ApprovePostDto {
  @IsNotEmpty()
  @IsString()
  doctorId: string;

  @IsNotEmpty()
  @IsString()
  @IsIn(['approved', 'rejected'])
  action: string;

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}