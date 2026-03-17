import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../../App';
import apiClient from '../../services/api';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'DoctorSubscription'>;
  route: RouteProp<RootStackParamList, 'DoctorSubscription'>;
};

type PlanKey = 'free_trial' | 'basic' | 'professional' | 'premium';

interface Plan {
  key: PlanKey;
  name: string;
  price: string;
  duration: string;
  badge?: string;
  badgeColor?: string;
  color: string;
  lightColor: string;
  appointments: string;
  listing: string;
  commission: string;
  points: string;
  withdrawal: string;
  monthlyMax: string;
  verifiedBadge: boolean;
  features: string[];
  restrictions?: string[];
}

const PLANS: Plan[] = [
  {
    key: 'free_trial',
    name: 'Free Trial',
    price: 'PKR 0',
    duration: '15 days free',
    color: '#78909C',
    lightColor: '#ECEFF1',
    appointments: '10 appointments (capped)',
    listing: 'Not listed on platform',
    commission: 'Standard rates apply',
    points: 'Locked — no points earned',
    withdrawal: 'Blocked during trial',
    monthlyMax: 'N/A',
    verifiedBadge: false,
    features: [
      '10 appointment slots only',
      'Account creation & setup',
      'Admin verification process',
      'Profile setup & preview',
    ],
    restrictions: [
      'Not visible in doctor listing',
      'Points locked (no earning)',
      'No cash withdrawal',
      'No reward conversion',
    ],
  },
  {
    key: 'basic',
    name: 'Basic',
    price: 'PKR 1,500',
    duration: 'per month',
    color: '#6B7FED',
    lightColor: '#EEF0FB',
    appointments: '30 appointments / month',
    listing: 'Standard listing',
    commission: '10% (PKR 500–800)  |  15% (PKR 801–1,200)  |  20% (PKR 1,201–2,000)',
    points: 'Active — earn from posts & bookings',
    withdrawal: 'Min PKR 500  |  Max PKR 5,000 / txn',
    monthlyMax: 'PKR 5,000 / month',
    verifiedBadge: false,
    features: [
      '30 appointments/month',
      'Standard doctor listing',
      'Points active (earn & redeem)',
      'Cash withdrawal enabled',
      '200 pts for 30 bookings/month',
    ],
  },
  {
    key: 'professional',
    name: 'Professional',
    price: 'PKR 3,500',
    duration: 'per month',
    badge: 'Popular',
    badgeColor: '#FF9800',
    color: '#5C6BC0',
    lightColor: '#E8EAF6',
    appointments: 'Unlimited appointments',
    listing: 'Priority listing (above Basic)',
    commission: '8% (PKR 500–800)  |  13% (PKR 801–1,200)  |  18% (PKR 1,201–2,000)',
    points: 'Active — earn from posts & bookings',
    withdrawal: 'Min PKR 500  |  Max PKR 5,000 / txn',
    monthlyMax: 'PKR 10,000 / month',
    verifiedBadge: false,
    features: [
      'Unlimited appointments',
      'Priority listing (above Basic)',
      '2% less commission on every booking',
      'Points active (earn & redeem)',
      'Higher monthly withdrawal limit',
      '200 pts for 30 bookings/month',
    ],
  },
  {
    key: 'premium',
    name: 'Premium',
    price: 'PKR 6,000',
    duration: 'per month',
    badge: 'Best Value',
    badgeColor: '#E91E63',
    color: '#7B1FA2',
    lightColor: '#F3E5F5',
    appointments: 'Unlimited appointments',
    listing: 'Top listing (above all doctors)',
    commission: '7% (PKR 500–800)  |  12% (PKR 801–1,200)  |  17% (PKR 1,201–2,000)',
    points: 'Active — earn from posts & bookings',
    withdrawal: 'Min PKR 500  |  Max PKR 5,000 / txn',
    monthlyMax: 'Unlimited / month',
    verifiedBadge: true,
    features: [
      'Unlimited appointments',
      'Top listing — appear above all doctors',
      'Blue tick verified badge on profile',
      '3% less commission on every booking',
      'Unlimited monthly withdrawal',
      '200 pts for 30 bookings/month',
    ],
  },
];

const POINTS_INFO = [
  '500 pts  →  Cross 1,000 likes on a post',
  '+1,000 pts  →  Cross 5,000 likes on a post',
  '+1,000 pts  →  Cross 10,000 likes (max per post)',
  'Trust Badge  →  Every 1 lac likes (Bronze → Platinum)',
  '200 pts  →  Complete 30 bookings in a month',
  '1 point  =  PKR 0.10  (fixed rate)',
];

