import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import { chatbotAPI, doctorAPI } from '../../services/api';
import { getUser } from '../../services/storage';
import { triggerSOS } from '../../services/sosService';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DoctorSuggestion {
  _id: string;
  fullName: string;
  specialization: string;
  email: string;
  avgRating: number;
  ratingCount: number;
  profileImage?: string;
  consultationFee?: number;
  sessionDuration?: number;
}

interface Message {
  id:        string;
  text:      string;
  isUser:    boolean;
  timestamp: Date;
  image?:    string;
  doctors?:  DoctorSuggestion[];   // bot recommendation cards
}

type ChatbotScreenProps = {
  id:   string;
  role: 'user' | 'doctor';
  onNavigateToDoctorAppointment?: (doctor: DoctorSuggestion) => void;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const CRITICAL_KEYWORDS = [
  'chest pain', "can't breathe", 'cant breathe', 'cannot breathe',
  'heart attack', "i'm dying", 'im dying', 'i am dying', 'help me',
  'unconscious', 'overdose', 'i want to die', 'killing myself',
  'suicidal', 'suicide', "can't move", 'cant move', 'severe pain',
  'emergency', 'feeling faint', 'collapsing', 'stroke', 'choking',
  'not breathing', 'seizure', 'passing out',
];

const isCritical = (text: string) => {
  const lower = text.toLowerCase();
  return CRITICAL_KEYWORDS.some((kw) => lower.includes(kw));
};

/** Extract [RECOMMEND_DOCTOR:xxx] marker from bot response */
const DOCTOR_MARKER = /\[RECOMMEND_DOCTOR:([^\]]+)\]/i;
function parseRecommendation(text: string): { cleanText: string; specialization: string | null } {
  const match = text.match(DOCTOR_MARKER);
  if (!match) return { cleanText: text, specialization: null };
  return {
    cleanText:      text.replace(DOCTOR_MARKER, '').trim(),
    specialization: match[1].trim().toLowerCase(),
  };
}

/** Normalise a specialization string to a common root for comparison */
const SPEC_ALIASES: Record<string, string> = {
  dermatologist: 'dermatology', dermatology: 'dermatology',
  psychiatrist: 'psychiatry',   psychiatry: 'psychiatry',
  psychologist: 'psychology',   psychology: 'psychology',
  orthopedic: 'orthopedics',    orthopaedic: 'orthopedics', orthopedics: 'orthopedics', orthopaedics: 'orthopedics',
  cardiologist: 'cardiology',   cardiology: 'cardiology',
  ophthalmologist: 'ophthalmology', ophthalmology: 'ophthalmology',
  neurologist: 'neurology',     neurology: 'neurology',
  gastroenterologist: 'gastroenterology', gastroenterology: 'gastroenterology',
  endocrinologist: 'endocrinology', endocrinology: 'endocrinology',
  gynecologist: 'gynecology',   gynecology: 'gynecology', gynaecology: 'gynecology', gynaecologist: 'gynecology',
  urologist: 'urology',         urology: 'urology',
  pulmonologist: 'pulmonology', pulmonology: 'pulmonology',
  oncologist: 'oncology',       oncology: 'oncology',
  hematologist: 'hematology',   hematology: 'hematology',
  nephrologist: 'nephrology',   nephrology: 'nephrology',
  immunologist: 'immunology',   immunology: 'immunology',
  dentist: 'dentistry',         dentistry: 'dentistry', dental: 'dentistry',
  surgeon: 'surgery',           surgery: 'surgery',
  pediatrician: 'pediatrics',   pediatrics: 'pediatrics', paediatrics: 'pediatrics',
  ent: 'ent',                   'ear nose throat': 'ent',
  'general practice': 'general practice', 'general practitioner': 'general practice',
  'general physician': 'general practice', gp: 'general practice',
};

function normaliseSpec(s: string): string {
  const lower = s.toLowerCase().trim();
  if (SPEC_ALIASES[lower]) return SPEC_ALIASES[lower];
  // strip common suffixes and try again
  const stripped = lower.replace(/(?:ologist|ician|ist|ogy|ics|ery|ry)$/, '');
  for (const [key, val] of Object.entries(SPEC_ALIASES)) {
    if (key.startsWith(stripped) && stripped.length > 3) return val;
  }
  return lower;
}

