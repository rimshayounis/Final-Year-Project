import React, { useState, useEffect } from 'react';
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
import { useStripe } from '@stripe/stripe-react-native';

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


function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
}
function daysLeft(iso: string) {
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  return diff > 0 ? diff : 0;
}

export default function SubscriptionScreen({ navigation, route }: Props) {
  const { doctorId, doctorName, isVerified } = route.params;

  // 'detail' = show current plan summary, 'select' = show plan cards for upgrade
  const [mode, setMode]               = useState<'detail' | 'select'>('select');
  const [selected, setSelected]       = useState<PlanKey>('free_trial');
  const [currentPlan, setCurrentPlan] = useState<PlanKey | null>(null);
  const [planStartDate, setPlanStartDate] = useState<string | null>(null);
  const [planEndDate, setPlanEndDate]     = useState<string | null>(null);
  const [planEndIso, setPlanEndIso]       = useState<string | null>(null);
  const [planPrice, setPlanPrice]         = useState<number>(0);
  const [fetchingPlan, setFetchingPlan]   = useState(true);
  const [cancelling, setCancelling]       = useState(false);
  const [loading, setLoading]             = useState(false);
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  // Fetch the doctor's current active subscription
  useEffect(() => {
    const fetchActivePlan = async () => {
      try {
        const res = await apiClient.get(`/subscriptions/${doctorId}/active`);
        const sub = res.data?.data;
        if (sub && sub.plan) {
          const plan = sub.plan as PlanKey;
          setCurrentPlan(plan);
          setSelected(plan);
          if (sub.startDate) setPlanStartDate(fmtDate(sub.startDate));
          if (sub.endDate) {
            setPlanEndDate(fmtDate(sub.endDate));
            setPlanEndIso(sub.endDate);
          }
          setPlanPrice(sub.pricePKR ?? 0);
          setMode('detail'); // show detail view if plan exists
        }
      } catch {
        // no active plan — go straight to select
      } finally {
        setFetchingPlan(false);
      }
    };
    fetchActivePlan();
  }, [doctorId]);

  const handleCancelSubscription = () => {
    Alert.alert(
      'Cancel Subscription',
      `Are you sure you want to cancel your ${PLANS.find(p => p.key === currentPlan)?.name ?? ''} plan? You will lose access at the end of your billing period.`,
      [
        { text: 'Keep Plan', style: 'cancel' },
        {
          text: 'Cancel Plan',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              await apiClient.delete(`/subscriptions/${doctorId}/cancel`, {
                data: { cancelReason: 'Cancelled by doctor from app' },
              });
              Alert.alert('Cancelled', 'Your subscription has been cancelled.', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (e: any) {
              Alert.alert('Error', e?.response?.data?.message ?? 'Could not cancel subscription.');
            } finally {
              setCancelling(false);
            }
          },
        },
      ],
    );
  };

  const selectedPlan = PLANS.find(p => p.key === selected)!;
  const isCurrentPlanSelected = currentPlan !== null && selected === currentPlan;;

  const handleContinue = () => {
    // Already on this plan — nothing to do
    if (isCurrentPlanSelected) {
      Alert.alert('Already Active', `You are already on the ${selectedPlan.name} plan.${planEndDate ? ` It renews on ${planEndDate}.` : ''}`);
      return;
    }

    // Free trial — no payment needed
    if (selected === 'free_trial') {
      Alert.alert(
        'Confirm Free Trial',
        'Start your 15-day free trial now?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Start Trial',
            onPress: async () => {
              setLoading(true);
              try {
                await apiClient.post('/subscriptions', { doctorId, plan: 'free_trial' });
              } catch (e: any) {
                console.error(e?.response?.data?.message ?? e?.message);
              } finally {
                setLoading(false);
              }
              if (isVerified) {
                navigation.goBack();
              } else {
                navigation.replace('DoctorUnverified', { doctorId, doctorName, selectedPlan: selected });
              }
            },
          },
        ],
      );
      return;
    }

    // Paid plan — go through Stripe
    Alert.alert(
      'Confirm Purchase',
      `You are about to purchase the ${selectedPlan.name} plan for ${selectedPlan.price}/month.\n\nYou will be prompted to enter your card details.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Proceed to Payment',
          onPress: () => handleStripePayment(),
        },
      ],
    );
  };

  const handleStripePayment = async () => {
    setLoading(true);
    try {
      // Step 1 — create PaymentIntent on backend
      const intentRes = await apiClient.post('/payment/create-intent', {
        doctorId,
        plan: selected,
      });
      const { clientSecret, paymentIntentId } = intentRes.data;

      // Step 2 — init Stripe payment sheet
      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'TruHeal Link',
        style: 'automatic',
      });

      if (initError) {
        Alert.alert('Payment Error', initError.message);
        setLoading(false);
        return;
      }

      // Step 3 — present the payment sheet to user
      const { error: payError } = await presentPaymentSheet();

      if (payError) {
        if (payError.code !== 'Canceled') {
          Alert.alert('Payment Failed', payError.message);
        }
        setLoading(false);
        return;
      }

      // Step 4 — payment succeeded on Stripe, confirm on backend
      await apiClient.post('/payment/confirm', {
        doctorId,
        plan: selected,
        paymentIntentId,
        doctorName: doctorName || 'Doctor',
      });

      Alert.alert(
        'Payment Successful! 🎉',
        `Your ${selectedPlan.name} plan is now active. Welcome aboard!`,
        [
          {
            text: 'Continue',
            onPress: () => {
              if (isVerified) {
                navigation.goBack();
              } else {
                navigation.replace('DoctorUnverified', { doctorId, doctorName, selectedPlan: selected });
              }
            },
          },
        ],
      );
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (fetchingPlan) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <StatusBar backgroundColor="#6B7FED" barStyle="light-content" />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Subscription</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#6B7FED" />
          <Text style={{ marginTop: 12, color: '#888', fontSize: 14 }}>Loading your plan...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Detail View (current plan summary) ───────────────────────────────────
  if (mode === 'detail' && currentPlan) {
    const plan     = PLANS.find(p => p.key === currentPlan)!;
    const daysRem  = planEndIso ? daysLeft(planEndIso) : 0;
    const isFree   = currentPlan === 'free_trial';

    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <StatusBar backgroundColor={plan.color} barStyle="light-content" />

        {/* Header */}
        <View style={[styles.header, { backgroundColor: plan.color }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Subscription</Text>
          <Text style={styles.headerSub}>Manage your current plan</Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

          {/* Plan card */}
          <View style={[styles.detailCard, { borderColor: plan.color }]}>
            {/* Color stripe */}
            <View style={[styles.detailStripe, { backgroundColor: plan.color }]}>
              <View>
                <Text style={styles.detailPlanName}>{plan.name} Plan</Text>
                {plan.verifiedBadge && (
                  <View style={styles.blueTickInline}>
                    <MaterialIcons name="verified" size={13} color="#fff" />
                    <Text style={styles.blueTickText}>Blue Tick Included</Text>
                  </View>
                )}
              </View>
              <View style={styles.detailActivePill}>
                <View style={styles.detailActiveDot} />
                <Text style={styles.detailActiveText}>Active</Text>
              </View>
            </View>

            {/* Details */}
            <View style={styles.detailBody}>
              <DetailInfoRow
                icon="cash-outline"
                label="Subscription Fee"
                value={isFree ? 'Free (15-day trial)' : `PKR ${planPrice.toLocaleString()} / month`}
                color={plan.color}
              />
              <View style={styles.detailDivider} />
              <DetailInfoRow
                icon="calendar-outline"
                label="Start Date"
                value={planStartDate ?? '—'}
                color={plan.color}
              />
              <View style={styles.detailDivider} />
              <DetailInfoRow
                icon="calendar-clear-outline"
                label="Expiry Date"
                value={planEndDate ?? '—'}
                color={plan.color}
              />
              <View style={styles.detailDivider} />
              <DetailInfoRow
                icon="time-outline"
                label="Days Remaining"
                value={`${daysRem} day${daysRem !== 1 ? 's' : ''}`}
                color={daysRem <= 5 ? '#dc2626' : plan.color}
              />
            </View>

            {/* Days bar */}
            {planEndIso && (
              <View style={styles.detailBarWrap}>
                <View style={styles.detailBarTrack}>
                  <View style={[styles.detailBarFill, {
                    backgroundColor: daysRem <= 5 ? '#dc2626' : plan.color,
                    width: `${Math.min(100, Math.round((daysRem / (isFree ? 15 : 30)) * 100))}%`,
                  }]} />
                </View>
                <Text style={styles.detailBarLabel}>{daysRem} days left</Text>
              </View>
            )}
          </View>

          {/* What's included summary */}
          <View style={styles.includedCard}>
            <Text style={[styles.includedTitle, { color: plan.color }]}>What's Included</Text>
            {plan.features.map((f, i) => (
              <View key={i} style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={15} color={plan.color} />
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>

          {/* Action buttons */}
          <View style={styles.actionRow}>
            {!isFree && (
              <TouchableOpacity
                style={[styles.cancelBtn, cancelling && { opacity: 0.6 }]}
                onPress={handleCancelSubscription}
                disabled={cancelling}
                activeOpacity={0.8}
              >
                {cancelling
                  ? <ActivityIndicator size="small" color="#dc2626" />
                  : <><Ionicons name="close-circle-outline" size={18} color="#dc2626" /><Text style={styles.cancelBtnText}>Cancel Plan</Text></>
                }
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.upgradeBtn, { backgroundColor: plan.color }, isFree && { flex: 1 }]}
              onPress={() => { setSelected('free_trial'); setMode('select'); }}
              activeOpacity={0.85}
            >
              <Ionicons name="arrow-up-circle-outline" size={18} color="#fff" />
              <Text style={styles.upgradeBtnText}>{isFree ? 'Choose a Plan' : 'Upgrade Plan'}</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Select / Upgrade View ─────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar backgroundColor="#6B7FED" barStyle="light-content" />
      {/* Header with back-to-detail if doctor already has a plan */}
      <View style={styles.header}>
        {currentPlan && (
          <TouchableOpacity onPress={() => setMode('detail')} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>
          {currentPlan ? 'Upgrade Plan' : 'Choose Your Plan'}
        </Text>
        <Text style={styles.headerSub}>
          {currentPlan
            ? 'Select a new plan to switch to'
            : 'Select a subscription that works for you. You can upgrade anytime.'}
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
          const isCurrent  = currentPlan === plan.key;
          return (
            <TouchableOpacity
              key={plan.key}
              activeOpacity={0.85}
              onPress={() => setSelected(plan.key)}
              style={[
                styles.card,
                isSelected && { borderColor: plan.color, borderWidth: 2.5 },
                isCurrent  && { borderColor: plan.color, borderWidth: 2.5 },
              ]}
            >
              {/* Card Header */}
              <View style={[styles.cardHeader, { backgroundColor: plan.color }]}>
                <View style={styles.cardHeaderLeft}>
                  <Text style={styles.planName}>{plan.name}</Text>
                  {isCurrent && (
                    <View style={styles.currentBadge}>
                      <Ionicons name="checkmark-circle" size={12} color={plan.color} />
                      <Text style={[styles.currentBadgeText, { color: plan.color }]}>Current Plan</Text>
                    </View>
                  )}
                  {!isCurrent && plan.verifiedBadge && (
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
            style={[
              styles.continueBtn,
              { backgroundColor: isCurrentPlanSelected ? '#888' : selectedPlan.color, opacity: loading ? 0.7 : 1 },
            ]}
            activeOpacity={0.85}
            onPress={handleContinue}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : isCurrentPlanSelected ? (
              <>
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={styles.continueBtnText}>Active Plan</Text>
              </>
            ) : (
              <>
                <Text style={styles.continueBtnText}>
                  {currentPlan && currentPlan !== 'free_trial' ? 'Switch Plan' : 'Continue'}
                </Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

/* ── Detail Info Row (for subscription detail view) ── */
function DetailInfoRow({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <View style={infoRowStyles.row}>
      <View style={[infoRowStyles.iconWrap, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon as any} size={16} color={color} />
      </View>
      <View style={infoRowStyles.texts}>
        <Text style={infoRowStyles.label}>{label}</Text>
        <Text style={[infoRowStyles.value, { color }]}>{value}</Text>
      </View>
    </View>
  );
}
const infoRowStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  texts: { flex: 1 },
  label: { fontSize: 11, color: '#888', fontWeight: '600', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.4 },
  value: { fontSize: 15, fontWeight: '700' },
});

/* ── Plan Card Detail Row ── */
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

  currentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 5,
    gap: 4,
    alignSelf: 'flex-start',
  },
  currentBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },

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

  /* ── Detail view ── */
  backBtn: { marginBottom: 4 },

  detailCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  detailStripe: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 20,
  },
  detailPlanName: { color: '#fff', fontSize: 22, fontWeight: '800' },
  blueTickInline: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 },

  detailActivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
  },
  detailActiveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4ade80' },
  detailActiveText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  detailBody: { paddingHorizontal: 18, paddingVertical: 6 },
  detailDivider: { height: 1, backgroundColor: '#F0F4FF', marginVertical: 2 },

  detailBarWrap: { paddingHorizontal: 18, paddingBottom: 16 },
  detailBarTrack: { height: 6, backgroundColor: '#F0F4FF', borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  detailBarFill: { height: 6, borderRadius: 3 },
  detailBarLabel: { fontSize: 11, color: '#888', fontWeight: '600', textAlign: 'right' },

  includedCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  includedTitle: { fontSize: 13, fontWeight: '700', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },

  actionRow: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#dc2626',
    borderRadius: 14,
    paddingVertical: 14,
    backgroundColor: '#fff',
  },
  cancelBtnText: { color: '#dc2626', fontSize: 15, fontWeight: '700' },
  upgradeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 14,
    paddingVertical: 14,
  },
  upgradeBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
