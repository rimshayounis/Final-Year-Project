
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsNumber,
  MinLength,
  IsArray,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RegisterUserDto {
  @IsNotEmpty()
  @IsString()
  fullName: string;

  @IsNotEmpty()
  @IsNumber()
  age: number;

  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsNotEmpty()
  @IsString()
  gender: string;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  password: string;

  @IsOptional()
  @IsString()
  userType?: string;
}


export class CreateHealthProfileDto {
  @IsOptional()
  @IsNumber()
  sleepDuration?: number;

  @IsOptional()
  @IsString()
  stressLevel?: string;

  @IsOptional()
  @IsString()
  dietPreference?: string;

  @IsOptional()
  @IsString()
  additionalNotes?: string;
}

export class EmergencyContactDto {
  @IsNotEmpty()
  @IsString()
  fullName: string;

  @IsNotEmpty()
  @IsString()
  phoneNumber: string;

  @IsNotEmpty()
  @IsString()
  relationship: string;
}

export class CreateEmergencyContactsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmergencyContactDto)
  contacts: EmergencyContactDto[];
}