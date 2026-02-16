import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Alert,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { useAudioRecorder, AudioModule, RecordingPresets } from "expo-audio";

type Message = {
  id: string;
  text?: string;
  image?: string;
  file?: string;
  audio?: string;
  sender: "user" | "doctor";
};

export default function UserSession() {
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();

  const doctorName = route.params?.doctorName ?? "Dr. Sarah Ahmed";
  const doctorImage =
    route.params?.doctorImage ?? "https://i.pravatar.cc/150?img=12";
  const duration = route.params?.duration ?? 1800;

  const [timeLeft, setTimeLeft] = useState<number>(duration);
  const [message, setMessage] = useState("");
  const [showOptions, setShowOptions] = useState(false);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<Message[]>([
    { id: "1", text: "Hello Doctor", sender: "user" },
    { id: "2", text: "Hello, how can I help you?", sender: "doctor" },
  ]);

  /* ⏳ Countdown */
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = () => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  /* ---------------- TEXT MESSAGE ---------------- */
  const sendMessage = () => {
    if (!message.trim()) return;

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        text: message,
        sender: "user",
      },
    ]);

    setMessage("");
    scrollToBottom();
  };

  /* ---------------- CAMERA ---------------- */
  const openCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission required", "Camera permission is needed.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 1,
    });

    if (!result.canceled) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          image: result.assets[0].uri,
          sender: "user",
        },
      ]);
      scrollToBottom();
    }

    setShowOptions(false);
  };

  /* ---------------- IMAGE ---------------- */
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1,
    });

    if (!result.canceled) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          image: result.assets[0].uri,
          sender: "user",
        },
      ]);
      scrollToBottom();
    }

    setShowOptions(false);
  };

  /* ---------------- FILE ---------------- */
  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      multiple: false,
    });

    if (!result.canceled && result.assets?.length) {
      const file = result.assets[0];

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          file: file.name,
          sender: "user",
        },
      ]);

      scrollToBottom();
    }

    setShowOptions(false);
  };

  /* ---------------- VOICE ---------------- */
  const startRecording = async () => {
    const permission = await AudioModule.requestRecordingPermissionsAsync();

    if (!permission.granted) {
      alert("Microphone permission required");
      return;
    }

    await recorder.prepareToRecordAsync();
    await recorder.record();
    setIsRecording(true);
  };

  const stopRecording = async () => {
    await recorder.stop();
    setIsRecording(false);

    const uri = recorder.uri;

    if (uri) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          audio: uri,
          sender: "user",
        },
      ]);
    }

    scrollToBottom();
  };

  /* ---------------- UI ---------------- */

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        {/* HEADER */}
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <View style={styles.doctorInfo}>
            <Image source={{ uri: doctorImage }} style={styles.avatar} />
            <View>
              <Text style={styles.name}>{doctorName}</Text>
              <Text style={styles.online}>Online</Text>
            </View>
          </View>
          <Text style={styles.timer}>{formatTime()}</Text>
        </View>

        {/* CHAT */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 15, paddingBottom: 80 }}
          renderItem={({ item }) => (
            <View
              style={[
                styles.messageBubble,
                item.sender === "doctor"
                  ? styles.doctorBubble
                  : styles.userBubble,
              ]}
            >
              {item.text && (
                <Text
                  style={
                    item.sender === "doctor"
                      ? styles.doctorText
                      : styles.userText
                  }
                >
                  {item.text}
                </Text>
              )}

              {item.image && (
                <Image
                  source={{ uri: item.image }}
                  style={{ width: 150, height: 150, borderRadius: 10 }}
                />
              )}

              {item.file && (
                <Text style={{ color: "#fff" }}>📎 {item.file}</Text>
              )}

              {item.audio && (
                <Text style={{ color: "#fff" }}>🎤 Voice Message</Text>
              )}
            </View>
          )}
        />

        {/* ATTACHMENT OPTIONS */}
        {showOptions && (
          <View style={styles.optionsContainer}>
            <TouchableOpacity onPress={openCamera} style={styles.optionItem}>
              <Ionicons name="camera" size={24} color="#6B7FED" />
              <Text>Camera</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={pickImage} style={styles.optionItem}>
              <Ionicons name="image" size={24} color="#6B7FED" />
              <Text>Image</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={pickFile} style={styles.optionItem}>
              <Ionicons name="document" size={24} color="#6B7FED" />
              <Text>File</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* INPUT */}
        <View
          style={[styles.inputContainer, { paddingBottom: insets.bottom + 5 }]}
        >
          <TouchableOpacity
            style={styles.plusButton}
            onPress={() => setShowOptions(!showOptions)}
          >
            <Ionicons name="add" size={26} color="#6B7FED" />
          </TouchableOpacity>

          <View style={styles.inputBox}>
            <TextInput
              placeholder="Type a message"
              value={message}
              onChangeText={setMessage}
              style={styles.textInput}
              multiline
            />

            {message.trim().length === 0 ? (
              <TouchableOpacity
                onPress={isRecording ? stopRecording : startRecording}
              >
                <MaterialIcons
                  name={isRecording ? "stop" : "keyboard-voice"}
                  size={24}
                  color={isRecording ? "red" : "#6B7FED"}
                />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={sendMessage}>
                <Ionicons name="send" size={24} color="#6B7FED" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ECECEC" },

  header: {
    backgroundColor: "#6B7FED",
    paddingHorizontal: 15,
    paddingBottom: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  doctorInfo: { flexDirection: "row", alignItems: "center" },

  avatar: { width: 45, height: 45, borderRadius: 22, marginRight: 10 },

  name: { color: "#fff", fontSize: 16, fontWeight: "700" },

  online: { color: "#CFFFD8", fontSize: 12 },

  timer: { color: "#fff", fontSize: 16, fontWeight: "600" },

  messageBubble: {
    maxWidth: "75%",
    padding: 12,
    borderRadius: 18,
    marginBottom: 10,
  },

  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#E0E0E0",
  },

  doctorBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#6B7FED",
  },

  userText: { color: "#000" },
  doctorText: { color: "#fff" },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingTop: 8,
  },

  plusButton: { marginRight: 5 },

  inputBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F2F2F2",
    borderRadius: 25,
    paddingHorizontal: 15,
  },

  textInput: { flex: 1, paddingVertical: 8 },

  optionsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#fff",
    paddingVertical: 10,
  },

  optionItem: { alignItems: "center" },
});
