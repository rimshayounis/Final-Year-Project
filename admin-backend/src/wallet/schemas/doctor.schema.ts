import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DoctorDocument = Doctor & Document;

@Schema({ _id: false })
export class BankDetails {
  @Prop() bankName!: string;
  @Prop() accountName!: string;
  @Prop() accountNumber!: string;
}

@Schema({ collection: 'doctors' })
export class Doctor {
  @Prop({ required: true }) fullName!: string;
  @Prop({ required: true }) email!: string;
  @Prop({ type: BankDetails, default: null }) bankDetails!: BankDetails | null;
}

export const DoctorSchema = SchemaFactory.createForClass(Doctor);
