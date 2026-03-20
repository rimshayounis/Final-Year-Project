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
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { DoctorsService } from './doctor.service';
import {
  RegisterDoctorDto,
  LoginDoctorDto,
  ForgotPasswordDto,
  VerifyOtpDto,
  ResetPasswordDto,
} from './dto/doctor.dto';

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
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `certificate-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only image files are allowed!'), false);
        }
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async register(
    @Body() registerDoctorDto: RegisterDoctorDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const certificatePaths = files?.map((file) => file.path) || [];
    return this.doctorsService.register({ ...registerDoctorDto, certificates: certificatePaths });
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDoctorDto: LoginDoctorDto) {
    return this.doctorsService.login(loginDoctorDto);
  }

  // ── Forgot Password flow ───────────────────────────────────────────────────

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.doctorsService.forgotPassword(dto);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.doctorsService.verifyOtp(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.doctorsService.resetPassword(dto);
  }

  // ── CRUD ───────────────────────────────────────────────────────────────────

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
  async updateDoctor(@Param('doctorId') doctorId: string, @Body() updateData: any) {
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

  @Get(':doctorId/bank-details')
  async getBankDetails(@Param('doctorId') doctorId: string) {
    return this.doctorsService.getBankDetails(doctorId);
  }

  @Post(':doctorId/bank-details')
  async saveBankDetails(
    @Param('doctorId') doctorId: string,
    @Body() body: { password: string; bankName: string; accountName: string; accountNumber: string },
  ) {
    return this.doctorsService.saveBankDetails(doctorId, body.password, body.bankName, body.accountName, body.accountNumber);
  }

  @Delete(':doctorId/bank-details')
  async deleteBankDetails(
    @Param('doctorId') doctorId: string,
    @Body() body: { password: string },
  ) {
    return this.doctorsService.deleteBankDetails(doctorId, body.password);
  }

  @Get(':doctorId/notification-settings')
  async getNotificationSettings(@Param('doctorId') doctorId: string) {
    return this.doctorsService.getNotificationSettings(doctorId);
  }

  @Patch(':doctorId/notification-settings')
  async updateNotificationSettings(
    @Param('doctorId') doctorId: string,
    @Body() body: { emailEnabled?: boolean; pushEnabled?: boolean },
  ) {
    return this.doctorsService.updateNotificationSettings(doctorId, body);
  }

  @Patch(':doctorId/push-token')
  async savePushToken(
    @Param('doctorId') doctorId: string,
    @Body() body: { token: string | null },
  ) {
    return this.doctorsService.savePushToken(doctorId, body.token ?? null);
  }

  @Patch(':doctorId/change-password')
  async changePassword(
    @Param('doctorId') doctorId: string,
    @Body() body: { oldPassword: string; newPassword: string },
  ) {
    return this.doctorsService.changePassword(doctorId, body.oldPassword, body.newPassword);
  }

  @Patch(':doctorId/change-email')
  async changeEmail(
    @Param('doctorId') doctorId: string,
    @Body() body: { password: string; newEmail: string },
  ) {
    return this.doctorsService.changeEmail(doctorId, body.password, body.newEmail);
  }
}