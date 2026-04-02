import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
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

  @Patch(':userId/sos-share-profile')
  @HttpCode(HttpStatus.OK)
  async updateSosShareProfile(
    @Param('userId') userId: string,
    @Body() dto: { sosShareProfile: boolean },
  ) {
    return this.usersService.updateSosShareProfile(userId, dto.sosShareProfile);
  }

  // ── CRUD ───────────────────────────────────────────────────────────────────
  // GET /users/:userId/suggestions  — friend suggestions by shared interests
  @Get(':userId/suggestions')
  async getFriendSuggestions(@Param('userId') userId: string) {
    return this.usersService.getFriendSuggestions(userId);
  }

  // GET /users/search?q=name&exclude=userId
  @Get('search/users')
  async searchUsers(
    @Query('q') query: string,
    @Query('exclude') excludeUserId: string,
  ) {
    return this.usersService.searchUsers(query || '', excludeUserId || '');
  }

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

  // ── Block / Unblock ───────────────────────────────────────────────────────
  @Post(':userId/block/:targetId')
  @HttpCode(HttpStatus.OK)
  async blockUser(
    @Param('userId') userId: string,
    @Param('targetId') targetId: string,
  ) {
    return this.usersService.blockUser(userId, targetId);
  }

  @Post(':userId/unblock/:targetId')
  @HttpCode(HttpStatus.OK)
  async unblockUser(
    @Param('userId') userId: string,
    @Param('targetId') targetId: string,
  ) {
    return this.usersService.unblockUser(userId, targetId);
  }

  @Get(':userId/blocked')
  async getBlockedUsers(@Param('userId') userId: string) {
    return this.usersService.getBlockedUsers(userId);
  }

  @Get(':userId/block-status/:targetId')
  async getBlockStatus(
    @Param('userId') userId: string,
    @Param('targetId') targetId: string,
  ) {
    return this.usersService.isBlockedBetween(userId, targetId);
  }
}