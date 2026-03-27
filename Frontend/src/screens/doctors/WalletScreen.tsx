import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  StatusBar,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../App";
import apiClient from "../../services/api";

type WalletNav = NativeStackNavigationProp<RootStackParamList, "Wallet">;
type WalletRoute = RouteProp<RootStackParamList, "Wallet">;

interface WalletLimits {
  minWithdrawal: number;
  maxPerTransaction: number;
  monthlyLimit: number | null;
  monthlyUsed: number;
  monthlyRemaining: number | null;
}

interface WalletTx {
  type: string;
  amount: number;
  pointsUsed: number;
  description: string;
  status: string | null;
  createdAt: string;
  // appointment earning fields
  patientName?: string | null;
  doctorName?: string | null;
  sessionDate?: string | null;
  sessionTime?: string | null;
  sessionDuration?: number | null;
  commissionRate?: number | null;
  commissionAmount?: number | null;
  appointmentId?: string | null;
}

interface BankDetails {
  bankName: string;
  accountName: string;
  accountNumber: string;
  addedAt: string;
}

interface WalletData {
  balance: number;
  totalEarned: number;
  totalWithdrawn: number;
  availablePoints: number;
  totalPointsEarned: number;
  plan: string;
  limits: WalletLimits;
  transactions: WalletTx[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-PK", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function TxIcon({ type, isEarning }: { type: string; isEarning: boolean }) {
  if (isEarning)
    return <Ionicons name="medkit" size={18} color="#6B7FED" />;
  if (type === "points_converted")
    return <Ionicons name="swap-horizontal" size={18} color="#00B374" />;
  if (type.startsWith("withdrawal"))
    return <Ionicons name="arrow-up-circle" size={18} color="#E53E3E" />;
  return <Ionicons name="wallet" size={18} color="#6B7FED" />;
}

function statusColor(status: string | null) {
  if (status === "pending")   return "#F6A623";
  if (status === "succeeded" || status === "completed") return "#00B374";
  if (status === "rejected")  return "#E53E3E";
  return "#6B7FED";
}

function statusLabel(status: string | null) {
  if (status === "succeeded" || status === "completed") return "Succeeded";
  if (!status) return "—";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<WalletNav>();
  const route = useRoute<WalletRoute>();
  const { doctorId } = route.params;

  const [wallet,          setWallet]          = useState<WalletData | null>(null);
  const [bankDetails,     setBankDetails]     = useState<BankDetails | null>(null);
  const [loading,         setLoading]         = useState(true);
  const [withdrawModal,   setWithdrawModal]   = useState(false);
  const [withdrawAmount,  setWithdrawAmount]  = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [expandedIndex,   setExpandedIndex]   = useState<number | null>(null);
  const [apptCache,       setApptCache]       = useState<Record<string, any>>({});
  const [txFilter,        setTxFilter]        = useState<"all" | "pending" | "confirmed" | "points" | "appointments">("all");
  const [filterModal,     setFilterModal]     = useState(false);

  const fetchWallet = async () => {
    try {
      const [walletRes, bankRes] = await Promise.all([
        apiClient.get(`/wallet/${doctorId}`),
        apiClient.get(`/doctors/${doctorId}/bank-details`),
      ]);
      setWallet(walletRes.data?.data ?? null);
      setBankDetails(bankRes.data ?? null);
    } catch {
      Alert.alert("Error", "Could not load wallet.");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchWallet();
    }, [doctorId]),
  );

  const effectiveMax = () => {
    if (!wallet) return 5000;
    const { maxPerTransaction, monthlyRemaining } = wallet.limits;
    const caps = [maxPerTransaction, wallet.balance];
    if (monthlyRemaining !== null) caps.push(monthlyRemaining);
    return Math.min(...caps);
  };

