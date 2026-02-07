
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
  Query,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { UsersService } from './users.service';
import {
  RegisterUserDto,
  RegisterDoctorDto,
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

  // ✅ NEW - Doctor registration with image upload
  @Post('register-doctor')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FilesInterceptor('certificates', 10, {
      storage: diskStorage({
        destination: './uploads/certificates',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `certificate-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        // ✅ Only accept image files
        if (file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only image files (JPG, JPEG, PNG, GIF, WEBP) are allowed!'), false);
        }
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // ✅ 5MB max file size per image
      },
    }),
  )
  async registerDoctor(
    @Body() registerDoctorDto: RegisterDoctorDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    // ✅ Get file paths from uploaded images
    const certificatePaths = files?.map(file => file.path) || [];
    
    return this.usersService.registerDoctor({
      ...registerDoctorDto,
      certificates: certificatePaths,
    });
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
  async getAllUsers(@Query('userType') userType?: string) {
    // ✅ Filter by userType if provided
    if (userType && (userType === 'user' || userType === 'doctor')) {
      return this.usersService.getUsersByType(userType);
    }
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