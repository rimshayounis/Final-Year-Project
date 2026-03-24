import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDoctorDto {
  @IsNotEmpty() @IsString()  fullName:         string;
  @IsNotEmpty() @IsEmail()   email:            string;
  @IsNotEmpty() @IsString()  @MinLength(8) password: string;
  @IsNotEmpty() @IsString()  @IsIn(['doctor', 'therapist']) professionalType: string;
  @IsNotEmpty() @IsString()  specialization:   string;
  @IsOptional() @IsString()  licenseNumber?:   string;
  @IsOptional() certificates?: string[];
}

export class LoginDoctorDto {
  @IsNotEmpty() @IsEmail()   email:    string;
  @IsNotEmpty() @IsString()  password: string;
  @IsOptional() @IsString()  userType?: string;
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

  @IsNotEmpty() @IsString() @MinLength(6)
  newPassword: string;
}