  const handleWithdraw = async () => {
    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert("Invalid", "Enter a valid amount.");
      return;
    }
    setWithdrawLoading(true);
    try {
      await apiClient.post("/wallet/withdraw", { doctorId, amount: amt });
      Alert.alert("Requested", `Withdrawal of PKR ${amt} submitted. Processing within 24 hours.`);
      setWithdrawModal(false);
      setWithdrawAmount("");
      fetchWallet();
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message || "Withdrawal failed.");
    } finally {
      setWithdrawLoading(false);
    }
  };

  const planLabel = (plan: string) => {
    if (plan === "free_trial")   return "Free Trial";
    if (plan === "basic")        return "Basic";
    if (plan === "professional") return "Professional";
    if (plan === "premium")      return "Premium";
    return plan;
  };

  const monthlyLimitLabel = (limits: WalletLimits) =>
    limits.monthlyLimit === null ? "Unlimited" : `PKR ${limits.monthlyLimit.toLocaleString()}`;

  const withdrawDisabled = () => {
    if (!withdrawAmount) return true;
    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt)) return true;
    const { minWithdrawal } = wallet!.limits;
    return amt < minWithdrawal || amt > effectiveMax();
  };

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color="#6B7FED" />
      </View>
    );
  }

  return (
    <View style={s.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#6B7FED" />

      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>My Wallet</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Balance Card */}
        <View style={s.balanceCard}>
          <View style={s.balanceTopRow}>
            <Ionicons name="wallet" size={26} color="#FFF" style={{ opacity: 0.9 }} />
            <Text style={s.balanceLabel}>Available Balance</Text>
            <View style={s.planBadge}>
              <Text style={s.planBadgeTxt}>{planLabel(wallet?.plan ?? "")}</Text>
            </View>
          </View>
          <Text style={s.balanceAmount}>
            PKR {(wallet?.balance ?? 0).toLocaleString("en-PK", { minimumFractionDigits: 2 })}
          </Text>
          <View style={s.balanceStatsRow}>
            <View style={s.balanceStat}>
              <Text style={s.balanceStatVal}>PKR {(wallet?.totalEarned ?? 0).toFixed(0)}</Text>
              <Text style={s.balanceStatLbl}>Total Earned</Text>
            </View>
            <View style={s.balanceStatDivider} />
            <View style={s.balanceStat}>
              <Text style={s.balanceStatVal}>PKR {(wallet?.totalWithdrawn ?? 0).toFixed(0)}</Text>
              <Text style={s.balanceStatLbl}>Withdrawn</Text>
            </View>
            <View style={s.balanceStatDivider} />
            <View style={s.balanceStat}>
              <Text style={s.balanceStatVal}>{wallet?.totalPointsEarned ?? 0}</Text>
              <Text style={s.balanceStatLbl}>Total Points Earned</Text>
            </View>
          </View>
        </View>

        {/* Limits Info Card */}
        {wallet && (
          <View style={s.limitsCard}>
            <Text style={s.limitsTitle}>Withdrawal Limits</Text>
            <View style={s.limitsGrid}>
              <View style={s.limitItem}>
                <Text style={s.limitVal}>PKR {wallet.limits.minWithdrawal.toLocaleString()}</Text>
                <Text style={s.limitLbl}>Min per request</Text>
              </View>
              <View style={s.limitDivider} />
              <View style={s.limitItem}>
                <Text style={s.limitVal}>PKR {wallet.limits.maxPerTransaction.toLocaleString()}</Text>
                <Text style={s.limitLbl}>Max per request</Text>
              </View>
              <View style={s.limitDivider} />
              <View style={s.limitItem}>
                <Text style={s.limitVal}>{monthlyLimitLabel(wallet.limits)}</Text>
                <Text style={s.limitLbl}>Monthly limit</Text>
              </View>
            </View>

            {wallet.limits.monthlyLimit !== null && (
              <View style={s.monthlyRow}>
                <View style={s.monthlyBarBg}>
                  <View
                    style={[
                      s.monthlyBarFill,
                      {
                        width: `${Math.min(100, (wallet.limits.monthlyUsed / wallet.limits.monthlyLimit!) * 100)}%`,
                        backgroundColor:
                          wallet.limits.monthlyUsed >= wallet.limits.monthlyLimit!
                            ? "#E53E3E" : "#00B374",
                      },
                    ]}
                  />
                </View>
                <Text style={s.monthlyTxt}>
                  PKR {wallet.limits.monthlyUsed.toFixed(0)} / {wallet.limits.monthlyLimit!.toLocaleString()} used this month
                </Text>
              </View>
            )}
            {wallet.limits.monthlyLimit === null && (
              <Text style={s.unlimitedTxt}>✓ Unlimited monthly withdrawals (Premium)</Text>
            )}
          </View>
        )}

        {/* Bank Details Quick Banner */}
        {!bankDetails && (
          <TouchableOpacity
            style={s.bankWarningBanner}
            onPress={() => navigation.navigate("BankDetails", { doctorId })}
          >
            <Ionicons name="alert-circle" size={18} color="#856404" />
            <Text style={s.bankWarningTxt}>No bank account linked. Add one to withdraw funds.</Text>
            <Ionicons name="chevron-forward" size={16} color="#856404" />
          </TouchableOpacity>
        )}
        {bankDetails && (
          <View style={s.bankLinkedBanner}>
            <Ionicons name="checkmark-circle" size={18} color="#00B374" />
            <View style={{ flex: 1 }}>
              <Text style={s.bankLinkedTxt}>{bankDetails.bankName}</Text>
              <Text style={s.bankLinkedSub}>****{bankDetails.accountNumber.slice(-4)} · {bankDetails.accountName}</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate("BankDetails", { doctorId })}>
              <Text style={s.bankChangeBtn}>Change</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Withdraw Button */}
        <TouchableOpacity
          style={[s.withdrawBtn, (!wallet?.balance || !bankDetails) && { opacity: 0.4 }]}
          onPress={() => {
            if (!bankDetails) {
              Alert.alert("Bank Account Required", "Please link a bank account before requesting a withdrawal.", [
                { text: "Cancel", style: "cancel" },
                { text: "Add Bank", onPress: () => navigation.navigate("BankDetails", { doctorId }) },
              ]);
              return;
            }
            if (!wallet?.balance) {
              Alert.alert("No Balance", "Convert your points first to add balance.");
              return;
            }
            setWithdrawAmount("");
            setWithdrawModal(true);
          }}
        >
          <Ionicons name="arrow-up-circle-outline" size={20} color="#FFF" />
          <Text style={s.withdrawBtnTxt}>Request Withdrawal</Text>
        </TouchableOpacity>

        {/* Transaction History */}
        <View style={s.sectionTitleRow}>
          <Text style={s.sectionTitle}>Transaction History</Text>
          <TouchableOpacity style={[s.filterBtn, txFilter !== "all" && s.filterBtnActive]} onPress={() => setFilterModal(true)}>
            <Ionicons name="filter" size={15} color={txFilter !== "all" ? "#FFF" : "#6B7FED"} />
            {txFilter !== "all" && <Text style={s.filterBtnTxt}>
              {txFilter === "pending" ? "Pending" : txFilter === "confirmed" ? "Confirmed" : txFilter === "points" ? "Points" : "Appointments"}
            </Text>}
          </TouchableOpacity>
        </View>

        {/* Filter Modal */}
        <Modal visible={filterModal} transparent animationType="fade" onRequestClose={() => setFilterModal(false)}>
          <TouchableOpacity style={s.filterOverlay} activeOpacity={1} onPress={() => setFilterModal(false)}>
            <View style={s.filterSheet}>
              <Text style={s.filterSheetTitle}>Filter Transactions</Text>
              {([
                { key: "all",          label: "All Transactions",      icon: "list" },
                { key: "pending",      label: "Pending Withdrawals",   icon: "time-outline" },
                { key: "confirmed",    label: "Confirmed Withdrawals", icon: "checkmark-circle-outline" },
                { key: "points",       label: "Earned by Points",      icon: "swap-horizontal" },
                { key: "appointments", label: "Earned by Appointments",icon: "medkit" },
              ] as const).map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[s.filterOption, txFilter === opt.key && s.filterOptionActive]}
                  onPress={() => { setTxFilter(opt.key); setFilterModal(false); setExpandedIndex(null); }}
                >
                  <Ionicons name={opt.icon as any} size={18} color={txFilter === opt.key ? "#6B7FED" : "#9099B5"} />
                  <Text style={[s.filterOptionTxt, txFilter === opt.key && { color: "#6B7FED", fontWeight: "700" }]}>{opt.label}</Text>
                  {txFilter === opt.key && <Ionicons name="checkmark" size={16} color="#6B7FED" style={{ marginLeft: "auto" }} />}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>

        {(!wallet?.transactions || wallet.transactions.length === 0) ? (
          <View style={s.emptyBox}>
            <Ionicons name="receipt-outline" size={36} color="#C0C5D8" />
            <Text style={s.emptyTxt}>No transactions yet</Text>
            <Text style={s.emptyHint}>Convert your points to see history here</Text>
          </View>
        ) : (() => {
          const filtered = wallet.transactions.filter((tx) => {
            if (txFilter === "all") return true;
            const isWithdrawal = tx.type === "withdrawal_requested" || tx.type === "withdrawal_completed" || tx.type === "withdrawal_rejected";
            const isEarning = tx.type === "appointment_earning" || (tx.type === "points_converted" && (tx.commissionRate != null || tx.description?.toLowerCase().includes("appointment")));
            const isPoints = tx.type === "points_converted" && !isEarning;
            if (txFilter === "pending")      return isWithdrawal && tx.status === "pending";
            if (txFilter === "confirmed")    return tx.type === "withdrawal_completed" || (isWithdrawal && (tx.status === "succeeded" || tx.status === "completed"));
            if (txFilter === "points")       return isPoints;
            if (txFilter === "appointments") return isEarning;
            return true;
          });
          if (filtered.length === 0) return (
            <View style={s.emptyBox}>
              <Ionicons name="search-outline" size={36} color="#C0C5D8" />
              <Text style={s.emptyTxt}>No matching transactions</Text>
              <Text style={s.emptyHint}>Try a different filter</Text>
            </View>
          );
          return filtered.map((tx, i) => {
            const isWithdrawal = tx.type === "withdrawal_requested" || tx.type === "withdrawal_completed" || tx.type === "withdrawal_rejected";
            // covers new "appointment_earning" AND old "points_converted" records
            // that describe an appointment fee release
            const isEarning =
              tx.type === "appointment_earning" ||
              (tx.type === "points_converted" &&
                (tx.commissionRate != null ||
                  tx.description?.toLowerCase().includes("appointment")));
            const isPoints = tx.type === "points_converted" && !isEarning;
            const canExpand    = isWithdrawal || isEarning;
            const isExpanded   = expandedIndex === i;
            const isCredit     = isEarning || isPoints;

            const grossAmount = isEarning
              ? (tx.amount + (tx.commissionAmount ?? 0)).toFixed(2)
              : null;

            return (
              <TouchableOpacity
                key={i}
                activeOpacity={canExpand ? 0.7 : 1}
                onPress={() => {
                  if (!canExpand) return;
                  const next = isExpanded ? null : i;
                  setExpandedIndex(next);
                  // fetch appointment details from API if not cached yet
                  if (!isExpanded && isEarning && tx.appointmentId && !apptCache[tx.appointmentId]) {
                    apiClient
                      .get(`/booked-appointments/${tx.appointmentId}`)
                      .then((r) =>
                        setApptCache((prev) => ({ ...prev, [tx.appointmentId!]: r.data?.data })),
                      )
                      .catch(() => {});
                  }
                }}
                style={[
                  s.txCard,
                  isWithdrawal && s.txCardWithdraw,
                  isEarning    && s.txCardEarning,
                ]}
              >
                {/* ── Collapsed header row ─── */}
                <View style={s.txHeaderRow}>
                  <View style={s.txIconBox}>
                    <TxIcon type={tx.type} isEarning={isEarning} />
                  </View>

                  <View style={s.txBody}>
                    <Text style={s.txDesc} numberOfLines={isExpanded ? undefined : 2}>
                      {tx.description}
                    </Text>
                    <Text style={s.txDate}>{formatDate(tx.createdAt)}</Text>
                    {isPoints && tx.pointsUsed > 0 && (
                      <Text style={s.txPointsUsed}>{tx.pointsUsed} pts converted</Text>
                    )}
                    {tx.status && (
                      <View style={[s.txStatusBadge, { backgroundColor: statusColor(tx.status) + "20" }]}>
                        <Text style={[s.txStatusTxt, { color: statusColor(tx.status) }]}>
                          {statusLabel(tx.status)}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={s.txRight}>
                    <Text style={[s.txAmount, isCredit ? s.txAmountCredit : s.txAmountDebit]}>
                      {isCredit ? "+" : "−"}PKR {tx.amount.toFixed(0)}
                    </Text>
                    {canExpand && (
                      <Ionicons
                        name={isExpanded ? "chevron-up" : "chevron-down"}
                        size={13}
                        color="#9099B5"
                        style={{ alignSelf: "center", marginTop: 4 }}
                      />
                    )}
                  </View>
                </View>

                {/* ── Expanded: Withdrawal ─── */}
                {isExpanded && isWithdrawal && (
                  <View style={s.txExpandBox}>
                    <View style={s.txExpandDivider} />

                    <DetailRow label="Requested Amount" value={`PKR ${tx.amount.toFixed(2)}`} />
                    <DetailRow
                      label="Processing Fee (2%)"
                      value={`− PKR ${(tx.amount * 0.02).toFixed(2)}`}
                      valueColor="#E53E3E"
                    />
                    <DetailRow
                      label="You Receive"
                      value={`PKR ${(tx.amount * 0.98).toFixed(2)}`}
                      valueColor="#00B374"
                      bold
                    />
                    {bankDetails && (
                      <>
                        <View style={s.txExpandDivider} />
                        <DetailRow label="Bank"    value={bankDetails.bankName} />
                        <DetailRow label="Account" value={`****${bankDetails.accountNumber.slice(-4)} · ${bankDetails.accountName}`} />
                      </>
                    )}
                    <View style={s.txExpandDivider} />
                    <DetailRow label="Date"   value={formatDate(tx.createdAt)} />
                    <DetailRow
                      label="Status"
                      value={statusLabel(tx.status)}
                      valueColor={statusColor(tx.status)}
                    />

                    <View style={s.txProcessNote}>
                      <Ionicons name="time-outline" size={12} color="#F6A623" />
                      <Text style={s.txProcessTxt}>Processing within 24 hours</Text>
                    </View>
                  </View>
                )}

                {/* ── Expanded: Appointment Earning ─── */}
                {isExpanded && isEarning && (() => {
                  // prefer live API data, fall back to fields stored in tx
                  const appt = tx.appointmentId ? apptCache[tx.appointmentId] : null;
                  const patientName    = appt?.userId?.fullName   ?? tx.patientName   ?? null;
                  const doctorName     = appt?.doctorId?.fullName ?? tx.doctorName    ?? null;
                  const sessionDate    = appt?.date               ?? tx.sessionDate   ?? null;
                  const sessionTime    = appt?.time               ?? tx.sessionTime   ?? null;
                  const sessionDuration = appt?.sessionDuration   ?? tx.sessionDuration ?? null;
                  return (
                    <View style={s.txExpandBox}>
                      <View style={s.txExpandDivider} />

                      {patientName     && <DetailRow label="Patient"       value={patientName} />}
                      {doctorName      && <DetailRow label="Doctor"        value={`Dr. ${doctorName}`} />}
                      {sessionDate     && <DetailRow label="Session Date"  value={sessionDate} />}
                      {sessionTime     && <DetailRow label="Session Time"  value={sessionTime} />}
                      {sessionDuration != null && (
                        <DetailRow label="Duration" value={`${sessionDuration} min`} />
                      )}

                      <View style={[s.txExpandDivider, { marginVertical: 8 }]} />

                      <DetailRow label="Appointment Fee" value={`PKR ${grossAmount}`} />
                      {tx.commissionRate != null && (
                        <DetailRow
                          label={`Commission (${Math.round(tx.commissionRate * 100)}%)`}
                          value={`−PKR ${(tx.commissionAmount ?? 0).toFixed(2)}`}
                          valueColor="#E53E3E"
                        />
                      )}
                      <DetailRow
                        label="Net Earned"
                        value={`+PKR ${tx.amount.toFixed(2)}`}
                        valueColor="#00B374"
                        bold
                      />
                    </View>
                  );
                })()}
              </TouchableOpacity>
            );
          });
        })()}
      </ScrollView>

      {/* Withdraw Modal */}
      <Modal
        visible={withdrawModal}
        transparent
        animationType="fade"
        onRequestClose={() => setWithdrawModal(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={s.modalOverlay}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={s.modalBox}>
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>Request Withdrawal</Text>
                  <TouchableOpacity onPress={() => setWithdrawModal(false)}>
                    <Ionicons name="close" size={22} color="#555" />
                  </TouchableOpacity>
                </View>

                <Text style={s.modalBalanceLbl}>Available Balance</Text>
                <Text style={s.modalBalanceVal}>
                  PKR {(wallet?.balance ?? 0).toFixed(2)}
                </Text>

                <View style={s.chipRow}>
                  <View style={s.chip}>
                    <Text style={s.chipTxt}>Min PKR {wallet?.limits.minWithdrawal.toLocaleString()}</Text>
                  </View>
                  <View style={s.chip}>
                    <Text style={s.chipTxt}>Max PKR {wallet?.limits.maxPerTransaction.toLocaleString()}</Text>
                  </View>
                  {wallet?.limits.monthlyRemaining !== null && (
                    <View style={[s.chip, { backgroundColor: "#FFF5E6" }]}>
                      <Text style={[s.chipTxt, { color: "#C67C00" }]}>
                        Monthly left: PKR {(wallet?.limits.monthlyRemaining ?? 0).toFixed(0)}
                      </Text>
                    </View>
                  )}
                </View>

                <Text style={s.inputLabel}>Amount (PKR)</Text>
                <View style={s.inputRow}>
                  <TextInput
                    style={s.modalInput}
                    value={withdrawAmount}
                    onChangeText={(v) => {
                      const digits = v.replace(/[^0-9.]/g, "");
                      const max = effectiveMax();
                      const num = parseFloat(digits);
                      if (!digits) { setWithdrawAmount(""); return; }
                      setWithdrawAmount(isNaN(num) ? digits : String(Math.min(num, max)));
                    }}
                    keyboardType="numeric"
                    placeholder="Enter amount"
                    placeholderTextColor="#AAA"
                  />
                  <TouchableOpacity
                    style={s.maxBtn}
                    onPress={() => setWithdrawAmount(String(effectiveMax()))}
                  >
                    <Text style={s.maxBtnTxt}>Max</Text>
                  </TouchableOpacity>
                </View>

                {/* Fee breakdown — shown only when amount is entered */}
                {!!withdrawAmount && !isNaN(parseFloat(withdrawAmount)) && parseFloat(withdrawAmount) > 0 && (() => {
                  const amt    = parseFloat(withdrawAmount);
                  const fee    = +(amt * 0.02).toFixed(2);
                  const payout = +(amt - fee).toFixed(2);
                  return (
                    <View style={s.feeBox}>
                      <View style={s.feeRow}>
                        <Text style={s.feeLbl}>Requested amount</Text>
                        <Text style={s.feeVal}>PKR {amt.toFixed(2)}</Text>
                      </View>
                      <View style={s.feeRow}>
                        <Text style={s.feeLbl}>Processing fee (2%)</Text>
                        <Text style={[s.feeVal, { color: "#E53E3E" }]}>− PKR {fee.toFixed(2)}</Text>
                      </View>
                      <View style={s.feeDivider} />
                      <View style={s.feeRow}>
                        <Text style={[s.feeLbl, { fontWeight: "700", color: "#1A1D2E" }]}>You will receive</Text>
                        <Text style={[s.feeVal, { fontWeight: "800", color: "#00B374" }]}>PKR {payout.toFixed(2)}</Text>
                      </View>
                    </View>
                  );
                })()}

                <Text style={s.withdrawNote}>Processing time: within 24 hours · 2% fee applies to all plans</Text>

                <TouchableOpacity
                  style={[s.confirmBtn, (withdrawLoading || withdrawDisabled()) && { opacity: 0.4 }]}
                  onPress={handleWithdraw}
                  disabled={withdrawLoading || withdrawDisabled()}
                >
                  {withdrawLoading
                    ? <ActivityIndicator color="#FFF" size="small" />
                    : <Text style={s.confirmBtnTxt}>Confirm Withdrawal</Text>}
                </TouchableOpacity>
              </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ── Small helper component ───────────────────────────────────────────────────
function DetailRow({
  label,
  value,
  valueColor,
  bold,
}: {
  label: string;
  value: string;
  valueColor?: string;
  bold?: boolean;
}) {
  return (
    <View style={s.txDetailRow}>
      <Text style={s.txDetailLbl}>{label}</Text>
      <Text
        style={[
          s.txDetailVal,
          valueColor ? { color: valueColor } : undefined,
          bold ? { fontWeight: "800" } : undefined,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F5F7FF" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    backgroundColor: "#6B7FED",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#FFF" },

  // Balance card
  balanceCard: {
    margin: 16,
    borderRadius: 20,
    backgroundColor: "#6B7FED",
    padding: 22,
    shadowColor: "#6B7FED",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  balanceTopRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  balanceLabel: { color: "rgba(255,255,255,0.85)", fontSize: 14, fontWeight: "600", flex: 1 },
  planBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  planBadgeTxt: { color: "#FFF", fontSize: 11, fontWeight: "700" },
  balanceAmount: { color: "#FFF", fontSize: 32, fontWeight: "800", marginBottom: 20 },
  balanceStatsRow: { flexDirection: "row", alignItems: "center" },
  balanceStat: { flex: 1, alignItems: "center" },
  balanceStatVal: { color: "#FFF", fontSize: 13, fontWeight: "700" },
  balanceStatLbl: { color: "rgba(255,255,255,0.7)", fontSize: 10, marginTop: 2 },
  balanceStatDivider: { width: 1, height: 28, backgroundColor: "rgba(255,255,255,0.3)" },

  // Limits card
  limitsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  limitsTitle: { fontSize: 13, fontWeight: "700", color: "#3D4A8A", marginBottom: 14 },
  limitsGrid: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  limitItem: { flex: 1, alignItems: "center" },
  limitVal: { fontSize: 13, fontWeight: "800", color: "#1A1D2E" },
  limitLbl: { fontSize: 10, color: "#9099B5", marginTop: 2 },
  limitDivider: { width: 1, height: 28, backgroundColor: "#E8EAF6" },
  monthlyRow: { gap: 6 },
  monthlyBarBg: {
    height: 6,
    backgroundColor: "#F0F4FF",
    borderRadius: 4,
    overflow: "hidden",
  },
  monthlyBarFill: { height: "100%", borderRadius: 4 },
  monthlyTxt: { fontSize: 11, color: "#9099B5" },
  unlimitedTxt: { fontSize: 11, color: "#00B374", fontWeight: "600" },

  // Withdraw button
  withdrawBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#E53E3E",
    marginHorizontal: 16,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 24,
  },
  withdrawBtnTxt: { color: "#FFF", fontSize: 15, fontWeight: "700" },

  // Section
  sectionTitleRow:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginHorizontal: 16, marginBottom: 10 },
  sectionTitle:      { fontSize: 15, fontWeight: "700", color: "#1A1D2E" },
  filterBtn:         { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: "#6B7FED" },
  filterBtnActive:   { backgroundColor: "#6B7FED" },
  filterBtnTxt:      { fontSize: 11, fontWeight: "700", color: "#FFF" },
  filterOverlay:     { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  filterSheet:       { backgroundColor: "#FFF", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
  filterSheetTitle:  { fontSize: 15, fontWeight: "700", color: "#1A1D2E", marginBottom: 16 },
  filterOption:      { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: "#F0F4FF" },
  filterOptionActive:{ backgroundColor: "#F0F4FF", borderRadius: 10, paddingHorizontal: 10 },
  filterOptionTxt:   { fontSize: 14, color: "#1A1D2E", flex: 1 },

  // Empty
  emptyBox: { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyTxt: { fontSize: 15, fontWeight: "600", color: "#9099B5" },
  emptyHint: { fontSize: 12, color: "#B0B7CE" },

  // Transaction card
  txCard: {
    backgroundColor: "#FFF",
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  txCardWithdraw: { borderLeftWidth: 3, borderLeftColor: "#E53E3E" },
  txCardEarning:  { borderLeftWidth: 3, borderLeftColor: "#6B7FED" },

  // Header row inside card
  txHeaderRow: { flexDirection: "row", alignItems: "flex-start" },
  txIconBox: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "#F0F4FF",
    justifyContent: "center", alignItems: "center",
    marginRight: 12,
    flexShrink: 0,
  },
  txBody: { flex: 1, minWidth: 0 },
  txDesc: { fontSize: 13, fontWeight: "600", color: "#1A1D2E" },
  txDate: { fontSize: 11, color: "#9099B5", marginTop: 2 },
  txPointsUsed: { fontSize: 11, color: "#00B374", marginTop: 2 },
  txStatusBadge: { alignSelf: "flex-start", marginTop: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  txStatusTxt: { fontSize: 10, fontWeight: "700" },

  // Amount column (right side of header row)
  txRight: { alignItems: "flex-end", flexShrink: 0, marginLeft: 8 },
  txAmount: { fontSize: 14, fontWeight: "700" },
  txAmountCredit: { color: "#00B374" },
  txAmountDebit:  { color: "#E53E3E" },

  // Expanded details section
  txExpandBox: { marginTop: 4 },
  txExpandDivider: { height: 1, backgroundColor: "#F0F4FF", marginVertical: 10 },
  txDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 3,
  },
  txDetailLbl: { fontSize: 12, color: "#9099B5", flex: 1 },
  txDetailVal: { fontSize: 12, fontWeight: "600", color: "#1A1D2E", textAlign: "right", flexShrink: 1 },
  txProcessNote: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
  txProcessTxt:  { fontSize: 11, color: "#F6A623", fontWeight: "600" },

  // Bank linked banner
  bankWarningBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FFF3CD", borderRadius: 12, padding: 12, marginHorizontal: 16, marginBottom: 10 },
  bankWarningTxt:    { flex: 1, fontSize: 12, color: "#856404", fontWeight: "600" },
  bankLinkedBanner:  { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#D4F8E8", borderRadius: 12, padding: 12, marginHorizontal: 16, marginBottom: 10 },
  bankLinkedTxt:     { fontSize: 13, fontWeight: "700", color: "#1A1D2E" },
  bankLinkedSub:     { fontSize: 11, color: "#555", marginTop: 1 },
  bankChangeBtn:     { fontSize: 12, fontWeight: "700", color: "#00B374" },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalBox: { backgroundColor: "#FFF", borderRadius: 20, padding: 24, width: "100%" },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16,
  },
  modalTitle: { fontSize: 17, fontWeight: "800", color: "#1A1D2E" },
  modalBalanceLbl: { fontSize: 11, color: "#9099B5", fontWeight: "600" },
  modalBalanceVal: { fontSize: 22, fontWeight: "800", color: "#6B7FED", marginBottom: 16 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 16 },
  chip: {
    backgroundColor: "#F0F4FF",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipTxt: { fontSize: 11, fontWeight: "600", color: "#3D4A8A" },
  inputLabel: { fontSize: 12, fontWeight: "600", color: "#555", marginBottom: 8 },
  inputRow: { flexDirection: "row", gap: 10, marginBottom: 6 },
  modalInput: {
    flex: 1,
    backgroundColor: "#F5F7FF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1A1D2E",
    borderWidth: 1,
    borderColor: "#E8EAF6",
  },
  maxBtn: {
    backgroundColor: "#6B7FED", borderRadius: 12, paddingHorizontal: 16, justifyContent: "center",
  },
  maxBtnTxt: { color: "#FFF", fontWeight: "700", fontSize: 13 },
  withdrawNote: { fontSize: 11, color: "#9099B5", marginBottom: 20 },
  feeBox:       { backgroundColor: "#F5F7FF", borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: "#E8EAF6" },
  feeRow:       { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 },
  feeLbl:       { fontSize: 12, color: "#9099B5" },
  feeVal:       { fontSize: 12, color: "#1A1D2E", fontWeight: "600" },
  feeDivider:   { height: 1, backgroundColor: "#E8EAF6", marginVertical: 4 },
  confirmBtn: {
    backgroundColor: "#E53E3E", borderRadius: 14, paddingVertical: 14, alignItems: "center",
  },
  confirmBtnTxt: { color: "#FFF", fontSize: 15, fontWeight: "700" },
});
