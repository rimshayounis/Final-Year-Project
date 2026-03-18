import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, StatusBar, TouchableOpacity,
  ScrollView, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useStripe } from '@stripe/stripe-react-native';
import { bookedAppointmentAPI, chatAPI } from '../../services/api';
import apiClient from '../../services/api';

interface AppointmentScreenProps { id: string; role: string; }

interface Appointment {
  _id: string;
  userId: any;
  doctorId: any;
  date: string;
  time: string;
  sessionDuration: number;
  consultationFee: number;
  healthConcern: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  paymentStatus: 'not_required' | 'pending_payment' | 'payment_held' | 'released' | 'refunded';
  heldAmount: number;
  createdAt: string;
}

const isTimeReached = (date: string, time: string) =>
  new Date() >= new Date(`${date}T${time}:00`);

const formatDisplayDate = (dateStr: string) =>
  new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

const formatDisplayTime = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`;
};

const getTimeUntil = (date: string, time: string) => {
  const diffMs = new Date(`${date}T${time}:00`).getTime() - Date.now();
  if (diffMs <= 0) return '';
  const diffMins  = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays  = Math.floor(diffHours / 24);
  if (diffDays  > 0) return `in ${diffDays}d ${diffHours % 24}h`;
  if (diffHours > 0) return `in ${diffHours}h ${diffMins % 60}m`;
  return `in ${diffMins}m`;
};

const PAYMENT_LABELS: Record<string, string> = {
  not_required:   '',
  pending_payment:'Payment Required',
  payment_held:   'Payment Held',
  released:       'Payment Released',
  refunded:       'Refunded',
};

const PAYMENT_COLORS: Record<string, { bg: string; text: string }> = {
  pending_payment:{ bg: '#FFF3CD', text: '#856404' },
  payment_held:   { bg: '#D4F8E8', text: '#1B8A5A' },
  released:       { bg: '#E8F0FE', text: '#3D5AFE' },
  refunded:       { bg: '#FFE0E0', text: '#C0392B' },
};

export default function AppointmentScreen({ id, role }: AppointmentScreenProps) {
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [appointments,    setAppointments]    = useState<Appointment[]>([]);
  const [isLoading,       setIsLoading]       = useState(true);
  const [isRefreshing,    setIsRefreshing]    = useState(false);
  const [chatLoadingId,   setChatLoadingId]   = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [payLoadingId,    setPayLoadingId]    = useState<string | null>(null);
  const [,                setNow]             = useState(new Date());

  const convCache = useRef<Record<string, string>>({});

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  useFocusEffect(
    useCallback(() => { loadAppointments(); }, [id, role])
  );

  const loadAppointments = async (refreshing = false) => {
    try {
      if (refreshing) setIsRefreshing(true);
      else setIsLoading(true);
      const response = role === 'doctor'
        ? await bookedAppointmentAPI.getDoctorAppointments(id)
        : await bookedAppointmentAPI.getUserAppointments(id);
      if (response.data?.success) setAppointments(response.data.data);
    } catch (error) {
      console.error('Load appointments error:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // ── Doctor: confirm or reject appointment ─────────────────────────────────
  const handleDoctorAction = async (appt: Appointment, action: 'confirmed' | 'cancelled') => {
    const label = action === 'confirmed' ? 'Confirm' : 'Reject';
    Alert.alert(
      `${label} Appointment`,
      action === 'confirmed'
        ? `Confirm appointment with ${appt.userId?.fullName ?? 'patient'}?\n\nThey will be notified to complete payment.`
        : `Reject appointment with ${appt.userId?.fullName ?? 'patient'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: label,
          style: action === 'cancelled' ? 'destructive' : 'default',
          onPress: async () => {
            setActionLoadingId(appt._id);
            try {
              await apiClient.patch(`/booked-appointments/${appt._id}/status`, { status: action });
              await loadAppointments();
            } catch (e: any) {
              Alert.alert('Error', e?.response?.data?.message || 'Action failed.');
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ]
    );
  };

  // ── User: pay for appointment ─────────────────────────────────────────────
  const handlePay = async (appt: Appointment) => {
    setPayLoadingId(appt._id);
    try {
      // Step 1 — create PaymentIntent for appointment
      const intentRes = await apiClient.post('/payment/appointment/create-intent', {
        appointmentId: appt._id,
      });
      const { clientSecret, paymentIntentId, amount } = intentRes.data;

      // Step 2 — init payment sheet
      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'TruHeal Link',
        style: 'automatic',
      });
      if (initError) {
        Alert.alert('Payment Error', initError.message);
        setPayLoadingId(null);
        return;
      }

      // Step 3 — present payment sheet
      const { error: presentError } = await presentPaymentSheet();
      if (presentError) {
        if (presentError.code !== 'Canceled') {
          Alert.alert('Payment Failed', presentError.message);
        }
        setPayLoadingId(null);
        return;
      }

      // Step 4 — confirm on backend
      await apiClient.post('/payment/appointment/confirm', {
        appointmentId: appt._id,
        paymentIntentId,
        userId: id,
      });

      Alert.alert(
        'Payment Successful',
        `PKR ${amount} held securely. It will be released to the doctor after your session completes.`,
      );
      await loadAppointments();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Payment failed.');
    } finally {
      setPayLoadingId(null);
    }
  };

  // ── Open chat session ─────────────────────────────────────────────────────
  const handleContinueSession = async (appointment: Appointment) => {
    const doctorId      = appointment.doctorId?._id   || appointment.doctorId;
    const patientId     = appointment.userId?._id     || appointment.userId;
    const doctorName    = appointment.doctorId?.fullName  || 'Doctor';
    const patientName   = appointment.userId?.fullName    || 'Patient';
    const doctorAvatar  = appointment.doctorId?.profilePicture || undefined;
    const patientAvatar = appointment.userId?.profilePicture   || undefined;
    const specialty     = appointment.doctorId?.doctorProfile?.specialization || '';

    const cacheKey = `${doctorId}_${patientId}`;
    let conversationId = convCache.current[cacheKey];

    if (!conversationId) {
      setChatLoadingId(appointment._id);
      try {
        const res = await chatAPI.getOrCreateConversation(doctorId, patientId);
        conversationId = res.data?._id || res.data?.conversationId;
        if (conversationId) convCache.current[cacheKey] = conversationId;
      } catch (err) {
        Alert.alert('Error', 'Could not open chat. Please try again.');
        setChatLoadingId(null);
        return;
      }
      setChatLoadingId(null);
    }

    if (!conversationId) {
      Alert.alert('Error', 'Could not get conversation ID.');
      return;
    }

    if (role === 'doctor') {
      navigation.navigate('DoctorChat', {
        patientId, patientName, patientAvatar, conversationId,
        appointmentId:   appointment._id,
        startTime:       `${appointment.date}T${appointment.time}:00`,
        sessionDuration: appointment.sessionDuration,
      });
    } else {
      navigation.navigate('PatientChat', {
        doctorId, doctorName, doctorAvatar, doctorSpecialty: specialty, conversationId,
        appointmentId:   appointment._id,
        startTime:       `${appointment.date}T${appointment.time}:00`,
        sessionDuration: appointment.sessionDuration,
      });
    }
  };

  const handleBookAppointment   = () => navigation.navigate('BookAppointments', { userId: id, role });
  const handleCreateAppointment = () => navigation.navigate('CreateAppointment', { doctorId: id });

  const getDoctorName     = (a: Appointment) => a.doctorId?.fullName || 'Unknown Doctor';
  const getPatientName    = (a: Appointment) => a.userId?.fullName   || 'Unknown Patient';
  const getSpecialization = (a: Appointment) => a.doctorId?.doctorProfile?.specialization || '';

  const getStatusColors = (status: string) => {
    switch (status) {
      case 'confirmed': return { bg: '#D4F8E8', text: '#1B8A5A' };
      case 'pending':   return { bg: '#FFE8C7', text: '#B25E00' };
      case 'cancelled': return { bg: '#FFE0E0', text: '#C0392B' };
      case 'completed': return { bg: '#E8F0FE', text: '#3D5AFE' };
      default:          return { bg: '#F0F0F0', text: '#555' };
    }
  };

  // Pending appointment count for bell badge (doctor only)
  const pendingCount = appointments.filter(a => a.status === 'pending').length;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#6B7FED" />
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <Text style={styles.headerTitle}>Appointments</Text>
          <View style={styles.bellWrap}>
            <MaterialIcons name="notifications" size={24} color="#FFFFFF" />
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6B7FED" />
          <Text style={styles.loadingText}>Loading appointments...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#6B7FED" />

      {/* Header with notification badge */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.headerTitle}>Appointments</Text>
        <View style={styles.bellWrap}>
          <MaterialIcons name="notifications" size={24} color="#FFFFFF" />
          {role === 'doctor' && pendingCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingCount > 9 ? '9+' : pendingCount}</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadAppointments(true)}
            colors={['#6B7FED']} tintColor="#6B7FED"
          />
        }
      >
        {appointments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="event-busy" size={70} color="#CCC" />
            <Text style={styles.emptyTitle}>No Appointments</Text>
            <Text style={styles.emptySubtitle}>
              {role === 'doctor'
                ? 'No appointments have been booked yet.'
                : 'You have no appointments yet. Book one below!'}
            </Text>
          </View>
        ) : (
          appointments.map((item) => {
            const statusColors      = getStatusColors(item.status);
            const timeReached       = isTimeReached(item.date, item.time);
            const timeUntil         = getTimeUntil(item.date, item.time);
            const isThisChatLoading = chatLoadingId === item._id;
            const isActionLoading   = actionLoadingId === item._id;
            const isPayLoading      = payLoadingId === item._id;

            // Doctor: show confirm/reject on pending appointments
            const showDoctorActions = role === 'doctor' && item.status === 'pending';

            // User: show Pay button if confirmed + pending_payment
            const showPayBtn = role === 'user' &&
              item.status === 'confirmed' &&
              item.paymentStatus === 'pending_payment';

            // Show session button only if payment is done (held/released) OR not required
            const paymentOk = !item.paymentStatus ||
              item.paymentStatus === 'not_required' ||
              item.paymentStatus === 'payment_held' ||
              item.paymentStatus === 'released';

            const canStartSession = item.status === 'confirmed' && timeReached && paymentOk;
            const showSessionBtn  = (item.status === 'confirmed' || item.status === 'pending') && !showPayBtn;

            const paymentColor = PAYMENT_COLORS[item.paymentStatus] ?? null;

            return (
              <View key={item._id} style={styles.card}>

                {/* Status row */}
                <View style={styles.statusRow}>
                  <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                    <Text style={[styles.statusText, { color: statusColors.text }]}>
                      {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    </Text>
                  </View>
                  {item.paymentStatus && item.paymentStatus !== 'not_required' && paymentColor && (
                    <View style={[styles.statusBadge, { backgroundColor: paymentColor.bg, marginLeft: 6 }]}>
                      <Ionicons
                        name={item.paymentStatus === 'payment_held' ? 'lock-closed' : 'card'}
                        size={10}
                        color={paymentColor.text}
                        style={{ marginRight: 3 }}
                      />
                      <Text style={[styles.statusText, { color: paymentColor.text }]}>
                        {PAYMENT_LABELS[item.paymentStatus]}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Appointment details */}
                {role === 'doctor' ? (
                  <Text style={styles.label}>
                    Patient: <Text style={styles.value}>{getPatientName(item)}</Text>
                  </Text>
                ) : (
                  <Text style={styles.label}>
                    Doctor:{' '}
                    <Text style={styles.value}>
                      {getDoctorName(item)}
                      {getSpecialization(item) ? ` · ${getSpecialization(item)}` : ''}
                    </Text>
                  </Text>
                )}
                <Text style={styles.label}>
                  Date: <Text style={styles.value}>{formatDisplayDate(item.date)}</Text>
                </Text>
                <Text style={styles.label}>
                  Time: <Text style={styles.value}>{formatDisplayTime(item.time)}</Text>
                </Text>
                <Text style={styles.label}>
                  Duration: <Text style={styles.value}>{item.sessionDuration} Minutes</Text>
                </Text>
                <Text style={styles.label}>
                  Fee: <Text style={styles.value}>PKR {item.consultationFee}</Text>
                </Text>

                <View style={styles.concernContainer}>
                  <MaterialIcons name="medical-services" size={14} color="#6B7FED" />
                  <Text style={styles.concernLabel}>Health Concern: </Text>
                  <Text style={styles.concernText} numberOfLines={2}>{item.healthConcern}</Text>
                </View>

                {/* ── DOCTOR: Confirm / Reject buttons ── */}
                {showDoctorActions && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.confirmBtn]}
                      onPress={() => handleDoctorAction(item, 'confirmed')}
                      disabled={isActionLoading}
                    >
                      {isActionLoading
                        ? <ActivityIndicator size="small" color="#FFF" />
                        : <>
                            <Ionicons name="checkmark-circle" size={16} color="#FFF" />
                            <Text style={styles.actionBtnTxt}>Confirm</Text>
                          </>
                      }
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.rejectBtn]}
                      onPress={() => handleDoctorAction(item, 'cancelled')}
                      disabled={isActionLoading}
                    >
                      {isActionLoading
                        ? <ActivityIndicator size="small" color="#FFF" />
                        : <>
                            <Ionicons name="close-circle" size={16} color="#FFF" />
                            <Text style={styles.actionBtnTxt}>Reject</Text>
                          </>
                      }
                    </TouchableOpacity>
                  </View>
                )}

                {/* ── USER: Pay button ── */}
                {showPayBtn && (
                  <TouchableOpacity
                    style={styles.payBtn}
                    onPress={() => handlePay(item)}
                    disabled={isPayLoading}
                  >
                    {isPayLoading
                      ? <ActivityIndicator size="small" color="#FFF" />
                      : <>
                          <Ionicons name="card" size={16} color="#FFF" />
                          <Text style={styles.payBtnTxt}>Pay PKR {item.consultationFee}</Text>
                        </>
                    }
                  </TouchableOpacity>
                )}

                {/* ── SESSION button ── */}
                {showSessionBtn && (
                  <TouchableOpacity
                    style={[styles.continueButton, !canStartSession && styles.continueButtonDisabled]}
                    onPress={() => canStartSession && handleContinueSession(item)}
                    disabled={!canStartSession || isThisChatLoading}
                    activeOpacity={canStartSession ? 0.8 : 1}
                  >
                    {isThisChatLoading ? (
                      <ActivityIndicator size="small" color="#6B7FED" />
                    ) : (
                      <>
                        {canStartSession && <MaterialIcons name="chat" size={18} color="#FFFFFF" />}
                        <Text style={[styles.continueButtonText, !canStartSession && styles.continueButtonTextDisabled]}>
                          {canStartSession
                            ? 'Continue Session'
                            : item.status === 'pending'
                            ? 'Awaiting Confirmation'
                            : `Session starts ${timeUntil}`}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}

        {role === 'doctor' ? (
          <TouchableOpacity style={styles.createButton} onPress={handleCreateAppointment}>
            <MaterialIcons name="add-circle-outline" size={24} color="#FFFFFF" />
            <Text style={styles.createButtonText}>Create Appointment</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.bookButton} onPress={handleBookAppointment}>
            <MaterialIcons name="calendar-today" size={20} color="#FFFFFF" />
            <Text style={styles.bookButtonText}>Book Appointment</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:                  { flex: 1, backgroundColor: '#F5F5F5' },
  header:                     { backgroundColor: '#6B7FED', paddingBottom: 15, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle:                { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  bellWrap:                   { position: 'relative', padding: 5 },
  badge:                      { position: 'absolute', top: 0, right: 0, backgroundColor: '#E53E3E', borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },
  badgeText:                  { color: '#FFF', fontSize: 9, fontWeight: '800' },
  content:                    { padding: 20 },
  loadingContainer:           { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText:                { marginTop: 12, fontSize: 15, color: '#666' },
  emptyContainer:             { alignItems: 'center', paddingTop: 60, paddingBottom: 30 },
  emptyTitle:                 { fontSize: 18, fontWeight: '700', color: '#333', marginTop: 16 },
  emptySubtitle:              { fontSize: 13, color: '#888', textAlign: 'center', marginTop: 8, paddingHorizontal: 30 },
  card:                       { backgroundColor: '#FFFFFF', borderRadius: 15, padding: 15, marginBottom: 20, elevation: 3, borderWidth: 1.5, borderColor: '#6B7FED' },
  statusRow:                  { flexDirection: 'row', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 6 },
  statusBadge:                { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText:                 { fontSize: 12, fontWeight: '700' },
  label:                      { fontSize: 14, color: '#555', marginBottom: 6 },
  value:                      { fontWeight: '600', color: '#2C3E50' },
  concernContainer:           { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#F0F2FF', borderRadius: 10, padding: 10, marginTop: 4, marginBottom: 4, flexWrap: 'wrap' },
  concernLabel:               { fontSize: 13, fontWeight: '600', color: '#6B7FED' },
  concernText:                { fontSize: 13, color: '#444', flex: 1 },

  // Doctor action buttons
  actionRow:                  { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn:                  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 11, borderRadius: 20, gap: 6 },
  confirmBtn:                 { backgroundColor: '#00B374' },
  rejectBtn:                  { backgroundColor: '#E53E3E' },
  actionBtnTxt:               { color: '#FFF', fontSize: 14, fontWeight: '700' },

  // User pay button
  payBtn:                     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F6A623', paddingVertical: 12, borderRadius: 20, marginTop: 12, gap: 8 },
  payBtnTxt:                  { color: '#FFF', fontSize: 14, fontWeight: '700' },

  // Session button
  continueButton:             { backgroundColor: '#6B7FED', paddingVertical: 11, borderRadius: 20, alignItems: 'center', marginTop: 12, flexDirection: 'row', justifyContent: 'center', gap: 8 },
  continueButtonDisabled:     { backgroundColor: '#E8E8E8', borderWidth: 1, borderColor: '#DDD' },
  continueButtonText:         { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  continueButtonTextDisabled: { color: '#AAAAAA' },

  bookButton:                 { backgroundColor: '#6B7FED', paddingVertical: 15, borderRadius: 30, alignItems: 'center', marginTop: 10, flexDirection: 'row', justifyContent: 'center', gap: 10, shadowColor: '#6B7FED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  bookButtonText:             { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  createButton:               { backgroundColor: '#4CAF50', paddingVertical: 15, borderRadius: 30, alignItems: 'center', marginTop: 10, flexDirection: 'row', justifyContent: 'center', gap: 10, shadowColor: '#4CAF50', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  createButtonText:           { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
