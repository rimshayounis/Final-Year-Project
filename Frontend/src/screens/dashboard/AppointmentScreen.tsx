import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, StatusBar, TouchableOpacity,
  ScrollView, ActivityIndicator, RefreshControl, Alert, Switch,
  Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useStripe } from '@stripe/stripe-react-native';
import { bookedAppointmentAPI, appointmentAPI, chatAPI, feedbackAPI } from '../../services/api';
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
  hasFeedback: boolean;
  createdAt: string;
}

interface TimeSlot { start: string; end: string; }
interface SpecificDate { date: string; timeSlots: TimeSlot[]; }
interface Availability {
  _id: string;
  doctorId: string;
  sessionDuration: number;
  consultationFee: number;
  specificDates: SpecificDate[];
  isActive: boolean;
  lastUpdated: string;
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

// ── Doctor Schedule Tab ───────────────────────────────────────────────────────
function ScheduleTab({ doctorId, onCreateSchedule }: { doctorId: string; onCreateSchedule: () => void }) {
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [toggling,     setToggling]     = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await appointmentAPI.getOwnAvailability(doctorId);
      setAvailability(res.data?.data ?? null);
    } catch {
      setAvailability(null);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, [doctorId]));

  const handleToggle = async (val: boolean) => {
    if (!availability) return;
    setToggling(true);
    try {
      await appointmentAPI.updateAvailability(doctorId, { isActive: val });
      setAvailability(prev => prev ? { ...prev, isActive: val } : prev);
    } catch {
      Alert.alert('Error', 'Failed to update status.');
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerWrap}>
        <ActivityIndicator size="large" color={PURPLE} />
      </View>
    );
  }

  if (!availability) {
    return (
      <View style={{ flex: 1 }}>
      <View style={styles.emptyContainer}>
        <MaterialIcons name="event-note" size={70} color="#CCC" />
        <Text style={styles.emptyTitle}>No Schedule Set</Text>
        <Text style={styles.emptySubtitle}>
          Create your availability schedule so patients can book appointments with you.
        </Text>
        <TouchableOpacity style={styles.scheduleEmptyBtn} onPress={onCreateSchedule}>
          <MaterialIcons name="add-circle-outline" size={22} color="#FFF" />
          <Text style={styles.createButtonText}>Create Schedule</Text>
        </TouchableOpacity>
      </View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {/* Schedule info card */}
      <View style={styles.scheduleCard}>
        {/* Header row with toggle */}
        <View style={styles.scheduleCardHeader}>
          <View>
            <Text style={styles.scheduleCardTitle}>My Schedule</Text>
            <Text style={[styles.scheduleStatusLabel, { color: availability.isActive ? '#1B8A5A' : '#C0392B' }]}>
              {availability.isActive ? 'Active — visible to patients' : 'Inactive — hidden from patients'}
            </Text>
          </View>
          <View style={styles.toggleWrap}>
            {toggling
              ? <ActivityIndicator size="small" color={PURPLE} />
              : <Switch
                  value={availability.isActive}
                  onValueChange={handleToggle}
                  trackColor={{ false: '#E0E0E0', true: '#A8F0CE' }}
                  thumbColor={availability.isActive ? '#00B374' : '#AAA'}
                />
            }
          </View>
        </View>

        {/* Fee & duration */}
        <View style={styles.scheduleInfoRow}>
          <View style={styles.scheduleInfoItem}>
            <MaterialIcons name="attach-money" size={20} color={PURPLE} />
            <View>
              <Text style={styles.scheduleInfoLabel}>Consultation Fee</Text>
              <Text style={styles.scheduleInfoValue}>PKR {availability.consultationFee}</Text>
            </View>
          </View>
          <View style={styles.scheduleInfoItem}>
            <MaterialIcons name="timer" size={20} color={PURPLE} />
            <View>
              <Text style={styles.scheduleInfoLabel}>Session Duration</Text>
              <Text style={styles.scheduleInfoValue}>{availability.sessionDuration} min</Text>
            </View>
          </View>
        </View>

        {/* Date & time slots */}
        <Text style={styles.slotsTitle}>Available Dates & Time Slots</Text>
        {availability.specificDates.length === 0 ? (
          <Text style={styles.noSlotsText}>No dates configured.</Text>
        ) : (
          availability.specificDates.map((d, i) => (
            <View key={i} style={styles.dateSlotRow}>
              <Text style={styles.dateSlotDate}>{formatDisplayDate(d.date)}</Text>
              <View style={styles.slotPills}>
                {d.timeSlots.map((ts, j) => (
                  <View key={j} style={styles.slotPill}>
                    <Text style={styles.slotPillText}>
                      {formatDisplayTime(ts.start)} – {formatDisplayTime(ts.end)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))
        )}

        {/* Edit schedule */}
        <TouchableOpacity style={styles.editScheduleBtn} onPress={onCreateSchedule}>
          <MaterialIcons name="edit" size={16} color={PURPLE} />
          <Text style={styles.editScheduleBtnText}>Edit Schedule</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function AppointmentScreen({ id, role }: AppointmentScreenProps) {
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [activeTab,       setActiveTab]       = useState<'appointments' | 'schedule'>('appointments');
  const [apptSubTab,     setApptSubTab]      = useState<'active' | 'completed'>('active');
  const [appointments,    setAppointments]    = useState<Appointment[]>([]);
  const [isLoading,       setIsLoading]       = useState(true);
  const [isRefreshing,    setIsRefreshing]    = useState(false);
  const [chatLoadingId,   setChatLoadingId]   = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [payLoadingId,    setPayLoadingId]    = useState<string | null>(null);
  const [,                setNow]             = useState(new Date());

  // Feedback modal state
  const [feedbackAppt,      setFeedbackAppt]      = useState<Appointment | null>(null);
  const [feedbackRating,    setFeedbackRating]    = useState(0);
  const [feedbackText,      setFeedbackText]      = useState('');
  const [feedbackLoading,   setFeedbackLoading]   = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  // Track locally which appointments have received feedback this session
  const [localFeedbackIds,  setLocalFeedbackIds]  = useState<Set<string>>(new Set());

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

  const handlePay = async (appt: Appointment) => {
    setPayLoadingId(appt._id);
    try {
      const intentRes = await apiClient.post('/payment/appointment/create-intent', {
        appointmentId: appt._id,
      });
      const { clientSecret, paymentIntentId, amount } = intentRes.data;
      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'TruHeal Link',
        style: 'automatic',
      });
      if (initError) { Alert.alert('Payment Error', initError.message); setPayLoadingId(null); return; }
      const { error: presentError } = await presentPaymentSheet();
      if (presentError) {
        if (presentError.code !== 'Canceled') Alert.alert('Payment Failed', presentError.message);
        setPayLoadingId(null);
        return;
      }
      await apiClient.post('/payment/appointment/confirm', {
        appointmentId: appt._id, paymentIntentId, userId: id,
      });
      Alert.alert('Payment Successful', `PKR ${amount} held securely. It will be released to the doctor after your session completes.`);
      await loadAppointments();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Payment failed.');
    } finally {
      setPayLoadingId(null);
    }
  };

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
      } catch {
        Alert.alert('Error', 'Could not open chat. Please try again.');
        setChatLoadingId(null);
        return;
      }
      setChatLoadingId(null);
    }

    if (!conversationId) { Alert.alert('Error', 'Could not get conversation ID.'); return; }

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

  const handleOpenFeedback = (appt: Appointment) => {
    setFeedbackAppt(appt);
    setFeedbackRating(0);
    setFeedbackText('');
    setFeedbackSubmitted(false);
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackAppt) return;
    if (feedbackRating === 0) {
      Alert.alert('Rating Required', 'Please select a star rating before submitting.');
      return;
    }
    setFeedbackLoading(true);
    try {
      const doctorId = feedbackAppt.doctorId?._id || feedbackAppt.doctorId;
      await feedbackAPI.submit({
        appointmentId: feedbackAppt._id,
        userId: id,
        doctorId,
        rating: feedbackRating,
        description: feedbackText.trim(),
      });
      setFeedbackSubmitted(true);
      setLocalFeedbackIds(prev => new Set([...prev, feedbackAppt._id]));
      setTimeout(() => {
        setFeedbackAppt(null);
        setFeedbackSubmitted(false);
      }, 2200);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to submit feedback.');
    } finally {
      setFeedbackLoading(false);
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

  const pendingCount = appointments.filter(a => a.status === 'pending').length;

  // Split appointments for doctor view
  const activeAppts    = appointments.filter(a => a.status !== 'completed' && a.status !== 'cancelled');
  const completedAppts = appointments.filter(a => a.status === 'completed');
  const cancelledAppts = appointments.filter(a => a.status === 'cancelled');

  const renderAppointmentCard = (item: Appointment, dimmed = false) => {
    const statusColors      = getStatusColors(item.status);
    const timeReached       = isTimeReached(item.date, item.time);
    const timeUntil         = getTimeUntil(item.date, item.time);
    const isThisChatLoading = chatLoadingId === item._id;
    const isActionLoading   = actionLoadingId === item._id;
    const isPayLoading      = payLoadingId === item._id;

    const showDoctorActions = role === 'doctor' && item.status === 'pending';
    const showPayBtn = role === 'user' && item.status === 'confirmed' && item.paymentStatus === 'pending_payment';
    const paymentOk = !item.paymentStatus || item.paymentStatus === 'not_required' || item.paymentStatus === 'payment_held' || item.paymentStatus === 'released';
    const canStartSession = item.status === 'confirmed' && timeReached && paymentOk;
    const showSessionBtn  = (item.status === 'confirmed' || item.status === 'pending') && !showPayBtn;
    const paymentColor = PAYMENT_COLORS[item.paymentStatus] ?? null;

    return (
      <View key={item._id} style={[styles.card, dimmed && styles.cardDimmed]}>
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
                size={10} color={paymentColor.text} style={{ marginRight: 3 }}
              />
              <Text style={[styles.statusText, { color: paymentColor.text }]}>
                {PAYMENT_LABELS[item.paymentStatus]}
              </Text>
            </View>
          )}
        </View>

        {role === 'doctor' ? (
          <Text style={styles.label}>Patient: <Text style={styles.value}>{getPatientName(item)}</Text></Text>
        ) : (
          <>
            <Text style={styles.label}>
              Doctor: <Text style={styles.value}>{getDoctorName(item)}{getSpecialization(item) ? ` · ${getSpecialization(item)}` : ''}</Text>
            </Text>
            {(item.doctorId?.ratingCount ?? 0) > 0 && (
              <View style={styles.ratingChip}>
                <MaterialIcons name="star" size={12} color="#F6A623" />
                <Text style={styles.ratingChipText}>{(item.doctorId?.avgRating ?? 0).toFixed(1)}</Text>
                <Text style={styles.ratingChipCount}>({item.doctorId.ratingCount})</Text>
              </View>
            )}
          </>
        )}
        <Text style={styles.label}>Date: <Text style={styles.value}>{formatDisplayDate(item.date)}</Text></Text>
        <Text style={styles.label}>Time: <Text style={styles.value}>{formatDisplayTime(item.time)}</Text></Text>
        <Text style={styles.label}>Duration: <Text style={styles.value}>{item.sessionDuration} Minutes</Text></Text>
        <Text style={styles.label}>Fee: <Text style={styles.value}>PKR {item.consultationFee}</Text></Text>
        <View style={styles.concernContainer}>
          <MaterialIcons name="medical-services" size={14} color={PURPLE} />
          <Text style={styles.concernLabel}>Health Concern: </Text>
          <Text style={styles.concernText} numberOfLines={2}>{item.healthConcern}</Text>
        </View>

        {showDoctorActions && (
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.actionBtn, styles.confirmBtn]} onPress={() => handleDoctorAction(item, 'confirmed')} disabled={isActionLoading}>
              {isActionLoading ? <ActivityIndicator size="small" color="#FFF" /> : <><Ionicons name="checkmark-circle" size={16} color="#FFF" /><Text style={styles.actionBtnTxt}>Confirm</Text></>}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => handleDoctorAction(item, 'cancelled')} disabled={isActionLoading}>
              {isActionLoading ? <ActivityIndicator size="small" color="#FFF" /> : <><Ionicons name="close-circle" size={16} color="#FFF" /><Text style={styles.actionBtnTxt}>Reject</Text></>}
            </TouchableOpacity>
          </View>
        )}

        {showPayBtn && (
          <TouchableOpacity style={styles.payBtn} onPress={() => handlePay(item)} disabled={isPayLoading}>
            {isPayLoading ? <ActivityIndicator size="small" color="#FFF" /> : <><Ionicons name="card" size={16} color="#FFF" /><Text style={styles.payBtnTxt}>Pay PKR {item.consultationFee}</Text></>}
          </TouchableOpacity>
        )}

        {showSessionBtn && (
          <TouchableOpacity
            style={[styles.continueButton, !canStartSession && styles.continueButtonDisabled]}
            onPress={() => canStartSession && handleContinueSession(item)}
            disabled={!canStartSession || isThisChatLoading}
            activeOpacity={canStartSession ? 0.8 : 1}
          >
            {isThisChatLoading ? <ActivityIndicator size="small" color={PURPLE} /> : (
              <>
                {canStartSession && <MaterialIcons name="chat" size={18} color="#FFF" />}
                <Text style={[styles.continueButtonText, !canStartSession && styles.continueButtonTextDisabled]}>
                  {canStartSession ? 'Continue Session' : item.status === 'pending' ? 'Awaiting Confirmation' : `Session starts ${timeUntil}`}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Feedback button — only for users on completed appointments */}
        {role === 'user' && item.status === 'completed' && (
          (() => {
            const alreadyGiven = item.hasFeedback || localFeedbackIds.has(item._id);
            return (
              <TouchableOpacity
                style={[styles.feedbackBtn, alreadyGiven && styles.feedbackBtnDone]}
                onPress={() => !alreadyGiven && handleOpenFeedback(item)}
                disabled={alreadyGiven}
                activeOpacity={alreadyGiven ? 1 : 0.8}
              >
                <Ionicons
                  name={alreadyGiven ? 'checkmark-circle' : 'star-outline'}
                  size={15}
                  color={alreadyGiven ? '#00B374' : PURPLE}
                />
                <Text style={[styles.feedbackBtnText, alreadyGiven && styles.feedbackBtnTextDone]}>
                  {alreadyGiven ? 'Feedback Given' : 'Give Feedback'}
                </Text>
              </TouchableOpacity>
            );
          })()
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={PURPLE} />
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <Text style={styles.headerTitle}>Appointments</Text>
          <View style={styles.bellWrap}><MaterialIcons name="notifications" size={24} color="#FFF" /></View>
        </View>
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={PURPLE} />
          <Text style={styles.loadingText}>Loading appointments...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={PURPLE} />

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.headerTitle}>Appointments</Text>
        <View style={styles.bellWrap}>
          <MaterialIcons name="notifications" size={24} color="#FFF" />
          {role === 'doctor' && pendingCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingCount > 9 ? '9+' : pendingCount}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Tabs — doctor only */}
      {role === 'doctor' && (
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'appointments' && styles.tabBtnActive]}
            onPress={() => setActiveTab('appointments')}
          >
            <MaterialIcons name="event" size={16} color={activeTab === 'appointments' ? PURPLE : '#AAA'} />
            <Text style={[styles.tabBtnText, activeTab === 'appointments' && styles.tabBtnTextActive]}>
              Appointments
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'schedule' && styles.tabBtnActive]}
            onPress={() => setActiveTab('schedule')}
          >
            <MaterialIcons name="schedule" size={16} color={activeTab === 'schedule' ? PURPLE : '#AAA'} />
            <Text style={[styles.tabBtnText, activeTab === 'schedule' && styles.tabBtnTextActive]}>
              Schedule
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Schedule Tab ── */}
      {/* ── Feedback Modal ── */}
      <Modal visible={!!feedbackAppt} transparent animationType="fade" onRequestClose={() => setFeedbackAppt(null)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.fbOverlay}>
            <View style={styles.fbCard}>
              {feedbackSubmitted ? (
                <View style={styles.fbThankWrap}>
                  <Ionicons name="checkmark-circle" size={52} color="#00B374" />
                  <Text style={styles.fbThankText}>Thank you for your feedback!</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.fbTitle}>How was your experience?</Text>
                  <Text style={styles.fbSub}>
                    {feedbackAppt?.doctorId?.fullName
                      ? feedbackAppt.doctorId.fullName
                      : 'Your appointment'}
                  </Text>
                  {feedbackAppt?.doctorId?.doctorProfile?.specialization ? (
                    <Text style={styles.fbSpecText}>
                      {feedbackAppt.doctorId.doctorProfile.specialization}
                    </Text>
                  ) : null}

                  {/* Stars */}
                  <View style={styles.fbStarsRow}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <TouchableOpacity key={star} onPress={() => setFeedbackRating(star)} activeOpacity={0.7}>
                        <Ionicons
                          name={star <= feedbackRating ? 'star' : 'star-outline'}
                          size={36}
                          color={star <= feedbackRating ? '#F6A623' : '#CCC'}
                          style={{ marginHorizontal: 4 }}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Description */}
                  <TextInput
                    style={styles.fbInput}
                    placeholder="Share your experience (optional)..."
                    placeholderTextColor="#AAA"
                    multiline
                    numberOfLines={3}
                    value={feedbackText}
                    onChangeText={setFeedbackText}
                    maxLength={300}
                  />

                  {/* Buttons */}
                  <View style={styles.fbBtnRow}>
                    <TouchableOpacity style={styles.fbCancelBtn} onPress={() => setFeedbackAppt(null)}>
                      <Text style={styles.fbCancelTxt}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.fbSubmitBtn, feedbackRating === 0 && styles.fbSubmitBtnDisabled]}
                      onPress={handleSubmitFeedback}
                      disabled={feedbackLoading || feedbackRating === 0}
                    >
                      {feedbackLoading
                        ? <ActivityIndicator size="small" color="#FFF" />
                        : <Text style={styles.fbSubmitTxt}>Submit</Text>}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {role === 'doctor' && activeTab === 'schedule' ? (
        <ScheduleTab doctorId={id} onCreateSchedule={handleCreateAppointment} />
      ) : (
        /* ── Appointments Tab (or Patient view) ── */
        <>
          {/* Sub-tabs: Active / Completed — both doctor and user */}
          <View style={styles.subTabBar}>
            <TouchableOpacity
              style={[styles.subTabBtn, apptSubTab === 'active' && styles.subTabBtnActive]}
              onPress={() => setApptSubTab('active')}
            >
              <Text style={[styles.subTabBtnText, apptSubTab === 'active' && styles.subTabBtnTextActive]}>
                Active
                {activeAppts.length > 0 && (
                  <Text style={styles.subTabCount}> ({activeAppts.length})</Text>
                )}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.subTabBtn, apptSubTab === 'completed' && styles.subTabBtnActive]}
              onPress={() => setApptSubTab('completed')}
            >
              <Text style={[styles.subTabBtnText, apptSubTab === 'completed' && styles.subTabBtnTextActive]}>
                Completed
                {(completedAppts.length + cancelledAppts.length) > 0 && (
                  <Text style={styles.subTabCount}> ({completedAppts.length + cancelledAppts.length})</Text>
                )}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={() => loadAppointments(true)} colors={[PURPLE]} tintColor={PURPLE} />
            }
          >
            {role === 'doctor' ? (
              apptSubTab === 'active' ? (
                activeAppts.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <MaterialIcons name="event-available" size={70} color="#CCC" />
                    <Text style={styles.emptyTitle}>No Active Appointments</Text>
                    <Text style={styles.emptySubtitle}>Pending and confirmed appointments will appear here.</Text>
                  </View>
                ) : (
                  activeAppts.map(item => renderAppointmentCard(item, false))
                )
              ) : (
                /* Completed sub-tab */
                (completedAppts.length + cancelledAppts.length) === 0 ? (
                  <View style={styles.emptyContainer}>
                    <MaterialIcons name="event-busy" size={70} color="#CCC" />
                    <Text style={styles.emptyTitle}>No Completed Appointments</Text>
                    <Text style={styles.emptySubtitle}>Finished and cancelled sessions will appear here.</Text>
                  </View>
                ) : (
                  <>
                    {completedAppts.length > 0 && (
                      <>
                        <Text style={styles.sectionHeader}>Completed</Text>
                        {completedAppts.map(item => renderAppointmentCard(item, true))}
                      </>
                    )}
                    {cancelledAppts.length > 0 && (
                      <>
                        <Text style={styles.sectionHeader}>Cancelled</Text>
                        {cancelledAppts.map(item => renderAppointmentCard(item, true))}
                      </>
                    )}
                  </>
                )
              )
            ) : (
              /* Patient view — Active / Completed sub-tabs */
              apptSubTab === 'active' ? (
                activeAppts.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <MaterialIcons name="event-available" size={70} color="#CCC" />
                    <Text style={styles.emptyTitle}>No Active Appointments</Text>
                    <Text style={styles.emptySubtitle}>Your upcoming and pending appointments will appear here.</Text>
                  </View>
                ) : (
                  activeAppts.map(item => renderAppointmentCard(item, false))
                )
              ) : (
                (completedAppts.length + cancelledAppts.length) === 0 ? (
                  <View style={styles.emptyContainer}>
                    <MaterialIcons name="event-busy" size={70} color="#CCC" />
                    <Text style={styles.emptyTitle}>No Completed Appointments</Text>
                    <Text style={styles.emptySubtitle}>Finished and cancelled sessions will appear here.</Text>
                  </View>
                ) : (
                  <>
                    {completedAppts.length > 0 && (
                      <>
                        <Text style={styles.sectionHeader}>Completed</Text>
                        {completedAppts.map(item => renderAppointmentCard(item, true))}
                      </>
                    )}
                    {cancelledAppts.length > 0 && (
                      <>
                        <Text style={styles.sectionHeader}>Cancelled</Text>
                        {cancelledAppts.map(item => renderAppointmentCard(item, true))}
                      </>
                    )}
                  </>
                )
              )
            )}

            {/* Bottom action buttons */}
            {role === 'doctor' ? (
              <TouchableOpacity style={styles.scheduleEmptyBtn} onPress={handleCreateAppointment}>
                <MaterialIcons name="add-circle-outline" size={22} color="#FFF" />
                <Text style={styles.createButtonText}>Create Appointment</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.bookButton} onPress={handleBookAppointment}>
                <MaterialIcons name="calendar-today" size={20} color="#FFF" />
                <Text style={styles.bookButtonText}>Book Appointment</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </>
      )}
    </View>
  );
}

