import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, StatusBar, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

const PURPLE = '#6B7FED';
const LAST_UPDATED = 'January 1, 2025';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Body({ children }: { children: string }) {
  return <Text style={styles.body}>{children}</Text>;
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={styles.bulletRow}>
      <View style={styles.bulletDot} />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

export default function PrivacyPolicyScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={PURPLE} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro card */}
        <View style={styles.introCard}>
          <Ionicons name="shield-checkmark" size={36} color={PURPLE} />
          <Text style={styles.introTitle}>Your Privacy Matters</Text>
          <Text style={styles.introSub}>
            TruHeal-Link is committed to protecting your personal health information.
            This policy explains what we collect, how we use it, and your rights.
          </Text>
          <Text style={styles.lastUpdated}>Last updated: {LAST_UPDATED}</Text>
        </View>

        <Section title="1. Information We Collect">
          <Body>We collect the following types of information when you use TruHeal-Link:</Body>
          <Bullet text="Account information: full name, email address, age, and gender." />
          <Bullet text="Health profile: sleep duration, stress level, diet preference, and additional health notes you voluntarily provide." />
          <Bullet text="Emergency contacts: names, phone numbers, and relationships of contacts you register." />
          <Bullet text="Appointment data: selected dates, time slots, health concerns, session details, and payment records." />
          <Bullet text="Posts and content: titles, descriptions, images, and categories you publish on the feed." />
          <Bullet text="Chat messages: text, images, and files exchanged between users and doctors through the in-app chat." />
          <Bullet text="Chatbot conversations: messages you send to the AI health assistant." />
          <Bullet text="Device and usage data: push notification tokens, IP address, device type, and app activity logs." />
        </Section>

        <Section title="2. How We Use Your Information">
          <Body>We use collected information to:</Body>
          <Bullet text="Create and manage your account and profile." />
          <Bullet text="Match you with verified doctors based on your health needs." />
          <Bullet text="Process appointment bookings, confirmations, and cancellations." />
          <Bullet text="Facilitate secure payments and release funds to doctors upon session completion." />
          <Bullet text="Power the AI chatbot with context relevant to your queries." />
          <Bullet text="Send push and email notifications about appointments, posts, and account activity." />
          <Bullet text="Moderate user-submitted posts through our doctor verification system." />
          <Bullet text="Detect and prevent fraud, abuse, and violations of our Terms of Service." />
          <Bullet text="Improve the app through aggregated, anonymised analytics." />
        </Section>

        <Section title="3. How We Share Your Information">
          <Body>
            We do not sell your personal information. We share it only in the following circumstances:
          </Body>
          <Bullet text="With doctors: your name, health concern, and appointment details are shared with the doctor you book." />
          <Bullet text="With payment processors: Stripe receives payment data to process transactions securely. We do not store card numbers." />
          <Bullet text="With service providers: we use third-party services (hosting, push notifications, cloud storage) that process data on our behalf under strict confidentiality agreements." />
          <Bullet text="For legal compliance: we may disclose information if required by law, court order, or to protect the safety of users." />
        </Section>

        <Section title="4. Data Security">
          <Body>
            We take data security seriously and implement appropriate technical and organisational measures including:
          </Body>
          <Bullet text="Passwords are hashed using industry-standard algorithms and never stored in plain text." />
          <Bullet text="All data in transit is encrypted using HTTPS / TLS." />
          <Bullet text="Payment processing is handled by Stripe, a PCI-DSS compliant provider." />
          <Bullet text="Access to sensitive data is restricted to authorised personnel only." />
          <Body>
            No system is 100% secure. If you suspect unauthorised access to your account, please contact our support team immediately.
          </Body>
        </Section>

        <Section title="5. Health Data">
          <Body>
            TruHeal-Link handles health-related information with heightened care. Your health profile, chat messages with doctors, and appointment health concerns are used solely to provide you with the services you request and are never used for advertising or shared with third parties without your explicit consent.
          </Body>
        </Section>

        <Section title="6. Data Retention">
          <Body>
            We retain your data for as long as your account is active or as needed to provide services. If you delete your account, your personal information is deleted within 30 days, except where we are required by law to retain it longer (e.g., financial transaction records for up to 7 years).
          </Body>
        </Section>

        <Section title="7. Your Rights">
          <Body>Depending on your location, you may have the right to:</Body>
          <Bullet text="Access the personal data we hold about you." />
          <Bullet text="Request correction of inaccurate data." />
          <Bullet text="Request deletion of your account and personal data." />
          <Bullet text="Withdraw consent for optional data processing." />
          <Bullet text="Lodge a complaint with a relevant data protection authority." />
          <Body>To exercise any of these rights, contact us via the Contact Support section in the app.</Body>
        </Section>

        <Section title="8. Children's Privacy">
          <Body>
            TruHeal-Link is not intended for users under the age of 13. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us immediately so we can remove it.
          </Body>
        </Section>

        <Section title="9. Changes to This Policy">
          <Body>
            We may update this Privacy Policy periodically. When we make material changes, we will notify you via in-app notification or email. Continued use of TruHeal-Link after changes constitutes acceptance of the updated policy.
          </Body>
        </Section>

        <Section title="10. Contact Us">
          <Body>
            If you have questions or concerns about this Privacy Policy or your data, please reach out through the Contact Support section in Settings, or email us at privacy@truhealllink.com.
          </Body>
        </Section>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#F0F4FF' },
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

  content:     { paddingHorizontal: 16, paddingTop: 20 },

  introCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 2,
  },
  introTitle:   { fontSize: 18, fontWeight: '800', color: '#1A1D2E', marginTop: 10, marginBottom: 8 },
  introSub:     { fontSize: 13, color: '#666', textAlign: 'center', lineHeight: 20 },
  lastUpdated:  { fontSize: 11, color: '#AAA', marginTop: 10 },

  section:      { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1A1D2E', marginBottom: 8 },
  body:         { fontSize: 13, color: '#555', lineHeight: 21, marginBottom: 8 },

  bulletRow:  { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  bulletDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: PURPLE, marginTop: 7, marginRight: 10 },
  bulletText: { flex: 1, fontSize: 13, color: '#555', lineHeight: 20 },
});
