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
  TextInput,
  useColorScheme,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { appointmentAPI } from '../../services/api';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

const lightTheme = {
  headerBg: '#6B7FED',
  screenBg: '#EEF0FB',
  cardBg: '#FFFFFF',
  accent: '#6B7FED',
  accentLight: '#E8F0FE',
  textPrimary: '#1A1F36',
  textSecondary: '#666',
  textMuted: '#999',
  border: '#E8E8F0',
  success: '#4CAF50',
  chipBg: 'rgba(255,255,255,0.2)',
  chipText: '#FFFFFF',
  searchBg: 'rgba(255,255,255,0.2)',
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
  success: '#66BB6A',
  chipBg: 'rgba(255,255,255,0.15)',
  chipText: '#FFFFFF',
  searchBg: 'rgba(255,255,255,0.12)',
};

// Emoji map for common specializations
const CATEGORY_ICONS: Record<string, string> = {
  Cancer: '🎗️',
  Urology: '🫘',
  Cardiology: '❤️',
  Pediatrics: '👶',
  Pediatrician: '👶',
  Neurology: '🧠',
  Dermatology: '🩹',
  Orthopedics: '🦴',
  Gynecology: '👩',
  Psychiatry: '🧘',
  ENT: '👂',
  Ophthalmology: '👁️',
  Dentistry: '🦷',
  General: '🏥',
  'General Physician': '🏥',
  Surgery: '🔪',
  Radiology: '📡',
  Endocrinology: '💊',
  Gastroenterology: '🫁',
  Nephrology: '🫀',
  Pulmonology: '🌬️',
  Rheumatology: '🦵',
  Oncology: '🎗️',
  'Cancer & Heart': '❤️',
};

const getCategoryIcon = (category: string): string => {
  if (CATEGORY_ICONS[category]) return CATEGORY_ICONS[category];
  // Fuzzy match
  const lower = category.toLowerCase();
  if (lower.includes('heart') || lower.includes('cardio')) return '❤️';
  if (lower.includes('cancer') || lower.includes('onco')) return '🎗️';
  if (lower.includes('child') || lower.includes('pedia')) return '👶';
  if (lower.includes('brain') || lower.includes('neuro')) return '🧠';
  if (lower.includes('bone') || lower.includes('ortho')) return '🦴';
  if (lower.includes('skin') || lower.includes('derm')) return '🩹';
  if (lower.includes('eye') || lower.includes('ophthal')) return '👁️';
  if (lower.includes('ear') || lower.includes('ent')) return '👂';
  if (lower.includes('tooth') || lower.includes('dent')) return '🦷';
  if (lower.includes('urol')) return '🫘';
  return '🏥';
};

interface Doctor {
  _id: string;
  fullName: string;
  specialization: string;
  email: string;
  profileImage?: string;
  consultationFee?: number;
  sessionDuration?: number;
}

interface AvailableSlot {
  date: string;
  dayName: string;
  slots: string[];
  fee: number;
}

