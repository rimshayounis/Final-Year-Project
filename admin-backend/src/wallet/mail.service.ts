import { Injectable } from '@nestjs/common';
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
        console.error('❌ Admin mail transporter error:', error.message);
      } else {
        console.log('✅ Admin mail transporter ready — Gmail connected successfully');
      }
    });
  }

  // ── Withdrawal Approved Email → Doctor ────────────────────────────────────
  async sendWithdrawalApprovedEmail(
    toEmail:    string,
    doctorName: string,
    amount:     number,
    payout:     number,
    fee:        number,
  ): Promise<void> {
    const mailOptions = {
      from:    `"TruHeal-Link" <${process.env.GMAIL_USER}>`,
      to:      toEmail,
      subject: '✅ Withdrawal Approved — TruHeal-Link',
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
        <table width="560" cellpadding="0" cellspacing="0"
               style="max-width:560px; width:100%; background:#ffffff;
                      border-radius:16px; overflow:hidden;
                      box-shadow:0 4px 20px rgba(0,0,0,0.10);">

          <!-- ── GREEN HEADER ── -->
          <tr>
            <td style="background:linear-gradient(135deg,#00B374,#00916A);
                        padding:36px 30px; text-align:center;">
              <div style="font-size:44px; margin-bottom:10px;">✅</div>
              <h1 style="color:#ffffff; margin:0; font-size:24px;
                          font-weight:800; letter-spacing:0.5px;">
                Withdrawal Approved!
              </h1>
              <p style="color:#ccfff0; margin:8px 0 0; font-size:13px;">
                TruHeal-Link Wallet
              </p>
            </td>
          </tr>

          <!-- ── GREETING ── -->
          <tr>
            <td style="padding:28px 30px 0;">
              <p style="font-size:16px; color:#1a1a1a; margin:0 0 8px;">
                Hi <strong>Dr. ${doctorName}</strong>,
              </p>
              <p style="font-size:14px; color:#555; margin:0; line-height:1.7;">
                Great news! Your withdrawal request has been
                <strong style="color:#00B374;">approved</strong> by the admin.
                Your payout is being processed and will be transferred
                to your registered bank account shortly.
              </p>
            </td>
          </tr>

          <!-- ── AMOUNT BREAKDOWN ── -->
          <tr>
            <td style="padding:24px 30px 0;">
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:#f0fdf8; border-radius:10px;
                             border:1px solid #d1fae5;">
                <tr>
                  <td style="padding:20px;">
                    <p style="margin:0 0 14px; font-size:11px; color:#00B374;
                               font-weight:700; text-transform:uppercase;
                               letter-spacing:1px;">
                      Transaction Summary
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size:14px; color:#444; padding:6px 0;">
                          Requested Amount
                        </td>
                        <td style="font-size:14px; color:#222; font-weight:600;
                                    text-align:right; padding:6px 0;">
                          PKR ${amount.toLocaleString()}
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size:14px; color:#444; padding:6px 0;">
                          Processing Fee (2%)
                        </td>
                        <td style="font-size:14px; color:#e53e3e; font-weight:600;
                                    text-align:right; padding:6px 0;">
                          − PKR ${fee.toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td colspan="2">
                          <hr style="border:none; border-top:1px solid #bbf7d0; margin:8px 0;">
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size:16px; color:#00B374; font-weight:700;
                                    padding:4px 0;">
                          You Will Receive
                        </td>
                        <td style="font-size:18px; color:#00B374; font-weight:800;
                                    text-align:right; padding:4px 0;">
                          PKR ${payout.toFixed(2)}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── NOTE ── -->
          <tr>
            <td style="padding:20px 30px 0;">
              <p style="font-size:13px; color:#888; margin:0; line-height:1.6;
                         background:#fffbeb; border-left:4px solid #f59e0b;
                         border-radius:6px; padding:14px 16px;">
                💡 <strong>Note:</strong> Please allow 1–3 business days for
                the amount to reflect in your bank account, depending on
                your bank's processing time.
              </p>
            </td>
          </tr>

          <!-- ── FOOTER ── -->
          <tr>
            <td style="background:#f9f9f9; padding:20px 30px;
                        text-align:center; margin-top:24px;
                        border-top:1px solid #f0f0f0;">
              <p style="margin:0; font-size:12px; color:#999; line-height:1.6;">
                This email was sent by
                <strong style="color:#6B7FED;">TruHeal-Link</strong>.<br>
                If you have any questions, contact our support team.
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
      console.log(`✅ Withdrawal approval email sent to: ${toEmail}`);
    } catch (error) {
      console.error(`❌ Withdrawal approval email failed for ${toEmail}:`, error.message);
    }
  }
}
