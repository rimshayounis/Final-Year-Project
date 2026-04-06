import { IsString, IsEmail, MinLength } from 'class-validator';

export class RegisterAdminDto {
  @IsString() fullName!: string;
  @IsString() username!: string;
  @IsEmail()  email!: string;
  @IsString() @MinLength(8) password!: string;
}
