import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  StatusBar,
} from "react-native";
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../App";

type SettingsNav = NativeStackNavigationProp<RootStackParamList, "Settings">;
type SettingsRoute = RouteProp<RootStackParamList, "Settings">;

/* ── Reusable row ── */
function SettingRow({
  icon,
  label,
  sublabel,
  onPress,
  right,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  danger?: boolean;
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
          <Text style={styles.rowSublabel}>{sublabel}</Text>
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

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<SettingsNav>();
  const route = useRoute<SettingsRoute>();
  const { id, role } = route.params;

  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: () =>
          navigation.reset({ index: 0, routes: [{ name: "LoginType" }] }),
      },
    ]);
  };

  const placeholder = (feature: string) =>
    Alert.alert(feature, "This feature is coming soon.");

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
            icon={<Ionicons name="person-outline" size={20} color="#6B7FED" />}
            label="Edit Profile"
            sublabel="Name, bio, photo"
            onPress={() => navigation.goBack()}
          />
          <View style={styles.divider} />
          <SettingRow
            icon={<Ionicons name="lock-closed-outline" size={20} color="#6B7FED" />}
            label="Change Password"
            onPress={() => placeholder("Change Password")}
          />
        </View>

        {/* ── ROLE-SPECIFIC ── */}
        {role === "user" ? (
          <>
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
                icon={
                  <Ionicons
                    name="call-outline"
                    size={20}
                    color="#00B374"
                  />
                }
                label="Emergency Contacts"
                sublabel="Manage your emergency contacts"
                onPress={() =>
                  navigation.navigate("EmergencyContact", { userId: id })
                }
              />
            </View>
          </>
        ) : (
          <>
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
                sublabel="PMDC license & credentials"
                onPress={() => placeholder("Verification Status")}
              />
            </View>
          </>
        )}

        {/* ── NOTIFICATIONS ── */}
        <SectionHeader title="Notifications" />
        <View style={styles.card}>
          <SettingRow
            icon={
              <Ionicons name="notifications-outline" size={20} color="#F6A623" />
            }
            label="Push Notifications"
            right={
              <Switch
                value={pushEnabled}
                onValueChange={setPushEnabled}
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
            onPress={() => placeholder("Privacy Policy")}
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
            onPress={() => placeholder("Terms of Service")}
          />
        </View>

        {/* ── SUPPORT ── */}
        <SectionHeader title="Support" />
        <View style={styles.card}>
          <SettingRow
            icon={
              <Ionicons
                name="help-circle-outline"
                size={20}
                color="#888"
              />
            }
            label="Help & FAQ"
            onPress={() => placeholder("Help & FAQ")}
          />
          <View style={styles.divider} />
          <SettingRow
            icon={
              <MaterialIcons name="support-agent" size={20} color="#888" />
            }
            label="Contact Support"
            onPress={() => placeholder("Contact Support")}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F4FF" },

  header: {
    backgroundColor: "#6B7FED",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFF",
  },

  sectionHeader: {
    fontSize: 12,
    fontWeight: "700",
    color: "#888",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginTop: 24,
    marginBottom: 6,
    marginHorizontal: 20,
  },

  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    marginHorizontal: 16,
    overflow: "hidden",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F0F4FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  rowBody: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: "600", color: "#1A1D2E" },
  rowSublabel: { fontSize: 12, color: "#999", marginTop: 2 },

  divider: {
    height: 1,
    backgroundColor: "#F0F4FF",
    marginLeft: 66,
  },
});
