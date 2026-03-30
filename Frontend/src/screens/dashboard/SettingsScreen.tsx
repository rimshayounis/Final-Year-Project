import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  StatusBar,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { RootStackParamList } from "../../../App";
import apiClient from "../../services/api";

async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    Alert.alert(
      "Permission required",
      "Please enable notifications in your device settings.",
    );
    return null;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  return tokenData.data;
}

type SettingsNav   = NativeStackNavigationProp<RootStackParamList, "Settings">;
type SettingsRoute = RouteProp<RootStackParamList, "Settings">;

/* ── Reusable row ──────────────────────────────────────────────────────────── */
function SettingRow({
  icon, label, sublabel, onPress, right, danger,
}: {
  icon:      React.ReactNode;
  label:     string;
  sublabel?: string;
  onPress?:  () => void;
  right?:    React.ReactNode;
  danger?:   boolean;
}) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={onPress ? 0.6 : 1}
    >
      <View style={styles.rowIcon}>{icon}</View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowLabel, danger && { color: "#E53E3E" }]}>
          {label}
        </Text>
        {sublabel ? (
          <Text style={styles.rowSublabel} numberOfLines={2}>
            {sublabel}
          </Text>
        ) : null}
      </View>
      {right ?? (
        onPress ? (
          <Ionicons name="chevron-forward" size={18} color="#C0C5D8" />
        ) : null
      )}
    </TouchableOpacity>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

/* ── Generic two-field modal ───────────────────────────────────────────────── */
type FieldConfig = {
  key:         string;
  label:       string;
  placeholder: string;
  secure?:     boolean;
};

