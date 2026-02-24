import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsMongoId,
  Matches,
  Min,
  IsOptional,
  IsEnum,
} from 'class-validator';

export class CreateBookedAppointmentDto {
  @IsMongoId()
  @IsNotEmpty()
  userId: string;

  @IsMongoId()
  @IsNotEmpty()
  doctorId: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be in YYYY-MM-DD format' })
  date: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{2}:\d{2}$/, { message: 'time must be in HH:MM format' })
  time: string;

  @IsNumber()
  @Min(15)
  sessionDuration: number;

  @IsNumber()
  @Min(0)
  consultationFee: number;

  @IsString()
  @IsNotEmpty()
  healthConcern: string;
}

export class UpdateAppointmentStatusDto {
  @IsEnum(['pending', 'confirmed', 'cancelled', 'completed'])
  @IsNotEmpty()
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';

  @IsString()
  @IsOptional()
  cancelReason?: string;
}