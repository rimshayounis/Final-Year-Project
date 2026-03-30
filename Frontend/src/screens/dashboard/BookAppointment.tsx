import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, StatusBar, TextInput, Image,
  Modal, Animated, KeyboardAvoidingView, Platform, useColorScheme, Dimensions,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import apiClient, { appointmentAPI, API_URL } from '../../services/api';

const { width } = Dimensions.get('window');

const lightTheme = {
  headerBg:      '#6B7FED',
  screenBg:      '#EEF0FB',
  cardBg:        '#FFFFFF',
  accent:        '#6B7FED',
  accentLight:   '#E8F0FE',
  textPrimary:   '#1A1F36',
  textSecondary: '#666',
  textMuted:     '#999',
  border:        '#E8E8F0',
  chipBg:        'rgba(255,255,255,0.2)',
};

const darkTheme = {
  headerBg:      '#3D4A8F',
  screenBg:      '#0F1117',
  cardBg:        '#1C1F2A',
  accent:        '#8B9FFF',
  accentLight:   '#1E2340',
  textPrimary:   '#F0F4FF',
  textSecondary: '#A0A8C0',
  textMuted:     '#6B7280',
  border:        '#2E3245',
  chipBg:        'rgba(255,255,255,0.15)',
};

const SESSION_OPTIONS = [0, 15, 20, 30, 45, 60]; // 0 = All
const TIME_PERIODS = ['All', 'Morning', 'Afternoon', 'Evening'];

// interest label → specialization keywords (case-insensitive partial match)
const INTEREST_SPEC_MAP: Record<string, string[]> = {
  'Skin Care':     ['dermatol'],
  'Hair Care':     ['dermatol', 'trichol'],
  'Weight Loss':   ['nutritio', 'dietit', 'endocrinol'],
  'Weight Gain':   ['nutritio', 'dietit'],
  'Mental Health': ['psychol', 'psychiatr'],
  'Fitness':       ['physiother', 'sports', 'orthop'],
  'Nutrition':     ['nutritio', 'dietit'],
  'Sleep Health':  ['neurol', 'general'],
};

function getMatchedKeywords(interests: string[]): string[] {
  return [...new Set(interests.flatMap((i) => INTEREST_SPEC_MAP[i] ?? []))];
}

