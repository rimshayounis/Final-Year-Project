import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { MailService } from '../mail/mail.service';
import { ChatMessage, ContactResult } from './sos.types'; // 👈 import from types file

@Injectable()
export class SosService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly mailService: MailService,
  ) {}

  async triggerSOS(
    userId: string,
    data: {
      lat:          number;
      lng:          number;
      chatHistory?: ChatMessage[];
    },
  ): Promise<{                    // 👈 explicit return type
    success:   boolean;
    message:   string;
    location?: string;
    notified?: ContactResult[];
  }> {
    // ── 1. Find user in MongoDB ──────────────────────────────────────────────
    const user = await this.userModel
      .findById(userId)
      .select('-password -otpCode -otpExpiry');

    if (!user) throw new NotFoundException('User not found');

    // ── 2. Check emergency contacts ──────────────────────────────────────────
    if (!user.emergencyContacts || user.emergencyContacts.length === 0) {
      return {
        success: false,
        message: 'No emergency contacts found. Please add contacts in your profile.',
      };
    }

    // ── 3. Build Google Maps link ────────────────────────────────────────────
    const locationUrl = `https://maps.google.com/?q=${data.lat},${data.lng}`;

    // ── 4. Build chat summary (last 3 messages) ──────────────────────────────
    const chatSummary =
      data.chatHistory && data.chatHistory.length > 0
        ? data.chatHistory
            .slice(-3)
            .map((m) => `${m.role}: ${m.text}`)
            .join('\n')
        : 'No recent chat history';

    // ── 5. Send confirmation email to user himself ───────────────────────────
    try {
      await this.mailService.sendSosConfirmationToUser(
        user.email,
        user.fullName,
        locationUrl,
        user.emergencyContacts.length,
      );
    } catch (err) {
      console.error('❌ User confirmation email failed:', err.message);
    }

    // ── 6. Send alert to each emergency contact ──────────────────────────────
    const results: ContactResult[] = [];

    for (const contact of user.emergencyContacts) {
      const contactResult: ContactResult = {
        name:         contact.fullName,
        phone:        contact.phoneNumber,
        relationship: contact.relationship,
        email:        contact.email ?? 'not provided',
        emailStatus:  'skipped',
      };

      if (contact.email) {
        try {
          await this.mailService.sendSosAlertToContact(
            contact.email,
            contact.fullName,
            contact.relationship,
            {
              fullName:      user.fullName,
              age:           user.age,
              gender:        user.gender,
              healthProfile: user.healthProfile,
            },
            locationUrl,
            chatSummary,
          );
          contactResult.emailStatus = 'sent ✅';
          console.log(`✅ SOS email sent to ${contact.fullName} — ${contact.email}`);
        } catch (err) {
          contactResult.emailStatus = 'failed ❌';
          console.error(`❌ SOS email failed for ${contact.fullName}:`, err.message);
        }
      }

      results.push(contactResult);
    }

    // ── 7. Return result ─────────────────────────────────────────────────────
    return {
      success:  true,
      message:  `SOS alert processed for ${results.length} contact(s)`,
      location: locationUrl,
      notified: results,
    };
  }
}