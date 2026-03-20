import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, StatusBar,
  TouchableOpacity, LayoutAnimation, Platform, UIManager,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PURPLE = '#6B7FED';

interface FAQItem {
  q: string;
  a: string;
}

interface FAQCategory {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  items: FAQItem[];
}

const FAQ_DATA: FAQCategory[] = [
  {
    title: 'Getting Started',
    icon: 'rocket-outline',
    color: '#6B7FED',
    items: [
      {
        q: 'What is TruHeal-Link?',
        a: 'TruHeal-Link is a digital health platform connecting patients with verified doctors. You can browse health content, book appointments, chat with doctors, and get general wellness guidance from our AI chatbot — all in one place.',
      },
      {
        q: 'How do I create an account?',
        a: 'Tap "Get Started" on the welcome screen and choose whether you are a patient or a doctor. Fill in your details, set up your health profile (patients) or submit your credentials (doctors), and you\'re ready to go.',
      },
      {
        q: 'Is TruHeal-Link free to use?',
        a: 'Creating an account and browsing the health feed is free for patients. Booking a doctor appointment incurs a consultation fee set by the doctor. Doctors may use a free trial plan or subscribe to a paid plan for additional features.',
      },
    ],
  },
  {
    title: 'Appointments',
    icon: 'calendar-outline',
    color: '#00B374',
    items: [
      {
        q: 'How do I book an appointment?',
        a: 'Go to the Appointments tab and tap "Book Appointment". Browse available doctors, select one, pick an available date and time slot, describe your health concern, and confirm the booking. You will receive a notification once the doctor confirms.',
      },
      {
        q: 'How does payment work for appointments?',
        a: 'After a doctor confirms your appointment, you will be prompted to pay the consultation fee securely through Stripe. Your payment is held safely until the session completes, then released to the doctor. We never store your card details.',
      },
      {
        q: 'Can I cancel an appointment?',
        a: 'Yes. Open the appointment card and use the cancellation option. Refund eligibility depends on how close to the session time you cancel. Contact Support if you have payment concerns after cancellation.',
      },
      {
        q: 'How does the session work?',
        a: 'Once your appointment time arrives and payment is confirmed, a "Continue Session" button appears on the appointment card. Tap it to open the in-app chat with your doctor for the duration of your booked session.',
      },
      {
        q: 'How do I give feedback after an appointment?',
        a: 'After your session is marked as completed, a "Give Feedback" button appears on the appointment card. Tap it to rate your experience (1–5 stars) and leave an optional written review. Your feedback helps other patients find the best doctors.',
      },
    ],
  },
  {
    title: 'Doctors & Verification',
    icon: 'shield-checkmark-outline',
    color: '#F6A623',
    items: [
      {
        q: 'How are doctors verified on TruHeal-Link?',
        a: 'Doctors register with their PMDC (Pakistan Medical & Dental Council) licence number and upload supporting credentials. Our team reviews each application before approving the doctor to practice on the platform. Verified doctors display a "Verified by PMDC" badge.',
      },
      {
        q: 'How are health posts verified?',
        a: 'Any doctor on the platform can review and approve or reject posts submitted by users. Approved posts appear in the public feed. This peer-review process ensures the content you see is medically vetted.',
      },
      {
        q: 'What does the doctor\'s trust badge mean?',
        a: 'Trust badges (Bronze, Silver, Gold, Platinum) reflect a doctor\'s engagement and contribution to the platform — including posts they\'ve approved and the engagement those posts receive. Higher badges indicate a more active and trusted contributor.',
      },
      {
        q: 'What is the "Recommended" badge on a doctor card?',
        a: 'Doctors who have successfully completed 30 or more sessions on TruHeal-Link earn a "Recommended" badge. This is a mark of experience and consistent patient satisfaction.',
      },
    ],
  },
  {
    title: 'Posts & Feed',
    icon: 'newspaper-outline',
    color: '#E53E3E',
    items: [
      {
        q: 'How do I submit a health post?',
        a: 'Tap the "+" tab in the bottom navigation to open the Create Post screen. Add a title, description, category, and optionally a background colour or images. Submit it for review. A verified doctor will approve or reject it.',
      },
      {
        q: 'Why is my post showing as "Pending"?',
        a: 'All submitted posts go through a doctor review process before being published. This typically takes a short time. You will see the status change to "Approved" or "Rejected" on your profile\'s post tabs.',
      },
      {
        q: 'Can I edit or delete my post?',
        a: 'You can edit a pending post before it is reviewed. Once approved, you can still edit minor details. Rejected posts can be deleted but not re-submitted. Use the three-dot (⋯) menu on any post card on your profile to manage it.',
      },
      {
        q: 'What does making a post "Private" do?',
        a: 'Setting a post to private hides it from the public feed and from other users\' views of your profile. Only you can see it when browsing your own profile. Your post count remains unchanged.',
      },
    ],
  },
  {
    title: 'AI Chatbot',
    icon: 'chatbubbles-outline',
    color: '#9B59B6',
    items: [
      {
        q: 'What can the TruHeal-Link chatbot do?',
        a: 'The AI chatbot can answer general health and wellness questions, help you understand symptoms, suggest lifestyle improvements, and guide you towards the right type of specialist. It provides information, not diagnosis.',
      },
      {
        q: 'Is chatbot advice medically reliable?',
        a: 'The chatbot provides general wellness information based on publicly available health knowledge. It is not a substitute for professional medical advice. For specific medical concerns, always consult a qualified doctor.',
      },
      {
        q: 'Are my chatbot conversations private?',
        a: 'Yes. Your chatbot conversation history is stored securely and linked only to your account. It is not shared with doctors or other users. You can clear your chat history at any time from the chatbot screen.',
      },
    ],
  },
  {
    title: 'Account & Settings',
    icon: 'settings-outline',
    color: '#888',
    items: [
      {
        q: 'How do I change my password?',
        a: 'Go to Settings → Change Password. Enter your current password followed by your new password (minimum 8 characters). Tap "Update Password" to save.',
      },
      {
        q: 'How do I update my profile picture or bio?',
        a: 'Navigate to your Profile tab. Tap your avatar to upload a new photo from your gallery. Tap the pencil icon next to your name or bio section to edit those fields.',
      },
      {
        q: 'How do I delete my account?',
        a: 'Account deletion is handled through our support team to ensure proper data cleanup. Please contact us via the Contact Support section with your request and we will process it within 7 business days.',
      },
      {
        q: 'How do push notifications work?',
        a: 'TruHeal-Link sends push notifications for appointment confirmations, post approvals, chat messages, and likes/comments on your posts. You can toggle push and email notifications on or off in Settings → Notifications.',
      },
    ],
  },
];

