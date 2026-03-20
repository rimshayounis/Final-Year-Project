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

export default function TermsOfServiceScreen() {
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
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro card */}
        <View style={styles.introCard}>
          <Ionicons name="document-text" size={36} color={PURPLE} />
          <Text style={styles.introTitle}>Terms of Service</Text>
          <Text style={styles.introSub}>
            By using TruHeal-Link, you agree to these terms. Please read them carefully before creating an account or booking any services.
          </Text>
          <Text style={styles.lastUpdated}>Last updated: {LAST_UPDATED}</Text>
        </View>

        <Section title="1. Acceptance of Terms">
          <Body>
            By downloading, installing, or using TruHeal-Link ("the App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not use the App. These Terms apply to all users, including patients (users) and healthcare providers (doctors).
          </Body>
        </Section>

        <Section title="2. Description of Service">
          <Body>TruHeal-Link is a digital health platform that provides:</Body>
          <Bullet text="A health information feed where doctors publish verified wellness content." />
          <Bullet text="Appointment booking between patients and verified doctors." />
          <Bullet text="In-app chat for secure communication between patients and doctors." />
          <Bullet text="An AI-powered health chatbot for general wellness guidance." />
          <Bullet text="User health profiles for personalised recommendations." />
          <Body>
            TruHeal-Link is NOT a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your qualified health provider with any questions you may have regarding a medical condition.
          </Body>
        </Section>

        <Section title="3. User Accounts">
          <Body>To use TruHeal-Link, you must:</Body>
          <Bullet text="Be at least 13 years of age (or have parental consent if under 18)." />
          <Bullet text="Provide accurate and complete registration information." />
          <Bullet text="Maintain the security of your password and not share your account credentials." />
          <Bullet text="Notify us immediately of any unauthorised use of your account." />
          <Body>
            You are responsible for all activities that occur under your account. TruHeal-Link is not liable for any loss or damage arising from your failure to protect your credentials.
          </Body>
        </Section>

        <Section title="4. Doctor Accounts & Verification">
          <Body>Doctors registering on TruHeal-Link agree to:</Body>
          <Bullet text="Submit a valid PMDC (Pakistan Medical & Dental Council) license number and relevant credentials." />
          <Bullet text="Provide accurate specialisation, qualifications, and contact information." />
          <Bullet text="Undergo identity and credential verification before being listed as active on the platform." />
          <Bullet text="Maintain valid licensure throughout their time on the platform." />
          <Bullet text="Only provide advice within their area of licensed medical competence." />
          <Body>
            TruHeal-Link reserves the right to suspend or permanently remove any doctor account that is found to have submitted false credentials or violated professional standards.
          </Body>
        </Section>

        <Section title="5. Appointments & Payments">
          <Body>The following rules govern appointments and payments on TruHeal-Link:</Body>
          <Bullet text="Patients may book appointments with available doctors through the app." />
          <Bullet text="Payment is processed securely through Stripe. We do not store card details." />
          <Bullet text="Fees are held by TruHeal-Link until the session is marked as completed, then released to the doctor after commission deduction." />
          <Bullet text="Cancellations made before session commencement may be eligible for a refund at TruHeal-Link's discretion." />
          <Bullet text="TruHeal-Link charges a commission on each completed paid appointment, as disclosed during onboarding." />
          <Bullet text="Disputes regarding payments must be reported through Contact Support within 7 days of the appointment." />
        </Section>

        <Section title="6. Content & Posts">
          <Body>
            Doctors may submit posts to the feed for review. Users may interact with verified posts (like, comment, share). By submitting content, you grant TruHeal-Link a non-exclusive, royalty-free licence to display that content within the app.
          </Body>
          <Body>You agree NOT to post content that:</Body>
          <Bullet text="Is false, misleading, or medically inaccurate." />
          <Bullet text="Promotes unverified treatments, supplements, or cures." />
          <Bullet text="Is abusive, harassing, obscene, or defamatory." />
          <Bullet text="Infringes any copyright, trademark, or other intellectual property right." />
          <Bullet text="Contains personal data of other individuals without their consent." />
          <Body>
            TruHeal-Link reserves the right to remove any content that violates these Terms without prior notice.
          </Body>
        </Section>

        <Section title="7. AI Chatbot Disclaimer">
          <Body>
            The TruHeal-Link AI chatbot provides general health information only. It does not constitute medical advice and should not be used in emergency situations. In case of a medical emergency, contact your local emergency services immediately. The chatbot responses are generated by an AI model and may not always be accurate or complete.
          </Body>
        </Section>

        <Section title="8. Prohibited Activities">
          <Body>You agree not to:</Body>
          <Bullet text="Impersonate any person or entity, including medical professionals." />
          <Bullet text="Use the App for any unlawful purpose or in violation of any applicable laws." />
          <Bullet text="Attempt to gain unauthorised access to any part of the App or its related systems." />
          <Bullet text="Scrape, crawl, or otherwise harvest data from the App without permission." />
          <Bullet text="Use the chatbot to generate harmful, dangerous, or illegal content." />
          <Bullet text="Harass, threaten, or intimidate other users or doctors." />
        </Section>

        <Section title="9. Termination">
          <Body>
            TruHeal-Link may suspend or terminate your account at any time for violations of these Terms, without prior notice. You may delete your account at any time through the Settings screen. Upon termination, your right to use the App ceases immediately.
          </Body>
        </Section>

        <Section title="10. Limitation of Liability">
          <Body>
            To the maximum extent permitted by applicable law, TruHeal-Link shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the App. TruHeal-Link's total liability in any matter arising from these Terms shall not exceed the amount you paid to us in the 12 months preceding the claim.
          </Body>
        </Section>

        <Section title="11. Changes to These Terms">
          <Body>
            We may update these Terms from time to time. Significant changes will be communicated via in-app notification. Continued use of TruHeal-Link after changes take effect constitutes your acceptance of the revised Terms.
          </Body>
        </Section>

        <Section title="12. Governing Law">
          <Body>
            These Terms are governed by and construed in accordance with the laws of Pakistan. Any disputes arising under or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts of Pakistan.
          </Body>
        </Section>

        <Section title="13. Contact">
          <Body>
            For questions about these Terms, please use the Contact Support section within the app or email us at legal@truhealllink.com.
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
  introTitle:  { fontSize: 18, fontWeight: '800', color: '#1A1D2E', marginTop: 10, marginBottom: 8 },
  introSub:    { fontSize: 13, color: '#666', textAlign: 'center', lineHeight: 20 },
  lastUpdated: { fontSize: 11, color: '#AAA', marginTop: 10 },

  section:      { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1A1D2E', marginBottom: 8 },
  body:         { fontSize: 13, color: '#555', lineHeight: 21, marginBottom: 8 },

  bulletRow:  { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  bulletDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: PURPLE, marginTop: 7, marginRight: 10 },
  bulletText: { flex: 1, fontSize: 13, color: '#555', lineHeight: 20 },
});