export default function BookAppointmentScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const t = isDark ? darkTheme : lightTheme;

  const userId = route.params?.userId || '507f1f77bcf86cd799439011';

  const [isLoading, setIsLoading] = useState(true);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadDoctors();
  }, []);

  // Re-filter whenever category, search, or doctors list changes
  useEffect(() => {
    filterDoctors();
  }, [selectedCategory, searchQuery, doctors]);

  const loadDoctors = async () => {
    try {
      setIsLoading(true);
      const response = await appointmentAPI.getAllDoctorsWithAvailability();

      if (response.data && response.data.success) {
        const doctorsData: Doctor[] = response.data.data
          .filter((item: any) => item.doctorId) // skip items with no doctor ref
          .map((item: any) => {
            const raw = item.doctorId.doctorProfile?.specialization || 'General';
            const specialization = raw.trim().split(" ").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
            return {
              _id: item.doctorId._id,
              fullName: item.doctorId.fullName || 'Unknown Doctor',
              specialization,
              email: item.doctorId.email || '',
              profileImage: item.doctorId.profileImage,
              consultationFee: item.consultationFee,
              sessionDuration: item.sessionDuration,
            };
          });

        setDoctors(doctorsData);

        // Build unique specialization categories (already normalized)
        const uniqueSpecs = Array.from(
          new Set(doctorsData.map((d) => d.specialization).filter(Boolean))
        ).sort();

        setCategories(['All', ...uniqueSpecs]);
      }
    } catch (error: any) {
      console.error('Load doctors error:', error);
      Alert.alert('Error', error.message || 'Failed to load doctors');
    } finally {
      setIsLoading(false);
    }
  };

  const filterDoctors = () => {
    let filtered = [...doctors];

    // Filter by specialization category (from doctor's signup data)
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(
        (d) => d.specialization === selectedCategory
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          (d.fullName ?? '').toLowerCase().includes(q) ||
          (d.specialization ?? '').toLowerCase().includes(q)
      );
    }

    setFilteredDoctors(filtered);
  };

  const handleDoctorPress = (doctor: Doctor) => {
    // Navigate to the appointment detail/booking screen (to be built separately)
    navigation.navigate('DoctorAppointmentDetail', { doctor, userId });
  };

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: t.screenBg }]}>
        <StatusBar barStyle="light-content" />
        <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: t.headerBg }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Book Appointment</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={t.accent} />
          <Text style={[styles.loadingText, { color: t.textSecondary }]}>Loading doctors...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: t.screenBg }]}>
      <StatusBar barStyle="light-content" />

      {/* ── Curved Blue Header ── */}
      <View style={[styles.headerSection, { paddingTop: insets.top, backgroundColor: t.headerBg }]}>
        {/* Top row */}
        <View style={styles.headerTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greetingTitle}>Hey,</Text>
            <Text style={styles.greetingSubtitle}>Find your favorite doctor!</Text>
          </View>
          <TouchableOpacity style={styles.notifBtn}>
            <MaterialIcons name="notifications" size={26} color="#FFFFFF" />
            <View style={styles.notifDot} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchBar, { backgroundColor: t.searchBg }]}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search doctor"
            placeholderTextColor="rgba(255,255,255,0.7)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <View style={styles.searchIconBox}>
            <MaterialIcons name="search" size={22} color={t.headerBg} />
          </View>
        </View>

        {/* Categories Row */}
        <View style={styles.categoriesHeader}>
          <Text style={styles.categoriesLabel}>Categories</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          {categories
            .filter((c) => c !== 'All')
            .map((category, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.categoryChip,
                  { backgroundColor: selectedCategory === category ? '#FFFFFF' : t.chipBg },
                ]}
                onPress={() =>
                  setSelectedCategory(selectedCategory === category ? 'All' : category)
                }
              >
                <Text style={styles.categoryEmoji}>{getCategoryIcon(category)}</Text>
                <Text
                  style={[
                    styles.categoryText,
                    { color: selectedCategory === category ? t.headerBg : '#FFFFFF' },
                  ]}
                  numberOfLines={1}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
        </ScrollView>
      </View>

      {/* ── Doctor List ── */}
      <ScrollView
        style={styles.listScroll}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.listHeader}>
          <Text style={[styles.topDoctorTitle, { color: t.textPrimary }]}>Top Doctor</Text>
          <TouchableOpacity onPress={() => setSelectedCategory('All')}>
            <Text style={[styles.seeAllDark, { color: t.accent }]}>See All</Text>
          </TouchableOpacity>
        </View>

        {filteredDoctors.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="person-off" size={60} color={t.textMuted} />
            <Text style={[styles.emptyText, { color: t.textSecondary }]}>No doctors found</Text>
            <Text style={[styles.emptySubtext, { color: t.textMuted }]}>
              Try adjusting your search or category
            </Text>
          </View>
        ) : (
          filteredDoctors.map((doctor) => (
            <TouchableOpacity
              key={doctor._id}
              style={[styles.doctorCard, { backgroundColor: t.cardBg, borderColor: t.border }]}
              onPress={() => handleDoctorPress(doctor)}
              activeOpacity={0.85}
            >
              {/* Avatar */}
              <View style={[styles.avatarContainer, { backgroundColor: t.accentLight }]}>
                {doctor.profileImage ? (
                  <Text style={[styles.avatarInitials, { color: t.accent }]}>
                    {getInitials(doctor.fullName)}
                  </Text>
                ) : (
                  <Text style={styles.avatarEmoji}>
                    {getCategoryIcon(doctor.specialization)}
                  </Text>
                )}
              </View>

              {/* Info */}
              <View style={styles.doctorInfo}>
                <Text style={[styles.doctorName, { color: t.textPrimary }]} numberOfLines={1}>
                  {doctor.fullName}
                </Text>
                <Text style={[styles.doctorSpec, { color: t.textSecondary }]} numberOfLines={1}>
                  {doctor.specialization}
                </Text>
              </View>

              {/* Arrow */}
              <MaterialIcons name="chevron-right" size={22} color={t.textMuted} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const HEADER_CURVE = 32;

const styles = StyleSheet.create({
  container: { flex: 1 },

  // ── Header ──
  headerSection: {
    borderBottomLeftRadius: HEADER_CURVE,
    borderBottomRightRadius: HEADER_CURVE,
    paddingHorizontal: 22,
    paddingBottom: 0,
    elevation: 8,
    shadowColor: '#4A5BC9',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 14,
    marginBottom: 18,
  },
  greetingTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  greetingSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.82)',
    marginTop: 2,
    fontWeight: '400',
  },
  notifBtn: {
    marginTop: 4,
    position: 'relative',
  },
  notifDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#FF4444',
    position: 'absolute',
    top: 0,
    right: 0,
    borderWidth: 1.5,
    borderColor: '#6B7FED',
  },

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingLeft: 18,
    paddingRight: 6,
    height: 52,
    marginBottom: 22,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '400',
  },
  searchIconBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Categories
  categoriesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  categoriesLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  seeAll: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  categoriesScroll: {},
  categoryChip: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginRight: 12,
    alignItems: 'center',
    minWidth: 90,
  },
  categoryEmoji: {
    fontSize: 26,
    marginBottom: 6,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },

  // ── Doctor List ──
  listScroll: { flex: 1 },
  listContent: { paddingHorizontal: 20, paddingTop: 24 },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  topDoctorTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  seeAllDark: {
    fontSize: 14,
    fontWeight: '600',
  },

  doctorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarEmoji: {
    fontSize: 30,
  },
  avatarInitials: {
    fontSize: 22,
    fontWeight: '800',
  },
  doctorInfo: { flex: 1 },
  doctorName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  doctorSpec: {
    fontSize: 13,
    fontWeight: '400',
  },

  // ── Misc ──
  header: {
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  placeholder: { width: 24 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 15 },
  emptyContainer: {
    paddingTop: 60,
    alignItems: 'center',
  },
  emptyText: { fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptySubtext: { fontSize: 13, marginTop: 8, textAlign: 'center', paddingHorizontal: 40 },
});