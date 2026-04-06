import { IsString, IsOptional, IsMongoId } from 'class-validator';

export class CreateReportDto {
  @IsString()
  reporterModel!: string;

  @IsMongoId()
  reporterId!: string;

  @IsString()
  reportedModel!: string;

  @IsMongoId()
  reportedId!: string;

  @IsString()
  reason!: string;

  @IsMongoId()
  @IsOptional()
  postId?: string;
}