export default function SubscriptionScreen({ navigation, route }: Props) {
  const { doctorId, doctorName, isVerified } = route.params;
  const [selected, setSelected] = useState<PlanKey>('free_trial');
  const [loading, setLoading] = useState(false);

  const selectedPlan = PLANS.find(p => p.key === selected)!;

  const handleContinue = () => {
    Alert.alert(
      `Confirm Plan`,
      `You selected the ${selectedPlan.name} plan (${selectedPlan.price}${selectedPlan.key !== 'free_trial' ? '/month' : ''}).\n\nProceed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setLoading(true);
            try {
              await apiClient.post('/subscriptions', {
                doctorId,
                plan: selected,
              });
            } catch (e: any) {
              console.error('Subscription save failed:', e?.response?.data?.message ?? e?.message);
            } finally {
              setLoading(false);
            }
            if (isVerified) {
              navigation.goBack();
            } else {
              navigation.replace('DoctorUnverified', {
                doctorId,
                doctorName,
                selectedPlan: selected,
              });
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar backgroundColor="#6B7FED" barStyle="light-content" />
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Choose Your Plan</Text>
        <Text style={styles.headerSub}>
          Select a subscription that works for you. You can upgrade anytime.
        </Text>
      </View>

      <View style={styles.scrollWrapper}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Plan Cards ── */}
        {PLANS.map(plan => {
          const isSelected = selected === plan.key;
          return (
            <TouchableOpacity
              key={plan.key}
              activeOpacity={0.85}
              onPress={() => setSelected(plan.key)}
              style={[
                styles.card,
                isSelected && { borderColor: plan.color, borderWidth: 2.5 },
              ]}
            >
              {/* Card Header */}
              <View style={[styles.cardHeader, { backgroundColor: plan.color }]}>
                <View style={styles.cardHeaderLeft}>
                  <Text style={styles.planName}>{plan.name}</Text>
                  {plan.verifiedBadge && (
                    <View style={styles.blueTick}>
                      <MaterialIcons name="verified" size={14} color="#fff" />
                      <Text style={styles.blueTickText}>Blue Tick</Text>
                    </View>
                  )}
                </View>
                <View style={styles.cardHeaderRight}>
                  {plan.badge && (
                    <View style={[styles.badge, { backgroundColor: plan.badgeColor }]}>
                      <Text style={styles.badgeText}>{plan.badge}</Text>
                    </View>
                  )}
                  <Text style={styles.planPrice}>{plan.price}</Text>
                  <Text style={styles.planDuration}>{plan.duration}</Text>
                </View>
              </View>

              {/* Card Body */}
              <View style={[styles.cardBody, { backgroundColor: plan.lightColor }]}>
                {/* Features */}
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: plan.color }]}>
                    What's Included
                  </Text>
                  {plan.features.map((f, i) => (
                    <View key={i} style={styles.featureRow}>
                      <Ionicons name="checkmark-circle" size={16} color={plan.color} />
                      <Text style={styles.featureText}>{f}</Text>
                    </View>
                  ))}
                </View>

                {/* Restrictions for free trial */}
                {plan.restrictions && (
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: '#B71C1C' }]}>
                      Restrictions
                    </Text>
                    {plan.restrictions.map((r, i) => (
                      <View key={i} style={styles.featureRow}>
                        <Ionicons name="close-circle" size={16} color="#E53935" />
                        <Text style={styles.restrictionText}>{r}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Details Grid */}
                <View style={styles.detailsGrid}>
                  <DetailRow
                    icon="calendar-outline"
                    label="Appointments"
                    value={plan.appointments}
                    color={plan.color}
                  />
                  <DetailRow
                    icon="list-outline"
                    label="Listing"
                    value={plan.listing}
                    color={plan.color}
                  />
                  <DetailRow
                    icon="cut-outline"
                    label="Commission"
                    value={plan.commission}
                    color={plan.color}
                  />
                  <DetailRow
                    icon="star-outline"
                    label="Points"
                    value={plan.points}
                    color={plan.color}
                  />
                  <DetailRow
                    icon="wallet-outline"
                    label="Withdrawal"
                    value={plan.withdrawal}
                    color={plan.color}
                  />
                  <DetailRow
                    icon="trending-up-outline"
                    label="Monthly Max"
                    value={plan.monthlyMax}
                    color={plan.color}
                  />
                </View>

                {/* Selected indicator */}
                {isSelected && (
                  <View style={[styles.selectedBadge, { backgroundColor: plan.color }]}>
                    <Ionicons name="checkmark" size={14} color="#fff" />
                    <Text style={styles.selectedBadgeText}>Selected</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}

        {/* ── Points & Rewards Info ── */}
        <View style={styles.rewardsCard}>
          <View style={styles.rewardsHeader}>
            <Ionicons name="gift" size={20} color="#6B7FED" />
            <Text style={styles.rewardsTitle}>Points & Rewards System</Text>
          </View>
          <Text style={styles.rewardsSub}>
            Available on all paid plans (Basic, Professional, Premium)
          </Text>
          {POINTS_INFO.map((info, i) => (
            <View key={i} style={styles.rewardRow}>
              <View style={styles.rewardDot} />
              <Text style={styles.rewardText}>{info}</Text>
            </View>
          ))}
          <View style={styles.withdrawalNote}>
            <Ionicons name="information-circle-outline" size={15} color="#5C6BC0" />
            <Text style={styles.withdrawalNoteText}>
              2% processing fee deducted on every withdrawal. Processing time ~24 hours.
            </Text>
          </View>
        </View>

        {/* ── Trust Score Info ── */}
        <View style={styles.trustCard}>
          <View style={styles.rewardsHeader}>
            <Ionicons name="shield-checkmark" size={20} color="#7B1FA2" />
            <Text style={[styles.rewardsTitle, { color: '#7B1FA2' }]}>
              Trust Score Badges
            </Text>
          </View>
          <Text style={styles.rewardsSub}>
            Earn reputation badges when your posts go viral (above 1 lac likes)
          </Text>
          {[
            { badge: 'Bronze', likes: '1,00,000 likes' },
            { badge: 'Silver', likes: '2,00,000 likes' },
            { badge: 'Gold', likes: '5,00,000 likes' },
            { badge: 'Platinum', likes: '10,00,000 likes' },
          ].map((item, i) => (
            <View key={i} style={styles.rewardRow}>
              <View style={[styles.rewardDot, { backgroundColor: '#7B1FA2' }]} />
              <Text style={styles.rewardText}>
                <Text style={{ fontWeight: '700' }}>{item.badge}</Text>
                {'  →  '}
                {item.likes}
              </Text>
            </View>
          ))}
        </View>

        {/* spacer for button */}
        <View style={{ height: 100 }} />
      </ScrollView>
      </View>

      {/* ── Sticky Continue Button ── */}
      <View style={styles.footer}>
        <View style={styles.footerInner}>
          <View>
            <Text style={styles.footerPlanName}>{selectedPlan.name}</Text>
            <Text style={styles.footerPlanPrice}>
              {selectedPlan.price}
              {selectedPlan.key !== 'free_trial' ? ' / month' : ''}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.continueBtn, { backgroundColor: selectedPlan.color, opacity: loading ? 0.7 : 1 }]}
            activeOpacity={0.85}
            onPress={handleContinue}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Text style={styles.continueBtnText}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

/* ── Detail Row Component ── */
function DetailRow({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailLabelRow}>
        <Ionicons name={icon as any} size={14} color={color} />
        <Text style={[styles.detailLabel, { color }]}>{label}</Text>
      </View>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

/* ── Styles ── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF' },

  header: {
    backgroundColor: '#6B7FED',
    paddingHorizontal: 24,
    paddingTop: 50,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.82)', fontSize: 13, marginTop: 6 },

  scrollWrapper: { flex: 1, backgroundColor: '#F0F4FF', overflow: 'hidden' },
  scrollContent: { padding: 16 },

  /* Card */
  card: {
    borderRadius: 20,
    marginBottom: 18,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 18,
  },
  cardHeaderLeft: { flex: 1 },
  cardHeaderRight: { alignItems: 'flex-end' },
  planName: { color: '#fff', fontSize: 20, fontWeight: '700' },
  planPrice: { color: '#fff', fontSize: 22, fontWeight: '800' },
  planDuration: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },

  blueTick: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  blueTickText: { color: '#fff', fontSize: 11, fontWeight: '600', marginLeft: 4 },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 8,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  cardBody: { padding: 16 },

  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 5 },
  featureText: { color: '#2C3E50', fontSize: 13, marginLeft: 7, flex: 1 },
  restrictionText: { color: '#B71C1C', fontSize: 13, marginLeft: 7, flex: 1 },

  detailsGrid: {
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  detailRow: { marginBottom: 8 },
  detailLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  detailLabel: { fontSize: 11, fontWeight: '700', marginLeft: 5, textTransform: 'uppercase', letterSpacing: 0.4 },
  detailValue: { color: '#2C3E50', fontSize: 13, lineHeight: 18, paddingLeft: 19 },

  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 12,
  },
  selectedBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700', marginLeft: 4 },

  /* Rewards */
  rewardsCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  rewardsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  rewardsTitle: { fontSize: 15, fontWeight: '700', color: '#6B7FED', marginLeft: 8 },
  rewardsSub: { color: '#888', fontSize: 12, marginBottom: 12 },
  rewardRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 7 },
  rewardDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#6B7FED',
    marginTop: 5,
    marginRight: 10,
  },
  rewardText: { color: '#2C3E50', fontSize: 13, flex: 1 },
  withdrawalNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EEF0FB',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  withdrawalNoteText: { color: '#5C6BC0', fontSize: 12, marginLeft: 6, flex: 1 },

  /* Trust card */
  trustCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  /* Footer */
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
    paddingBottom: 24,
    paddingTop: 16,
    paddingHorizontal: 20,
  },
  footerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerPlanName: { fontSize: 13, color: '#888', fontWeight: '500' },
  footerPlanPrice: { fontSize: 18, fontWeight: '800', color: '#1A1F36' },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  continueBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
