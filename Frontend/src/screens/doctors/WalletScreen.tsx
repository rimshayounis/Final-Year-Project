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
  monthlyLimit: number | null;   // null = unlimited (premium)
  monthlyUsed: number;
  monthlyRemaining: number | null; // null = unlimited
}

interface WalletTx {
  type: string;
  amount: number;
  pointsUsed: number;
  description: string;
  status: string | null;
  createdAt: string;
}

interface WalletData {
  balance: number;
  totalEarned: number;
  totalWithdrawn: number;
  availablePoints: number;
  plan: string;
  limits: WalletLimits;
  transactions: WalletTx[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-PK", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function TxIcon({ type }: { type: string }) {
  if (type === "points_converted")
    return <Ionicons name="swap-horizontal" size={18} color="#00B374" />;
  if (type.startsWith("withdrawal"))
    return <Ionicons name="arrow-up-circle" size={18} color="#E53E3E" />;
  return <Ionicons name="wallet" size={18} color="#6B7FED" />;
}

function statusColor(status: string | null) {
  if (status === "pending")   return "#F6A623";
  if (status === "completed") return "#00B374";
  if (status === "rejected")  return "#E53E3E";
  return "#6B7FED";
}

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<WalletNav>();
  const route = useRoute<WalletRoute>();
  const { doctorId } = route.params;

  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [withdrawModal, setWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  const fetchWallet = async () => {
    try {
      const res = await apiClient.get(`/wallet/${doctorId}`);
      setWallet(res.data?.data ?? null);
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
    const { maxPerTransaction, monthlyRemaining, balance } = wallet.limits;
    const caps = [maxPerTransaction, balance];
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
      Alert.alert("Requested", `Withdrawal of PKR ${amt} submitted. Processing in 3–5 business days.`);
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
              <Text style={s.balanceStatVal}>{wallet?.availablePoints ?? 0}</Text>
              <Text style={s.balanceStatLbl}>Points Left</Text>
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

            {/* Monthly usage bar */}
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

        {/* Withdraw Button */}
        <TouchableOpacity
          style={[s.withdrawBtn, !(wallet?.balance) && { opacity: 0.4 }]}
          onPress={() => {
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
        <Text style={s.sectionTitle}>Transaction History</Text>

        {(!wallet?.transactions || wallet.transactions.length === 0) ? (
          <View style={s.emptyBox}>
            <Ionicons name="receipt-outline" size={36} color="#C0C5D8" />
            <Text style={s.emptyTxt}>No transactions yet</Text>
            <Text style={s.emptyHint}>Convert your points to see history here</Text>
          </View>
        ) : (
          wallet.transactions.map((tx, i) => (
            <View key={i} style={s.txCard}>
              <View style={s.txIconBox}>
                <TxIcon type={tx.type} />
              </View>
              <View style={s.txBody}>
                <Text style={s.txDesc}>{tx.description}</Text>
                <Text style={s.txDate}>{formatDate(tx.createdAt)}</Text>
                {tx.status && (
                  <View style={[s.txStatusBadge, { backgroundColor: statusColor(tx.status) + "20" }]}>
                    <Text style={[s.txStatusTxt, { color: statusColor(tx.status) }]}>
                      {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[s.txAmount, tx.type === "points_converted" ? s.txAmountCredit : s.txAmountDebit]}>
                {tx.type === "points_converted" ? "+" : "-"}PKR {tx.amount.toFixed(0)}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      {/* Withdraw Modal */}
      <Modal
        visible={withdrawModal}
        transparent
        animationType="fade"
        onRequestClose={() => setWithdrawModal(false)}
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

                {/* Limit chips */}
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

                <Text style={s.withdrawNote}>Processing time: 3–5 business days</Text>

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
      </Modal>
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
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#1A1D2E", marginHorizontal: 16, marginBottom: 10 },

  // Empty
  emptyBox: { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyTxt: { fontSize: 15, fontWeight: "600", color: "#9099B5" },
  emptyHint: { fontSize: 12, color: "#B0B7CE" },

  // Transaction card
  txCard: {
    flexDirection: "row",
    alignItems: "center",
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
  txIconBox: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "#F0F4FF",
    justifyContent: "center", alignItems: "center", marginRight: 12,
  },
  txBody: { flex: 1 },
  txDesc: { fontSize: 13, fontWeight: "600", color: "#1A1D2E" },
  txDate: { fontSize: 11, color: "#9099B5", marginTop: 2 },
  txStatusBadge: { alignSelf: "flex-start", marginTop: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  txStatusTxt: { fontSize: 10, fontWeight: "700" },
  txAmount: { fontSize: 14, fontWeight: "700", marginLeft: 8 },
  txAmountCredit: { color: "#00B374" },
  txAmountDebit: { color: "#E53E3E" },

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
  confirmBtn: {
    backgroundColor: "#E53E3E", borderRadius: 14, paddingVertical: 14, alignItems: "center",
  },
  confirmBtnTxt: { color: "#FFF", fontSize: 15, fontWeight: "700" },
});