/** Loose match: does the doctor's specialization relate to the recommended one? */
function matchesSpec(docSpec: string, recommended: string): boolean {
  const d = normaliseSpec(docSpec);
  const r = normaliseSpec(recommended);
  if (d === r) return true;
  return d.includes(r) || r.includes(d);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ChatbotScreen({ role, onNavigateToDoctorAppointment }: ChatbotScreenProps) {
  const insets        = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);

  const [message,          setMessage]          = useState('');
  const [messages,         setMessages]         = useState<Message[]>([]);
  const [isLoading,        setIsLoading]        = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [userId,           setUserId]           = useState('');
  const [sosSending,       setSosSending]       = useState(false);

  const defaultWelcome: Message = {
    id:        'welcome',
    text:      role === 'doctor'
      ? 'Hi Doctor! I am your TruHeal-Link assistant. How can I help you today? 😊'
      : 'Hi! I am your TruHeal-Link health assistant. Describe your symptoms and I will help you. 😊',
    isUser:    false,
    timestamp: new Date(),
  };

  // ── Load User + History ───────────────────────────────────────────────────

  useEffect(() => {
    const loadUserAndHistory = async () => {
      try {
        setIsLoadingHistory(true);
        const userData = await getUser();
        if (!userData?._id) { setMessages([defaultWelcome]); return; }

        setUserId(userData._id);
        const response = await chatbotAPI.getChatHistory(userData._id);
        const history  = Array.isArray(response.data.data) ? response.data.data : [];

        if (!history.length) { setMessages([defaultWelcome]); return; }

        const loaded: Message[] = history.flatMap((item: any) => {
          const msgs: Message[] = [];
          if (item.message) msgs.push({ id: item._id + '_user', text: item.message, isUser: true,  timestamp: new Date(item.createdAt), image: item.imageUrl || undefined });
          if (item.response) msgs.push({ id: item._id + '_bot',  text: item.response, isUser: false, timestamp: new Date(item.createdAt) });
          return msgs;
        });

        setMessages(loaded.length ? loaded : [defaultWelcome]);
      } catch {
        setMessages([defaultWelcome]);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    loadUserAndHistory();
  }, []);

  // ── Auto Scroll ───────────────────────────────────────────────────────────

  useEffect(() => {
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  // ── Clear Chat ────────────────────────────────────────────────────────────

  const handleClearChat = () => {
    Alert.alert('Clear Chat', 'Are you sure you want to clear all messages?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear', style: 'destructive',
        onPress: async () => {
          try {
            if (userId) await chatbotAPI.clearHistory(userId);
            setMessages([{ id: 'welcome', text: role === 'doctor' ? 'Chat cleared! How can I help you, Doctor? 😊' : 'Chat cleared! How can I help you? 😊', isUser: false, timestamp: new Date() }]);
          } catch { Alert.alert('Error', 'Failed to clear chat history'); }
        },
      },
    ]);
  };

  const handleCopy = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied', 'Message copied to clipboard');
  };

  // ── SOS from Chat ─────────────────────────────────────────────────────────

  const handleSOSFromChat = (userMessage: string) => {
    Alert.alert(
      '🚨 Emergency Detected',
      `We noticed you may need urgent help:\n\n"${userMessage}"\n\nDo you want to send an SOS alert to your emergency contacts?`,
      [
        { text: 'I am Fine', style: 'cancel' },
        {
          text: 'YES — Send SOS', style: 'destructive',
          onPress: async () => {
            setSosSending(true);
            setMessages((prev) => [...prev, { id: Date.now() + '_sos', text: '🚨 SOS alert is being sent to your emergency contacts...', isUser: false, timestamp: new Date() }]);
            await triggerSOS();
            setSosSending(false);
            setMessages((prev) => [...prev, { id: Date.now() + '_ok', text: '✅ SOS alert sent! Help is on the way. Please stay calm.', isUser: false, timestamp: new Date() }]);
          },
        },
      ],
    );
  };

  // ── Fetch Doctors by Specialization ──────────────────────────────────────

  const fetchDoctorsBySpec = async (specialization: string): Promise<DoctorSuggestion[]> => {
    try {
      const res = await doctorAPI.getVerifiedDoctors();
      const all: any[] = Array.isArray(res.data) ? res.data : (res.data?.doctors || []);
      return all
        .filter((d) => matchesSpec(d.doctorProfile?.specialization || '', specialization))
        .slice(0, 3)
        .map((d) => ({
          _id:            d._id,
          fullName:       d.fullName,
          specialization: d.doctorProfile?.specialization || specialization,
          email:          d.email,
          avgRating:      d.avgRating  || 0,
          ratingCount:    d.ratingCount || 0,
          profileImage:   d.profileImage || undefined,
          consultationFee: d.consultationFee || undefined,
          sessionDuration: d.sessionDuration || undefined,
        }));
    } catch {
      return [];
    }
  };

  // ── Send Message ──────────────────────────────────────────────────────────

  const handleSend = async (imageUrl?: string, fileUrl?: string) => {
    const textToSend = message.trim();
    if (!textToSend && !imageUrl && !fileUrl) return;
    if (!userId) { Alert.alert('Error', 'User session not found. Please login again.'); return; }

    // Critical keyword check → SOS
    if (role === 'user' && textToSend && isCritical(textToSend)) {
      setMessages((prev) => [...prev, { id: Date.now().toString(), text: textToSend, isUser: true, timestamp: new Date(), image: imageUrl }]);
      setMessage('');
      handleSOSFromChat(textToSend);
      return;
    }

    // Add user message
    const userMsg: Message = {
      id:        Date.now().toString(),
      text:      textToSend || (imageUrl ? 'Sent an image' : 'Sent a file'),
      isUser:    true,
      timestamp: new Date(),
      image:     imageUrl,
    };
    setMessages((prev) => [...prev, userMsg]);
    setMessage('');
    setIsLoading(true);

    try {
      const response = await chatbotAPI.sendMessage({ userId, message: textToSend || (imageUrl ? 'Image sent' : 'File sent'), imageUrl, fileUrl });
      const rawText  = response.data.data.botResponse.text as string;

      // Parse doctor recommendation marker
      const { cleanText, specialization } = parseRecommendation(rawText);

      let doctors: DoctorSuggestion[] = [];
      if (specialization && role === 'user') {
        doctors = await fetchDoctorsBySpec(specialization);
      }

      const botMsg: Message = {
        id:        response.data.data.botResponse.id,
        text:      cleanText,
        isUser:    false,
        timestamp: new Date(response.data.data.botResponse.timestamp),
        doctors:   doctors.length ? doctors : undefined,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (error: any) {
      setMessages((prev) => [...prev, { id: Date.now().toString(), text: 'Sorry, I could not process your request. Please try again. 🙏', isUser: false, timestamp: new Date() }]);
      console.error('Chatbot error:', error?.response?.data || error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Media ─────────────────────────────────────────────────────────────────

  const handleMediaOptions = () => {
    Alert.alert('Select Option', 'Choose media type', [
      { text: 'Camera', onPress: handleOpenCamera },
      { text: 'Image',  onPress: handlePickImage },
      { text: 'File',   onPress: handlePickFile },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleOpenCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission Needed', 'Camera permission required'); return; }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled && result.assets?.length > 0) await handleSend(result.assets[0].uri);
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission Needed', 'Gallery permission required'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets?.length > 0) await handleSend(result.assets[0].uri);
  };

  const handlePickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
    if (!result.canceled) await handleSend(undefined, result.assets[0].uri);
  };

  // ── Doctor Card ───────────────────────────────────────────────────────────

  const renderDoctorCard = (doctor: DoctorSuggestion) => (
    <TouchableOpacity
      key={doctor._id}
      style={styles.doctorCard}
      onPress={() => onNavigateToDoctorAppointment?.(doctor)}
      activeOpacity={0.75}
    >
      <View style={styles.doctorAvatar}>
        {doctor.profileImage ? (
          <Image source={{ uri: doctor.profileImage }} style={styles.doctorAvatarImg} />
        ) : (
          <Text style={styles.doctorAvatarLetter}>
            {doctor.fullName.charAt(0).toUpperCase()}
          </Text>
        )}
      </View>
      <View style={styles.doctorInfo}>
        <Text style={styles.doctorName} numberOfLines={1}>{doctor.fullName}</Text>
        <Text style={styles.doctorSpec} numberOfLines={1}>{doctor.specialization}</Text>
        <View style={styles.doctorRatingRow}>
          <Text style={styles.starIcon}>⭐</Text>
          <Text style={styles.ratingText}>
            {doctor.avgRating.toFixed(1)} ({doctor.ratingCount} reviews)
          </Text>
        </View>
      </View>
      <View style={styles.bookBadge}>
        <Text style={styles.bookBadgeText}>Book</Text>
        <MaterialIcons name="chevron-right" size={16} color="#6B7FED" />
      </View>
    </TouchableOpacity>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <StatusBar barStyle="light-content" backgroundColor="#6B7FED" />

      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.headerTitle}>Chatbot</Text>
        <TouchableOpacity style={styles.menuButton} onPress={handleClearChat}>
          <MaterialIcons name="delete-outline" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* SOS SENDING BANNER */}
      {sosSending && (
        <View style={styles.sosBanner}>
          <ActivityIndicator size="small" color="#fff" />
          <Text style={styles.sosBannerText}>🚨 Sending SOS alert...</Text>
        </View>
      )}

      {/* MESSAGES */}
      {isLoadingHistory ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6B7FED" />
          <Text style={styles.loadingText}>Loading chat history...</Text>
        </View>
      ) : (
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.botAvatarContainer}>
            <Text style={styles.botAvatar}>🤖</Text>
            <Text style={styles.sparkle}>✨</Text>
          </View>

          {messages.map((msg) => (
            <View
              key={msg.id}
              style={[styles.messageWrapper, msg.isUser ? styles.userMessageWrapper : styles.botMessageWrapper]}
            >
              <View
                style={[
                  styles.messageBubble,
                  msg.isUser ? styles.userMessage : styles.botMessage,
                  msg.text.startsWith('🚨') && styles.sosMessage,
                  msg.text.startsWith('✅') && styles.sosSuccessMessage,
                ]}
              >
                {msg.image && (
                  <Image source={{ uri: msg.image }} style={styles.messageImage} resizeMode="cover" />
                )}

                <Text
                  style={[
                    styles.messageText,
                    msg.isUser ? styles.userMessageText : styles.botMessageText,
                    msg.text.startsWith('🚨') && styles.sosMessageText,
                    msg.text.startsWith('✅') && styles.sosSuccessText,
                  ]}
                >
                  {msg.text}
                </Text>

                {/* Doctor recommendation cards */}
                {!msg.isUser && msg.doctors && msg.doctors.length > 0 && (
                  <View style={styles.doctorSection}>
                    <View style={styles.doctorSectionHeader}>
                      <MaterialIcons name="local-hospital" size={16} color="#6B7FED" />
                      <Text style={styles.doctorSectionTitle}>Recommended Doctors</Text>
                    </View>
                    {msg.doctors.map(renderDoctorCard)}
                  </View>
                )}
              </View>

              {!msg.isUser && (
                <TouchableOpacity style={styles.copyButton} onPress={() => handleCopy(msg.text)}>
                  <Ionicons name="copy-outline" size={16} color="#999" />
                </TouchableOpacity>
              )}
            </View>
          ))}

          {isLoading && (
            <View style={styles.botMessageWrapper}>
              <ActivityIndicator size="small" color="#6B7FED" />
            </View>
          )}
        </ScrollView>
      )}

      {/* INPUT */}
      <View style={[styles.inputContainer, { paddingBottom: insets.bottom || 15 }]}>
        <TouchableOpacity style={styles.mediaButton} onPress={handleMediaOptions}>
          <Ionicons name="attach" size={22} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Describe your symptoms..."
            placeholderTextColor="#999"
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={1000}
          />
        </View>
        <TouchableOpacity
          style={[styles.sendButton, (!message.trim() || isLoading) && styles.sendButtonDisabled]}
          onPress={() => handleSend()}
          disabled={!message.trim() || isLoading}
        >
          <Ionicons name="send" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2FF' },

  header: {
    backgroundColor:   '#6B7FED',
    paddingHorizontal: 18,
    paddingBottom:     12,
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  menuButton:  { padding: 6 },

  sosBanner: {
    backgroundColor: '#FF0000',
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    paddingVertical: 10,
    gap:             8,
  },
  sosBannerText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  loadingText:      { fontSize: 14, color: '#6B7FED' },

  messagesContainer: { flex: 1 },
  messagesContent:   { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },

  botAvatarContainer: { alignItems: 'center', marginBottom: 16 },
  botAvatar:          { fontSize: 48 },
  sparkle:            { fontSize: 16, position: 'absolute', top: -2, right: '37%' },

  messageWrapper:     { flexDirection: 'row', marginBottom: 10, alignItems: 'flex-end' },
  userMessageWrapper: { justifyContent: 'flex-end' },
  botMessageWrapper:  { justifyContent: 'flex-start', gap: 6 },

  messageBubble: { maxWidth: '80%', borderRadius: 18, padding: 10, paddingHorizontal: 14 },
  userMessage:   { backgroundColor: '#6B7FED', borderBottomRightRadius: 4 },
  botMessage:    { backgroundColor: '#FFF', borderBottomLeftRadius: 4, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },

  sosMessage:        { backgroundColor: '#FF000015', borderLeftWidth: 3, borderLeftColor: '#FF0000' },
  sosSuccessMessage: { backgroundColor: '#00B37415', borderLeftWidth: 3, borderLeftColor: '#00B374' },
  sosMessageText:    { color: '#CC0000', fontWeight: '600' },
  sosSuccessText:    { color: '#00B374', fontWeight: '600' },

  messageText:     { fontSize: 14, lineHeight: 20 },
  userMessageText: { color: '#FFF' },
  botMessageText:  { color: '#2C3E50' },
  messageImage:    { width: '100%', height: 160, borderRadius: 10, marginBottom: 6 },

  copyButton: { padding: 4 },

  // ── Doctor recommendation section ──────────────────────────────────────────
  doctorSection: {
    marginTop:    12,
    borderTopWidth: 1,
    borderTopColor: '#E8ECFF',
    paddingTop:   10,
  },
  doctorSectionHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            6,
    marginBottom:   8,
  },
  doctorSectionTitle: {
    fontSize:   13,
    fontWeight: '700',
    color:      '#6B7FED',
  },
  doctorCard: {
    flexDirection:    'row',
    alignItems:       'center',
    backgroundColor:  '#F5F7FF',
    borderRadius:     12,
    padding:          10,
    marginBottom:     8,
    borderWidth:      1,
    borderColor:      '#DDE3FF',
  },
  doctorAvatar: {
    width:           42,
    height:          42,
    borderRadius:    21,
    backgroundColor: '#6B7FED',
    alignItems:      'center',
    justifyContent:  'center',
    marginRight:     10,
  },
  doctorAvatarImg: { width: 42, height: 42, borderRadius: 21 },
  doctorAvatarLetter: { color: '#fff', fontSize: 18, fontWeight: '700' },

  doctorInfo:   { flex: 1 },
  doctorName:   { fontSize: 13, fontWeight: '700', color: '#1A1F36', marginBottom: 2 },
  doctorSpec:   { fontSize: 11, color: '#6B7FED', marginBottom: 3 },
  doctorRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  starIcon:     { fontSize: 11 },
  ratingText:   { fontSize: 11, color: '#6B7280' },

  bookBadge: {
    flexDirection:    'row',
    alignItems:       'center',
    backgroundColor:  '#EEF0FF',
    paddingHorizontal: 8,
    paddingVertical:  4,
    borderRadius:     8,
    gap:              2,
  },
  bookBadgeText: { fontSize: 12, fontWeight: '700', color: '#6B7FED' },

  // ── Input ──────────────────────────────────────────────────────────────────
  inputContainer: {
    flexDirection:    'row',
    paddingHorizontal: 12,
    paddingTop:       10,
    paddingBottom:    10,
    backgroundColor:  '#FFF',
    alignItems:       'flex-end',
    borderTopWidth:   1,
    borderTopColor:   '#EAECF5',
  },
  mediaButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#6B7FED',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 8,
  },
  inputWrapper: {
    flex:              1,
    backgroundColor:   '#F0F2FF',
    borderRadius:      22,
    paddingHorizontal: 14,
    paddingVertical:   8,
    marginRight:       8,
    minHeight:         40,
    justifyContent:    'center',
  },
  input:              { fontSize: 14, color: '#2C3E50', maxHeight: 100 },
  sendButton:         { width: 40, height: 40, borderRadius: 20, backgroundColor: '#6B7FED', justifyContent: 'center', alignItems: 'center' },
  sendButtonDisabled: { backgroundColor: '#C5CAE9' },
});
