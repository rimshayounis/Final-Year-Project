import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';

// Called from PostsService after incrementLikes
export class HandleLikeMilestoneDto {
  @IsString()
  @IsNotEmpty()
  postId: string;

  @IsNumber()
  @Min(0)
  currentLikes: number;

  @IsString()
  @IsNotEmpty()
  approvingDoctorId: string; // doctor who approved this post
}

// Called from BookedAppointmentService when status → 'completed'
export class HandleBookingCompletedDto {
  @IsString()
  @IsNotEmpty()
  doctorId: string;

  @IsString()
  @IsNotEmpty()
  yearMonth: string; // 'YYYY-MM'
}
