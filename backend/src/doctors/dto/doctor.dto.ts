
import { IsString, IsEmail, IsNotEmpty, IsNumber, IsOptional, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// ✅ NEW - Doctor-specific registration DTO
export class RegisterDoctorDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  licenseNumber: string;

  @IsString()
  @IsNotEmpty()
  specialization: string;

  @IsArray()
  @IsOptional()

  certificates?: string[]; // Array of certificate URLs/paths

}

export class LoginDoctorDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsEnum(['user', 'doctor'])
  @IsNotEmpty()
  userType: 'user' | 'doctor';
}