function FAQAccordion({ item, isOpen, onToggle }: {
  item: FAQItem;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={styles.faqItem}>
      <TouchableOpacity style={styles.faqQ} onPress={onToggle} activeOpacity={0.7}>
        <Text style={styles.faqQText}>{item.q}</Text>
        <Ionicons
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={PURPLE}
          style={{ flexShrink: 0 }}
        />
      </TouchableOpacity>
      {isOpen && (
        <View style={styles.faqA}>
          <Text style={styles.faqAText}>{item.a}</Text>
        </View>
      )}
    </View>
  );
}

export default function HelpFAQScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [openKey, setOpenKey] = useState<string | null>(null);

  const toggle = (key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenKey(prev => (prev === key ? null : key));
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={PURPLE} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & FAQ</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.heroCard}>
          <Ionicons name="help-buoy" size={38} color={PURPLE} />
          <Text style={styles.heroTitle}>How can we help?</Text>
          <Text style={styles.heroSub}>
            Find answers to the most common questions below. Can't find what you're looking for? Contact our support team.
          </Text>
        </View>

        {FAQ_DATA.map((cat) => (
          <View key={cat.title} style={styles.categoryBlock}>
            {/* Category header */}
            <View style={styles.catHeader}>
              <View style={[styles.catIconWrap, { backgroundColor: cat.color + '20' }]}>
                <Ionicons name={cat.icon} size={18} color={cat.color} />
              </View>
              <Text style={[styles.catTitle, { color: cat.color }]}>{cat.title}</Text>
            </View>

            {/* FAQ items */}
            <View style={styles.faqCard}>
              {cat.items.map((item, idx) => {
                const key = `${cat.title}-${idx}`;
                return (
                  <React.Fragment key={key}>
                    <FAQAccordion
                      item={item}
                      isOpen={openKey === key}
                      onToggle={() => toggle(key)}
                    />
                    {idx < cat.items.length - 1 && <View style={styles.faqDivider} />}
                  </React.Fragment>
                );
              })}
            </View>
          </View>
        ))}

        {/* Still need help? */}
        <View style={styles.stillNeedCard}>
          <MaterialIcons name="support-agent" size={32} color={PURPLE} />
          <Text style={styles.stillNeedTitle}>Still need help?</Text>
          <Text style={styles.stillNeedSub}>
            Our support team is here for you. Reach out and we'll get back to you as soon as possible.
          </Text>
          <TouchableOpacity
            style={styles.contactBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={styles.contactBtnText}>Go Back to Settings</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF' },
  header: {
    backgroundColor: PURPLE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  backBtn:     { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },

  content: { paddingHorizontal: 16, paddingTop: 20 },

  heroCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    elevation: 2,
  },
  heroTitle: { fontSize: 18, fontWeight: '800', color: '#1A1D2E', marginTop: 10, marginBottom: 6 },
  heroSub:   { fontSize: 13, color: '#666', textAlign: 'center', lineHeight: 20 },

  categoryBlock: { marginBottom: 20 },

  catHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  catIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catTitle: { fontSize: 13, fontWeight: '800', letterSpacing: 0.3, textTransform: 'uppercase' },

  faqCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 1,
  },

  faqItem:   {},
  faqQ: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  faqQText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1A1D2E', lineHeight: 20 },
  faqA:     { paddingHorizontal: 16, paddingBottom: 14 },
  faqAText: { fontSize: 13, color: '#555', lineHeight: 21 },
  faqDivider: { height: 1, backgroundColor: '#F0F4FF', marginHorizontal: 16 },

  stillNeedCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginTop: 4,
    elevation: 2,
  },
  stillNeedTitle: { fontSize: 17, fontWeight: '800', color: '#1A1D2E', marginTop: 10, marginBottom: 6 },
  stillNeedSub:   { fontSize: 13, color: '#666', textAlign: 'center', lineHeight: 20, marginBottom: 18 },
  contactBtn: {
    backgroundColor: PURPLE,
    borderRadius: 12,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  contactBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});
