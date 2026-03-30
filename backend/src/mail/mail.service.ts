import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    const gmailPass = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s/g, '');

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: gmailPass,
      },
    });

    this.transporter.verify((error) => {
      if (error) {
        console.error('❌ Mail transporter error:', error.message);
      } else {
        console.log('✅ Mail transporter ready — Gmail connected successfully');
      }
    });
  }

  // ── OTP Email ──────────────────────────────────────────────────────────────
  async sendOtpEmail(
    toEmail:  string,
    otpCode:  string,
    userName: string,
  ): Promise<void> {
    const mailOptions = {
      from:    `"TruHeal-Link" <${process.env.GMAIL_USER}>`,
      to:      toEmail,
      subject: 'Password Reset OTP — TruHeal-Link',
      html: `
        <div style="font-family:Arial,sans-serif; max-width:480px;
                    margin:0 auto; padding:32px; background:#f8f8f8;
                    border-radius:12px;">
          <div style="text-align:center; margin-bottom:24px;">
            <h2 style="color:#6B7FED; margin:0;">TruHeal-Link</h2>
            <p style="color:#888; font-size:13px; margin:4px 0 0;">
              Password Reset Request
            </p>
          </div>
          <div style="background:#fff; border-radius:10px;
                      padding:28px; text-align:center;">
            <p style="color:#333; font-size:15px; margin:0 0 8px;">
              Hi <strong>${userName}</strong>,
            </p>
            <p style="color:#555; font-size:14px; margin:0 0 24px;">
              Use the OTP below to reset your password.
              It expires in <strong>10 minutes</strong>.
            </p>
            <div style="background:#6B7FED; color:#fff; font-size:32px;
                        font-weight:bold; letter-spacing:12px;
                        padding:16px 24px; border-radius:8px;
                        display:inline-block;">
              ${otpCode}
            </div>
            <p style="color:#999; font-size:12px; margin:20px 0 0;">
              If you did not request this, please ignore this email.
            </p>
          </div>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log('✅ OTP email sent to:', toEmail);
    } catch (error) {
      console.error('❌ Mail send error:', error.message);
      throw new InternalServerErrorException(
        'Failed to send OTP email. Please try again.',
      );
    }
  }

  // ── SOS Alert Email → Emergency Contact ───────────────────────────────────
  async sendSosAlertToContact(
    contactEmail:    string,
    contactName:     string,
    contactRelation: string,
    userName:        string,
    userPhone:       string,
    sosMessage:      string,
    locationUrl:     string,
  ): Promise<void> {
    const mailOptions = {
      from:    `"TruHeal-Link Emergency" <${process.env.GMAIL_USER}>`,
      to:      contactEmail,
      subject: `🚨 SOS Alert — ${userName} needs immediate help!`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#f4f4f4;
             font-family:Arial, Helvetica, sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0"
         style="background-color:#f4f4f4; padding:30px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="max-width:600px; width:100%; background:#ffffff;
                      border-radius:16px; overflow:hidden;
                      box-shadow:0 4px 20px rgba(0,0,0,0.15);">

          <!-- ── RED HEADER ── -->
          <tr>
            <td style="background:linear-gradient(135deg,#FF0000,#CC0000);
                        padding:40px 30px; text-align:center;">
              <div style="font-size:48px; margin-bottom:12px;">🚨</div>
              <h1 style="color:#ffffff; margin:0; font-size:28px;
                          font-weight:800; letter-spacing:1px;">
                SOS EMERGENCY ALERT
              </h1>
              <p style="color:#ffcccc; margin:8px 0 0; font-size:14px;">
                Sent via TruHeal-Link Emergency System
              </p>
            </td>
          </tr>

          <!-- ── GREETING ── -->
          <tr>
            <td style="padding:30px 30px 0;">
              <p style="font-size:17px; color:#1a1a1a; margin:0 0 8px;">
                Hi <strong>${contactName}</strong>
                <span style="color:#666;">(${contactRelation})</span>,
              </p>
              <p style="font-size:15px; color:#444; margin:0; line-height:1.6;">
                Your contact
                <strong style="color:#CC0000;">${userName}</strong>
                has triggered an SOS emergency alert and needs your
                <strong>immediate help!</strong>
              </p>
            </td>
          </tr>

          <!-- ── SOS MESSAGE BOX ── -->
          <tr>
            <td style="padding:24px 30px 0;">
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:#fff8f8;
                             border-left:5px solid #FF0000;
                             border-radius:8px;">
                <tr>
                  <td style="padding:20px;">
                    <p style="margin:0 0 10px; font-size:12px;
                               color:#FF0000; font-weight:700;
                               text-transform:uppercase;
                               letter-spacing:1px;">
                      💬 Emergency Message from ${userName}
                    </p>
                    <p style="margin:0; font-size:16px; color:#333;
                               line-height:1.6; font-style:italic;">
                      "${sosMessage}"
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── DIVIDER ── -->
          <tr>
            <td style="padding:24px 30px 0;">
              <hr style="border:none; border-top:1px solid #f0f0f0; margin:0;">
            </td>
          </tr>

          <!-- ── LOCATION BUTTON ── -->
          <tr>
            <td style="padding:24px 30px; text-align:center;">
              <p style="margin:0 0 16px; font-size:13px; color:#888;
                         font-weight:700; text-transform:uppercase;
                         letter-spacing:1px;">
                📍 Tap below to see live location
              </p>
              <a href="${locationUrl}"
                 style="display:inline-block;
                         background:#FF0000;
                         color:#ffffff;
                         padding:16px 48px;
                         border-radius:50px;
                         text-decoration:none;
                         font-size:16px;
                         font-weight:700;
                         letter-spacing:0.5px;">
                View Live Location on Google Maps
              </a>
            </td>
          </tr>

          <!-- ── FOOTER ── -->
          <tr>
            <td style="background:#f9f9f9; padding:20px 30px;
                        text-align:center;
                        border-top:1px solid #f0f0f0;">
              <p style="margin:0; font-size:12px; color:#999; line-height:1.6;">
                This alert was sent automatically by
                <strong style="color:#6B7FED;">TruHeal-Link</strong>
                Emergency System.<br>
                Please respond immediately.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ SOS alert sent to contact: ${contactEmail}`);
    } catch (error) {
      console.error(`❌ SOS alert failed for ${contactEmail}:`, error.message);
    }
  }

  // ── SOS Confirmation Email → User himself ─────────────────────────────────
  async sendSosConfirmationToUser(
    userEmail:     string,
    userName:      string,
    locationUrl:   string,
    contactsCount: number,
  ): Promise<void> {
    const mailOptions = {
      from:    `"TruHeal-Link Emergency" <${process.env.GMAIL_USER}>`,
      to:      userEmail,
      subject: '✅ SOS Alert Sent — TruHeal-Link',
      html: `
        <div style="font-family:Arial,sans-serif; max-width:480px;
                    margin:0 auto; padding:32px; background:#f8f8f8;
                    border-radius:12px;">
          <div style="text-align:center; margin-bottom:24px;">
            <h2 style="color:#6B7FED; margin:0;">TruHeal-Link</h2>
            <p style="color:#888; font-size:13px; margin:4px 0 0;">
              Emergency Alert Confirmation
            </p>
          </div>
          <div style="background:#fff; border-radius:10px; padding:28px;">
            <p style="color:#333; font-size:15px; margin:0 0 12px;">
              Hi <strong>${userName}</strong>,
            </p>
            <p style="color:#555; font-size:14px; margin:0 0 20px;">
              Your SOS alert has been sent to
              <strong>${contactsCount} emergency contact(s)</strong>.
              Help is on the way!
            </p>
            <div style="text-align:center; margin:20px 0;">
              <a href="${locationUrl}"
                 style="background:#6B7FED; color:#fff;
                         padding:12px 24px; border-radius:50px;
                         text-decoration:none; font-size:15px;
                         font-weight:bold; display:inline-block;">
                📍 Your Shared Location
              </a>
            </div>
            <p style="color:#999; font-size:12px; margin:20px 0 0;
                      text-align:center;">
              If this was a mistake, contact your emergency contacts
              directly to let them know you are safe.
            </p>
          </div>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ SOS confirmation sent to user: ${userEmail}`);
    } catch (error) {
      console.error(`❌ SOS confirmation failed:`, error.message);
    }
  }
}