import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as nodemailer from 'nodemailer';
import * as https from 'https';
import { Doctor, DoctorDocument } from '../doctors/schemas/doctor.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class NotificationService {
  private transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  constructor(
    @InjectModel(Doctor.name) private doctorModel: Model<DoctorDocument>,
    @InjectModel(User.name)   private userModel:   Model<UserDocument>,
  ) {}

  // ── Called after appointment is booked ────────────────────────────────────
  async notifyDoctorNewAppointment(apptData: {
    doctorId:        string;
    userId:          string;
    date:            string;
    time:            string;
    sessionDuration: number;
    consultationFee: number;
    healthConcern:   string;
  }): Promise<void> {
    const [doctor, patient] = await Promise.all([
      this.doctorModel.findById(apptData.doctorId).select('fullName email notificationSettings expoPushToken').exec(),
      this.userModel.findById(apptData.userId).select('fullName').exec(),
    ]);

    if (!doctor) return;

    const settings   = (doctor as any).notificationSettings;
    const doctorName = (doctor as any).fullName ?? 'Doctor';
    const patientName = (patient as any)?.fullName ?? 'Patient';

    const details = {
      patientName,
      doctorName,
      date:            apptData.date,
      time:            apptData.time,
      sessionDuration: apptData.sessionDuration,
      consultationFee: apptData.consultationFee,
      healthConcern:   apptData.healthConcern,
    };

    if (settings?.emailEnabled) {
      await this.sendEmail((doctor as any).email, details).catch((e) =>
        console.error('[Notification] Email error:', e.message),
      );
    }

    if (settings?.pushEnabled) {
      const pushToken = (doctor as any).expoPushToken;
      if (pushToken) {
        await this.sendPushNotification(pushToken, details).catch((e) =>
          console.error('[Notification] Push error:', e.message),
        );
      } else {
        console.log(`[Notification] No push token for Dr. ${doctorName}`);
      }
    }
  }

  // ── Email ─────────────────────────────────────────────────────────────────
  private async sendEmail(
    to: string,
    d: {
      patientName: string; doctorName: string; date: string; time: string;
      sessionDuration: number; consultationFee: number; healthConcern: string;
    },
  ): Promise<void> {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('[Notification] Email skipped — EMAIL_USER / EMAIL_PASS not set');
      return;
    }

    await this.transporter.sendMail({
      from:    `"TruHeal Link" <${process.env.EMAIL_USER}>`,
      to,
      subject: `📅 New Appointment Booked — ${d.patientName}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;border-radius:12px;overflow:hidden;border:1px solid #e8eaf6;">
          <div style="background:#6B7FED;padding:24px 28px;">
            <h2 style="color:#fff;margin:0;">TruHeal Link</h2>
            <p style="color:rgba(255,255,255,0.85);margin:4px 0 0;">New Appointment Booked</p>
          </div>
          <div style="padding:28px;">
            <p style="color:#555;">Hello Dr. <strong>${d.doctorName}</strong>,<br>A new appointment has been booked. Please open the app to confirm or reject.</p>
            <table style="width:100%;border-collapse:collapse;margin-top:16px;">
              ${row('👤 Patient',        d.patientName)}
              ${row('🩺 Health Concern', d.healthConcern)}
              ${row('📅 Date',           d.date)}
              ${row('🕐 Time',           d.time)}
              ${row('⏱️ Duration',       `${d.sessionDuration} minutes`)}
              ${row('💰 Fee',            `PKR ${d.consultationFee}`)}
            </table>
            <div style="margin-top:24px;padding:16px;background:#f0f4ff;border-radius:10px;text-align:center;">
              <p style="color:#6B7FED;font-weight:700;margin:0;">Open TruHeal Link app to Confirm or Reject</p>
            </div>
          </div>
        </div>
      `,
    });

    console.log(`[Notification] Email sent to ${to}`);
  }

  // ── User post like/comment push notification ───────────────────────────────
  async notifyUserPostActivity(params: {
    postAuthorId:   string;
    authorModel:    'User' | 'Doctor';
    actorName:      string;
    activity:       'liked' | 'commented on';
    postTitle:      string;
  }): Promise<void> {
    // fetch the post author's push token and notification settings
    let token: string | null = null;
    let pushEnabled = false;

    if (params.authorModel === 'User') {
      const user = await this.userModel
        .findById(params.postAuthorId)
        .select('expoPushToken notificationSettings')
        .exec();
      token       = (user as any)?.expoPushToken ?? null;
      pushEnabled = (user as any)?.notificationSettings?.pushEnabled ?? false;
    } else {
      const doctor = await this.doctorModel
        .findById(params.postAuthorId)
        .select('expoPushToken notificationSettings')
        .exec();
      token       = (doctor as any)?.expoPushToken ?? null;
      pushEnabled = (doctor as any)?.notificationSettings?.pushEnabled ?? false;
    }

    if (!pushEnabled || !token) return;

    const title = params.activity === 'liked' ? '❤️ New Like' : '💬 New Comment';
    const body  = `${params.actorName} ${params.activity} your post "${params.postTitle}"`;

    await this.sendRawPush(token, title, body).catch((e) =>
      console.error('[Notification] User push error:', e.message),
    );
  }

  // ── Expo Push Notification ─────────────────────────────────────────────────
  private async sendPushNotification(
    token: string,
    d: { patientName: string; doctorName: string; date: string; time: string; healthConcern: string },
  ): Promise<void> {
    await this.sendRawPush(
      token,
      '📅 New Appointment Booked',
      `${d.patientName} · ${d.date} at ${d.time}`,
      { patientName: d.patientName, date: d.date, time: d.time, healthConcern: d.healthConcern },
    );
  }

  private async sendRawPush(
    token: string,
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<void> {
    const payload = JSON.stringify({
      to:        token,
      title,
      body,
      sound:     'default',          // iOS + Android default notification sound
      channelId: 'default',          // Android: must match the channel created in App.tsx
      priority:  'high',             // Android: shows as heads-up banner with sound
      data:      data ?? {},
    });

    await new Promise<void>((resolve, reject) => {
      const req = https.request(
        {
          hostname: 'exp.host',
          path: '/--/api/v2/push/send',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
          },
        },
        (res) => {
          res.resume();
          res.on('end', () => resolve());
        },
      );
      req.on('error', reject);
      req.write(payload);
      req.end();
    });

    console.log(`[Notification] Push sent to token ${token.slice(0, 20)}...`);
  }

}

// HTML table row helper
function row(label: string, value: string) {
  return `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f4ff;color:#888;font-size:13px;width:40%;">${label}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f4ff;color:#1A1D2E;font-size:13px;font-weight:600;">${value}</td>
    </tr>`;
}
