import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RegisterUserDto {
  @IsNotEmpty() @IsString()  fullName:  string;
  @IsNotEmpty() @IsNumber()  age:       number;
  @IsNotEmpty() @IsEmail()   email:     string;
  @IsNotEmpty() @IsString()  @MinLength(8) password: string;
  @IsNotEmpty() @IsString()  gender:    string;
  @IsNotEmpty() @IsString()  userType:  string;
}

export class LoginDto {
  @IsNotEmpty() @IsEmail()  email:    string;
  @IsNotEmpty() @IsString() password: string;
  @IsOptional() @IsString() userType?: string;
}

export class CreateHealthProfileDto {
  @IsOptional() @IsNumber() sleepDuration?:   number;
  @IsOptional() @IsString() stressLevel?:     string;
  @IsOptional() @IsString() dietPreference?:  string;
  @IsOptional() @IsString() additionalNotes?: string;
}

// ── Emergency Contact ──────────────────────────────────────────────────────

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

  @IsOptional()   // 👈 optional so signup doesn't break if not provided
  @IsEmail()
  email?: string;
}

export class CreateEmergencyContactsDto {
  @IsArray()
  @ValidateNested({ each: true })  // 👈 validates each contact object
  @Type(() => EmergencyContactDto) // 👈 transforms plain object to class
  contacts: EmergencyContactDto[];
}

// ── Forgot Password DTOs ───────────────────────────────────────────────────

export class ForgotPasswordDto {
  @IsNotEmpty() @IsEmail()
  email: string;
}

export class VerifyOtpDto {
  @IsNotEmpty() @IsEmail()
  email: string;

  @IsNotEmpty() @IsString()
  otpCode: string;
}

export class ResetPasswordDto {
  @IsNotEmpty() @IsEmail()
  email: string;

  @IsNotEmpty() @IsString()
  otpCode: string;

  @IsNotEmpty() @IsString() @MinLength(8)
  newPassword: string;
}