function specializationMatches(spec: string, keywords: string[]): boolean {
  const lower = spec.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

const getTimePeriod = (slot: string): string => {
  const [hStr] = slot.split(':');
  const h = parseInt(hStr, 10);
  if (h >= 6  && h < 12) return 'Morning';
  if (h >= 12 && h < 17) return 'Afternoon';
  if (h >= 17 && h < 21) return 'Evening';
  return 'Other';
};

type SubscriptionPlan = 'free_trial' | 'basic' | 'professional' | 'premium';
const PLAN_RANK: Record<SubscriptionPlan, number> = { premium: 4, professional: 3, basic: 2, free_trial: 1 };
const isPremiumPlan = (plan?: SubscriptionPlan) => plan === 'premium';

interface MentorLevel {
  level:     number;
  title:     string;
  score:     number;
  nextScore: number | null;
}

interface Doctor {
  _id:               string;
  fullName:          string;
  specialization:    string;
  email:             string;
  profileImage?:     string;
  consultationFee?:  number;
  sessionDuration?:  number;
  subscriptionPlan?: SubscriptionPlan;
  completedCount:    number;
  avgRating?:        number;
  ratingCount?:      number;
  specificDates?:    { date: string; timeSlots: { start: string; end: string }[] }[];
  mentorLevel?:      MentorLevel;
}

interface Filters {
  minFee:      string;
  maxFee:      string;
  sessionDur:  number;   // 0 = any
  timePeriod:  string;   // 'All' | 'Morning' | 'Afternoon' | 'Evening'
}

const DEFAULT_FILTERS: Filters = { minFee: '', maxFee: '', sessionDur: 0, timePeriod: 'All' };

export default function BookAppointmentScreen() {
  const insets     = useSafeAreaInsets();
  const route      = useRoute<any>();
  const navigation = useNavigation<any>();
  const colorScheme = useColorScheme();
  const t = colorScheme === 'dark' ? darkTheme : lightTheme;

  const userId = route.params?.userId || '';

  const [isLoading,        setIsLoading]        = useState(true);
  const [doctors,          setDoctors]          = useState<Doctor[]>([]);
  const [filteredDoctors,  setFilteredDoctors]  = useState<Doctor[]>([]);
  const [categories,       setCategories]       = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery,      setSearchQuery]      = useState('');
  const [searchOpen,       setSearchOpen]       = useState(false);
  const [filterVisible,    setFilterVisible]    = useState(false);
  const [filters,          setFilters]          = useState<Filters>(DEFAULT_FILTERS);
  const [pendingFilters,   setPendingFilters]   = useState<Filters>(DEFAULT_FILTERS);
  const [matchedKeywords,  setMatchedKeywords]  = useState<string[]>([]);

  const searchWidth = useRef(new Animated.Value(0)).current;

  const openSearch = () => {
    setSearchOpen(true);
    Animated.timing(searchWidth, { toValue: width - 120, duration: 220, useNativeDriver: false }).start();
  };
  const closeSearch = () => {
    setSearchQuery('');
    Animated.timing(searchWidth, { toValue: 0, duration: 180, useNativeDriver: false }).start(() => setSearchOpen(false));
  };

  useEffect(() => { loadDoctors(); }, []);
  useEffect(() => { filterDoctors(); }, [selectedCategory, searchQuery, doctors, filters, matchedKeywords]);

  const loadDoctors = async () => {
    try {
      setIsLoading(true);

      // Fetch user interests and doctor list in parallel
      const [response, userRes] = await Promise.all([
        appointmentAPI.getAllDoctorsWithAvailability(),
        userId ? apiClient.get(`/users/${userId}`).catch(() => null) : Promise.resolve(null),
      ]);

      const interests: string[] =
        userRes?.data?.user?.healthProfile?.interests ??
        userRes?.data?.data?.healthProfile?.interests ?? [];
      const keywords = getMatchedKeywords(interests);
      setMatchedKeywords(keywords);

      if (response.data?.success) {
        const baseUrl = API_URL.replace('/api', '');
        const doctorsData: Doctor[] = await Promise.all(
          response.data.data
            .filter((item: any) => item.doctorId)
            .map(async (item: any) => {
              const raw = item.doctorId.doctorProfile?.specialization || 'General';
              const specialization = raw.trim().split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

              let profileImage: string | undefined;
              let mentorLevel: MentorLevel | undefined;

              const [profileRes, mentorRes] = await Promise.allSettled([
                apiClient.get(`/profiles/doctor/${item.doctorId._id}`),
                apiClient.get(`/points-reward/${item.doctorId._id}/mentor-level`),
              ]);

              if (profileRes.status === 'fulfilled') {
                const pd = profileRes.value.data?.data;
                if (pd?.profileImage) {
                  profileImage = pd.profileImage.startsWith('http') ? pd.profileImage : baseUrl + pd.profileImage;
                }
              }
              if (mentorRes.status === 'fulfilled') {
                mentorLevel = mentorRes.value.data?.data ?? undefined;
              }

              return {
                _id:              item.doctorId._id,
                fullName:         item.doctorId.fullName || 'Unknown Doctor',
                specialization,
                email:            item.doctorId.email || '',
                profileImage,
                consultationFee:  item.consultationFee,
                sessionDuration:  item.sessionDuration,
                subscriptionPlan: item.doctorId.subscriptionPlan as SubscriptionPlan | undefined,
                completedCount:   item.doctorId.completedCount ?? 0,
                avgRating:        item.doctorId.avgRating,
                ratingCount:      item.doctorId.ratingCount,
                specificDates:    item.specificDates,
                mentorLevel,
              };
            })
        );

        // Sort: interest-matched first, then by plan rank, then by mentor level
        doctorsData.sort((a, b) => {
          const aMatch = keywords.length > 0 && specializationMatches(a.specialization, keywords) ? 1 : 0;
          const bMatch = keywords.length > 0 && specializationMatches(b.specialization, keywords) ? 1 : 0;
          if (bMatch !== aMatch) return bMatch - aMatch;
          const planDiff = (PLAN_RANK[b.subscriptionPlan ?? 'free_trial'] ?? 1) -
                           (PLAN_RANK[a.subscriptionPlan ?? 'free_trial'] ?? 1);
          if (planDiff !== 0) return planDiff;
          return (b.mentorLevel?.level ?? 0) - (a.mentorLevel?.level ?? 0);
        });

        setDoctors(doctorsData);
        const specs = Array.from(new Set(doctorsData.map(d => d.specialization).filter(Boolean))).sort();
        setCategories(['All', ...specs]);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to load doctors');
    } finally {
      setIsLoading(false);
    }
  };

  const filterDoctors = () => {
    let list = [...doctors];

    // Category filter
    if (selectedCategory !== 'All') list = list.filter(d => d.specialization === selectedCategory);

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(d => d.fullName.toLowerCase().includes(q) || d.specialization.toLowerCase().includes(q));
    }

    // Min fee
    if (filters.minFee !== '') list = list.filter(d => (d.consultationFee ?? 0) >= parseInt(filters.minFee, 10));
    // Max fee
    if (filters.maxFee !== '') list = list.filter(d => (d.consultationFee ?? Infinity) <= parseInt(filters.maxFee, 10));
    // Session duration
    if (filters.sessionDur > 0) list = list.filter(d => d.sessionDuration === filters.sessionDur);
    // Time period
    if (filters.timePeriod !== 'All') {
      list = list.filter(d => {
        const slots = (d.specificDates ?? []).flatMap(sd => sd.timeSlots.map(ts => ts.start));
        return slots.some(s => getTimePeriod(s) === filters.timePeriod);
      });
    }

    setFilteredDoctors(list);
  };

  const applyFilters = () => { setFilters(pendingFilters); setFilterVisible(false); };
  const resetFilters = () => { setPendingFilters(DEFAULT_FILTERS); setFilters(DEFAULT_FILTERS); setFilterVisible(false); };

  const hasActiveFilters = filters.minFee !== '' || filters.maxFee !== '' || filters.sessionDur > 0 || filters.timePeriod !== 'All';

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const handleBookPress = (doctor: Doctor) =>
    navigation.navigate('DoctorAppointmentDetail', { doctor, userId });

  const handleProfilePress = (doctor: Doctor) =>
    navigation.navigate('DoctorProfileView', { doctorId: doctor._id, userId });

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: t.screenBg }]}>
        <StatusBar barStyle="light-content" />
        <View style={[styles.simpleHeader, { paddingTop: insets.top + 10, backgroundColor: t.headerBg }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.simpleHeaderTitle}>Book Appointment</Text>
          <View style={{ width: 24 }} />
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

      {/* ── Blue Header ── */}
      <View style={[styles.headerSection, { paddingTop: insets.top + 6, backgroundColor: t.headerBg }]}>
        {/* Top row: back | [subtitle OR search input] | search-icon | filter-icon */}
        <View style={styles.headerTopRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <MaterialIcons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>

          {/* Middle: subtitle or inline search */}
          {searchOpen ? (
            <View style={styles.searchInputWrap}>
              <TextInput
                autoFocus
                style={styles.searchInput}
                placeholder="Search doctor..."
                placeholderTextColor="rgba(255,255,255,0.6)"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          ) : (
            <Text style={styles.headerSubtitle}>Find your favorite doctor</Text>
          )}

          {/* Right icons — always visible */}
          <TouchableOpacity style={styles.iconBtn} onPress={searchOpen ? closeSearch : openSearch}>
            <MaterialIcons name={searchOpen ? 'close' : 'search'} size={24} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => { setPendingFilters(filters); setFilterVisible(true); }}>
            <MaterialIcons name="tune" size={24} color="#FFF" />
            {hasActiveFilters && <View style={styles.filterDot} />}
          </TouchableOpacity>
        </View>

        {/* Categories */}
        <View style={styles.categoriesRow}>
          <Text style={styles.categoriesLabel}>Categories</Text>
        </View>
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContent}
        >
          {categories.filter(c => c !== 'All').map((cat, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.categoryChip, { backgroundColor: selectedCategory === cat ? '#FFF' : t.chipBg }]}
              onPress={() => setSelectedCategory(selectedCategory === cat ? 'All' : cat)}
            >
              <Text style={[styles.categoryText, { color: selectedCategory === cat ? t.headerBg : '#FFF' }]}>
                {cat}
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
        <Text style={[styles.topDoctorTitle, { color: t.textPrimary }]}>
          {filteredDoctors.length} Doctor{filteredDoctors.length !== 1 ? 's' : ''} Found
        </Text>

        {filteredDoctors.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="person-off" size={60} color={t.textMuted} />
            <Text style={[styles.emptyText, { color: t.textSecondary }]}>No doctors found</Text>
            <Text style={[styles.emptySubtext, { color: t.textMuted }]}>Try adjusting filters or category</Text>
          </View>
        ) : (
          filteredDoctors.map(doctor => {
            const isPremium     = isPremiumPlan(doctor.subscriptionPlan);
            const isRecommended = doctor.completedCount >= 30;
            const isSuggested   = matchedKeywords.length > 0 && specializationMatches(doctor.specialization, matchedKeywords);
            return (
              <View key={doctor._id} style={[
                styles.doctorCard,
                { backgroundColor: t.cardBg, borderColor: isSuggested ? '#7B8CDE' : t.border, borderWidth: isSuggested ? 1.5 : 1 },
              ]}>
                {/* Badges row */}
                {(isSuggested || isRecommended) && (
                  <View style={styles.badgesRow}>
                    {isSuggested && (
                      <View style={styles.suggestedBadge}>
                        <Ionicons name="sparkles" size={11} color="#FFF" />
                        <Text style={styles.suggestedText}>Suggested for you</Text>
                      </View>
                    )}
                    {isRecommended && (
                      <View style={styles.recommendedBadge}>
                        <MaterialIcons name="verified" size={11} color="#FFF" />
                        <Text style={styles.recommendedText}>Recommended</Text>
                        <Text style={styles.recommendedCount}>{doctor.completedCount} sessions</Text>
                      </View>
                    )}
                  </View>
                )}

                <View style={styles.cardBody}>
                  {/* Avatar — click to view profile */}
                  <TouchableOpacity onPress={() => handleProfilePress(doctor)} activeOpacity={0.85} style={styles.avatarWrap}>
                    <View style={[styles.avatarContainer, { backgroundColor: t.accentLight }]}>
                      {doctor.profileImage ? (
                        <Image source={{ uri: doctor.profileImage }} style={styles.avatarImage} />
                      ) : (
                        <Text style={[styles.avatarInitials, { color: t.accent }]}>{getInitials(doctor.fullName)}</Text>
                      )}
                    </View>
                  </TouchableOpacity>

                  {/* Info — click name to view profile */}
                  <View style={styles.doctorInfo}>
                    <TouchableOpacity onPress={() => handleProfilePress(doctor)} style={styles.nameRow}>
                      <Text style={[styles.doctorName, { color: t.textPrimary }]} numberOfLines={1}>
                        {doctor.fullName}
                      </Text>
                      {/* Blue verified tick — premium only, inline with name */}
                      {isPremium && (
                        <MaterialIcons name="verified" size={15} color="#1DA1F2" style={{ marginLeft: 4 }} />
                      )}
                    </TouchableOpacity>
                    <Text style={[styles.doctorSpec, { color: t.textSecondary }]} numberOfLines={1}>
                      {doctor.specialization}
                    </Text>
                    <View style={styles.doctorMeta}>
                      {doctor.consultationFee != null && (
                        <View style={[styles.metaChip, { backgroundColor: t.accentLight }]}>
                          <MaterialIcons name="payments" size={11} color={t.accent} />
                          <Text style={[styles.metaChipText, { color: t.accent }]}>PKR {doctor.consultationFee}</Text>
                        </View>
                      )}
                      {doctor.sessionDuration != null && (
                        <View style={[styles.metaChip, { backgroundColor: t.accentLight }]}>
                          <MaterialIcons name="timer" size={11} color={t.accent} />
                          <Text style={[styles.metaChipText, { color: t.accent }]}>{doctor.sessionDuration} min</Text>
                        </View>
                      )}
                      {(doctor.ratingCount ?? 0) > 0 && (
                        <View style={[styles.metaChip, { backgroundColor: '#FFF8E7' }]}>
                          <MaterialIcons name="star" size={11} color="#F6A623" />
                          <Text style={[styles.metaChipText, { color: '#B07D00' }]}>
                            {(doctor.avgRating ?? 0).toFixed(1)}
                          </Text>
                        </View>
                      )}
                      {doctor.mentorLevel && (
                        <View style={[styles.metaChip, {
                          backgroundColor:
                            doctor.mentorLevel.level === 5 ? '#F3E5F5'
                            : doctor.mentorLevel.level === 4 ? '#FFF8E7'
                            : doctor.mentorLevel.level === 3 ? '#EEF0FB'
                            : doctor.mentorLevel.level === 2 ? '#E8F5E9'
                            : '#F5F5F5',
                        }]}>
                          <Ionicons
                            name="ribbon"
                            size={11}
                            color={
                              doctor.mentorLevel.level === 5 ? '#7B1FA2'
                              : doctor.mentorLevel.level === 4 ? '#F9A825'
                              : doctor.mentorLevel.level === 3 ? '#6B7FED'
                              : doctor.mentorLevel.level === 2 ? '#00B374'
                              : '#999'
                            }
                          />
                          <Text style={[styles.metaChipText, {
                            color:
                              doctor.mentorLevel.level === 5 ? '#7B1FA2'
                              : doctor.mentorLevel.level === 4 ? '#B07D00'
                              : doctor.mentorLevel.level === 3 ? '#6B7FED'
                              : doctor.mentorLevel.level === 2 ? '#00B374'
                              : '#999',
                          }]}>
                            Lv.{doctor.mentorLevel.level} {doctor.mentorLevel.title}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Book button */}
                  <TouchableOpacity style={styles.bookBtn} onPress={() => handleBookPress(doctor)}>
                    <Text style={styles.bookBtnText}>Book</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* ── Filter Modal ── */}
      <Modal visible={filterVisible} transparent animationType="slide" onRequestClose={() => setFilterVisible(false)}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setFilterVisible(false)} />
        <View style={[styles.filterSheet, { backgroundColor: t.cardBg }]}>
          <View style={styles.filterSheetHandle} />
          <Text style={[styles.filterTitle, { color: t.textPrimary }]}>Filter Doctors</Text>

          {/* Fee range */}
          <Text style={[styles.filterLabel, { color: t.textSecondary }]}>Consultation Fee (PKR)</Text>
          <View style={styles.feeRow}>
            <TextInput
              style={[styles.feeInput, { color: t.textPrimary, borderColor: t.border, backgroundColor: t.screenBg }]}
              placeholder="Min"
              placeholderTextColor={t.textMuted}
              keyboardType="numeric"
              value={pendingFilters.minFee}
              onChangeText={v => setPendingFilters(p => ({ ...p, minFee: v }))}
            />
            <Text style={[styles.feeSep, { color: t.textMuted }]}>—</Text>
            <TextInput
              style={[styles.feeInput, { color: t.textPrimary, borderColor: t.border, backgroundColor: t.screenBg }]}
              placeholder="Max"
              placeholderTextColor={t.textMuted}
              keyboardType="numeric"
              value={pendingFilters.maxFee}
              onChangeText={v => setPendingFilters(p => ({ ...p, maxFee: v }))}
            />
          </View>

          {/* Session duration */}
          <Text style={[styles.filterLabel, { color: t.textSecondary }]}>Session Duration</Text>
          <View style={styles.chipRow}>
            {SESSION_OPTIONS.map(d => (
              <TouchableOpacity
                key={d}
                style={[styles.filterChip, pendingFilters.sessionDur === d && styles.filterChipActive]}
                onPress={() => setPendingFilters(p => ({ ...p, sessionDur: d }))}
              >
                <Text style={[styles.filterChipText, pendingFilters.sessionDur === d && styles.filterChipTextActive]}>
                  {d === 0 ? 'Any' : `${d} min`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Time period */}
          <Text style={[styles.filterLabel, { color: t.textSecondary }]}>Time Slot</Text>
          <View style={styles.chipRow}>
            {TIME_PERIODS.map(tp => (
              <TouchableOpacity
                key={tp}
                style={[styles.filterChip, pendingFilters.timePeriod === tp && styles.filterChipActive]}
                onPress={() => setPendingFilters(p => ({ ...p, timePeriod: tp }))}
              >
                <Text style={[styles.filterChipText, pendingFilters.timePeriod === tp && styles.filterChipTextActive]}>
                  {tp}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Buttons */}
          <View style={styles.filterBtns}>
            <TouchableOpacity style={styles.resetBtn} onPress={resetFilters}>
              <Text style={styles.resetBtnText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyBtn} onPress={applyFilters}>
              <Text style={styles.applyBtnText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const HEADER_CURVE = 28;

const styles = StyleSheet.create({
  container:          { flex: 1 },
  simpleHeader:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 14 },
  simpleHeaderTitle:  { fontSize: 18, fontWeight: '700', color: '#FFF' },
  loadingContainer:   { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText:        { marginTop: 12, fontSize: 15 },

  // Header
  headerSection:      { borderBottomLeftRadius: HEADER_CURVE, borderBottomRightRadius: HEADER_CURVE, paddingHorizontal: 18, paddingBottom: 0, elevation: 8, shadowColor: '#4A5BC9', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12 },
  headerTopRow:       { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 },
  headerSubtitle:     { flex: 1, fontSize: 15, color: 'rgba(255,255,255,0.9)', fontWeight: '600', marginHorizontal: 6 },
  iconBtn:            { padding: 6 },
  searchInputWrap:    { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginHorizontal: 6 },
  searchInput:        { flex: 1, fontSize: 14, color: '#FFF', paddingVertical: 0 },
  filterDot:          { position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF4444' },

  // Categories
  categoriesRow:      { marginBottom: 10 },
  categoriesLabel:    { fontSize: 16, fontWeight: '700', color: '#FFF' },
  categoriesContent:  { paddingBottom: 16, gap: 8 },
  categoryChip:       { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  categoryText:       { fontSize: 13, fontWeight: '600' },

  // List
  listScroll:         { flex: 1 },
  listContent:        { paddingHorizontal: 18, paddingTop: 20 },
  topDoctorTitle:     { fontSize: 18, fontWeight: '800', marginBottom: 14, letterSpacing: -0.3 },

  // Doctor card
  doctorCard:         { padding: 14, borderRadius: 18, borderWidth: 1, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
  premiumCard:        { borderWidth: 1.5, elevation: 4, shadowOpacity: 0.12 },
  badgesRow:          { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  suggestedBadge:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#7B8CDE', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  suggestedText:      { fontSize: 11, fontWeight: '700', color: '#FFF' },
  recommendedBadge:   { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#16A34A', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  recommendedText:    { fontSize: 11, fontWeight: '700', color: '#FFF' },
  recommendedCount:   { fontSize: 10, fontWeight: '500', color: 'rgba(255,255,255,0.85)' },
  cardBody:           { flexDirection: 'row', alignItems: 'center' },
  avatarWrap:         { position: 'relative', marginRight: 14 },
  avatarContainer:    { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImage:        { width: 60, height: 60, borderRadius: 30 },
  avatarInitials:     { fontSize: 20, fontWeight: '800' },
  verifiedTick:       { position: 'absolute', bottom: -2, right: -2, backgroundColor: '#FFF', borderRadius: 8, width: 18, height: 18, justifyContent: 'center', alignItems: 'center' },
  nameRow:            { flexDirection: 'row', alignItems: 'center' },
  doctorInfo:         { flex: 1 },
  doctorName:         { fontSize: 15, fontWeight: '700', marginBottom: 2, letterSpacing: -0.2 },
  doctorSpec:         { fontSize: 12, fontWeight: '400', marginBottom: 6 },
  doctorMeta:         { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  metaChip:           { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10 },
  metaChipText:       { fontSize: 11, fontWeight: '600' },
  bookBtn:            { backgroundColor: '#6B7FED', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
  bookBtnText:        { color: '#FFF', fontSize: 13, fontWeight: '700' },

  emptyContainer:     { paddingTop: 60, alignItems: 'center' },
  emptyText:          { fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptySubtext:       { fontSize: 13, marginTop: 8, textAlign: 'center', paddingHorizontal: 40 },

  // Filter sheet
  modalOverlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  filterSheet:        { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, gap: 4 },
  filterSheetHandle:  { width: 40, height: 4, borderRadius: 2, backgroundColor: '#DDD', alignSelf: 'center', marginBottom: 16 },
  filterTitle:        { fontSize: 18, fontWeight: '800', marginBottom: 16 },
  filterLabel:        { fontSize: 13, fontWeight: '600', marginTop: 12, marginBottom: 8 },
  feeRow:             { flexDirection: 'row', alignItems: 'center', gap: 10 },
  feeInput:           { flex: 1, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14 },
  feeSep:             { fontSize: 16, fontWeight: '600' },
  chipRow:            { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip:         { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F0F2FF', borderWidth: 1.5, borderColor: '#E8ECFF' },
  filterChipActive:   { backgroundColor: '#6B7FED', borderColor: '#6B7FED' },
  filterChipText:     { fontSize: 13, fontWeight: '600', color: '#555' },
  filterChipTextActive: { color: '#FFF' },
  filterBtns:         { flexDirection: 'row', gap: 12, marginTop: 24 },
  resetBtn:           { flex: 1, paddingVertical: 14, borderRadius: 20, borderWidth: 1.5, borderColor: '#6B7FED', alignItems: 'center' },
  resetBtnText:       { fontSize: 15, fontWeight: '700', color: '#6B7FED' },
  applyBtn:           { flex: 1, paddingVertical: 14, borderRadius: 20, backgroundColor: '#6B7FED', alignItems: 'center' },
  applyBtnText:       { fontSize: 15, fontWeight: '700', color: '#FFF' },
});
