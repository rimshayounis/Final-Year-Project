import { IsNotEmpty, IsString, IsOptional, IsArray, IsIn } from 'class-validator';

export class CreatePostDto {
  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsString()
  category: string;

  @IsOptional()
  @IsArray()
  mediaUrls?: string[];

  @IsOptional()
  @IsString()
  backgroundColor?: string;

  @IsOptional()
  @IsString()
  @IsIn(['pending', 'approved', 'rejected'])
  status?: string;

  @IsOptional()
  @IsString()
  @IsIn(['User', 'Doctor'])
  userModel?: string;
}