import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  useColorScheme,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { appointmentAPI, bookedAppointmentAPI } from '../../services/api';

const { width } = Dimensions.get('window');

const lightTheme = {
  headerBg: '#6B7FED',
  screenBg: '#F0F2FF',
  cardBg: '#FFFFFF',
  accent: '#6B7FED',
  accentLight: '#E8ECFF',
  textPrimary: '#1A1F36',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  success: '#10B981',
  slotUnselectedBg: '#FFFFFF',
  slotUnselectedBorder: '#E5E7EB',
  slotUnselectedText: '#374151',
};

const darkTheme = {
  headerBg: '#3D4A8F',
  screenBg: '#0F1117',
  cardBg: '#1C1F2A',
  accent: '#8B9FFF',
  accentLight: '#1E2340',
  textPrimary: '#F0F4FF',
  textSecondary: '#A0A8C0',
  textMuted: '#6B7280',
  border: '#2E3245',
  success: '#34D399',
  slotUnselectedBg: '#1C1F2A',
  slotUnselectedBorder: '#2E3245',
  slotUnselectedText: '#D1D5DB',
};

interface Doctor {
  _id: string;
  fullName: string;
  specialization: string;
  email: string;
  profileImage?: string;
  consultationFee?: number;
  sessionDuration?: number;
  avgRating?: number;
  ratingCount?: number;
}

