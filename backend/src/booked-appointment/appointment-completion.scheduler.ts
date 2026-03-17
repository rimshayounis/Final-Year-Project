// src/booked-appointment/appointment-completion.scheduler.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  BookedAppointment,
  BookedAppointmentDocument,
} from './schemas/booked-appointment.schema';
import { AppointmentGateway } from './appointment.gateway';

@Injectable()
export class AppointmentCompletionScheduler {
  private readonly logger = new Logger(AppointmentCompletionScheduler.name);

  constructor(
    @InjectModel(BookedAppointment.name)
    private readonly bookedAppointmentModel: Model<BookedAppointmentDocument>,
    private readonly gateway: AppointmentGateway,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async run() {
    const now = new Date();

    const confirmed = await this.bookedAppointmentModel
      .find({ status: 'confirmed' })
      .exec();

    for (const appt of confirmed) {
      const [hours, minutes] = appt.time.split(':').map(Number);
      const apptStart = new Date(appt.date);
      apptStart.setHours(hours, minutes, 0, 0);

      const apptEnd = new Date(
        apptStart.getTime() + appt.sessionDuration * 60 * 1000,
      );

      if (now >= apptEnd) {
        appt.status = 'completed';
        appt.completedAt = now;
        await appt.save();

        this.gateway.notifyCompleted(String(appt._id));
        this.logger.log(`Auto-completed appointment ${appt._id}`);
      }
    }
  }
}