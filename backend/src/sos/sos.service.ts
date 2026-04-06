import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { MailService } from '../mail/mail.service';
import { ChatMessage, ContactResult } from './sos.types';

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
  ): Promise<{
    success:   boolean;
    message:   string;
    location?: string;
    notified?: ContactResult[];
  }> {
    // 1. Find user
    const user = await this.userModel
      .findById(userId)
      .select('-password -otpCode -otpExpiry');

    if (!user) throw new NotFoundException('User not found');

    // 2. Check emergency contacts
    if (!user.emergencyContacts || user.emergencyContacts.length === 0) {
      return {
        success: false,
        message: 'No emergency contacts found. Please add contacts in your profile.',
      };
    }

    // 3. Build Google Maps link
    const locationUrl = `https://maps.google.com/?q=${data.lat},${data.lng}`;

    // 4. Get custom SOS message (or default)
    const sosMessage = user.sosMessage ||
      'I need emergency help! Please contact me immediately.';

    // 5. Send confirmation email to user himself
    try {
      await this.mailService.sendSosConfirmationToUser(
        user.email,
        user.fullName,
        locationUrl,
        user.emergencyContacts.length,
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('❌ User confirmation email failed:', errorMessage);
    }

    // 6. Send alert to each emergency contact
    const results: ContactResult[] = [];

    for (const contact of user.emergencyContacts) {
      const contactResult: ContactResult = {
        name:         contact.fullName,
        relationship: contact.relationship,
        email:        contact.email ?? 'not provided',
        emailStatus:  'skipped',
      };

      if (contact.email) {
        try {
          const shareProfile = user.sosShareProfile !== false; // default true
          await this.mailService.sendSosAlertToContact(
            contact.email,
            contact.fullName,
            contact.relationship,
            user.fullName,
            user.phoneNumber ?? 'Not provided',
            sosMessage,
            locationUrl,
            shareProfile ? {
              age:             user.age,
              gender:          user.gender,
              sleepDuration:   user.healthProfile?.sleepDuration,
              stressLevel:     user.healthProfile?.stressLevel,
              dietPreference:  user.healthProfile?.dietPreference,
              additionalNotes: user.healthProfile?.additionalNotes,
              interests:       user.healthProfile?.interests,
            } : undefined,
          );
          contactResult.emailStatus = 'sent ✅';
          console.log(`✅ SOS email sent to ${contact.fullName}`);
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          contactResult.emailStatus = 'failed ❌';
          console.error(`❌ SOS email failed for ${contact.fullName}:`, errorMessage);
        }
      }

      results.push(contactResult);
    }

    // 7. Return result
    return {
      success:  true,
      message:  `SOS alert processed for ${results.length} contact(s)`,
      location: locationUrl,
      notified: results,
    };
  }
}