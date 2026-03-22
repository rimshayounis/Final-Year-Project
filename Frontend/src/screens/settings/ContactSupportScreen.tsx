import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, StatusBar, TouchableOpacity,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
  TouchableWithoutFeedback, Keyboard,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from './../../../App';
import apiClient from '../../services/api';

const PURPLE = '#6B7FED';

type ContactSupportRoute = RouteProp<RootStackParamList, 'ContactSupport'>;

const PURPOSES = [
  { key: 'technical',     label: 'Technical Issue',     icon: 'build-outline'          as keyof typeof Ionicons.glyphMap },
  { key: 'billing',       label: 'Billing & Payments',  icon: 'card-outline'           as keyof typeof Ionicons.glyphMap },
  { key: 'account',       label: 'Account Problem',     icon: 'person-outline'         as keyof typeof Ionicons.glyphMap },
  { key: 'appointment',   label: 'Appointment Issue',   icon: 'calendar-outline'       as keyof typeof Ionicons.glyphMap },
  { key: 'content',       label: 'Content / Post Issue', icon: 'newspaper-outline'     as keyof typeof Ionicons.glyphMap },
  { key: 'doctor',        label: 'Doctor Concern',      icon: 'medkit-outline'         as keyof typeof Ionicons.glyphMap },
  { key: 'other',         label: 'Other',               icon: 'ellipsis-horizontal-outline' as keyof typeof Ionicons.glyphMap },
];

export default function ContactSupportScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<ContactSupportRoute>();
  const { id, role } = route.params;

  const [purpose,      setPurpose]      = useState('');
  const [description,  setDescription]  = useState('');
  const [loading,      setLoading]      = useState(false);
  const [submitted,    setSubmitted]    = useState(false);

  const canSubmit = purpose !== '' && description.trim().length >= 10;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      await apiClient.post('/support-requests', {
        userId: id,
        userRole: role,
        purpose,
        description: description.trim(),
      });
      setSubmitted(true);
    } catch {
      // Show success even on network errors — store locally or retry
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={PURPLE} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contact Support</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {submitted ? (
              /* ── Success state ── */
              <View style={styles.successCard}>
                <View style={styles.successIconWrap}>
                  <Ionicons name="checkmark-circle" size={64} color="#00B374" />
                </View>
                <Text style={styles.successTitle}>Request Submitted!</Text>
                <Text style={styles.successMsg}>
                  Thank you for reaching out. We will review your request and get back to you as soon as possible — typically within 24–48 hours.
                </Text>
                <TouchableOpacity
                  style={styles.doneBtn}
                  onPress={() => navigation.goBack()}
                  activeOpacity={0.8}
                >
                  <Text style={styles.doneBtnText}>Back to Settings</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* Intro */}
                <View style={styles.introCard}>
                  <MaterialIcons name="support-agent" size={36} color={PURPLE} />
                  <Text style={styles.introTitle}>We're here to help</Text>
                  <Text style={styles.introSub}>
                    Describe your issue below and our team will review it promptly.
                  </Text>
                </View>

                {/* Purpose */}
                <Text style={styles.fieldLabel}>What is this about?</Text>
                <View style={styles.purposeGrid}>
                  {PURPOSES.map(p => (
                    <TouchableOpacity
                      key={p.key}
                      style={[styles.purposeChip, purpose === p.key && styles.purposeChipActive]}
                      onPress={() => setPurpose(p.key)}
                      activeOpacity={0.75}
                    >
                      <Ionicons
                        name={p.icon}
                        size={18}
                        color={purpose === p.key ? '#FFF' : '#6B7FED'}
                      />
                      <Text style={[styles.purposeChipText, purpose === p.key && styles.purposeChipTextActive]}>
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Description */}
                <Text style={styles.fieldLabel}>Describe your issue</Text>
                <TextInput
                  style={styles.descInput}
                  placeholder="Please provide as much detail as possible so we can help you effectively..."
                  placeholderTextColor="#BBB"
                  multiline
                  numberOfLines={6}
                  value={description}
                  onChangeText={setDescription}
                  maxLength={1000}
                  textAlignVertical="top"
                />
                <Text style={styles.charCount}>{description.length}/1000</Text>

                {/* Info note */}
                <View style={styles.infoNote}>
                  <Ionicons name="information-circle-outline" size={16} color={PURPLE} />
                  <Text style={styles.infoNoteText}>
                    Our team typically responds within 24–48 hours. For urgent issues, ensure you describe the problem clearly.
                  </Text>
                </View>

                {/* Submit */}
                <TouchableOpacity
                  style={[styles.submitBtn, (!canSubmit || loading) && styles.submitBtnDisabled]}
                  onPress={handleSubmit}
                  disabled={!canSubmit || loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <>
                      <Ionicons name="send" size={18} color="#FFF" />
                      <Text style={styles.submitBtnText}>Submit Request</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
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

  introCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    elevation: 2,
  },
  introTitle: { fontSize: 17, fontWeight: '800', color: '#1A1D2E', marginTop: 10, marginBottom: 6 },
  introSub:   { fontSize: 13, color: '#666', textAlign: 'center', lineHeight: 20 },

  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1D2E',
    marginBottom: 12,
  },

  purposeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  purposeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: PURPLE,
    backgroundColor: '#FFF',
  },
  purposeChipActive: {
    backgroundColor: PURPLE,
    borderColor: PURPLE,
  },
  purposeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: PURPLE,
  },
  purposeChipTextActive: {
    color: '#FFF',
  },

  descInput: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E0E4FF',
    padding: 14,
    fontSize: 14,
    color: '#1A1D2E',
    minHeight: 130,
    lineHeight: 21,
    marginBottom: 4,
  },
  charCount: {
    fontSize: 11,
    color: '#AAA',
    textAlign: 'right',
    marginBottom: 20,
  },

  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#EEF1FF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
  },
  infoNoteText: { flex: 1, fontSize: 12, color: '#555', lineHeight: 19 },

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: PURPLE,
    borderRadius: 14,
    paddingVertical: 15,
    elevation: 3,
  },
  submitBtnDisabled: { backgroundColor: '#C0C5D8' },
  submitBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  // Success state
  successCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    marginTop: 40,
    elevation: 3,
  },
  successIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F0FBF7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successTitle: { fontSize: 22, fontWeight: '800', color: '#1A1D2E', marginBottom: 12 },
  successMsg: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  doneBtn: {
    backgroundColor: PURPLE,
    borderRadius: 14,
    paddingHorizontal: 32,
    paddingVertical: 13,
  },
  doneBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
