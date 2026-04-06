import { IsString } from 'class-validator';

export class LoginAdminDto {
  @IsString() identifier!: string; // username or email
  @IsString() password!: string;
}
