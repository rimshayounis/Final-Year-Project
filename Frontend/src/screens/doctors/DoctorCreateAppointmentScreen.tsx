import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  StatusBar,
  Platform,
  useColorScheme,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRoute, useNavigation } from "@react-navigation/native";
import { appointmentAPI } from '../../services/api'
import { useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface TimeSlot {
  start: string;
  end: string;
}
interface SelectedDate {
  date: string;
  timeSlots: TimeSlot[];
}
interface WorkingDay {
  day: string;
  isWorking: boolean;
  timeSlots: TimeSlot[];
}

// ─── Constants ────────────────────────────────────────────────────────────────
const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const SESSION_DURATIONS = [15, 20, 30, 45, 60];
const MAX_SELECTABLE_DAYS = 30;

// ─── Theme ────────────────────────────────────────────────────────────────────
const lightTheme = {
  screenBg: "#F0F4FF",
  cardBg: "#FFFFFF",
  inputBg: "#FFFFFF",
  calendarTileBg: "#F5F7FF",
  chipBg: "#F0F4FF",
  modalBg: "#FFFFFF",
  durationOptBg: "#F8F8F8",
  progressTrack: "#E8ECF8",
  addSlotBg: "#F0F4FF",
  textPrimary: "#2C3E50",
  textSecondary: "#666666",
  textMuted: "#999999",
  textAccent: "#6B7FED",
  border: "#E8ECF8",
  accent: "#6B7FED",
  accentLight: "#E8F0FE",
  danger: "#FF4444",
  statusBar: "light-content" as const,
};

const darkTheme = {
  screenBg: "#0F1117",
  cardBg: "#1C1F2A",
  inputBg: "#1C1F2A",
  calendarTileBg: "#252836",
  chipBg: "#252836",
  modalBg: "#1C1F2A",
  durationOptBg: "#252836",
  progressTrack: "#2E3245",
  addSlotBg: "#252836",
  textPrimary: "#F0F4FF",
  textSecondary: "#A0A8C0",
  textMuted: "#6B7280",
  textAccent: "#8B9FFF",
  border: "#2E3245",
  accent: "#8B9FFF",
  accentLight: "#1E2340",
  danger: "#FF6666",
  statusBar: "light-content" as const,
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function DoctorCreateAppointmentScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const t = isDark ? darkTheme : lightTheme;
    const route = useRoute<any>(); 
  const navigation = useNavigation<any>(); 

    const doctorId = route.params?.doctorId || "507f1f77bcf86cd799439011";

     const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [workingDays] = useState<WorkingDay[]>(
    DAYS_OF_WEEK.map((day) => ({
      day,
      isWorking: day !== "Sunday",
      timeSlots: [{ start: "09:00", end: "17:00" }],
    })),
  );
  const [selectedDates, setSelectedDates] = useState<SelectedDate[]>([]);
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const [sessionDuration, setSessionDuration] = useState(30);
  const [consultationFee, setConsultationFee] = useState("");
  const [showDurationModal, setShowDurationModal] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showTimePickerModal, setShowTimePickerModal] = useState(false);
  const [timePickerMode, setTimePickerMode] = useState<"start" | "end">(
    "start",
  );
  const [selectedSlotIndex, setSelectedSlotIndex] = useState(0);
  const [tempTime, setTempTime] = useState(new Date());
  const [isDateTimePicker, setIsDateTimePicker] = useState(false);

  useEffect(() => {
    loadExistingAvailability();
  }, []);

  const loadExistingAvailability = async () => {
    try {
      setIsLoading(true);
      const response = await appointmentAPI.getDoctorAvailability(doctorId);

      if (response.data && response.data.data) {
        const data = response.data.data;
        setSessionDuration(data.sessionDuration);
        setConsultationFee(data.consultationFee.toString());

        if (data.specificDates && data.specificDates.length > 0) {
          setSelectedDates(
            data.specificDates.map((sd: any) => ({
              date: sd.date,
              timeSlots: sd.timeSlots,
            }))
          );
        }
      }
    } catch (error: any) {
      console.log("No existing availability found. Creating new.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Calendar dates ────────────────────────────────────────────────────────
  const calendarDates = useMemo(() => {
    const dates: Date[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < MAX_SELECTABLE_DAYS; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, []);

  const calendarGroups = useMemo(() => {
    const groups: { monthLabel: string; dates: Date[] }[] = [];
    calendarDates.forEach((date) => {
      const label = date.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
      const g = groups.find((x) => x.monthLabel === label);
      if (g) g.dates.push(date);
      else groups.push({ monthLabel: label, dates: [date] });
    });
    return groups;
  }, [calendarDates]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const formatDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const formatDisplayDate = (dateStr: string) =>
    new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const isDateSelected = (dateStr: string) =>
    selectedDates.some((d) => d.date === dateStr);

  const toTimeString = (date: Date) =>
    `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;

  const buildTempTime = (timeString: string) => {
    const [h, m] = timeString.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  };

  // ── Date selection ────────────────────────────────────────────────────────
  const handleDateSelect = (date: Date) => {
    const dateStr = formatDate(date);
    if (selectedDates.find((d) => d.date === dateStr)) {
      setSelectedDates(selectedDates.filter((d) => d.date !== dateStr));
      if (activeDate === dateStr) setActiveDate(null);
      return;
    }
    if (selectedDates.length > 0) {
      const all = [...selectedDates.map((d) => d.date), dateStr].sort();
      const diffDays = Math.round(
        (new Date(all[all.length - 1] + "T00:00:00").getTime() -
          new Date(all[0] + "T00:00:00").getTime()) /
          86400000,
      );
      if (diffDays >= MAX_SELECTABLE_DAYS) {
        Alert.alert(
          "Range Limit Reached",
          `You can only set availability within a ${MAX_SELECTABLE_DAYS}-day range.`,
        );
        return;
      }
      Alert.alert(
        "Copy Time Slots?",
        "Use the same time slots as the previous date?",
        [
          {
            text: "No, Set New",
            onPress: () => {
              setSelectedDates([
                ...selectedDates,
                {
                  date: dateStr,
                  timeSlots: [{ start: "09:00", end: "17:00" }],
                },
              ]);
              setActiveDate(dateStr);
            },
          },
          {
            text: "Yes, Copy",
            onPress: () => {
              const last = selectedDates[selectedDates.length - 1];
              setSelectedDates([
                ...selectedDates,
                { date: dateStr, timeSlots: [...last.timeSlots] },
              ]);
              setActiveDate(dateStr);
            },
          },
        ],
      );
    } else {
      setSelectedDates([
        { date: dateStr, timeSlots: [{ start: "09:00", end: "17:00" }] },
      ]);
      setActiveDate(dateStr);
    }
  };

  const getActiveDateTimeSlots = (): TimeSlot[] => {
    if (!activeDate) return [];
    return selectedDates.find((d) => d.date === activeDate)?.timeSlots || [];
  };

  const addTimeSlotToDate = () => {
    if (!activeDate) return;
    setSelectedDates((prev) =>
      prev.map((d) =>
        d.date === activeDate
          ? {
              ...d,
              timeSlots: [...d.timeSlots, { start: "09:00", end: "17:00" }],
            }
          : d,
      ),
    );
  };

  const removeTimeSlotFromDate = (si: number) => {
    if (!activeDate) return;
    const dateData = selectedDates.find((d) => d.date === activeDate);
    if (!dateData || dateData.timeSlots.length <= 1) {
      Alert.alert("Error", "At least one time slot is required");
      return;
    }
    setSelectedDates((prev) =>
      prev.map((d) =>
        d.date === activeDate
          ? { ...d, timeSlots: d.timeSlots.filter((_, i) => i !== si) }
          : d,
      ),
    );
  };

  // ── Time picker ───────────────────────────────────────────────────────────
  const openTimePickerForDate = (si: number, mode: "start" | "end") => {
    if (!activeDate) return;
    const dateData = selectedDates.find((d) => d.date === activeDate);
    if (!dateData) return;
    const slot = dateData.timeSlots[si];
    setIsDateTimePicker(true);
    setSelectedSlotIndex(si);
    setTimePickerMode(mode);
    setTempTime(buildTempTime(mode === "start" ? slot.start : slot.end));
    Platform.OS === "android"
      ? setShowTimePicker(true)
      : setShowTimePickerModal(true);
  };

  const applyTimeString = (timeString: string) => {
    if (isDateTimePicker && activeDate) {
      setSelectedDates((prev) =>
        prev.map((d) =>
          d.date === activeDate
            ? {
                ...d,
                timeSlots: d.timeSlots.map((slot, i) =>
                  i === selectedSlotIndex
                    ? timePickerMode === "start"
                      ? { ...slot, start: timeString }
                      : { ...slot, end: timeString }
                    : slot,
                ),
              }
            : d,
        ),
      );
    } else if (selectedDayIndex !== null) {
      setSelectedDayIndex(null); // unused in this simplified version
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === "android") {
      setShowTimePicker(false);
      if (event.type === "set" && selectedTime)
        applyTimeString(toTimeString(selectedTime));
    } else {
      if (selectedTime) setTempTime(selectedTime);
    }
  };

  const confirmTimeSelection = () => {
    applyTimeString(toTimeString(tempTime));
    setShowTimePickerModal(false);
  };

  // ── Submit ────────────────────────────────────────────────────────────────
   const handleSubmit = async () => {
    if (!consultationFee || parseFloat(consultationFee) <= 0) {
      Alert.alert("Error", "Please enter a valid consultation fee");
      return;
    }
    if (selectedDates.length === 0) {
      Alert.alert("Error", "Please select at least one date");
      return;
    }

    try {
      setIsSaving(true);

      const availabilityData = {
        doctorId,
        sessionDuration,
        consultationFee: parseFloat(consultationFee),
        specificDates: selectedDates.map((sd) => ({
          date: sd.date,
          timeSlots: sd.timeSlots,
        })),
      };

      const response = await appointmentAPI.createOrUpdateAvailability(
        availabilityData
      );

      if (response.data && response.data.success) {
        Alert.alert(
          "Success",
          "Appointment settings saved successfully!",
          [
            {
              text: "OK",
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (error: any) {
      console.error("Save error:", error);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to save settings"
      );
    } finally {
      setIsSaving(false);
    }
  };


  const remainingDays = MAX_SELECTABLE_DAYS - selectedDates.length;

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: t.screenBg }]}>
        <StatusBar barStyle={t.statusBar} backgroundColor={t.accent} />

        <View
          style={[
            styles.header,
            { paddingTop: insets.top + 10, backgroundColor: t.accent },
          ]}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Appointment Settings</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={t.accent} />
          <Text style={[styles.loadingText, { color: t.textSecondary }]}>
            Loading your settings...
          </Text>
        </View>
      </View>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: t.screenBg }]}>
      <StatusBar barStyle={t.statusBar} backgroundColor={t.accent} />

      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 10, backgroundColor: t.accent },
        ]}
      >
        <TouchableOpacity style={styles.backButton}
        onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Appointment Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Session Duration */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: t.textPrimary }]}>
            Session Duration
          </Text>
          <TouchableOpacity
            style={[
              styles.card,
              { backgroundColor: t.cardBg, borderColor: t.border },
            ]}
            onPress={() => setShowDurationModal(true)}
          >
            <View style={styles.cardRow}>
              <MaterialIcons name="access-time" size={20} color={t.accent} />
              <Text style={[styles.cardText, { color: t.textPrimary }]}>
                {sessionDuration} minutes per session
              </Text>
            </View>
            <MaterialIcons
              name="keyboard-arrow-down"
              size={24}
              color={t.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Consultation Fee */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: t.textPrimary }]}>
            Consultation Fee
          </Text>
          <View
            style={[
              styles.card,
              { backgroundColor: t.cardBg, borderColor: t.border },
            ]}
          >
            
            <TextInput
              style={[styles.feeInput, { color: t.textPrimary }]}
              placeholder="Enter fee amount"
              placeholderTextColor={t.textMuted}
              keyboardType="numeric"
              value={consultationFee}
              onChangeText={setConsultationFee}
            />
            <Text style={[styles.currencyText, { color: t.textSecondary }]}>
              PKR
            </Text>
          </View>
        </View>

        {/* Specific Dates */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: t.textPrimary }]}>
              Specific Dates
            </Text>
            <Text style={[styles.sectionSubtitle, { color: t.textSecondary }]}>
              Select dates for one-time availability (max {MAX_SELECTABLE_DAYS}
              -day range)
            </Text>
          </View>

          {/* Progress bar */}
          <View
            style={[
              styles.progressCard,
              { backgroundColor: t.cardBg, borderColor: t.border },
            ]}
          >
            <View style={styles.cardRow}>
              <MaterialIcons name="date-range" size={16} color={t.accent} />
              <Text style={[styles.rangeText, { color: t.textSecondary }]}>
                {selectedDates.length} date
                {selectedDates.length !== 1 ? "s" : ""} selected
                {selectedDates.length > 0 && ` · ${remainingDays} remaining`}
              </Text>
            </View>
            <View
              style={[
                styles.progressTrack,
                { backgroundColor: t.progressTrack },
              ]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: t.accent,
                    width:
                      `${(selectedDates.length / MAX_SELECTABLE_DAYS) * 100}%` as any,
                  },
                ]}
              />
            </View>
          </View>

          {/* Calendar by month */}
          {calendarGroups.map((group, gi) => (
            <View key={gi} style={styles.monthGroup}>
              <View style={styles.monthLabelRow}>
                <MaterialIcons
                  name="calendar-today"
                  size={15}
                  color={t.accent}
                />
                <Text style={[styles.monthLabel, { color: t.accent }]}>
                  {group.monthLabel}
                </Text>
              </View>
              <View
                style={[
                  styles.calendarCard,
                  { backgroundColor: t.cardBg, borderColor: t.border },
                ]}
              >
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.calendarGrid}>
                    {group.dates.map((date, di) => {
                      const dateStr = formatDate(date);
                      const isSel = isDateSelected(dateStr);
                      const isActive = activeDate === dateStr;
                      return (
                        <TouchableOpacity
                          key={di}
                          style={[
                            styles.calendarTile,
                            {
                              backgroundColor: t.calendarTileBg,
                              borderColor: t.border,
                            },
                            isSel && {
                              backgroundColor: t.accentLight,
                              borderColor: t.accent,
                            },
                            isActive && {
                              backgroundColor: t.accent,
                              borderColor: t.accent,
                            },
                          ]}
                          onPress={() => handleDateSelect(date)}
                        >
                          <Text
                            style={[
                              styles.tileDay,
                              { color: t.textSecondary },
                              isSel && { color: t.accent },
                              isActive && { color: "#FFFFFF" },
                            ]}
                          >
                            {date.toLocaleDateString("en-US", {
                              weekday: "short",
                            })}
                          </Text>
                          <Text
                            style={[
                              styles.tileNum,
                              { color: t.textPrimary },
                              isSel && { color: t.accent },
                              isActive && { color: "#FFFFFF" },
                            ]}
                          >
                            {date.getDate()}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            </View>
          ))}

          {/* Selected date chips */}
          {selectedDates.length > 0 && (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: t.cardBg,
                  borderColor: t.border,
                  flexDirection: "column",
                  alignItems: "flex-start",
                },
              ]}
            >
              <Text style={[styles.selectedTitle, { color: t.textPrimary }]}>
                Selected Dates ({selectedDates.length})
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipRow}>
                  {selectedDates.map((dd, i) => {
                    const isActive = activeDate === dd.date;
                    return (
                      <TouchableOpacity
                        key={i}
                        style={[
                          styles.chip,
                          { backgroundColor: t.chipBg, borderColor: t.accent },
                          isActive && { backgroundColor: t.accent },
                        ]}
                        onPress={() => setActiveDate(dd.date)}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            { color: isActive ? "#FFFFFF" : t.accent },
                          ]}
                        >
                          {formatDisplayDate(dd.date)}
                        </Text>
                        <TouchableOpacity
                          onPress={() => {
                            setSelectedDates(
                              selectedDates.filter((x) => x.date !== dd.date),
                            );
                            if (activeDate === dd.date) setActiveDate(null);
                          }}
                        >
                          <MaterialIcons
                            name="close"
                            size={16}
                            color={isActive ? "#FFFFFF" : t.textSecondary}
                          />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Time slots for active date */}
          {activeDate && (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: t.cardBg,
                  borderColor: t.border,
                  flexDirection: "column",
                  alignItems: "stretch",
                  gap: 10,
                },
              ]}
            >
              <Text style={[styles.timeSlotsTitle, { color: t.textPrimary }]}>
                Time Slots for {formatDisplayDate(activeDate)}
              </Text>
              {getActiveDateTimeSlots().map((slot, si) => (
                <View key={si} style={styles.timeSlotRow}>
                  <TouchableOpacity
                    style={[
                      styles.timeBtn,
                      { backgroundColor: t.inputBg, borderColor: t.border },
                    ]}
                    onPress={() => openTimePickerForDate(si, "start")}
                  >
                    <MaterialIcons name="schedule" size={16} color={t.accent} />
                    <Text style={[styles.timeText, { color: t.textPrimary }]}>
                      {slot.start}
                    </Text>
                  </TouchableOpacity>

                  <Text style={[styles.timeSep, { color: t.textMuted }]}>
                    to
                  </Text>

                  <TouchableOpacity
                    style={[
                      styles.timeBtn,
                      { backgroundColor: t.inputBg, borderColor: t.border },
                    ]}
                    onPress={() => openTimePickerForDate(si, "end")}
                  >
                    <MaterialIcons name="schedule" size={16} color={t.accent} />
                    <Text style={[styles.timeText, { color: t.textPrimary }]}>
                      {slot.end}
                    </Text>
                  </TouchableOpacity>

                  {getActiveDateTimeSlots().length > 1 && (
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => removeTimeSlotFromDate(si)}
                    >
                      <MaterialIcons name="close" size={18} color={t.danger} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              <TouchableOpacity
                style={[
                  styles.addSlotBtn,
                  { backgroundColor: t.addSlotBg, borderColor: t.accent },
                ]}
                onPress={addTimeSlotToDate}
              >
                <MaterialIcons name="add" size={18} color={t.accent} />
                <Text style={[styles.addSlotText, { color: t.accent }]}>
                  Add time slot
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Submit */}
         <TouchableOpacity
          style={[
            styles.submitBtn,
            { backgroundColor: t.accent },
            isSaving && { opacity: 0.6 },
          ]}
          onPress={handleSubmit}
          disabled={isSaving}
        >
          {isSaving ? (
            <View style={styles.buttonLoading}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={[styles.submitText, { marginLeft: 10 }]}>
                Saving...
              </Text>
            </View>
          ) : (
            <Text style={styles.submitText}>Save Settings</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* ── Duration Modal ────────────────────────────────────────────────── */}
      <Modal
        visible={showDurationModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDurationModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDurationModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.bottomSheet, { backgroundColor: t.modalBg }]}>
              <View
                style={[styles.sheetHeader, { borderBottomColor: t.border }]}
              >
                <Text style={[styles.sheetTitle, { color: t.textPrimary }]}>
                  Select Session Duration
                </Text>
                <TouchableOpacity onPress={() => setShowDurationModal(false)}>
                  <MaterialIcons
                    name="close"
                    size={24}
                    color={t.textSecondary}
                  />
                </TouchableOpacity>
              </View>
              <View style={styles.durationList}>
                {SESSION_DURATIONS.map((dur) => (
                  <TouchableOpacity
                    key={dur}
                    style={[
                      styles.durationOpt,
                      { backgroundColor: t.durationOptBg },
                      sessionDuration === dur && {
                        backgroundColor: t.accentLight,
                      },
                    ]}
                    onPress={() => {
                      setSessionDuration(dur);
                      setShowDurationModal(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.durationOptText,
                        { color: t.textPrimary },
                        sessionDuration === dur && {
                          color: t.accent,
                          fontWeight: "600",
                        },
                      ]}
                    >
                      {dur} minutes
                    </Text>
                    {sessionDuration === dur && (
                      <MaterialIcons name="check" size={20} color={t.accent} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Time Picker Modal iOS ─────────────────────────────────────────── */}
      {Platform.OS === "ios" && (
        <Modal
          visible={showTimePickerModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowTimePickerModal(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowTimePickerModal(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <View
                style={[styles.bottomSheet, { backgroundColor: t.modalBg }]}
              >
                <View
                  style={[styles.sheetHeader, { borderBottomColor: t.border }]}
                >
                  <Text style={[styles.sheetTitle, { color: t.textPrimary }]}>
                    Select {timePickerMode === "start" ? "Start" : "End"} Time
                  </Text>
                </View>

                {/*
                  FIX: `themeVariant` tells the native iOS picker which color
                  scheme to use. Without it, the spinner always renders using
                  the system default — so in dark mode the digits are dark on
                  a dark modal background and invisible.
                */}
                <DateTimePicker
                  value={tempTime}
                  mode="time"
                  is24Hour={false}
                  display="spinner"
                  onChange={handleTimeChange}
                  themeVariant={isDark ? "dark" : "light"}
                  style={styles.timePicker}
                />

                <View style={styles.pickerBtns}>
                  <TouchableOpacity
                    style={[
                      styles.pickerCancelBtn,
                      { backgroundColor: t.durationOptBg },
                    ]}
                    onPress={() => setShowTimePickerModal(false)}
                  >
                    <Text
                      style={[
                        styles.pickerCancelText,
                        { color: t.textSecondary },
                      ]}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.pickerConfirmBtn,
                      { backgroundColor: t.accent },
                    ]}
                    onPress={confirmTimeSelection}
                  >
                    <Text style={styles.pickerConfirmText}>Confirm</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}

      {/* ── Time Picker Android ───────────────────────────────────────────── */}
      {Platform.OS === "android" && showTimePicker && (
        <DateTimePicker
          value={tempTime}
          mode="time"
          is24Hour={false}
          display="default"
          onChange={handleTimeChange}
          themeVariant={isDark ? "dark" : "light"}
        />
      )}
    </View>
  );
}

// ─── Styles (layout only; colors always injected inline from theme) ───────────
const styles = StyleSheet.create({

   loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 15,
    fontWeight: "500",
  },
  buttonLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  container: { flex: 1 },
  header: {
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: { padding: 5 },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#FFFFFF" },
  placeholder: { width: 34 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  section: { marginBottom: 25 },
  sectionHeader: { marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  sectionSubtitle: { fontSize: 13, marginTop: 3 },

  card: {
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 12,
  },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  cardText: { fontSize: 15, fontWeight: "500" },
  feeInput: { flex: 1, fontSize: 15 },
  currencyText: { fontSize: 15, fontWeight: "600" },

  progressCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 14,
  },
  rangeText: { fontSize: 13, fontWeight: "500" },
  progressTrack: {
    height: 6,
    borderRadius: 10,
    overflow: "hidden",
    width: "100%",
  },
  progressFill: { height: 6, borderRadius: 10 },

  monthGroup: { marginBottom: 14 },
  monthLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  monthLabel: { fontSize: 15, fontWeight: "700", letterSpacing: 0.3 },
  calendarCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  calendarGrid: { flexDirection: "row", gap: 10 },
  calendarTile: {
    width: 60,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 2,
  },
  tileDay: { fontSize: 11, fontWeight: "600", marginBottom: 4 },
  tileNum: { fontSize: 18, fontWeight: "700" },

  selectedTitle: { fontSize: 14, fontWeight: "600", marginBottom: 12 },
  chipRow: { flexDirection: "row", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontWeight: "600" },

  timeSlotsTitle: { fontSize: 14, fontWeight: "600" },
  timeSlotRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  timeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  timeText: { fontSize: 15, fontWeight: "600" },
  timeSep: { fontSize: 14 },
  removeBtn: { padding: 8 },
  addSlotBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    marginTop: 5,
  },
  addSlotText: { fontSize: 14, fontWeight: "600" },

  submitBtn: {
    borderRadius: 15,
    padding: 16,
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#6B7FED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitText: { fontSize: 17, fontWeight: "700", color: "#FFFFFF" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  bottomSheet: {
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingTop: 20,
    paddingBottom: 44,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 25,
    paddingBottom: 15,
    borderBottomWidth: 1,
  },
  sheetTitle: { fontSize: 20, fontWeight: "700" },
  durationList: { paddingHorizontal: 25, paddingTop: 15 },
  durationOpt: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  durationOptText: { fontSize: 16 },

  timePicker: { height: 200 },
  pickerBtns: {
    flexDirection: "row",
    paddingHorizontal: 25,
    paddingTop: 15,
    gap: 10,
  },
  pickerCancelBtn: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  pickerCancelText: { fontSize: 16, fontWeight: "600" },
  pickerConfirmBtn: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  pickerConfirmText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
});
