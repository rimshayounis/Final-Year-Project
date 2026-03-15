import { Controller, Get, Put, Param, Body, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { UserProfileService } from './user-profile.service';
import { UpdateUserProfileDto } from './dto/user-profile.dto';

@Controller('profiles')
export class UserProfileController {
  constructor(private readonly profileService: UserProfileService) {}

  // GET /profiles/:ownerType/:ownerId
  @Get(':ownerType/:ownerId')
  async getProfile(
    @Param('ownerId') ownerId: string,
    @Param('ownerType') ownerType: string,
  ) {
    const type = ownerType === 'doctor' ? 'Doctor' : 'User';
    const profile = await this.profileService.getProfile(ownerId, type);
    return { success: true, data: profile ?? { ownerId, ownerType: type, bio: null, profileImage: null } };
  }

  // PUT /profiles/:ownerType/:ownerId — update bio
 @Put(':ownerType/:ownerId')
async updateProfile(
  @Param('ownerId') ownerId: string,
  @Param('ownerType') ownerType: string,
  @Body() dto: UpdateUserProfileDto,
) {
  console.log('updateProfile called:', ownerId, ownerType, dto); // ← add this
  const type = ownerType === 'doctor' ? 'Doctor' : 'User';
  const profile = await this.profileService.upsertProfile(ownerId, type, dto);
  return { success: true, data: profile };
}

  // PUT /profiles/:ownerType/:ownerId/image — upload profile image
  @Put(':ownerType/:ownerId/image')
  @UseInterceptors(
    FileInterceptor('profileImage', {
      storage: diskStorage({
        destination: './uploads/profiles',
        filename: (req, file, cb) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `profile-${unique}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
          return cb(new BadRequestException('Only image files allowed'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 3 * 1024 * 1024 },
    }),
  )
  async uploadImage(
    @Param('ownerId') ownerId: string,
    @Param('ownerType') ownerType: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    const type = ownerType === 'doctor' ? 'Doctor' : 'User';
    const imageUrl = `/uploads/profiles/${file.filename}`;
    const profile = await this.profileService.upsertProfile(ownerId, type, { profileImage: imageUrl });
    return { success: true, data: profile };
  }
}