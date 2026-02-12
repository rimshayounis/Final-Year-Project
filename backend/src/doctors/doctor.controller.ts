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
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { DoctorsService } from './doctor.service';
import { RegisterDoctorDto, LoginDoctorDto } from './dto/doctor.dto';

@Controller('doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FilesInterceptor('certificates', 10, {
      storage: diskStorage({
        destination: './uploads/certificates',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `certificate-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              'Only image files (JPG, JPEG, PNG, GIF, WEBP) are allowed!',
            ),
            false,
          );
        }
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max file size per image
      },
    }),
  )
  async register(
    @Body() registerDoctorDto: RegisterDoctorDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const certificatePaths = files?.map((file) => file.path) || [];

    return this.doctorsService.register({
      ...registerDoctorDto,
      certificates: certificatePaths,
    });
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDoctorDto: LoginDoctorDto) {
    return this.doctorsService.login(loginDoctorDto);
  }

  @Get(':doctorId')
  async getDoctorById(@Param('doctorId') doctorId: string) {
    return this.doctorsService.getDoctorById(doctorId);
  }

  @Get()
  async getAllDoctors() {
    return this.doctorsService.getAllDoctors();
  }

  @Get('verified/list')
  async getVerifiedDoctors() {
    return this.doctorsService.getVerifiedDoctors();
  }

  @Put(':doctorId')
  async updateDoctor(
    @Param('doctorId') doctorId: string,
    @Body() updateData: any,
  ) {
    return this.doctorsService.updateDoctor(doctorId, updateData);
  }

  @Put(':doctorId/verify')
  async verifyDoctor(@Param('doctorId') doctorId: string) {
    return this.doctorsService.verifyDoctor(doctorId);
  }

  @Delete(':doctorId')
  async deleteDoctor(@Param('doctorId') doctorId: string) {
    return this.doctorsService.deleteDoctor(doctorId);
  }
}