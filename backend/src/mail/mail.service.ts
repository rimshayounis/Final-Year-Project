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

    this.transporter.verify((error, success) => {
      if (error) {
        console.error('❌ Mail transporter error:', error.message);
      } else {
        console.log('✅ Mail transporter ready — Gmail connected successfully');
      }
    });
  }

  // ── Existing Method (keep as is) ──────────────────────────────────────────
  async sendOtpEmail(toEmail: string, otpCode: string, userName: string): Promise<void> {
    const mailOptions = {
      from: `"TruHeal-Link" <${process.env.GMAIL_USER}>`,
      to: toEmail,
      subject: 'Password Reset OTP — TruHeal-Link',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f8f8f8; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="color: #6B7FED; margin: 0;">TruHeal-Link</h2>
            <p style="color: #888; font-size: 13px; margin: 4px 0 0;">Password Reset Request</p>
          </div>
          <div style="background: #fff; border-radius: 10px; padding: 28px; text-align: center;">
            <p style="color: #333; font-size: 15px; margin: 0 0 8px;">Hi <strong>${userName}</strong>,</p>
            <p style="color: #555; font-size: 14px; margin: 0 0 24px;">Use the OTP below to reset your password. It expires in <strong>10 minutes</strong>.</p>
            <div style="background: #6B7FED; color: #fff; font-size: 32px; font-weight: bold; letter-spacing: 12px; padding: 16px 24px; border-radius: 8px; display: inline-block;">
              ${otpCode}
            </div>
            <p style="color: #999; font-size: 12px; margin: 20px 0 0;">If you did not request this, please ignore this email.</p>
          </div>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log('✅ OTP email sent to:', toEmail);
    } catch (error) {
      console.error('❌ Mail send error:', error.message);
      throw new InternalServerErrorException('Failed to send OTP email. Please try again.');
    }
  }

  // ── NEW: SOS Alert Email → sent to each Emergency Contact ─────────────────
  async sendSosAlertToContact(
    contactEmail:    string,
    contactName:     string,
    contactRelation: string,
    user: {
      fullName:      string;
      age:           number;
      gender:        string;
      healthProfile?: {
        sleepDuration?:   number;
        stressLevel?:     string;
        dietPreference?:  string;
        additionalNotes?: string;
      };
    },
    locationUrl:  string,
    chatSummary:  string,
  ): Promise<void> {
    const mailOptions = {
      from: `"TruHeal-Link Emergency" <${process.env.GMAIL_USER}>`,
      to: contactEmail,
      subject: `🚨 SOS Emergency Alert — ${user.fullName} needs help!`,
      html: `
        <div style="font-family:Arial, sans-serif; max-width:600px;
                    margin:0 auto; border:3px solid #FF0000;
                    border-radius:12px; overflow:hidden;">

          <!-- Header -->
          <div style="background:#FF0000; padding:24px; text-align:center;">
            <h1 style="color:#fff; margin:0; font-size:28px;">
              🚨 SOS EMERGENCY ALERT
            </h1>
            <p style="color:#ffe0e0; margin:8px 0 0; font-size:14px;">
              Sent via TruHeal-Link Emergency System
            </p>
          </div>

          <!-- Message -->
          <div style="padding:24px; background:#fff;">
            <p style="font-size:16px; color:#333;">
              Hi <strong>${contactName}</strong> (${contactRelation}),
            </p>
            <p style="font-size:15px; color:#555;">
              Your contact <strong>${user.fullName}</strong> has triggered
              an SOS emergency alert and needs your immediate help!
            </p>

            <!-- Patient Info Table -->
            <table style="width:100%; border-collapse:collapse;
                          margin:20px 0; font-size:14px;">
              <tr style="background:#fff0f0;">
                <td style="padding:10px; border:1px solid #fcc;
                           font-weight:bold; width:35%;">👤 Full Name</td>
                <td style="padding:10px; border:1px solid #fcc;">
                  ${user.fullName}
                </td>
              </tr>
              <tr>
                <td style="padding:10px; border:1px solid #fcc;
                           font-weight:bold;">🎂 Age</td>
                <td style="padding:10px; border:1px solid #fcc;">
                  ${user.age}
                </td>
              </tr>
              <tr style="background:#fff0f0;">
                <td style="padding:10px; border:1px solid #fcc;
                           font-weight:bold;">⚧ Gender</td>
                <td style="padding:10px; border:1px solid #fcc;">
                  ${user.gender}
                </td>
              </tr>
              <tr>
                <td style="padding:10px; border:1px solid #fcc;
                           font-weight:bold;">😴 Sleep</td>
                <td style="padding:10px; border:1px solid #fcc;">
                  ${user.healthProfile?.sleepDuration ?? 'N/A'} hrs/night
                </td>
              </tr>
              <tr style="background:#fff0f0;">
                <td style="padding:10px; border:1px solid #fcc;
                           font-weight:bold;">😰 Stress Level</td>
                <td style="padding:10px; border:1px solid #fcc;">
                  ${user.healthProfile?.stressLevel ?? 'N/A'}
                </td>
              </tr>
              <tr>
                <td style="padding:10px; border:1px solid #fcc;
                           font-weight:bold;">🥗 Diet</td>
                <td style="padding:10px; border:1px solid #fcc;">
                  ${user.healthProfile?.dietPreference ?? 'N/A'}
                </td>
              </tr>
              <tr style="background:#fff0f0;">
                <td style="padding:10px; border:1px solid #fcc;
                           font-weight:bold;">📋 Notes</td>
                <td style="padding:10px; border:1px solid #fcc;">
                  ${user.healthProfile?.additionalNotes ?? 'N/A'}
                </td>
              </tr>
            </table>

            <!-- Last AI Chat -->
            <div style="background:#f9f9f9; border-left:4px solid #FF0000;
                        padding:16px; border-radius:4px; margin:20px 0;">
              <p style="margin:0 0 8px; font-weight:bold; color:#333;">
                💬 Last AI Chat Messages:
              </p>
              <p style="margin:0; color:#555; font-size:13px;
                        white-space:pre-line;">
                ${chatSummary}
              </p>
            </div>

            <!-- Location Button -->
            <div style="text-align:center; margin:28px 0;">
              <a href="${locationUrl}"
                 style="background:#FF0000; color:#fff; padding:16px 32px;
                        border-radius:8px; text-decoration:none;
                        font-size:18px; font-weight:bold;">
                📍 View Live Location on Google Maps
              </a>
            </div>

            <p style="color:#999; font-size:12px; text-align:center;
                      margin-top:24px;">
              This alert was sent automatically by TruHeal-Link.
              Please respond immediately.
            </p>
          </div>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ SOS alert email sent to contact: ${contactEmail}`);
    } catch (error) {
      console.error(`❌ SOS alert email failed for ${contactEmail}:`, error.message);
      // Don't throw — we don't want one failed email to stop other contacts
    }
  }

  // ── NEW: SOS Confirmation Email → sent to the User himself ────────────────
  async sendSosConfirmationToUser(
    userEmail:      string,
    userName:       string,
    locationUrl:    string,
    contactsCount:  number,
  ): Promise<void> {
    const mailOptions = {
      from: `"TruHeal-Link Emergency" <${process.env.GMAIL_USER}>`,
      to: userEmail,
      subject: '✅ SOS Alert Sent — TruHeal-Link',
      html: `
        <div style="font-family:Arial, sans-serif; max-width:480px;
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
              Your SOS alert has been successfully sent to
              <strong>${contactsCount} emergency contact(s)</strong>.
              Help is on the way!
            </p>

            <!-- Location -->
            <div style="text-align:center; margin:20px 0;">
              <a href="${locationUrl}"
                 style="background:#6B7FED; color:#fff; padding:12px 24px;
                        border-radius:8px; text-decoration:none;
                        font-size:15px; font-weight:bold;">
                📍 Your Shared Location
              </a>
            </div>

            <p style="color:#999; font-size:12px; margin:20px 0 0;
                      text-align:center;">
              If this was a mistake please contact your emergency contacts
              directly to let them know you are safe.
            </p>
          </div>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ SOS confirmation email sent to user: ${userEmail}`);
    } catch (error) {
      console.error(`❌ SOS confirmation email failed:`, error.message);
      // Don't throw — confirmation email failure shouldn't affect SOS
    }
  }
}