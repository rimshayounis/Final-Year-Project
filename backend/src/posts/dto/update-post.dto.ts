import { IsOptional, IsString, IsArray, IsIn, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdatePostDto {
  // Auth field — stripped before DB update, kept here so whitelist allows it
  @IsOptional()
  @IsString()
  userId?: string;

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
  @Transform(({ value }) => (Array.isArray(value) ? value : value ? [value] : []))
  mediaUrls?: string[];

  @IsOptional()
  @IsString()
  backgroundColor?: string;

  // Visibility toggle — works on any post status
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (typeof value === 'boolean') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  isActive?: boolean;
}