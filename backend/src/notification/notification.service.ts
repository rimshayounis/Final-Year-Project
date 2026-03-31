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
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  constructor(
    @InjectModel(Doctor.name) private doctorModel: Model<DoctorDocument>,
    @InjectModel(User.name)   private userModel:   Model<UserDocument>,
  ) {}

  // ── 1. Doctor notified when user books ────────────────────────────────────
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
      this.doctorModel.findById(apptData.doctorId)
        .select('fullName email notificationSettings expoPushToken').exec(),
      this.userModel.findById(apptData.userId)
        .select('fullName').exec(),
    ]);

    if (!doctor) return;

    const settings    = (doctor as any).notificationSettings;
    const doctorName  = (doctor as any).fullName  ?? 'Doctor';
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
      await this.sendNewAppointmentEmail(
        (doctor as any).email, details,
      ).catch((e) => console.error('[Notification] Email error:', e.message));
    }

    if (settings?.pushEnabled) {
      const pushToken = (doctor as any).expoPushToken;
      if (pushToken) {
        await this.sendRawPush(
          pushToken,
          '📅 New Appointment Booked',
          `${patientName} · ${apptData.date} at ${apptData.time}`,
          { patientName, date: apptData.date, time: apptData.time },
        ).catch((e) => console.error('[Notification] Push error:', e.message));
      } else {
        console.log(`[Notification] No push token for Dr. ${doctorName}`);
      }
    }
  }

  // ── 2. User notified when doctor confirms or rejects ──────────────────────
  async notifyUserAppointmentStatus(data: {
    userId:          string;
    doctorId:        string;
    status:          'confirmed' | 'cancelled';
    date:            string;
    time:            string;
    consultationFee: number;
  }): Promise<void> {
    const [user, doctor] = await Promise.all([
      this.userModel.findById(data.userId)
        .select('fullName email expoPushToken notificationSettings').exec(),
      this.doctorModel.findById(data.doctorId)
        .select('fullName').exec(),
    ]);

    if (!user) return;

    const userName    = (user as any).fullName   ?? 'Patient';
    const doctorName  = (doctor as any)?.fullName ?? 'Doctor';
    const isConfirmed = data.status === 'confirmed';

    // ── Push notification ────────────────────────────────────────────────
    const pushToken = (user as any).expoPushToken;
    if (pushToken) {
      await this.sendRawPush(
        pushToken,
        isConfirmed
          ? '✅ Appointment Confirmed!'
          : '❌ Appointment Rejected',
        isConfirmed
          ? `Dr. ${doctorName} confirmed your appointment on ${data.date}. Please complete payment.`
          : `Dr. ${doctorName} rejected your appointment on ${data.date}.`,
        { status: data.status, date: data.date, time: data.time },
      ).catch((e) => console.error('[Notification] Push error:', e.message));
    }

    // ── Email ─────────────────────────────────────────────────────────────
    await this.sendAppointmentStatusEmail(
      (user as any).email,
      {
        userName,
        doctorName,
        status:          data.status,
        date:            data.date,
        time:            data.time,
        consultationFee: data.consultationFee,
      },
    ).catch((e) => console.error('[Notification] Email error:', e.message));
  }

  // ── 3. Doctor notified when user pays ────────────────────────────────────
  async notifyDoctorPaymentReceived(data: {
    doctorId:        string;
    userId:          string;
    date:            string;
    time:            string;
    consultationFee: number;
  }): Promise<void> {
    const [doctor, patient] = await Promise.all([
      this.doctorModel.findById(data.doctorId)
        .select('fullName email notificationSettings expoPushToken').exec(),
      this.userModel.findById(data.userId)
        .select('fullName').exec(),
    ]);

    if (!doctor) return;

    const doctorName  = (doctor as any).fullName  ?? 'Doctor';
    const patientName = (patient as any)?.fullName ?? 'Patient';
    const settings    = (doctor as any).notificationSettings;

    // ── Push notification ────────────────────────────────────────────────
    const pushToken = (doctor as any).expoPushToken;
    if (pushToken) {
      await this.sendRawPush(
        pushToken,
        '💰 Payment Received!',
        `${patientName} paid PKR ${data.consultationFee} for appointment on ${data.date}.`,
        { date: data.date, time: data.time, amount: data.consultationFee },
      ).catch((e) => console.error('[Notification] Push error:', e.message));
    }

    // ── Email — always send for payment events ───────────────────────────
    await this.sendPaymentReceivedEmail(
      (doctor as any).email,
      {
        doctorName,
        patientName,
        date:            data.date,
        time:            data.time,
        consultationFee: data.consultationFee,
      },
    ).catch((e) => console.error('[Notification] Email error:', e.message));
  }

  // ── Post like/comment notification ────────────────────────────────────────
  async notifyUserPostActivity(params: {
    postAuthorId: string;
    authorModel:  'User' | 'Doctor';
    actorName:    string;
    activity:     'liked' | 'commented on';
    postTitle:    string;
  }): Promise<void> {
    let token:       string | null = null;
    let pushEnabled: boolean       = false;

    if (params.authorModel === 'User') {
      const user = await this.userModel
        .findById(params.postAuthorId)
        .select('expoPushToken notificationSettings').exec();
      token       = (user as any)?.expoPushToken ?? null;
      pushEnabled = (user as any)?.notificationSettings?.pushEnabled ?? false;
    } else {
      const doctor = await this.doctorModel
        .findById(params.postAuthorId)
        .select('expoPushToken notificationSettings').exec();
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

  // ── 5. Both notified when session starts ──────────────────────────────────
  async notifySessionStarted(data: {
    doctorId:        string;
    userId:          string;
    date:            string;
    time:            string;
    sessionDuration: number;
  }): Promise<void> {
    const [doctor, patient] = await Promise.all([
      this.doctorModel.findById(data.doctorId).select('fullName email expoPushToken').exec(),
      this.userModel.findById(data.userId).select('fullName email expoPushToken notificationSettings').exec(),
    ]);

    if (!doctor || !patient) return;

    const doctorName  = (doctor as any).fullName  ?? 'Doctor';
    const patientName = (patient as any).fullName ?? 'Patient';

    // ── Push to doctor ────────────────────────────────────────────────────
    const doctorToken = (doctor as any).expoPushToken;
    if (doctorToken) {
      await this.sendRawPush(
        doctorToken,
        '🟢 Session Started',
        `Your session with ${patientName} is now live!`,
        { date: data.date, time: data.time },
      ).catch((e) => console.error('[Notification] Push error:', e.message));
    }

    // ── Push to patient ───────────────────────────────────────────────────
    const patientToken = (patient as any).expoPushToken;
    if (patientToken) {
      await this.sendRawPush(
        patientToken,
        '🟢 Session Started',
        `Your session with Dr. ${doctorName} is now live!`,
        { date: data.date, time: data.time },
      ).catch((e) => console.error('[Notification] Push error:', e.message));
    }

    // ── Email to doctor ───────────────────────────────────────────────────
    await this.sendSessionStartedEmail(
      (doctor as any).email,
      { recipientName: `Dr. ${doctorName}`, otherPartyName: patientName, role: 'doctor', date: data.date, time: data.time, sessionDuration: data.sessionDuration },
    ).catch((e) => console.error('[Notification] Session email error:', e.message));

    // ── Email to patient ──────────────────────────────────────────────────
    await this.sendSessionStartedEmail(
      (patient as any).email,
      { recipientName: patientName, otherPartyName: `Dr. ${doctorName}`, role: 'patient', date: data.date, time: data.time, sessionDuration: data.sessionDuration },
    ).catch((e) => console.error('[Notification] Session email error:', e.message));
  }

  // ── Email: New Appointment → Doctor ──────────────────────────────────────
  private async sendNewAppointmentEmail(
    to: string,
    d: {
      patientName:     string;
      doctorName:      string;
      date:            string;
      time:            string;
      sessionDuration: number;
      consultationFee: number;
      healthConcern:   string;
    },
  ): Promise<void> {
    if (!process.env.GMAIL_USER) return;

    await this.transporter.sendMail({
      from:    `"TruHeal Link" <${process.env.GMAIL_USER}>`,
      to,
      subject: `📅 New Appointment Booked — ${d.patientName}`,
      html: `
        <div style="font-family:Arial,sans-serif; max-width:520px;
                    margin:0 auto; border-radius:12px; overflow:hidden;
                    border:1px solid #e8eaf6;">
          <div style="background:#6B7FED; padding:24px 28px;">
            <h2 style="color:#fff; margin:0;">TruHeal Link</h2>
            <p style="color:rgba(255,255,255,0.85); margin:4px 0 0;">
              New Appointment Booked
            </p>
          </div>
          <div style="padding:28px;">
            <p style="color:#555;">
              Hello Dr. <strong>${d.doctorName}</strong>,<br>
              A new appointment has been booked.
              Please open the app to confirm or reject.
            </p>
            <table style="width:100%; border-collapse:collapse; margin-top:16px;">
              ${row('👤 Patient',        d.patientName)}
              ${row('🩺 Health Concern', d.healthConcern)}
              ${row('📅 Date',           d.date)}
              ${row('🕐 Time',           d.time)}
              ${row('⏱️ Duration',       `${d.sessionDuration} minutes`)}
              ${row('💰 Fee',            `PKR ${d.consultationFee}`)}
            </table>
            <div style="margin-top:24px; padding:16px; background:#f0f4ff;
                        border-radius:10px; text-align:center;">
              <p style="color:#6B7FED; font-weight:700; margin:0;">
                Open TruHeal Link app to Confirm or Reject
              </p>
            </div>
          </div>
        </div>
      `,
    });
    console.log(`[Notification] New appointment email sent to ${to}`);
  }

  // ── Email: Appointment Status → User ─────────────────────────────────────
  private async sendAppointmentStatusEmail(
    to: string,
    d: {
      userName:        string;
      doctorName:      string;
      status:          'confirmed' | 'cancelled';
      date:            string;
      time:            string;
      consultationFee: number;
    },
  ): Promise<void> {
    if (!process.env.GMAIL_USER) return;

    const isConfirmed = d.status === 'confirmed';
    const headerColor = isConfirmed ? '#00B374' : '#E53E3E';
    const statusText  = isConfirmed ? '✅ Confirmed' : '❌ Rejected';
    const bodyMessage = isConfirmed
      ? `Your appointment with Dr. <strong>${d.doctorName}</strong> has been
         <strong>confirmed</strong>! Please complete the payment of
         <strong>PKR ${d.consultationFee}</strong> to secure your slot.`
      : `Unfortunately your appointment with Dr. <strong>${d.doctorName}</strong>
         has been <strong>rejected</strong>. Please book another slot.`;

    await this.transporter.sendMail({
      from:    `"TruHeal Link" <${process.env.GMAIL_USER}>`,
      to,
      subject: `${statusText} — Your Appointment on ${d.date}`,
      html: `
        <div style="font-family:Arial,sans-serif; max-width:520px;
                    margin:0 auto; border-radius:12px; overflow:hidden;
                    border:1px solid #e8eaf6;">
          <div style="background:${headerColor}; padding:24px 28px;">
            <h2 style="color:#fff; margin:0;">TruHeal Link</h2>
            <p style="color:rgba(255,255,255,0.85); margin:4px 0 0;">
              Appointment ${isConfirmed ? 'Confirmed' : 'Rejected'}
            </p>
          </div>
          <div style="padding:28px;">
            <p style="color:#555;">
              Hi <strong>${d.userName}</strong>,<br>${bodyMessage}
            </p>
            <table style="width:100%; border-collapse:collapse; margin-top:16px;">
              ${row('👨‍⚕️ Doctor', `Dr. ${d.doctorName}`)}
              ${row('📅 Date',    d.date)}
              ${row('🕐 Time',    d.time)}
              ${isConfirmed
                ? row('💰 Amount Due', `PKR ${d.consultationFee}`)
                : ''}
            </table>
            ${isConfirmed ? `
            <div style="margin-top:24px; padding:16px; background:#f0fff8;
                        border-radius:10px; text-align:center;">
              <p style="color:#00B374; font-weight:700; margin:0;">
                Open TruHeal Link app to complete payment
              </p>
            </div>` : ''}
          </div>
        </div>
      `,
    });
    console.log(`[Notification] Status email sent to ${to}`);
  }

  // ── Email: Payment Received → Doctor ─────────────────────────────────────
  private async sendPaymentReceivedEmail(
    to: string,
    d: {
      doctorName:      string;
      patientName:     string;
      date:            string;
      time:            string;
      consultationFee: number;
    },
  ): Promise<void> {
    if (!process.env.GMAIL_USER) return;

    await this.transporter.sendMail({
      from:    `"TruHeal Link" <${process.env.GMAIL_USER}>`,
      to,
      subject: `💰 Payment Received — ${d.patientName}`,
      html: `
        <div style="font-family:Arial,sans-serif; max-width:520px;
                    margin:0 auto; border-radius:12px; overflow:hidden;
                    border:1px solid #e8eaf6;">
          <div style="background:#00B374; padding:24px 28px;">
            <h2 style="color:#fff; margin:0;">TruHeal Link</h2>
            <p style="color:rgba(255,255,255,0.85); margin:4px 0 0;">
              Payment Received
            </p>
          </div>
          <div style="padding:28px;">
            <p style="color:#555;">
              Hello Dr. <strong>${d.doctorName}</strong>,<br>
              <strong>${d.patientName}</strong> has completed the payment
              for their appointment.
            </p>
            <table style="width:100%; border-collapse:collapse; margin-top:16px;">
              ${row('👤 Patient', d.patientName)}
              ${row('📅 Date',    d.date)}
              ${row('🕐 Time',    d.time)}
              ${row('💰 Amount',  `PKR ${d.consultationFee}`)}
            </table>
            <div style="margin-top:24px; padding:16px; background:#f0fff8;
                        border-radius:10px; text-align:center;">
              <p style="color:#00B374; font-weight:700; margin:0;">
                Payment held securely —
                released after session completes
              </p>
            </div>
          </div>
        </div>
      `,
    });
    console.log(`[Notification] Payment email sent to ${to}`);
  }

  // ── Email: Session Started → Doctor & Patient ─────────────────────────────
  private async sendSessionStartedEmail(
    to: string,
    d: {
      recipientName:   string;
      otherPartyName:  string;
      role:            'doctor' | 'patient';
      date:            string;
      time:            string;
      sessionDuration: number;
    },
  ): Promise<void> {
    if (!process.env.GMAIL_USER) return;

    const roleLabel = d.role === 'doctor' ? 'patient' : 'doctor';

    await this.transporter.sendMail({
      from:    `"TruHeal Link" <${process.env.GMAIL_USER}>`,
      to,
      subject: `🟢 Your Session Has Started — TruHeal Link`,
      html: `
        <div style="font-family:Arial,sans-serif; max-width:520px;
                    margin:0 auto; border-radius:12px; overflow:hidden;
                    border:1px solid #e8eaf6;">
          <div style="background:#6B7FED; padding:24px 28px;">
            <h2 style="color:#fff; margin:0;">TruHeal Link</h2>
            <p style="color:rgba(255,255,255,0.85); margin:4px 0 0;">
              Session Started
            </p>
          </div>
          <div style="padding:28px;">
            <p style="color:#555;">
              Hi <strong>${d.recipientName}</strong>,<br>
              Your session with your <strong>${roleLabel}</strong>,
              <strong style="color:#6B7FED;">${d.otherPartyName}</strong>,
              has officially started. Please open the TruHeal Link app now.
            </p>
            <table style="width:100%; border-collapse:collapse; margin-top:16px;">
              ${row('📅 Date',      d.date)}
              ${row('🕐 Time',      d.time)}
              ${row('⏱️ Duration',  `${d.sessionDuration} minutes`)}
            </table>
            <div style="margin-top:24px; padding:16px; background:#f0f4ff;
                        border-radius:10px; text-align:center;">
              <p style="color:#6B7FED; font-weight:700; margin:0;">
                Open TruHeal Link to join your session
              </p>
            </div>
          </div>
        </div>
      `,
    });
    console.log(`[Notification] Session-started email sent to ${to}`);
  }

  // ── Raw Expo Push ─────────────────────────────────────────────────────────
  async sendRawPush(
    token: string,
    title: string,
    body:  string,
    data?: Record<string, any>,
  ): Promise<void> {
    const payload = JSON.stringify({
      to:        token,
      title,
      body,
      sound:     'default',
      channelId: 'default',
      priority:  'high',
      data:      data ?? {},
    });

    await new Promise<void>((resolve, reject) => {
      const req = https.request(
        {
          hostname: 'exp.host',
          path:     '/--/api/v2/push/send',
          method:   'POST',
          headers: {
            'Content-Type':   'application/json',
            'Content-Length': Buffer.byteLength(payload),
          },
        },
        (res) => { res.resume(); res.on('end', () => resolve()); },
      );
      req.on('error', reject);
      req.write(payload);
      req.end();
    });

    console.log(`[Notification] Push sent to ${token.slice(0, 20)}...`);
  }
}

// ── HTML row helper ───────────────────────────────────────────────────────────
function row(label: string, value: string) {
  return `
    <tr>
      <td style="padding:8px 12px; border-bottom:1px solid #f0f4ff;
                 color:#888; font-size:13px; width:40%;">${label}</td>
      <td style="padding:8px 12px; border-bottom:1px solid #f0f4ff;
                 color:#1A1D2E; font-size:13px; font-weight:600;">${value}</td>
    </tr>`;
}