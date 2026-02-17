import { IsOptional, IsString, IsArray, IsIn } from 'class-validator';

export class UpdatePostDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
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
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mediaUrls?: string[];

  @IsOptional()
  @IsString()
  backgroundColor?: string;
}