function FormModal({
  visible, title, fields, values, onChange,
  onSubmit, onClose, loading, submitLabel, footerNode,
}: {
  visible:       boolean;
  title:         string;
  fields:        FieldConfig[];
  values:        Record<string, string>;
  onChange:      (key: string, val: string) => void;
  onSubmit:      () => void;
  onClose:       () => void;
  loading:       boolean;
  submitLabel?:  string;
  footerNode?:   React.ReactNode;
}) {
  const [shown, setShown] = useState<Record<string, boolean>>({});

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ width: "100%" }}
          >
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalBox}>
                {/* Header */}
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{title}</Text>
                  <TouchableOpacity onPress={onClose}>
                    <Ionicons name="close" size={22} color="#555" />
                  </TouchableOpacity>
                </View>

                {fields.map((f) => (
                  <View key={f.key} style={styles.fieldWrap}>
                    <Text style={styles.fieldLabel}>{f.label}</Text>
                    <View style={styles.fieldRow}>
                      <TextInput
                        style={styles.fieldInput}
                        value={values[f.key] ?? ""}
                        onChangeText={(v) => onChange(f.key, v)}
                        placeholder={f.placeholder}
                        placeholderTextColor="#AAA"
                        secureTextEntry={f.secure && !shown[f.key]}
                        autoCapitalize="none"
                      />
                      {f.secure && (
                        <TouchableOpacity
                          style={styles.eyeBtn}
                          onPress={() =>
                            setShown((p) => ({ ...p, [f.key]: !p[f.key] }))
                          }
                        >
                          <Ionicons
                            name={shown[f.key] ? "eye-off-outline" : "eye-outline"}
                            size={20}
                            color="#9099B5"
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}

                {footerNode}

                <TouchableOpacity
                  style={[styles.submitBtn, loading && { opacity: 0.5 }]}
                  onPress={onSubmit}
                  disabled={loading}
                >
                  {loading
                    ? <ActivityIndicator color="#FFF" size="small" />
                    : <Text style={styles.submitBtnTxt}>
                        {submitLabel ?? "Save"}
                      </Text>
                  }
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN SCREEN
══════════════════════════════════════════════════════════════════════════════ */
export default function SettingsScreen() {
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation<SettingsNav>();
  const route      = useRoute<SettingsRoute>();
  const { id, role } = route.params;

  // ── Notification state ────────────────────────────────────────────────────
  const [pushEnabled,  setPushEnabled]  = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [doctorPlan,   setDoctorPlan]   = useState<string>("free_trial");

  // ── Verification state ────────────────────────────────────────────────────
  const [verifModal, setVerifModal] = useState(false);
  const [verifData,  setVerifData]  = useState<{
    isVerified:        boolean;
    isRejected:        boolean;
    rejectionReason:   string | null;
    licenseNumber:     string | null;
    specialization:    string;
    certificatesCount: number;
    fullName:          string;
    email:             string;
  } | null>(null);

  // ── Password modal state ──────────────────────────────────────────────────
  const [pwdModal,   setPwdModal]   = useState(false);
  const [pwdFields,  setPwdFields]  = useState<Record<string, string>>({});
  const [pwdLoading, setPwdLoading] = useState(false);

  // ── SOS message state ─────────────────────────────────────────────────────
  const [sosMessage,      setSosMessage]      = useState(
    'I need emergency help! Please contact me immediately.'
  );
  const [sosModal,        setSosModal]        = useState(false);
  const [sosLoading,      setSosLoading]      = useState(false);
  const [sosMessageDraft, setSosMessageDraft] = useState('');

  /* ── Load data on mount ──────────────────────────────────────────────────── */
  useEffect(() => {
    if (role === "doctor") {
      apiClient.get(`/doctors/${id}`)
        .then((res) => {
          const d = res.data?.doctor ?? res.data ?? {};
          setDoctorPlan(d.subscriptionPlan ?? "free_trial");
          setVerifData(prev => ({
            ...(prev ?? {
              isVerified: false, isRejected: false,
              rejectionReason: null, licenseNumber: null,
              specialization: '', certificatesCount: 0,
            }),
            fullName: d.fullName ?? '',
            email:    d.email    ?? '',
          }));
        })
        .catch(() => {});

      apiClient.get(`/doctors/${id}/verification-status`)
        .then((res) => {
          const v = res.data ?? {};
          setVerifData(prev => ({
            ...(prev ?? { fullName: '', email: '' }),
            isVerified:        v.isVerified        ?? false,
            isRejected:        v.isRejected        ?? false,
            rejectionReason:   v.rejectionReason   ?? null,
            licenseNumber:     v.licenseNumber     ?? null,
            specialization:    v.specialization    ?? '',
            certificatesCount: v.certificatesCount ?? 0,
          }));
        })
        .catch(() => {});
    }

    if (role === "user") {
      // Load notification settings
      apiClient.get(`/users/${id}/notification-settings`)
        .then((res) => {
          const d = res.data?.data ?? {};
          if (d.pushEnabled  !== undefined) setPushEnabled(d.pushEnabled);
          if (d.emailEnabled !== undefined) setEmailEnabled(d.emailEnabled);
        })
        .catch(() => {});

      // 👇 Load SOS message
      apiClient.get(`/users/${id}`)
        .then((res) => {
          const u = res.data;
          if (u?.sosMessage) setSosMessage(u.sosMessage);
        })
        .catch(() => {});
    }
  }, [id, role]);

  /* ── Handlers ────────────────────────────────────────────────────────────── */
  const handlePushToggle = async (value: boolean) => {
    setPushEnabled(value);
    try {
      await apiClient.patch(`/users/${id}/notification-settings`, {
        pushEnabled: value,
      });
    } catch { /* silent */ }

    if (value) {
      try {
        const token = await registerForPushNotifications();
        if (token) {
          await apiClient.patch(`/users/${id}/push-token`, { token });
        }
      } catch (e) {
        console.warn("[PushNotif] Registration failed:", e);
      }
    } else {
      try {
        await apiClient.patch(`/users/${id}/push-token`, { token: null });
      } catch { /* silent */ }
    }
  };

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text:    "Log Out",
        style:   "destructive",
        onPress: () =>
          navigation.reset({ index: 0, routes: [{ name: "LoginType" }] }),
      },
    ]);
  };

  const handleChangePassword = async () => {
    const { oldPassword, newPassword, confirmPassword } = pwdFields;
    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert("Missing fields", "Please fill in all fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Mismatch", "New passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert("Too short", "Password must be at least 8 characters.");
      return;
    }
    setPwdLoading(true);
    try {
      const endpoint = role === "doctor"
        ? `/doctors/${id}/change-password`
        : `/users/${id}/change-password`;
      await apiClient.patch(endpoint, { oldPassword, newPassword });
      Alert.alert("Success", "Password changed successfully.");
      setPwdModal(false);
      setPwdFields({});
    } catch (e: any) {
      Alert.alert(
        "Error",
        e?.response?.data?.message || "Failed to change password.",
      );
    } finally {
      setPwdLoading(false);
    }
  };

  // 👇 NEW — Save SOS message
  const handleSaveSosMessage = async () => {
    if (!sosMessageDraft.trim()) {
      Alert.alert('Error', 'SOS message cannot be empty.');
      return;
    }
    setSosLoading(true);
    try {
      await apiClient.patch(`/users/${id}/sos-message`, {
        sosMessage: sosMessageDraft.trim(),
      });
      setSosMessage(sosMessageDraft.trim());
      setSosModal(false);
      Alert.alert('✅ Saved', 'Your SOS message has been updated.');
    } catch {
      Alert.alert('Error', 'Failed to save SOS message.');
    } finally {
      setSosLoading(false);
    }
  };

  /* ══════════════════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════════════════ */
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#6B7FED" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── ACCOUNT ── */}
        <SectionHeader title="Account" />
        <View style={styles.card}>
          <SettingRow
            icon={<Ionicons name="lock-closed-outline" size={20} color="#6B7FED" />}
            label="Change Password"
            sublabel="Update your password"
            onPress={() => { setPwdFields({}); setPwdModal(true); }}
          />
        </View>

        {/* ── ROLE SPECIFIC ── */}
        {role === "user" ? (
          <>
            {/* Health */}
            <SectionHeader title="Health" />
            <View style={styles.card}>
              <SettingRow
                icon={<Ionicons name="heart-outline" size={20} color="#00B374" />}
                label="Health Profile"
                sublabel="Sleep, stress, diet"
                onPress={() =>
                  navigation.navigate("HealthProfile", { userId: id })
                }
              />
              <View style={styles.divider} />
              <SettingRow
                icon={<Ionicons name="call-outline" size={20} color="#00B374" />}
                label="Emergency Contacts"
                sublabel="Manage your emergency contacts"
                onPress={() =>
                  navigation.navigate("EmergencyContact", { userId: id })
                }
              />
            </View>

            {/* 👇 NEW — SOS Emergency */}
            <SectionHeader title="SOS Emergency" />
            <View style={styles.card}>
              <SettingRow
                icon={
                  <Ionicons name="warning-outline" size={20} color="#FF0000" />
                }
                label="SOS Message"
                sublabel={sosMessage}
                onPress={() => {
                  setSosMessageDraft(sosMessage);
                  setSosModal(true);
                }}
              />
            </View>
          </>
        ) : (
          <>
            {/* Doctor section — unchanged */}
            <SectionHeader title="Practice" />
            <View style={styles.card}>
              <SettingRow
                icon={
                  <Ionicons name="calendar-outline" size={20} color="#00B374" />
                }
                label="Manage Appointments"
                sublabel="Set your available slots"
                onPress={() =>
                  navigation.navigate("CreateAppointment", { doctorId: id })
                }
              />
              <View style={styles.divider} />
              <SettingRow
                icon={
                  <FontAwesome5
                    name="user-md"
                    size={16}
                    color="#00B374"
                    style={{ marginLeft: 2 }}
                  />
                }
                label="Verification Status"
                sublabel={
                  verifData?.isVerified   ? "✓ Verified"
                  : verifData?.isRejected ? "Rejected — tap for details"
                  : "Pending review"
                }
                onPress={() => setVerifModal(true)}
              />
              <View style={styles.divider} />
              <SettingRow
                icon={
                  <MaterialIcons
                    name="card-membership"
                    size={20}
                    color="#6B7FED"
                  />
                }
                label="Manage Subscription"
                sublabel="View or change your plan"
                onPress={() =>
                  navigation.navigate("DoctorSubscription", {
                    doctorId:   id,
                    doctorName: "",
                    isVerified: true,
                  })
                }
              />
              <View style={styles.divider} />
              <SettingRow
                icon={
                  <Ionicons
                    name="notifications-outline"
                    size={20}
                    color="#F6A623"
                  />
                }
                label="Appointment Alerts"
                sublabel="Email, WhatsApp & app notifications"
                onPress={() =>
                  navigation.navigate("NotificationSettings", { doctorId: id })
                }
              />
              <View style={styles.divider} />
              <SettingRow
                icon={
                  <Ionicons name="card-outline" size={20} color="#6B7FED" />
                }
                label="Bank Details"
                sublabel="Link your bank account for withdrawals"
                onPress={() =>
                  navigation.navigate("BankDetails", { doctorId: id })
                }
              />
              <View style={styles.divider} />
              <View
                style={
                  doctorPlan === "free_trial" ? styles.blurRow : undefined
                }
              >
                <SettingRow
                  icon={
                    <Ionicons
                      name="wallet-outline"
                      size={20}
                      color={
                        doctorPlan === "free_trial" ? "#C0C5D8" : "#00B374"
                      }
                    />
                  }
                  label="Wallet Management"
                  sublabel={
                    doctorPlan === "free_trial"
                      ? "Upgrade plan to access wallet"
                      : "Balance, conversions & withdrawals"
                  }
                  onPress={
                    doctorPlan === "free_trial"
                      ? () =>
                          Alert.alert(
                            "Upgrade Required",
                            "Wallet is not available on Free Trial.",
                          )
                      : () =>
                          navigation.navigate("Wallet", { doctorId: id })
                  }
                />
              </View>
            </View>
          </>
        )}

        {/* ── NOTIFICATIONS ── */}
        <SectionHeader title="Notifications" />
        <View style={styles.card}>
          <SettingRow
            icon={
              <Ionicons
                name="notifications-outline"
                size={20}
                color="#F6A623"
              />
            }
            label="Push Notifications"
            sublabel={
              role === "user" ? "Likes & comments on your posts" : undefined
            }
            right={
              <Switch
                value={pushEnabled}
                onValueChange={
                  role === "user" ? handlePushToggle : setPushEnabled
                }
                trackColor={{ false: "#DDE", true: "#6B7FED" }}
                thumbColor="#FFF"
              />
            }
          />
          <View style={styles.divider} />
          <SettingRow
            icon={<Ionicons name="mail-outline" size={20} color="#F6A623" />}
            label="Email Notifications"
            right={
              <Switch
                value={emailEnabled}
                onValueChange={setEmailEnabled}
                trackColor={{ false: "#DDE", true: "#6B7FED" }}
                thumbColor="#FFF"
              />
            }
          />
        </View>

        {/* ── PRIVACY ── */}
        <SectionHeader title="Privacy & Security" />
        <View style={styles.card}>
          <SettingRow
            icon={
              <Ionicons name="shield-outline" size={20} color="#6B7FED" />
            }
            label="Privacy Policy"
            onPress={() => navigation.navigate("PrivacyPolicy")}
          />
          <View style={styles.divider} />
          <SettingRow
            icon={
              <Ionicons
                name="document-text-outline"
                size={20}
                color="#6B7FED"
              />
            }
            label="Terms of Service"
            onPress={() => navigation.navigate("TermsOfService")}
          />
        </View>

        {/* ── SUPPORT ── */}
        <SectionHeader title="Support" />
        <View style={styles.card}>
          <SettingRow
            icon={
              <Ionicons name="help-circle-outline" size={20} color="#888" />
            }
            label="Help & FAQ"
            onPress={() => navigation.navigate("HelpFAQ")}
          />
          <View style={styles.divider} />
          <SettingRow
            icon={
              <MaterialIcons name="support-agent" size={20} color="#888" />
            }
            label="Contact Support"
            onPress={() =>
              navigation.navigate("ContactSupport", { id, role })
            }
          />
        </View>

        {/* ── DANGER ── */}
        <SectionHeader title="Account Actions" />
        <View style={styles.card}>
          <SettingRow
            icon={
              <Ionicons name="log-out-outline" size={20} color="#E53E3E" />
            }
            label="Log Out"
            danger
            onPress={handleLogout}
          />
        </View>
      </ScrollView>

      {/* ── Change Password Modal ── */}
      <FormModal
        visible={pwdModal}
        title="Change Password"
        fields={[
          {
            key:         "oldPassword",
            label:       "Current Password",
            placeholder: "Enter current password",
            secure:      true,
          },
          {
            key:         "newPassword",
            label:       "New Password",
            placeholder: "At least 8 characters",
            secure:      true,
          },
          {
            key:         "confirmPassword",
            label:       "Confirm Password",
            placeholder: "Repeat new password",
            secure:      true,
          },
        ]}
        values={pwdFields}
        onChange={(k, v) => setPwdFields((p) => ({ ...p, [k]: v }))}
        onSubmit={handleChangePassword}
        onClose={() => { setPwdModal(false); setPwdFields({}); }}
        loading={pwdLoading}
        submitLabel="Update Password"
        footerNode={
          <TouchableOpacity
            style={styles.forgotLink}
            onPress={() => {
              setPwdModal(false);
              Alert.alert(
                "Forgot Password",
                "A password reset link will be sent to your registered email.",
                [{ text: "OK" }],
              );
            }}
          >
            <Text style={styles.forgotTxt}>Forgot your password?</Text>
          </TouchableOpacity>
        }
      />

      {/* ── 👇 NEW SOS Message Modal ── */}
      <Modal
        visible={sosModal}
        transparent
        animationType="fade"
        onRequestClose={() => setSosModal(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.overlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={{ width: "100%" }}
            >
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={styles.modalBox}>

                  {/* Header */}
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>🚨 SOS Message</Text>
                    <TouchableOpacity onPress={() => setSosModal(false)}>
                      <Ionicons name="close" size={22} color="#555" />
                    </TouchableOpacity>
                  </View>

                  {/* Info text */}
                  <Text style={styles.sosInfoText}>
                    This message will be sent to your emergency contacts
                    when you trigger SOS. Keep it short and clear.
                  </Text>

                  {/* Input */}
                  <View style={styles.fieldWrap}>
                    <Text style={styles.fieldLabel}>Your SOS Message</Text>
                    <View style={[styles.fieldRow, styles.sosInputContainer]}>
                      <TextInput
                        style={[styles.fieldInput, styles.sosTextInput]}
                        value={sosMessageDraft}
                        onChangeText={setSosMessageDraft}
                        placeholder="e.g. I need emergency help! I am at this location."
                        placeholderTextColor="#AAA"
                        multiline
                        maxLength={200}
                      />
                    </View>
                    {/* Character count */}
                    <Text style={styles.charCount}>
                      {sosMessageDraft.length}/200
                    </Text>
                  </View>

                  {/* Save button */}
                  <TouchableOpacity
                    style={[
                      styles.submitBtn,
                      styles.sosSubmitBtn,
                      sosLoading && { opacity: 0.5 },
                    ]}
                    onPress={handleSaveSosMessage}
                    disabled={sosLoading}
                  >
                    {sosLoading
                      ? <ActivityIndicator color="#FFF" size="small" />
                      : <Text style={styles.submitBtnTxt}>
                          Save SOS Message
                        </Text>
                    }
                  </TouchableOpacity>

                </View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── Verification Status Modal ── */}
      <Modal
        visible={verifModal}
        transparent
        animationType="fade"
        onRequestClose={() => setVerifModal(false)}
      >
        <View style={styles.overlay}>
          <View style={[styles.modalBox, { padding: 0, overflow: "hidden" }]}>
            <View
              style={[
                styles.verifHeader,
                {
                  backgroundColor:
                    verifData?.isVerified ? "#059669"
                    : verifData?.isRejected ? "#dc2626"
                    : "#6B7FED",
                },
              ]}
            >
              <MaterialIcons
                name={
                  verifData?.isVerified ? "verified"
                  : verifData?.isRejected ? "cancel"
                  : "schedule"
                }
                size={36}
                color="#fff"
              />
              <Text style={styles.verifHeaderTitle}>
                {verifData?.isVerified   ? "Verified"
                : verifData?.isRejected  ? "Rejected"
                : "Pending Review"}
              </Text>
              <TouchableOpacity
                style={styles.verifClose}
                onPress={() => setVerifModal(false)}
              >
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ padding: 20 }}
              showsVerticalScrollIndicator={false}
            >
              <VerifRow label="Full Name"      value={verifData?.fullName       || "—"} />
              <VerifRow label="Email"          value={verifData?.email          || "—"} />
              <VerifRow label="Specialization" value={verifData?.specialization || "—"} />
              <VerifRow label="License Number" value={verifData?.licenseNumber  || "N/A"} />
              <VerifRow
                label="Certificates"
                value={`${verifData?.certificatesCount ?? 0} uploaded`}
              />
              <VerifRow
                label="Status"
                value={
                  verifData?.isVerified  ? "Verified ✓"
                  : verifData?.isRejected ? "Rejected ✕"
                  : "Under Review ⏳"
                }
                valueColor={
                  verifData?.isVerified  ? "#059669"
                  : verifData?.isRejected ? "#dc2626"
                  : "#d97706"
                }
              />
              {verifData?.isRejected && !verifData?.isVerified && (
                <View style={styles.verifRejectBox}>
                  <Text style={styles.verifRejectLabel}>
                    Rejection Reason
                  </Text>
                  <Text style={styles.verifRejectText}>
                    {verifData.rejectionReason || "No reason provided."}
                  </Text>
                </View>
              )}
              <View style={{ height: 12 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

    </View>
  );
}

