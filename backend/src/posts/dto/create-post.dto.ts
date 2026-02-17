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
  @IsIn([
    'Hair & Skin',
    'Mental Health',
    'Nutrition',
    'Fitness',
    'Heart Health',
    'General Health',
    'Other',
  ])
  category: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mediaUrls?: string[];

  @IsOptional()
  @IsString()
  backgroundColor?: string;
}