interface DaySlot {
  date: string;
  dayName: string;
  slots: string[];
  fee: number;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const formatTime12h = (time: string): string => {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour.toString().padStart(2, '0')}.${m.toString().padStart(2, '0')} ${period}`;
};

const getCategoryEmoji = (specialization: string): string => {
  const s = (specialization || '').toLowerCase();
  if (s.includes('cardio') || s.includes('heart')) return '❤️';
  if (s.includes('cancer') || s.includes('onco')) return '🎗️';
  if (s.includes('pedia') || s.includes('child')) return '👶';
  if (s.includes('neuro') || s.includes('brain')) return '🧠';
  if (s.includes('ortho') || s.includes('bone')) return '🦴';
  if (s.includes('derm') || s.includes('skin')) return '🩹';
  if (s.includes('urol')) return '🫘';
  if (s.includes('eye') || s.includes('ophthal')) return '👁️';
  if (s.includes('dent')) return '🦷';
  return '🏥';
};

export default function DoctorAppointmentDetailScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const t = isDark ? darkTheme : lightTheme;

  const { doctor, userId } = route.params;

  const [isLoading, setIsLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  const [availableDays, setAvailableDays] = useState<DaySlot[]>([]);
  const [sessionDuration, setSessionDuration] = useState(30);
  const [consultationFee, setConsultationFee] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [healthConcern, setHealthConcern] = useState('');
  const [showAllSlots, setShowAllSlots] = useState(false);

  useEffect(() => {
    loadSlots();
  }, []);

  const loadSlots = async () => {
    try {
      setIsLoading(true);
      const today = new Date();
      const endDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

      const response = await appointmentAPI.getAvailableSlots(
        doctor._id,
        formatDate(today),
        formatDate(endDate),
      );

      if (response.data && response.data.success) {
        const data = response.data.data;
        setAvailableDays(data.availableSlots || []);
        setSessionDuration(data.sessionDuration || 30);
        setConsultationFee(data.consultationFee || 0);

        if (data.availableSlots?.length > 0) {
          setSelectedDate(data.availableSlots[0].date);
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load available slots');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const now = new Date();
  const todayStr = formatDate(now);
  const rawSelectedSlots = availableDays.find((d) => d.date === selectedDate)?.slots || [];
  const selectedDaySlots = selectedDate === todayStr
    ? rawSelectedSlots.filter((time) => {
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m > now.getHours() * 60 + now.getMinutes();
      })
    : rawSelectedSlots;

  const handleBooking = async () => {
    if (!selectedDate || !selectedSlot) {
      Alert.alert('Incomplete', 'Please select a date and time slot.');
      return;
    }
    if (!healthConcern.trim()) {
      Alert.alert('Incomplete', 'Please describe your health concern.');
      return;
    }

    const d = new Date(selectedDate + 'T00:00:00');
    const day = DAYS[d.getDay()];
    const month = MONTHS[d.getMonth()];
    const date = d.getDate();

    Alert.alert(
      'Confirm Booking',
      `${doctor.fullName}\n${day}, ${month} ${date}\n${formatTime12h(selectedSlot)}\nDuration: ${sessionDuration} min\nFee: PKR ${consultationFee}\nConcern: ${healthConcern}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              setIsBooking(true);
              await bookedAppointmentAPI.book({
                userId,
                doctorId: doctor._id,
                date: selectedDate!,
                time: selectedSlot!,
                sessionDuration,
                consultationFee,
                healthConcern,
              });
              Alert.alert('Booked! 🎉', 'Your appointment request has been sent to the doctor.', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (e: any) {
              const errData = e.response?.data;
              const conflict =
                typeof errData === 'object' && errData?.code === 'PENDING_APPOINTMENT_EXISTS'
                  ? errData
                  : null;

              if (conflict) {
                const statusLabel =
                  conflict.status === 'pending'
                    ? 'waiting for doctor confirmation'
                    : 'confirmed but payment pending';

                Alert.alert(
                  'Active Appointment Exists',
                  `You already have an appointment with this doctor (${statusLabel}).\n\nCancel it to book a new slot, or wait for it to proceed.`,
                  [
                    { text: 'Wait', style: 'cancel' },
                    {
                      text: 'Cancel My Appointment',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          await bookedAppointmentAPI.cancel(
                            conflict.appointmentId,
                            'User cancelled to book a new slot',
                          );
                          // Reload slots so the freed slot appears
                          await loadSlots();
                          Alert.alert(
                            'Cancelled',
                            'Your previous appointment was cancelled. You can now book a new slot.',
                          );
                        } catch {
                          Alert.alert('Error', 'Could not cancel appointment. Please try again.');
                        }
                      },
                    },
                  ],
                );
              } else {
                Alert.alert('Error', typeof e.response?.data?.message === 'string' ? e.response.data.message : e.message || 'Booking failed');
              }
            } finally {
              setIsBooking(false);
            }
          },
        },
      ],
    );
  };

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { backgroundColor: t.screenBg }]}>
        <StatusBar barStyle="light-content" />

        {/* ── Header ── */}
        <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: t.headerBg }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
            <MaterialIcons name="arrow-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Make Appointment</Text>
          <View style={styles.headerBtn} />
        </View>

        {/* ── Doctor Card ── */}
        <View style={[styles.doctorCard, { backgroundColor: t.cardBg }]}>
          <View style={[styles.doctorAvatar, { backgroundColor: t.accentLight }]}>
            {doctor.profileImage ? (
              <Image source={{ uri: doctor.profileImage }} style={styles.avatarImage} />
            ) : (
              <Text style={[styles.avatarInitials, { color: t.accent }]}>
                {getInitials(doctor.fullName)}
              </Text>
            )}
          </View>
          <View style={styles.doctorInfo}>
            <Text style={[styles.doctorName, { color: t.textPrimary }]}>
              {doctor.fullName.charAt(0).toUpperCase() + doctor.fullName.slice(1)}
            </Text>
            <Text style={[styles.doctorSpec, { color: t.textSecondary }]}>{doctor.specialization}</Text>
            <View style={styles.doctorMeta}>
              <View style={styles.metaItem}>
                <MaterialIcons name="access-time" size={13} color={t.success} />
                <Text style={[styles.metaText, { color: t.textSecondary }]}>{sessionDuration} min</Text>
              </View>
              <View style={styles.metaItem}>
                <MaterialIcons name="payments" size={13} color={t.accent} />
                <Text style={[styles.metaText, { color: t.textSecondary }]}>PKR {consultationFee}</Text>
              </View>
              {(doctor.ratingCount ?? 0) > 0 && (
                <View style={styles.ratingChip}>
                  <MaterialIcons name="star" size={13} color="#F6A623" />
                  <Text style={styles.ratingChipText}>{(doctor.avgRating ?? 0).toFixed(1)}</Text>
                  <Text style={styles.ratingChipCount}>({doctor.ratingCount})</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={t.accent} />
            <Text style={[styles.loadingText, { color: t.textSecondary }]}>
              Loading availability...
            </Text>
          </View>
        ) : availableDays.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="event-busy" size={70} color={t.textMuted} />
            <Text style={[styles.emptyTitle, { color: t.textPrimary }]}>No Availability</Text>
            <Text style={[styles.emptySubtitle, { color: t.textSecondary }]}>
              This doctor hasn't set any upcoming slots.
            </Text>
            <TouchableOpacity
              style={[styles.backBtn, { backgroundColor: t.accent }]}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backBtnText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 + insets.bottom }]}
              showsVerticalScrollIndicator={false}
            >
              {/* ── Select Date ── */}
              <Text style={[styles.sectionTitle, { color: t.textPrimary }]}>Select Date</Text>
              <View style={[styles.calendarCard, { backgroundColor: t.cardBg }]}>
                <CalendarStrip
                  availableDays={availableDays}
                  selectedDate={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    setSelectedSlot(null);
                    setShowAllSlots(false);
                  }}
                  t={t}
                />
              </View>

              {/* ── Time Duration Info ── */}
              <View style={[styles.durationCard, { backgroundColor: t.cardBg, borderColor: t.border }]}>
                <MaterialIcons name="timer" size={18} color={t.accent} />
                <Text style={[styles.durationText, { color: t.textPrimary }]}>
                  Time Duration of Consultation
                </Text>
                <View style={[styles.durationBadge, { backgroundColor: t.accentLight }]}>
                  <Text style={[styles.durationBadgeText, { color: t.accent }]}>
                    {sessionDuration} min
                  </Text>
                </View>
              </View>

              {/* ── Pick Time ── */}
              {selectedDate && (
                <>
                  <Text style={[styles.sectionTitle, { color: t.textPrimary }]}>Pick Time</Text>
                  {selectedDaySlots.length === 0 ? (
                    <Text style={[styles.noSlotsText, { color: t.textMuted }]}>
                      No slots available for this date.
                    </Text>
                  ) : (
                    <>
                      <View style={styles.slotsGrid}>
                        {(showAllSlots ? selectedDaySlots : selectedDaySlots.slice(0, 6)).map((time, i) => {
                          const isSelected = selectedSlot === time;
                          return (
                            <TouchableOpacity
                              key={i}
                              style={[
                                styles.slotChip,
                                {
                                  backgroundColor: isSelected ? t.accent : t.slotUnselectedBg,
                                  borderColor: isSelected ? t.accent : t.slotUnselectedBorder,
                                },
                              ]}
                              onPress={() => setSelectedSlot(time)}
                              activeOpacity={0.8}
                            >
                              <Text
                                style={[
                                  styles.slotText,
                                  { color: isSelected ? '#FFFFFF' : t.slotUnselectedText },
                                ]}
                              >
                                {formatTime12h(time)}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                      {selectedDaySlots.length > 6 && (
                        <TouchableOpacity
                          style={styles.seeMoreBtn}
                          onPress={() => setShowAllSlots(v => !v)}
                        >
                          <Text style={[styles.seeMoreText, { color: t.accent }]}>
                            {showAllSlots
                              ? 'Show less'
                              : `See more (${selectedDaySlots.length - 6} more slots)`}
                          </Text>
                          <MaterialIcons
                            name={showAllSlots ? 'expand-less' : 'expand-more'}
                            size={18}
                            color={t.accent}
                          />
                        </TouchableOpacity>
                      )}
                    </>
                  )}
                </>
              )}

              {/* ── Health Concern ── */}
              <Text style={[styles.sectionTitle, { color: t.textPrimary }]}>
                Tell us about your health concern
              </Text>
              <View style={[styles.concernCard, { backgroundColor: t.cardBg, borderColor: t.border }]}>
                <TextInput
                  style={[styles.concernInput, { color: t.textPrimary }]}
                  placeholder="Describe your symptoms or reason for visit..."
                  placeholderTextColor={t.textMuted}
                  value={healthConcern}
                  onChangeText={setHealthConcern}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

            </ScrollView>

            {/* ── Booking Button ── */}
            <View
              style={[
                styles.bookingFooter,
                { backgroundColor: t.screenBg, paddingBottom: insets.bottom + 16 },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.bookingBtn,
                  { backgroundColor: t.accent },
                  (!selectedDate || !selectedSlot || !healthConcern.trim()) && { opacity: 0.5 },
                ]}
                onPress={handleBooking}
                disabled={!selectedDate || !selectedSlot || !healthConcern.trim() || isBooking}
                activeOpacity={0.85}
              >
                {isBooking ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.bookingBtnText}>Booking</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Calendar Strip Component ──
function CalendarStrip({
  availableDays,
  selectedDate,
  onSelect,
  t,
}: {
  availableDays: DaySlot[];
  selectedDate: string | null;
  onSelect: (date: string) => void;
  t: typeof lightTheme;
}) {
  const availableDates = new Set(availableDays.map((d) => d.date));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sortedDates = [...availableDays].sort((a, b) => a.date.localeCompare(b.date));
  const startRef = sortedDates.length > 0 ? new Date(sortedDates[0].date + 'T00:00:00') : today;
  const lastDate = sortedDates.length > 0
    ? new Date(sortedDates[sortedDates.length - 1].date + 'T00:00:00')
    : today;

  const totalDays = Math.max(
    7,
    Math.ceil((lastDate.getTime() - startRef.getTime()) / (1000 * 60 * 60 * 24)) + 1,
  );

  const weekStart = new Date(startRef);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  const days: Date[] = [];
  for (let i = 0; i < Math.ceil(totalDays / 7) * 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    days.push(d);
  }

  const formatKey = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const cellWidth = (width - 40 - 32) / 7;

  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <View>
      <View style={cs.dayHeaderRow}>
        {DAYS_SHORT.map((d) => (
          <Text key={d} style={[cs.dayHeader, { color: t.textMuted, width: cellWidth }]}>{d}</Text>
        ))}
      </View>
      {weeks.map((week, wi) => (
        <View key={wi} style={cs.weekRow}>
          {week.map((day, di) => {
            const key = formatKey(day);
            const isAvailable = availableDates.has(key);
            const isSelected = selectedDate === key;
            const isPast = day < today;

            return (
              <TouchableOpacity
                key={di}
                style={[
                  cs.dayCell,
                  { width: cellWidth, height: cellWidth },
                  isSelected && { backgroundColor: t.accent, borderRadius: cellWidth / 2 },
                ]}
                onPress={() => isAvailable && !isPast && onSelect(key)}
                disabled={!isAvailable || isPast}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    cs.dayCellText,
                    {
                      color: isSelected
                        ? '#FFFFFF'
                        : isAvailable && !isPast
                        ? t.textPrimary
                        : t.textMuted,
                      fontWeight: isAvailable && !isPast ? '700' : '400',
                    },
                  ]}
                >
                  {day.getDate()}
                </Text>
                {isAvailable && !isPast && !isSelected && (
                  <View style={[cs.availableDot, { backgroundColor: t.accent }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const cs = StyleSheet.create({
  dayHeaderRow: { flexDirection: 'row', marginBottom: 4 },
  dayHeader: { textAlign: 'center', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  weekRow: { flexDirection: 'row', marginBottom: 2 },
  dayCell: { justifyContent: 'center', alignItems: 'center' },
  dayCellText: { fontSize: 15 },
  availableDot: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 50,
  },
  headerBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.3 },
  doctorCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 20, marginTop: -30,
    borderRadius: 20, padding: 16, elevation: 8,
    shadowColor: '#6B7FED', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18, shadowRadius: 16, zIndex: 10,
  },
  doctorAvatar: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', marginRight: 14, overflow: 'hidden' },
  avatarEmoji: { fontSize: 34 },
  avatarInitials: { fontSize: 26, fontWeight: '800' },
  avatarImage: { width: 70, height: 70, borderRadius: 35 },
  seeMoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, marginTop: 4 },
  seeMoreText: { fontSize: 13, fontWeight: '700' },
  doctorInfo: { flex: 1 },
  doctorName: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3, marginBottom: 2 },
  doctorSpec: { fontSize: 13, fontWeight: '500', marginBottom: 8 },
  doctorMeta: { flexDirection: 'row', gap: 14 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, fontWeight: '500' },
  ratingChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FFF8E7', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  ratingChipText: { fontSize: 12, fontWeight: '700', color: '#B07D00' },
  ratingChipCount: { fontSize: 11, color: '#C89600' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '800', marginBottom: 14, letterSpacing: -0.3 },
  calendarCard: {
    borderRadius: 16, padding: 16, marginBottom: 20,
    elevation: 2, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8,
  },
  durationCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 24,
  },
  durationText: { flex: 1, fontSize: 14, fontWeight: '600' },
  durationBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  durationBadgeText: { fontSize: 13, fontWeight: '700' },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  slotChip: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: 12, borderWidth: 1.5 },
  slotText: { fontSize: 14, fontWeight: '600' },
  noSlotsText: { fontSize: 14, textAlign: 'center', marginTop: 10, marginBottom: 20 },
  concernCard: {
    borderRadius: 16, borderWidth: 1.5, padding: 14, marginBottom: 24,
    elevation: 2, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8,
  },
  concernInput: { fontSize: 14, lineHeight: 22, minHeight: 100, fontWeight: '400' },
  bookingFooter: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingTop: 12,
    elevation: 12, shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12,
  },
  bookingBtn: {
    borderRadius: 16, paddingVertical: 18, alignItems: 'center', justifyContent: 'center',
    elevation: 4, shadowColor: '#6B7FED',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10,
  },
  bookingBtnText: { fontSize: 17, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.3 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 15 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '800', marginTop: 16 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', marginTop: 8 },
  backBtn: { marginTop: 24, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 25 },
  backBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});