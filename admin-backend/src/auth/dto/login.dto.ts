import { IsString, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  identifier: string; // accepts username or email

  @IsString()
  @IsNotEmpty()
  password: string;
}
