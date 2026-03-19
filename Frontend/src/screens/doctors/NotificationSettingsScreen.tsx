import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { RootStackParamList } from "../../../App";
import apiClient from "../../services/api";

type Nav   = NativeStackNavigationProp<RootStackParamList, "NotificationSettings">;
type Route = RouteProp<RootStackParamList, "NotificationSettings">;

interface Settings {
  emailEnabled:    boolean;
  pushEnabled: boolean;
}

// Configure how notifications appear when the app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    Alert.alert("Push notifications only work on a physical device.");
    return null;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    Alert.alert(
      "Permission required",
      "Please enable notifications in your device settings to receive appointment alerts.",
    );
    return null;
  }

  // Android channel is created at app startup in App.tsx

  const tokenData = await Notifications.getExpoPushTokenAsync();
  return tokenData.data;
}

export default function NotificationSettingsScreen() {
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route      = useRoute<Route>();
  const { doctorId } = route.params;

  const [settings, setSettings] = useState<Settings>({
    emailEnabled:    false,
    pushEnabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  useFocusEffect(
    useCallback(() => {
      apiClient
        .get(`/doctors/${doctorId}/notification-settings`)
        .then((r) => {
          const d: Settings = r.data?.data ?? {};
          setSettings(d);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, [doctorId]),
  );

  const save = async (patch: Partial<Settings>) => {
    setSaving(true);
    try {
      const res = await apiClient.patch(`/doctors/${doctorId}/notification-settings`, patch);
      const updated: Settings = res.data?.data ?? settings;
      setSettings(updated);

      // When app notifications are enabled, register for push and save the token
      if (patch.pushEnabled === true) {
        try {
          const token = await registerForPushNotifications();
          if (token) {
            await apiClient.patch(`/doctors/${doctorId}/push-token`, { token });
            console.log("[PushNotif] Token saved:", token.slice(0, 30) + "...");
          }
        } catch (e) {
          console.warn("[PushNotif] Token registration failed:", e);
        }
      }

      // When app notifications are disabled, clear the stored token
      if (patch.pushEnabled === false) {
        try {
          await apiClient.patch(`/doctors/${doctorId}/push-token`, { token: null });
        } catch (e) {
          console.warn("[PushNotif] Token clear failed:", e);
        }
      }
    } catch {
      Alert.alert("Error", "Could not save settings.");
    } finally {
      setSaving(false);
    }
  };

  const toggle = (key: keyof Settings, value: boolean) => {
    const patch = { [key]: value };
    setSettings((p) => ({ ...p, ...patch }));
    save(patch);
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
          <Text style={s.headerTitle}>Appointment Alerts</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={s.hint}>
            Choose how you'd like to be notified when a patient books an appointment.
          </Text>

          {/* ── App Notifications ── */}
          <Text style={s.sectionTitle}>In-App</Text>
          <View style={s.card}>
            <Row
              icon={<Ionicons name="notifications" size={20} color="#6B7FED" />}
              label="App Notifications"
              sublabel="Receive OS banner alerts when a patient books"
              right={
                <Switch
                  value={settings.pushEnabled}
                  onValueChange={(v) => toggle("pushEnabled", v)}
                  trackColor={{ false: "#DDE", true: "#6B7FED" }}
                  thumbColor="#FFF"
                />
              }
            />
          </View>
          {settings.pushEnabled && (
            <View style={s.infoBox}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#6B7FED" />
              <Text style={[s.infoTxt, { color: "#6B7FED" }]}>
                You'll receive a banner notification on your device when a patient books.
              </Text>
            </View>
          )}

          {/* ── Email ── */}
          <Text style={s.sectionTitle}>Email</Text>
          <View style={s.card}>
            <Row
              icon={<Ionicons name="mail" size={20} color="#00B374" />}
              label="Email Alerts"
              sublabel="Get an email with full appointment details"
              right={
                <Switch
                  value={settings.emailEnabled}
                  onValueChange={(v) => toggle("emailEnabled", v)}
                  trackColor={{ false: "#DDE", true: "#00B374" }}
                  thumbColor="#FFF"
                />
              }
            />
          </View>
          {settings.emailEnabled && (
            <View style={s.infoBox}>
              <Ionicons name="information-circle-outline" size={16} color="#00B374" />
              <Text style={s.infoTxt}>
                Email will be sent to your registered email address.
              </Text>
            </View>
          )}

        </ScrollView>
      </View>
  );
}

function Row({
  icon, label, sublabel, right,
}: {
  icon: React.ReactNode; label: string; sublabel?: string; right?: React.ReactNode;
}) {
  return (
    <View style={s.row}>
      <View style={s.rowIcon}>{icon}</View>
      <View style={s.rowBody}>
        <Text style={s.rowLabel}>{label}</Text>
        {sublabel ? <Text style={s.rowSub}>{sublabel}</Text> : null}
      </View>
      {right}
    </View>
  );
}

const s = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: "#F0F4FF" },
  centered:{ flex: 1, justifyContent: "center", alignItems: "center" },

  header: {
    backgroundColor: "#6B7FED",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#FFF" },

  hint: {
    fontSize: 13, color: "#888", marginHorizontal: 20,
    marginTop: 16, marginBottom: 4, lineHeight: 18,
  },

  sectionTitle: {
    fontSize: 12, fontWeight: "700", color: "#888",
    letterSpacing: 0.8, textTransform: "uppercase",
    marginTop: 20, marginBottom: 6, marginHorizontal: 20,
  },

  card: {
    backgroundColor: "#FFF", borderRadius: 16,
    marginHorizontal: 16, overflow: "hidden",
  },

  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14 },
  rowIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "#F0F4FF",
    alignItems: "center", justifyContent: "center", marginRight: 14,
  },
  rowBody: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: "600", color: "#1A1D2E" },
  rowSub:   { fontSize: 12, color: "#999", marginTop: 2 },

  infoBox: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginHorizontal: 16, marginTop: 8, padding: 12,
    backgroundColor: "#D4F8E8", borderRadius: 10,
  },
  infoTxt: { fontSize: 12, color: "#00B374", fontWeight: "600", flex: 1 },
});
