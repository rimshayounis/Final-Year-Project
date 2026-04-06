import { Controller, Post, Get, Body, Headers, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterAdminDto } from './dto/register-admin.dto';
import { LoginAdminDto } from './dto/login-admin.dto';

@Controller('auth/admin')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterAdminDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginAdminDto) {
    return this.authService.login(dto);
  }

  @Get('profile')
  profile(@Headers('authorization') authHeader: string) {
    if (!authHeader?.startsWith('Bearer '))
      throw new UnauthorizedException('Missing token');
    const token = authHeader.slice(7);
    return this.authService.getProfile(token);
  }

  @Post('forgot-password')
  forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  @Post('verify-otp')
  verifyOtp(
    @Body('email') email: string,
    @Body('otp')   otp:   string,
  ) {
    return this.authService.verifyOtp(email, otp);
  }

  @Post('reset-password')
  resetPassword(
    @Body('email')       email:       string,
    @Body('otp')         otp:         string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.authService.resetPassword(email, otp, newPassword);
  }
}
