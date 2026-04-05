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
import { RootStackParamList } from "../../../App";
import apiClient from "../../services/api";

type Nav   = NativeStackNavigationProp<RootStackParamList, "NotificationSettings">;
type Route = RouteProp<RootStackParamList, "NotificationSettings">;

interface Settings {
  emailEnabled: boolean;
}

export default function NotificationSettingsScreen() {
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route      = useRoute<Route>();
  const { doctorId } = route.params;

  const [settings, setSettings] = useState<Settings>({
    emailEnabled: false,
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