const PURPLE = '#6B7FED';
const styles = StyleSheet.create({
  container:                  { flex: 1, backgroundColor: '#F5F5F5' },
  header:                     { backgroundColor: PURPLE, paddingBottom: 15, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle:                { fontSize: 20, fontWeight: '700', color: '#FFF' },
  bellWrap:                   { position: 'relative', padding: 5 },
  badge:                      { position: 'absolute', top: 0, right: 0, backgroundColor: '#E53E3E', borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },
  badgeText:                  { color: '#FFF', fontSize: 9, fontWeight: '800' },

  // Tabs
  tabBar:                     { flexDirection: 'row', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E8ECFF' },
  tabBtn:                     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  tabBtnActive:               { borderBottomWidth: 2, borderBottomColor: PURPLE },
  tabBtnText:                 { fontSize: 13, fontWeight: '600', color: '#AAA' },
  tabBtnTextActive:           { color: PURPLE },

  content:                    { padding: 20 },
  centerWrap:                 { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText:                { marginTop: 12, fontSize: 15, color: '#666' },
  emptyContainer:             { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 40 },
  emptyTitle:                 { fontSize: 18, fontWeight: '700', color: '#333', marginTop: 16 },
  emptySubtitle:              { fontSize: 13, color: '#888', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  scheduleEmptyBtn:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#4CAF50', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 30, marginTop: 24, alignSelf: 'center', shadowColor: '#4CAF50', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },

  // Sub-tabs inside Appointments
  subTabBar:                  { flexDirection: 'row', backgroundColor: '#F0F2FF', marginHorizontal: 20, marginTop: 14, marginBottom: 2, borderRadius: 20, padding: 3 },
  subTabBtn:                  { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 18 },
  subTabBtnActive:            { backgroundColor: '#FFF', shadowColor: '#000', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 1 }, shadowRadius: 4, elevation: 2 },
  subTabBtnText:              { fontSize: 13, fontWeight: '600', color: '#AAA' },
  subTabBtnTextActive:        { color: PURPLE },
  subTabCount:                { fontWeight: '400', fontSize: 12 },

  sectionHeader:              { fontSize: 13, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, marginTop: 4 },
  card:                       { backgroundColor: '#FFF', borderRadius: 15, padding: 15, marginBottom: 20, elevation: 3, borderWidth: 1.5, borderColor: PURPLE },
  cardDimmed:                 { opacity: 0.5 },

  statusRow:                  { flexDirection: 'row', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 6 },
  statusBadge:                { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText:                 { fontSize: 12, fontWeight: '700' },
  label:                      { fontSize: 14, color: '#555', marginBottom: 6 },
  value:                      { fontWeight: '600', color: '#2C3E50' },
  ratingChip:                 { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FFF8E7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, alignSelf: 'flex-start', marginTop: 4, marginBottom: 2 },
  ratingChipText:             { fontSize: 12, fontWeight: '700', color: '#B07D00' },
  ratingChipCount:            { fontSize: 11, color: '#C89600' },

  concernContainer:           { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#F0F2FF', borderRadius: 10, padding: 10, marginTop: 4, marginBottom: 4, flexWrap: 'wrap' },
  concernLabel:               { fontSize: 13, fontWeight: '600', color: PURPLE },
  concernText:                { fontSize: 13, color: '#444', flex: 1 },

  actionRow:                  { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn:                  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 11, borderRadius: 20, gap: 6 },
  confirmBtn:                 { backgroundColor: '#00B374' },
  rejectBtn:                  { backgroundColor: '#E53E3E' },
  actionBtnTxt:               { color: '#FFF', fontSize: 14, fontWeight: '700' },

  payBtn:                     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F6A623', paddingVertical: 12, borderRadius: 20, marginTop: 12, gap: 8 },
  payBtnTxt:                  { color: '#FFF', fontSize: 14, fontWeight: '700' },

  continueButton:             { backgroundColor: PURPLE, paddingVertical: 11, borderRadius: 20, alignItems: 'center', marginTop: 12, flexDirection: 'row', justifyContent: 'center', gap: 8 },
  continueButtonDisabled:     { backgroundColor: '#E8E8E8', borderWidth: 1, borderColor: '#DDD' },
  continueButtonText:         { color: '#FFF', fontSize: 14, fontWeight: '600' },
  continueButtonTextDisabled: { color: '#AAAAAA' },

  bookButton:                 { backgroundColor: PURPLE, paddingVertical: 15, borderRadius: 30, alignItems: 'center', marginTop: 10, flexDirection: 'row', justifyContent: 'center', gap: 10, shadowColor: PURPLE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  bookButtonText:             { color: '#FFF', fontSize: 16, fontWeight: '700' },
  createButton:               { backgroundColor: '#4CAF50', paddingVertical: 15, borderRadius: 30, alignItems: 'center', marginTop: 10, flexDirection: 'row', justifyContent: 'center', gap: 10, shadowColor: '#4CAF50', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  createButtonText:           { color: '#FFF', fontSize: 16, fontWeight: '700' },

  // Feedback button on completed card
  feedbackBtn:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10, paddingVertical: 9, borderRadius: 20, borderWidth: 1.5, borderColor: PURPLE },
  feedbackBtnDone:         { borderColor: '#00B374', backgroundColor: '#F0FBF7' },
  feedbackBtnText:         { fontSize: 13, fontWeight: '600', color: PURPLE },
  feedbackBtnTextDone:     { color: '#00B374' },

  // Feedback modal
  fbOverlay:               { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  fbCard:                  { backgroundColor: '#FFF', borderRadius: 20, padding: 24, width: '100%', alignItems: 'center', elevation: 10 },
  fbThankWrap:             { alignItems: 'center', paddingVertical: 20 },
  fbThankText:             { fontSize: 17, fontWeight: '700', color: '#00B374', marginTop: 14, textAlign: 'center' },
  fbTitle:                 { fontSize: 20, fontWeight: '700', color: '#1A1D2E', marginBottom: 6, textAlign: 'center' },
  fbSub:                   { fontSize: 14, color: '#888', marginBottom: 4, textAlign: 'center' },
  fbSpecText:              { fontSize: 12, color: '#6B7FED', fontWeight: '600', marginBottom: 16, textAlign: 'center' },
  fbStarsRow:              { flexDirection: 'row', marginBottom: 20 },
  fbInput:                 { width: '100%', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12, padding: 12, fontSize: 14, color: '#333', minHeight: 80, textAlignVertical: 'top', marginBottom: 20 },
  fbBtnRow:                { flexDirection: 'row', gap: 12, width: '100%' },
  fbCancelBtn:             { flex: 1, paddingVertical: 12, borderRadius: 20, borderWidth: 1.5, borderColor: '#DDD', alignItems: 'center' },
  fbCancelTxt:             { fontSize: 14, fontWeight: '600', color: '#888' },
  fbSubmitBtn:             { flex: 1, paddingVertical: 12, borderRadius: 20, backgroundColor: PURPLE, alignItems: 'center' },
  fbSubmitBtnDisabled:     { backgroundColor: '#CCC' },
  fbSubmitTxt:             { fontSize: 14, fontWeight: '700', color: '#FFF' },

  // Schedule tab
  scheduleCard:               { backgroundColor: '#FFF', borderRadius: 16, padding: 18, marginBottom: 20, elevation: 3, borderWidth: 1.5, borderColor: PURPLE },
  scheduleCardHeader:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  scheduleCardTitle:          { fontSize: 17, fontWeight: '700', color: '#2C3E50' },
  scheduleStatusLabel:        { fontSize: 12, fontWeight: '600', marginTop: 3 },
  toggleWrap:                 { minWidth: 52, alignItems: 'center' },
  scheduleInfoRow:            { flexDirection: 'row', gap: 16, marginBottom: 18 },
  scheduleInfoItem:           { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F0F2FF', borderRadius: 12, padding: 12 },
  scheduleInfoLabel:          { fontSize: 11, color: '#888', fontWeight: '500' },
  scheduleInfoValue:          { fontSize: 15, fontWeight: '700', color: '#2C3E50', marginTop: 2 },
  slotsTitle:                 { fontSize: 14, fontWeight: '700', color: '#555', marginBottom: 10 },
  noSlotsText:                { fontSize: 13, color: '#AAA', fontStyle: 'italic' },
  dateSlotRow:                { marginBottom: 12 },
  dateSlotDate:               { fontSize: 13, fontWeight: '700', color: '#2C3E50', marginBottom: 6 },
  slotPills:                  { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  slotPill:                   { backgroundColor: '#EEF0FF', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  slotPillText:               { fontSize: 12, color: PURPLE, fontWeight: '600' },
  editScheduleBtn:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, borderColor: PURPLE },
  editScheduleBtnText:        { fontSize: 14, fontWeight: '600', color: PURPLE },
});
