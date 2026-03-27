import { IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString, MinLength } from 'class-validator';

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

export class CreateEmergencyContactsDto {
  contacts: {
    fullName:     string;
    phoneNumber:  string;
    relationship: string;
  }[];
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