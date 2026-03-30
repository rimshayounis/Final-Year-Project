import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import {
  RegisterUserDto,
  CreateHealthProfileDto,
  CreateEmergencyContactsDto,
  UpdateSosMessageDto,
  LoginDto,
  ForgotPasswordDto,
  VerifyOtpDto,
  ResetPasswordDto,
} from './dto/user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerUserDto: RegisterUserDto) {
    return this.usersService.register(registerUserDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.usersService.login(loginDto);
  }

  // ── Forgot Password flow ───────────────────────────────────────────────────
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.usersService.forgotPassword(dto);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.usersService.verifyOtp(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.usersService.resetPassword(dto);
  }

  // ── Health Profile & Emergency Contacts ───────────────────────────────────
  @Post(':userId/health-profile')
  @HttpCode(HttpStatus.CREATED)
  async createHealthProfile(
    @Param('userId') userId: string,
    @Body() healthProfileDto: CreateHealthProfileDto,
  ) {
    return this.usersService.createHealthProfile(userId, healthProfileDto);
  }

  @Post(':userId/emergency-contacts')
  @HttpCode(HttpStatus.CREATED)
  async createEmergencyContacts(
    @Param('userId') userId: string,
    @Body() emergencyContactsDto: CreateEmergencyContactsDto,
  ) {
    return this.usersService.createEmergencyContacts(userId, emergencyContactsDto);
  }

  // ── SOS Message ───────────────────────────────────────────────────────────
  @Patch(':userId/sos-message')
  @HttpCode(HttpStatus.OK)
  async updateSosMessage(
    @Param('userId') userId: string,
    @Body() dto: UpdateSosMessageDto,
  ) {
    return this.usersService.updateSosMessage(userId, dto.sosMessage);
  }

  // ── CRUD ───────────────────────────────────────────────────────────────────
  @Get(':userId')
  async getUserById(@Param('userId') userId: string) {
    return this.usersService.getUserById(userId);
  }

  @Get()
  async getAllUsers() {
    return this.usersService.getAllUsers();
  }

  @Put(':userId')
  async updateUser(
    @Param('userId') userId: string,
    @Body() updateData: any,
  ) {
    return this.usersService.updateUser(userId, updateData);
  }

  @Delete(':userId')
  async deleteUser(@Param('userId') userId: string) {
    return this.usersService.deleteUser(userId);
  }

  @Patch(':userId/change-password')
  async changePassword(
    @Param('userId') userId: string,
    @Body() body: { oldPassword: string; newPassword: string },
  ) {
    return this.usersService.changePassword(
      userId,
      body.oldPassword,
      body.newPassword,
    );
  }

  @Patch(':userId/change-email')
  async changeEmail(
    @Param('userId') userId: string,
    @Body() body: { password: string; newEmail: string },
  ) {
    return this.usersService.changeEmail(
      userId,
      body.password,
      body.newEmail,
    );
  }

  @Get(':userId/notification-settings')
  async getNotificationSettings(@Param('userId') userId: string) {
    return this.usersService.getNotificationSettings(userId);
  }

  @Patch(':userId/notification-settings')
  async updateNotificationSettings(
    @Param('userId') userId: string,
    @Body() body: { pushEnabled?: boolean; emailEnabled?: boolean },
  ) {
    return this.usersService.updateNotificationSettings(userId, body);
  }

  @Patch(':userId/push-token')
  async savePushToken(
    @Param('userId') userId: string,
    @Body() body: { token: string | null },
  ) {
    return this.usersService.savePushToken(userId, body.token ?? null);
  }
}