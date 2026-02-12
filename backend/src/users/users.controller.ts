
import {
  Controller,
  Get,
  Post,
  Put,
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
  LoginDto,
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
    return this.usersService.createEmergencyContacts(
      userId,
      emergencyContactsDto,
    );
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
  async updateUser(@Param('userId') userId: string, @Body() updateData: any) {
    return this.usersService.updateUser(userId, updateData);
  }

  @Delete(':userId')
  async deleteUser(@Param('userId') userId: string) {
    return this.usersService.deleteUser(userId);
  }
}