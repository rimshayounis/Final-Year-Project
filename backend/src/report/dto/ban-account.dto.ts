import { IsMongoId, IsIn } from 'class-validator';

export class BanAccountDto {
  @IsMongoId()
  reportedId!: string;

  @IsIn(['User', 'Doctor'])
  reportedModel!: 'User' | 'Doctor';
}
