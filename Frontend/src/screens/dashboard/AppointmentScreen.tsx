// ─────────────────────────────────────────────────────────────────────────────
//  AppointmentScreen.tsx
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, StatusBar, TouchableOpacity,
  ScrollView, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { bookedAppointmentAPI, chatAPI } from '../../services/api';

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

export default function AppointmentScreen({ id, role }: AppointmentScreenProps) {
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [appointments,  setAppointments]  = useState<Appointment[]>([]);
  const [isLoading,     setIsLoading]     = useState(true);
  const [isRefreshing,  setIsRefreshing]  = useState(false);
  const [chatLoadingId, setChatLoadingId] = useState<string | null>(null);
  const [,              setNow]           = useState(new Date());

  // ✅ Cache conversation IDs so we don't re-fetch on every button press
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

  // ── Continue Session → Chat ────────────────────────────────────────────────
  const handleContinueSession = async (appointment: Appointment) => {
    const doctorId      = appointment.doctorId?._id   || appointment.doctorId;
    const patientId     = appointment.userId?._id     || appointment.userId;
    const doctorName    = appointment.doctorId?.fullName  || 'Doctor';
    const patientName   = appointment.userId?.fullName    || 'Patient';
    const doctorAvatar  = appointment.doctorId?.profilePicture || undefined;
    const patientAvatar = appointment.userId?.profilePicture   || undefined;
    const specialty     = appointment.doctorId?.doctorProfile?.specialization || '';

    // ✅ Use cached conversationId if available — avoid repeated API calls
    const cacheKey = `${doctorId}_${patientId}`;
    let conversationId = convCache.current[cacheKey];

    if (!conversationId) {
      setChatLoadingId(appointment._id);
      try {
        const res = await chatAPI.getOrCreateConversation(doctorId, patientId);
        conversationId = res.data?._id || res.data?.conversationId;
        if (conversationId) {
          convCache.current[cacheKey] = conversationId; // ✅ cache it
        }
      } catch (err) {
        console.error('getOrCreateConversation error:', err);
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
      });
    } else {
      navigation.navigate('PatientChat', {
        doctorId, doctorName, doctorAvatar, doctorSpecialty: specialty, conversationId,
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

  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#6B7FED" />
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <Text style={styles.headerTitle}>Appointments</Text>
          <TouchableOpacity style={styles.notificationButton}>
            <MaterialIcons name="notifications" size={24} color="#FFFFFF" />
          </TouchableOpacity>
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

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.headerTitle}>Appointments</Text>
        <TouchableOpacity style={styles.notificationButton}>
          <MaterialIcons name="notifications" size={24} color="#FFFFFF" />
        </TouchableOpacity>
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
            const canStartSession   = item.status === 'confirmed' && timeReached;
            const showSessionBtn    = item.status === 'confirmed' || item.status === 'pending';
            const isThisChatLoading = chatLoadingId === item._id;

            return (
              <View key={item._id} style={styles.card}>
                <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                  <Text style={[styles.statusText, { color: statusColors.text }]}>
                    {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                  </Text>
                </View>

                <Text style={styles.label}>
                  Patient: <Text style={styles.value}>{getPatientName(item)}</Text>
                </Text>
                <Text style={styles.label}>
                  Doctor:{' '}
                  <Text style={styles.value}>
                    {getDoctorName(item)}
                    {getSpecialization(item) ? ` · ${getSpecialization(item)}` : ''}
                  </Text>
                </Text>
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

                {showSessionBtn && (
                  <TouchableOpacity
                    style={[
                      styles.continueButton,
                      !canStartSession && styles.continueButtonDisabled,
                    ]}
                    onPress={() => canStartSession && handleContinueSession(item)}
                    disabled={!canStartSession || isThisChatLoading}
                    activeOpacity={canStartSession ? 0.8 : 1}
                  >
                    {isThisChatLoading ? (
                      <ActivityIndicator size="small" color="#6B7FED" />
                    ) : (
                      <>
                        {canStartSession && (
                          <MaterialIcons name="chat" size={18} color="#FFFFFF" />
                        )}
                        <Text style={[
                          styles.continueButtonText,
                          !canStartSession && styles.continueButtonTextDisabled,
                        ]}>
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
  container:           { flex: 1, backgroundColor: '#F5F5F5' },
  header:              { backgroundColor: '#6B7FED', paddingBottom: 15, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle:         { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  notificationButton:  { padding: 5 },
  content:             { padding: 20 },
  loadingContainer:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText:         { marginTop: 12, fontSize: 15, color: '#666' },
  emptyContainer:      { alignItems: 'center', paddingTop: 60, paddingBottom: 30 },
  emptyTitle:          { fontSize: 18, fontWeight: '700', color: '#333', marginTop: 16 },
  emptySubtitle:       { fontSize: 13, color: '#888', textAlign: 'center', marginTop: 8, paddingHorizontal: 30 },
  card:                { backgroundColor: '#FFFFFF', borderRadius: 15, padding: 15, marginBottom: 20, elevation: 3, borderWidth: 1.5, borderColor: '#6B7FED' },
  label:               { fontSize: 14, color: '#555', marginBottom: 6 },
  value:               { fontWeight: '600', color: '#2C3E50' },
  statusBadge:         { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginBottom: 10 },
  statusText:          { fontSize: 12, fontWeight: '700' },
  concernContainer:    { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#F0F2FF', borderRadius: 10, padding: 10, marginTop: 4, marginBottom: 4, flexWrap: 'wrap' },
  concernLabel:        { fontSize: 13, fontWeight: '600', color: '#6B7FED' },
  concernText:         { fontSize: 13, color: '#444', flex: 1 },
  continueButton:      { backgroundColor: '#6B7FED', paddingVertical: 11, borderRadius: 20, alignItems: 'center', marginTop: 12, flexDirection: 'row', justifyContent: 'center', gap: 8 },
  continueButtonDisabled:     { backgroundColor: '#E8E8E8', borderWidth: 1, borderColor: '#DDD' },
  continueButtonText:         { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  continueButtonTextDisabled: { color: '#AAAAAA' },
  bookButton:    { backgroundColor: '#6B7FED', paddingVertical: 15, borderRadius: 30, alignItems: 'center', marginTop: 10, flexDirection: 'row', justifyContent: 'center', gap: 10, shadowColor: '#6B7FED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  bookButtonText:  { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  createButton:  { backgroundColor: '#4CAF50', paddingVertical: 15, borderRadius: 30, alignItems: 'center', marginTop: 10, flexDirection: 'row', justifyContent: 'center', gap: 10, shadowColor: '#4CAF50', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  createButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