/* ── VerifRow helper ───────────────────────────────────────────────────────── */
function VerifRow({
  label, value, valueColor,
}: {
  label:       string;
  value:       string;
  valueColor?: string;
}) {
  return (
    <View style={styles.verifRow}>
      <Text style={styles.verifRowLabel}>{label}</Text>
      <Text
        style={[
          styles.verifRowValue,
          valueColor ? { color: valueColor, fontWeight: "700" } : {},
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

/* ── Styles ────────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: "#F0F4FF" },

  header: {
    backgroundColor:  "#6B7FED",
    flexDirection:    "row",
    alignItems:       "center",
    justifyContent:   "space-between",
    paddingHorizontal: 20,
    paddingBottom:    8,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#FFF" },

  sectionHeader: {
    fontSize:         12,
    fontWeight:       "700",
    color:            "#888",
    letterSpacing:    0.8,
    textTransform:    "uppercase",
    marginTop:        24,
    marginBottom:     6,
    marginHorizontal: 20,
  },

  card: {
    backgroundColor:  "#FFF",
    borderRadius:     16,
    marginHorizontal: 16,
    overflow:         "hidden",
  },

  row: {
    flexDirection:    "row",
    alignItems:       "center",
    paddingHorizontal: 16,
    paddingVertical:  14,
  },
  rowIcon: {
    width:           36,
    height:          36,
    borderRadius:    10,
    backgroundColor: "#F0F4FF",
    alignItems:      "center",
    justifyContent:  "center",
    marginRight:     14,
  },
  rowBody:     { flex: 1 },
  rowLabel:    { fontSize: 15, fontWeight: "600", color: "#1A1D2E" },
  rowSublabel: { fontSize: 12, color: "#999", marginTop: 2 },

  divider:  { height: 1, backgroundColor: "#F0F4FF", marginLeft: 66 },
  blurRow:  { opacity: 0.4 },

  // ── Modal shared ──
  overlay: {
    flex:             1,
    backgroundColor:  "rgba(0,0,0,0.5)",
    justifyContent:   "center",
    alignItems:       "center",
    paddingHorizontal: 24,
  },
  modalBox: {
    backgroundColor: "#FFF",
    borderRadius:    20,
    padding:         24,
    width:           "100%",
  },
  modalHeader: {
    flexDirection:  "row",
    justifyContent: "space-between",
    alignItems:     "center",
    marginBottom:   20,
  },
  modalTitle: { fontSize: 17, fontWeight: "800", color: "#1A1D2E" },

  fieldWrap:  { marginBottom: 14 },
  fieldLabel: {
    fontSize:     12,
    fontWeight:   "600",
    color:        "#555",
    marginBottom: 6,
  },
  fieldRow: {
    flexDirection:    "row",
    alignItems:       "center",
    backgroundColor:  "#F5F7FF",
    borderRadius:     12,
    borderWidth:      1,
    borderColor:      "#E8EAF6",
  },
  fieldInput: {
    flex:             1,
    paddingHorizontal: 14,
    paddingVertical:  12,
    fontSize:         15,
    color:            "#1A1D2E",
  },
  eyeBtn:      { paddingHorizontal: 12 },
  forgotLink:  { alignItems: "flex-end", marginBottom: 16, marginTop: -6 },
  forgotTxt:   { fontSize: 13, color: "#6B7FED", fontWeight: "600" },
  submitBtn: {
    backgroundColor: "#6B7FED",
    borderRadius:    14,
    paddingVertical: 14,
    alignItems:      "center",
    marginTop:       4,
  },
  submitBtnTxt: { color: "#FFF", fontSize: 15, fontWeight: "700" },

  // ── SOS Modal specific ──
  sosInfoText: {
    fontSize:     13,
    color:        "#888",
    marginBottom: 16,
    lineHeight:   18,
  },
  sosInputContainer: {
    height:      100,
    alignItems:  "flex-start",
  },
  sosTextInput: {
    height:            100,
    textAlignVertical: "top",
  },
  charCount: {
    fontSize:   11,
    color:      "#AAA",
    textAlign:  "right",
    marginTop:  4,
  },
  sosSubmitBtn: {
    backgroundColor: "#FF0000", // 👈 red for SOS
  },

  // ── Verification modal ──
  verifHeader: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           10,
    padding:       20,
    paddingTop:    24,
  },
  verifHeaderTitle: {
    flex:       1,
    fontSize:   18,
    fontWeight: "800",
    color:      "#fff",
  },
  verifClose: { padding: 4 },
  verifRow: {
    flexDirection:       "row",
    justifyContent:      "space-between",
    alignItems:          "center",
    paddingVertical:     12,
    borderBottomWidth:   1,
    borderBottomColor:   "#f0f0f5",
  },
  verifRowLabel: { fontSize: 13, color: "#888",    fontWeight: "600" },
  verifRowValue: {
    fontSize:   14,
    color:      "#1A1D2E",
    fontWeight: "500",
    maxWidth:   "60%",
    textAlign:  "right",
  },
  verifRejectBox: {
    backgroundColor: "#fff1f2",
    borderRadius:    12,
    padding:         14,
    marginTop:       14,
    borderWidth:     1,
    borderColor:     "#fecaca",
  },
  verifRejectLabel: {
    fontSize:      11,
    fontWeight:    "700",
    color:         "#dc2626",
    marginBottom:  6,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  verifRejectText: {
    fontSize:   14,
    color:      "#991b1b",
    lineHeight: 20,
  },
});