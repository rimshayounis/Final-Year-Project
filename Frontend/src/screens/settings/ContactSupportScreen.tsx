import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, StatusBar, TouchableOpacity,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
  TouchableWithoutFeedback, Keyboard, RefreshControl,
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

const PURPOSE_LABEL: Record<string, string> = Object.fromEntries(PURPOSES.map(p => [p.key, p.label]));

type SupportStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

const STATUS_CONFIG: Record<SupportStatus, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  open:        { label: 'Open',        color: '#B45309', bg: '#FEF3C7', icon: 'time-outline'           },
  in_progress: { label: 'In Progress', color: '#1D4ED8', bg: '#DBEAFE', icon: 'reload-circle-outline'  },
  resolved:    { label: 'Resolved',    color: '#065F46', bg: '#D1FAE5', icon: 'checkmark-circle-outline'},
  closed:      { label: 'Closed',      color: '#4B5563', bg: '#F3F4F6', icon: 'close-circle-outline'   },
};

interface SupportRequest {
  _id: string;
  purpose: string;
  description: string;
  status: SupportStatus;
  adminNote?: string | null;
  createdAt: string;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ContactSupportScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<ContactSupportRoute>();
  const { id, role } = route.params;

  const [purpose,      setPurpose]      = useState('');
  const [description,  setDescription]  = useState('');
  const [loading,      setLoading]      = useState(false);
  const [submitted,    setSubmitted]    = useState(false);

  const [requests,     setRequests]     = useState<SupportRequest[]>([]);
  const [reqLoading,   setReqLoading]   = useState(false);
  const [refreshing,   setRefreshing]   = useState(false);

  const fetchRequests = useCallback(async (silent = false) => {
    if (!silent) setReqLoading(true);
    try {
      const res = await apiClient.get(`/support-requests/user/${id}`);
      const data: SupportRequest[] = res.data?.data ?? res.data ?? [];
      setRequests(data);
    } catch {
      // silently ignore
    } finally {
      setReqLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

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
      fetchRequests(true);
    } catch {
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchRequests(true);
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
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PURPLE]} tintColor={PURPLE} />}
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
                  onPress={() => {
                    setSubmitted(false);
                    setPurpose('');
                    setDescription('');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.doneBtnText}>Submit Another</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.doneBtn, { backgroundColor: '#E5E7EB', marginTop: 10 }]}
                  onPress={() => navigation.goBack()}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.doneBtnText, { color: '#374151' }]}>Back to Settings</Text>
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

            {/* ── My Previous Requests ── */}
            <View style={styles.prevSection}>
              <View style={styles.prevHeader}>
                <Ionicons name="list-outline" size={20} color={PURPLE} />
                <Text style={styles.prevHeaderText}>My Requests</Text>
                {requests.length > 0 && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{requests.length}</Text>
                  </View>
                )}
              </View>

              {reqLoading ? (
                <ActivityIndicator color={PURPLE} style={{ marginTop: 16 }} />
              ) : requests.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <Ionicons name="mail-outline" size={36} color="#CCC" />
                  <Text style={styles.emptyText}>No requests yet</Text>
                </View>
              ) : (
                requests.map(req => {
                  const cfg = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.open;
                  return (
                    <View key={req._id} style={styles.reqCard}>
                      {/* Top row: purpose + date */}
                      <View style={styles.reqTopRow}>
                        <Text style={styles.reqPurpose}>
                          {PURPOSE_LABEL[req.purpose] ?? req.purpose}
                        </Text>
                        <Text style={styles.reqDate}>{formatDate(req.createdAt)}</Text>
                      </View>

                      {/* Description snippet */}
                      <Text style={styles.reqDesc} numberOfLines={2}>{req.description}</Text>

                      {/* Status badge */}
                      <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                        <Ionicons name={cfg.icon} size={13} color={cfg.color} />
                        <Text style={[styles.statusBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                      </View>

                      {/* Admin note */}
                      {req.adminNote ? (
                        <View style={styles.adminNoteWrap}>
                          <View style={styles.adminNoteHeader}>
                            <Ionicons name="chatbubble-ellipses-outline" size={14} color={PURPLE} />
                            <Text style={styles.adminNoteLabel}>Admin Response</Text>
                          </View>
                          <Text style={styles.adminNoteText}>{req.adminNote}</Text>
                        </View>
                      ) : null}
                    </View>
                  );
                })
              )}
            </View>
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
    marginBottom: 24,
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

  // Previous requests section
  prevSection: {
    marginTop: 32,
  },
  prevHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  prevHeaderText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A1D2E',
    flex: 1,
  },
  countBadge: {
    backgroundColor: PURPLE,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '700' },

  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 8,
  },
  emptyText: { fontSize: 13, color: '#AAA' },

  reqCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  reqTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  reqPurpose: { fontSize: 13, fontWeight: '700', color: '#1A1D2E' },
  reqDate:    { fontSize: 11, color: '#9CA3AF' },
  reqDesc:    { fontSize: 13, color: '#6B7280', lineHeight: 19, marginBottom: 10 },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeText: { fontSize: 12, fontWeight: '700' },

  adminNoteWrap: {
    marginTop: 12,
    backgroundColor: '#EEF1FF',
    borderRadius: 10,
    padding: 12,
  },
  adminNoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  adminNoteLabel: { fontSize: 12, fontWeight: '700', color: PURPLE },
  adminNoteText:  { fontSize: 13, color: '#374151', lineHeight: 19 },
});
