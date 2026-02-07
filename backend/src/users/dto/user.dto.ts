
import { IsString, IsEmail, IsNotEmpty, IsNumber, IsOptional, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class RegisterUserDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsNumber()
  @IsNotEmpty()
  age: number;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  gender: string;

  @IsEnum(['user', 'doctor'])
  @IsNotEmpty()
  userType: 'user' | 'doctor';
}

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


export class LoginDto {
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

export class CreateHealthProfileDto {
  @IsNumber()
  sleepDuration: number;

  @IsString()
  stressLevel: string;

  @IsString()
  dietPreference: string;

  @IsOptional()
  @IsString()
  additionalNotes?: string;
}

export class EmergencyContactDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  relationship: string;
}

export class CreateEmergencyContactsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmergencyContactDto)
  contacts: EmergencyContactDto[];
}