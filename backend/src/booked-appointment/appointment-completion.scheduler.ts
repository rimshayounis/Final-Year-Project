import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  BookedAppointment,
  BookedAppointmentDocument,
} from './schemas/booked-appointment.schema';
import { AppointmentGateway } from './appointment.gateway';
import { PaymentService } from '../payment/payment.service';
import { BookedAppointmentService } from './booked-appointment.service';

@Injectable()
export class AppointmentCompletionScheduler {
  private readonly logger = new Logger(AppointmentCompletionScheduler.name);

  constructor(
    @InjectModel(BookedAppointment.name)
    private readonly bookedAppointmentModel: Model<BookedAppointmentDocument>,
    private readonly gateway: AppointmentGateway,
    private readonly paymentService: PaymentService,
    private readonly bookedAppointmentService: BookedAppointmentService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async run() {
    // Auto-cancel unconfirmed (>10 min) and unpaid confirmed (>10 min)
    await this.bookedAppointmentService
      .autoCancelExpiredAppointments()
      .catch((e) => this.logger.error(`Auto-cancel failed: ${e.message}`));

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

        // Release held payment to doctor wallet (if payment was held)
        if (appt.paymentStatus === 'payment_held') {
          this.paymentService
            .releaseAppointmentPayment(String(appt._id))
            .then(() =>
              this.logger.log(`Payment released for appointment ${appt._id}`),
            )
            .catch((err) =>
              this.logger.error(`Payment release failed for ${appt._id}: ${err.message}`),
            );
        }
      }
    }
  }
}
