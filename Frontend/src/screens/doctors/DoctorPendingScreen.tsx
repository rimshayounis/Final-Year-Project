import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Alert, ActivityIndicator, TextInput, Platform, KeyboardAvoidingView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../../App';
import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { doctorAPI } from '../../services/api';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'DoctorUnverified'>;
  route: RouteProp<RootStackParamList, 'DoctorUnverified'>;
};

interface VerificationStatus {
  isVerified: boolean;
  isRejected: boolean;
  rejectionReason: string | null;
  licenseNumber: string | null;
  specialization: string;
  certificatesCount: number;
}

interface CertFile { uri: string; name: string; mimeType: string; }

export default function DoctorPendingScreen({ navigation, route }: Props) {
  const { doctorId, doctorName } = route.params;

  const [status, setStatus]           = useState<VerificationStatus | null>(null);
  const [fetching, setFetching]       = useState(true);

  // Resubmit form state
  const [showResubmit, setShowResubmit] = useState(false);
  const [specialization, setSpecialization] = useState('');
  const [licenseNumber, setLicenseNumber]   = useState('');
  const [certs, setCerts]                   = useState<CertFile[]>([]);
  const [submitting, setSubmitting]         = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await doctorAPI.getVerificationStatus(doctorId);
      setStatus(res.data);
    } catch {
      // silently fail on poll
    } finally {
      setFetching(false);
    }
  }, [doctorId]);

  // Fetch on mount + poll every 15 s
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out', style: 'destructive',
        onPress: () => navigation.reset({ index: 0, routes: [{ name: 'LoginType' }] }),
      },
    ]);
  };

  const handlePickCerts = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const files: CertFile[] = result.assets.map(a => ({
        uri: a.uri, name: a.name,
        mimeType: a.mimeType || (a.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
      }));
      setCerts(prev => [...prev, ...files]);
    } catch {
      Alert.alert('Error', 'Failed to pick files.');
    }
  };

  const handleResubmit = async () => {
    if (!specialization.trim())
      return Alert.alert('Error', 'Specialization is required.');
    if (certs.length === 0)
      return Alert.alert('Error', 'Please upload at least one document.');

    setSubmitting(true);
    try {
      const body = new FormData();
      body.append('specialization', specialization.trim());
      body.append('licenseNumber', licenseNumber.trim());
      certs.forEach(c => {
        body.append('certificates', {
          uri: Platform.OS === 'ios' ? c.uri.replace('file://', '') : c.uri,
          name: c.name,
          type: c.mimeType,
        } as any);
      });

      await doctorAPI.resubmit(doctorId, body);
      setShowResubmit(false);
      setCerts([]);
      setSpecialization('');
      setLicenseNumber('');
      await fetchStatus();
      Alert.alert('Submitted', 'Your application has been resubmitted for review.');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Resubmission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Header badge ────────────────────────────────────────────────────────
  const headerColor = status?.isVerified
    ? '#059669'
    : status?.isRejected
    ? '#dc2626'
    : '#6B7FED';

  const headerBadgeText = status?.isVerified
    ? 'Verified ✓'
    : status?.isRejected
    ? 'Application Rejected'
    : 'Pending Verification';

  // ─── Loading ─────────────────────────────────────────────────────────────
  if (fetching) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#6B7FED" />
        <Text style={{ marginTop: 12, color: '#666' }}>Checking verification status...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar backgroundColor={headerColor} barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: headerColor }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Welcome, {doctorName}</Text>
            <Text style={styles.appName}>TruHeal-Link</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <MaterialIcons name="logout" size={20} color="#fff" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.statusBadge}>
          <MaterialIcons
            name={status?.isVerified ? 'verified' : status?.isRejected ? 'cancel' : 'schedule'}
            size={16} color="#FFD700"
          />
          <Text style={styles.statusText}>{headerBadgeText}</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* ── VERIFIED ──────────────────────────────────────────────────── */}
        {status?.isVerified && (
          <>
            <View style={styles.card}>
              <MaterialIcons name="verified" size={64} color="#059669" />
              <Text style={styles.successTitle}>Account Verified!</Text>
              <Text style={styles.successText}>
                Your credentials have been reviewed and approved. You can now access all features of TruHeal-Link.
              </Text>
            </View>

            <View style={[styles.documentsCard, { backgroundColor: '#d1fae5', borderColor: '#6ee7b7', borderWidth: 1 }]}>
              <View style={styles.documentsHeader}>
                <MaterialIcons name="folder" size={24} color="#059669" />
                <Text style={[styles.documentsTitle, { color: '#065f46' }]}>Verified Documents</Text>
              </View>
              <DocRow icon="check-circle" color="#059669" label={`License Number: ${status.licenseNumber || 'N/A'}`} />
              <DocRow icon="check-circle" color="#059669" label={`Specialization: ${status.specialization}`} />
              <DocRow icon="check-circle" color="#059669" label={`Certificates: ${status.certificatesCount} verified`} />
            </View>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#059669' }]}
              onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Login', params: { userType: 'doctor' } }] })}
            >
              <MaterialIcons name="login" size={20} color="#fff" />
              <Text style={styles.actionBtnText}>Continue to Login</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── REJECTED ──────────────────────────────────────────────────── */}
        {status?.isRejected && !showResubmit && (
          <>
            <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: '#dc2626' }]}>
              <MaterialIcons name="cancel" size={64} color="#dc2626" />
              <Text style={[styles.successTitle, { color: '#dc2626' }]}>Application Rejected</Text>
              <Text style={styles.successText}>
                Unfortunately, your application did not pass verification. Please review the reason below and resubmit with the correct documents.
              </Text>
            </View>

            <View style={styles.rejectionBox}>
              <View style={styles.rejectionHeader}>
                <MaterialIcons name="report-problem" size={20} color="#dc2626" />
                <Text style={styles.rejectionTitle}>Reason for Rejection</Text>
              </View>
              <Text style={styles.rejectionReason}>{status.rejectionReason || 'No reason provided.'}</Text>
            </View>

            <View style={[styles.documentsCard, { backgroundColor: '#fff1f2', borderColor: '#fecaca', borderWidth: 1 }]}>
              <View style={styles.documentsHeader}>
                <MaterialIcons name="folder" size={24} color="#dc2626" />
                <Text style={[styles.documentsTitle, { color: '#991b1b' }]}>Submitted Documents</Text>
              </View>
              <DocRow icon="cancel" color="#dc2626" label={`License Number: ${status.licenseNumber || 'N/A'}`} />
              <DocRow icon="cancel" color="#dc2626" label={`Specialization: ${status.specialization}`} />
              <DocRow icon="cancel" color="#dc2626" label={`Certificates: ${status.certificatesCount} uploaded`} />
            </View>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#dc2626' }]}
              onPress={() => {
                setSpecialization(status.specialization || '');
                setLicenseNumber(status.licenseNumber || '');
                setCerts([]);
                setShowResubmit(true);
              }}
            >
              <MaterialIcons name="refresh" size={20} color="#fff" />
              <Text style={styles.actionBtnText}>Resubmit Application</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── RESUBMIT FORM ─────────────────────────────────────────────── */}
        {status?.isRejected && showResubmit && (
          <>
            <View style={styles.card}>
              <MaterialIcons name="edit-document" size={48} color="#6B7FED" />
              <Text style={styles.successTitle}>Resubmit Application</Text>
              <Text style={styles.successText}>Update your information and upload correct documents.</Text>
            </View>

            <View style={styles.formCard}>
              <Text style={styles.fieldLabel}>Specialization *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Cardiologist, Psychologist..."
                value={specialization}
                onChangeText={setSpecialization}
                placeholderTextColor="#aaa"
              />

              <Text style={styles.fieldLabel}>License Number</Text>
              <TextInput
                style={styles.input}
                placeholder="PMDC License No."
                value={licenseNumber}
                onChangeText={setLicenseNumber}
                placeholderTextColor="#aaa"
              />

              <Text style={styles.fieldLabel}>Documents / Certificates *</Text>
              <TouchableOpacity style={styles.uploadBtn} onPress={handlePickCerts}>
                <MaterialIcons name="upload-file" size={20} color="#6B7FED" />
                <Text style={styles.uploadBtnText}>
                  {certs.length > 0 ? `${certs.length} file(s) selected — tap to add more` : 'Upload Documents'}
                </Text>
              </TouchableOpacity>

              {certs.map((c, i) => (
                <View key={i} style={styles.certRow}>
                  <MaterialIcons name="insert-drive-file" size={16} color="#6B7FED" />
                  <Text style={styles.certName} numberOfLines={1}>{c.name}</Text>
                  <TouchableOpacity onPress={() => setCerts(prev => prev.filter((_, idx) => idx !== i))}>
                    <MaterialIcons name="close" size={16} color="#dc2626" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <View style={styles.resubmitActions}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#f3f4f8', flex: 1 }]}
                onPress={() => setShowResubmit(false)}
                disabled={submitting}
              >
                <Text style={[styles.actionBtnText, { color: '#555' }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#6B7FED', flex: 2 }]}
                onPress={handleResubmit}
                disabled={submitting}
              >
                {submitting
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <><MaterialIcons name="send" size={18} color="#fff" /><Text style={styles.actionBtnText}>Submit</Text></>
                }
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ── PENDING ───────────────────────────────────────────────────── */}
        {!status?.isVerified && !status?.isRejected && (
          <>
            <View style={styles.card}>
              <MaterialIcons name="celebration" size={60} color="#6B7FED" />
              <Text style={styles.successTitle}>Registration Submitted!</Text>
              <Text style={styles.successText}>
                Your  account has been created successfully. We're reviewing your credentials and will update this page once verification is complete.
              </Text>
            </View>

            <View style={styles.infoCard}>
              <MaterialIcons name="schedule" size={24} color="#FFA500" />
              <Text style={styles.infoText}>
                Verification typically takes 24–48 hours. Pease wait patiently while we review your documents.
              </Text>
            </View>

            <View style={[styles.documentsCard, { backgroundColor: '#E8F4F8' }]}>
              <View style={styles.documentsHeader}>
                <MaterialIcons name="folder" size={24} color="#6B7FED" />
                <Text style={styles.documentsTitle}>Submitted Documents</Text>
              </View>
              <DocRow icon="check-circle" color="#4CAF50" label={`Specialization: ${status?.specialization || 'Submitted'}`} />
              <DocRow icon="pending" color="#FF9800" label="License Number: Under Review" />
              <DocRow icon="pending" color="#FF9800" label={`Certificates: ${status?.certificatesCount ?? 0} file(s) — Under Review`} />
            </View>

            <TouchableOpacity style={styles.refreshBtn} onPress={() => { setFetching(true); fetchStatus(); }}>
              <MaterialIcons name="refresh" size={18} color="#6B7FED" />
              <Text style={styles.refreshText}>Refresh Status</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function DocRow({ icon, color, label }: { icon: any; color: string; label: string }) {
  return (
    <View style={styles.documentItem}>
      <MaterialIcons name={icon} size={20} color={color} />
      <Text style={styles.documentsText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    paddingTop: 50, paddingBottom: 30, paddingHorizontal: 30,
    borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 4,
  },
  logoutText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  greeting: { fontSize: 18, color: '#FFFFFF', fontWeight: '400' },
  appName: { fontSize: 28, color: '#FFFFFF', fontWeight: '700', marginTop: 5 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'flex-start', paddingHorizontal: 12,
    paddingVertical: 6, borderRadius: 15, marginTop: 10, gap: 5,
  },
  statusText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 30,
    alignItems: 'center', marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 3,
  },
  successTitle: {
    fontSize: 22, fontWeight: '700', color: '#2C3E50',
    marginTop: 16, textAlign: 'center',
  },
  successText: {
    fontSize: 14, color: '#666', marginTop: 10,
    textAlign: 'center', lineHeight: 22,
  },
  infoCard: {
    backgroundColor: '#FFF4E6', borderRadius: 15, padding: 18,
    flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 12,
  },
  infoText: { flex: 1, fontSize: 13, color: '#2C3E50', lineHeight: 20 },
  documentsCard: { borderRadius: 15, padding: 20, marginBottom: 20 },
  documentsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 },
  documentsTitle: { fontSize: 17, fontWeight: '700', color: '#2C3E50' },
  documentItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  documentsText: { fontSize: 14, color: '#2C3E50' },

  // Rejection
  rejectionBox: {
    backgroundColor: '#fff1f2', borderRadius: 14, padding: 18,
    marginBottom: 20, borderWidth: 1, borderColor: '#fecaca',
  },
  rejectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  rejectionTitle: { fontSize: 14, fontWeight: '700', color: '#dc2626' },
  rejectionReason: { fontSize: 15, color: '#991b1b', lineHeight: 22 },

  // Action buttons
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 15, borderRadius: 14, marginBottom: 14,
  },
  actionBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Resubmit form
  formCard: {
    backgroundColor: '#fff', borderRadius: 18, padding: 20,
    marginBottom: 16, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
  },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#555', marginBottom: 6, marginTop: 12, textTransform: 'uppercase', letterSpacing: 0.4 },
  input: {
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#111', backgroundColor: '#fafafa',
  },
  uploadBtn: {
    borderWidth: 1.5, borderColor: '#6B7FED', borderStyle: 'dashed',
    borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#f5f3ff',
  },
  uploadBtnText: { color: '#6B7FED', fontWeight: '600', fontSize: 14, flex: 1 },
  certRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#f3f4f8', borderRadius: 8, padding: 8, marginTop: 6,
  },
  certName: { flex: 1, fontSize: 12, color: '#333' },
  resubmitActions: { flexDirection: 'row', gap: 10, marginBottom: 14 },

  // Refresh
  refreshBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, padding: 12, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#6B7FED', backgroundColor: '#f5f3ff',
  },
  refreshText: { color: '#6B7FED', fontWeight: '600', fontSize: 14 },
});
