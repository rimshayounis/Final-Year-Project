import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Remove spaces from App Password — Gmail adds spaces for readability
    // but nodemailer requires it without spaces
    const gmailPass = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s/g, '');

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: gmailPass,
      },
    });

    // Verify connection on startup — shows error immediately in console
    this.transporter.verify((error, success) => {
      if (error) {
        console.error('❌ Mail transporter error:', error.message);
      } else {
        console.log('✅ Mail transporter ready — Gmail connected successfully');
      }
    });
  }

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
}