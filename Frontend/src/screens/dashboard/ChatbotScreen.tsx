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
import { chatbotAPI } from '../../services/api';
import { getUser } from '../../services/storage';
import { triggerSOS } from '../../services/sosService'; // 👈 NEW

interface Message {
  id:        string;
  text:      string;
  isUser:    boolean;
  timestamp: Date;
  image?:    string;
}

type ChatbotScreenProps = {
  id:   string;
  role: 'user' | 'doctor';
};

// 👇 NEW — critical keywords that trigger SOS
const CRITICAL_KEYWORDS = [
  "chest pain",
  "can't breathe",
  "cant breathe",
  "cannot breathe",
  "heart attack",
  "i'm dying",
  "im dying",
  "i am dying",
  "help me",
  "unconscious",
  "overdose",
  "i want to die",
  "killing myself",
  "suicidal",
  "suicide",
  "can't move",
  "cant move",
  "severe pain",
  "emergency",
  "feeling faint",
  "collapsing",
  "stroke",
  "choking",
  "not breathing",
  "seizure",
  "unconscious",
  "passing out",
];

// 👇 NEW — check if message contains critical keyword
const checkCriticalKeywords = (text: string): boolean => {
  const lower = text.toLowerCase().trim();
  return CRITICAL_KEYWORDS.some((keyword) => lower.includes(keyword));
};

export default function ChatbotScreen({ id, role }: ChatbotScreenProps) {
  const insets       = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const [message,           setMessage]           = useState('');
  const [messages,          setMessages]          = useState<Message[]>([]);
  const [isLoading,         setIsLoading]         = useState(false);
  const [isLoadingHistory,  setIsLoadingHistory]  = useState(true);
  const [userId,            setUserId]            = useState('');
  const [sosSending,        setSosSending]        = useState(false); // 👈 NEW

  const defaultWelcome: Message = {
    id:        'welcome',
    text:      role === 'doctor'
      ? 'Hi Doctor! I am your TruHeal-Link assistant. How can I help you today? 😊'
      : 'Hi! I am your TruHeal-Link health assistant. Ask me anything about your health! 😊',
    isUser:    false,
    timestamp: new Date(),
  };

  /* ── Load User + History ─────────────────────────────────────────────────── */
  useEffect(() => {
    const loadUserAndHistory = async () => {
      try {
        setIsLoadingHistory(true);

        const userData = await getUser();
        if (!userData?._id) {
          setMessages([defaultWelcome]);
          return;
        }

        setUserId(userData._id);

        const response = await chatbotAPI.getChatHistory(userData._id);
        const history  = Array.isArray(response.data.data)
          ? response.data.data
          : [];

        if (!history || history.length === 0) {
          setMessages([defaultWelcome]);
          return;
        }

        const loadedMessages: Message[] = history
          .map((item: any) => {
            const msgs: Message[] = [];
            if (item.message) {
              msgs.push({
                id:        item._id + '_user',
                text:      item.message,
                isUser:    true,
                timestamp: new Date(item.createdAt),
                image:     item.imageUrl || undefined,
              });
            }
            if (item.response) {
              msgs.push({
                id:        item._id + '_bot',
                text:      item.response,
                isUser:    false,
                timestamp: new Date(item.createdAt),
              });
            }
            return msgs;
          })
          .flat();

        setMessages(
          loadedMessages.length > 0 ? loadedMessages : [defaultWelcome],
        );
      } catch (error) {
        console.error('Failed to load history:', error);
        setMessages([defaultWelcome]);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadUserAndHistory();
  }, []);

  /* ── Auto Scroll ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  /* ── Clear Chat ──────────────────────────────────────────────────────────── */
  const handleClearChat = () => {
    Alert.alert(
      'Clear Chat',
      'Are you sure you want to clear all messages?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text:  'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              if (userId) await chatbotAPI.clearHistory(userId);
              setMessages([{
                id:        'welcome',
                text:      role === 'doctor'
                  ? 'Chat cleared! How can I help you, Doctor? 😊'
                  : 'Chat cleared! How can I help you? 😊',
                isUser:    false,
                timestamp: new Date(),
              }]);
            } catch {
              Alert.alert('Error', 'Failed to clear chat history');
            }
          },
        },
      ],
    );
  };

  /* ── Copy Message ────────────────────────────────────────────────────────── */
  const handleCopy = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied', 'Message copied to clipboard');
  };

  // 👇 NEW — handle SOS confirmation from AI chat
  const handleSOSFromChat = (userMessage: string) => {
    Alert.alert(
      '🚨 Emergency Detected',
      `We noticed you may need urgent help:\n\n"${userMessage}"\n\nDo you want to send an SOS alert to your emergency contacts?`,
      [
        {
          text:  'I am Fine',
          style: 'cancel',
        },
        {
          text:    'YES — Send SOS',
          style:   'destructive',
          onPress: async () => {
            setSosSending(true);

            // Add system message in chat
            const sosMsg: Message = {
              id:        Date.now().toString() + '_sos',
              text:      '🚨 SOS alert is being sent to your emergency contacts...',
              isUser:    false,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, sosMsg]);

            // Trigger SOS
            await triggerSOS();
            setSosSending(false);

            // Add confirmation message in chat
            const confirmMsg: Message = {
              id:        Date.now().toString() + '_confirm',
              text:      '✅ SOS alert has been sent to your emergency contacts. Help is on the way! Please stay calm.',
              isUser:    false,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, confirmMsg]);
          },
        },
      ],
    );
  };

  /* ── Send Message ────────────────────────────────────────────────────────── */
  const handleSend = async (imageUrl?: string, fileUrl?: string) => {
    const textToSend = message.trim();

    if (!textToSend && !imageUrl && !fileUrl) return;

    if (!userId) {
      Alert.alert('Error', 'User session not found. Please login again.');
      return;
    }

    // 👇 NEW — check for critical keywords BEFORE sending to AI
    // Only check for users, not doctors
    if (role === 'user' && textToSend && checkCriticalKeywords(textToSend)) {
      // Add user message to chat first
      const userMsg: Message = {
        id:        Date.now().toString(),
        text:      textToSend,
        isUser:    true,
        timestamp: new Date(),
        image:     imageUrl,
      };
      setMessages((prev) => [...prev, userMsg]);
      setMessage('');

      // Show SOS popup
      handleSOSFromChat(textToSend);
      return; // stop here — don't send to AI yet
    }

    // Normal flow — no critical keywords
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
      const response = await chatbotAPI.sendMessage({
        userId,
        message:  textToSend || (imageUrl ? 'Image sent' : 'File sent'),
        imageUrl,
        fileUrl,
      });

      const botData = response.data.data.botResponse;
      const botMsg: Message = {
        id:        botData.id,
        text:      botData.text,
        isUser:    false,
        timestamp: new Date(botData.timestamp),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (error: any) {
      const errorMsg: Message = {
        id:        Date.now().toString(),
        text:      'Sorry, I could not process your request. Please try again. 🙏',
        isUser:    false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
      console.error('Chatbot error:', error?.response?.data || error.message);
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Media Options ───────────────────────────────────────────────────────── */
  const handleMediaOptions = () => {
    Alert.alert('Select Option', 'Choose media type', [
      { text: 'Camera',  onPress: handleOpenCamera },
      { text: 'Image',   onPress: handlePickImage },
      { text: 'File',    onPress: handlePickFile },
      { text: 'Cancel',  style: 'cancel' },
    ]);
  };

  const handleOpenCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'Camera permission required');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled && result.assets?.length > 0) {
      await handleSend(result.assets[0].uri);
    }
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'Gallery permission required');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality:    0.8,
    });
    if (!result.canceled && result.assets?.length > 0) {
      await handleSend(result.assets[0].uri);
    }
  };

  const handlePickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
    if (result.canceled === false) {
      await handleSend(undefined, result.assets[0].uri);
    }
  };

  /* ── UI ──────────────────────────────────────────────────────────────────── */
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

      {/* SOS SENDING INDICATOR */}
      {sosSending && (
        <View style={styles.sosBanner}>
          <ActivityIndicator size="small" color="#fff" />
          <Text style={styles.sosBannerText}>
            🚨 Sending SOS alert...
          </Text>
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
              style={[
                styles.messageWrapper,
                msg.isUser
                  ? styles.userMessageWrapper
                  : styles.botMessageWrapper,
              ]}
            >
              <View
                style={[
                  styles.messageBubble,
                  msg.isUser ? styles.userMessage : styles.botMessage,
                  // 👇 highlight SOS system messages
                  msg.text.startsWith('🚨') && styles.sosMessage,
                  msg.text.startsWith('✅') && styles.sosSuccessMessage,
                ]}
              >
                {msg.image && (
                  <Image
                    source={{ uri: msg.image }}
                    style={styles.messageImage}
                    resizeMode="cover"
                  />
                )}
                <Text
                  style={[
                    styles.messageText,
                    msg.isUser
                      ? styles.userMessageText
                      : styles.botMessageText,
                    msg.text.startsWith('🚨') && styles.sosMessageText,
                    msg.text.startsWith('✅') && styles.sosSuccessText,
                  ]}
                >
                  {msg.text}
                </Text>
              </View>

              {!msg.isUser && (
                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={() => handleCopy(msg.text)}
                >
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

      {/* INPUT AREA */}
      <View
        style={[
          styles.inputContainer,
          { paddingBottom: insets.bottom || 15 },
        ]}
      >
        <TouchableOpacity
          style={styles.mediaButton}
          onPress={handleMediaOptions}
        >
          <Ionicons name="attach" size={22} color="#FFF" />
        </TouchableOpacity>

        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#999"
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={1000}
          />
        </View>

        <TouchableOpacity
          style={[
            styles.sendButton,
            (!message.trim() || isLoading) && styles.sendButtonDisabled,
          ]}
          onPress={() => handleSend()}
          disabled={!message.trim() || isLoading}
        >
          <Ionicons name="send" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2FF' },

  // Header
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

  // 👇 NEW — SOS banner
  sosBanner: {
    backgroundColor: '#FF0000',
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    paddingVertical: 10,
    gap:             8,
  },
  sosBannerText: {
    color:      '#fff',
    fontWeight: '700',
    fontSize:   14,
  },

  // Loading
  loadingContainer: {
    flex:           1,
    justifyContent: 'center',
    alignItems:     'center',
    gap:            10,
  },
  loadingText: { fontSize: 14, color: '#6B7FED' },

  // Messages
  messagesContainer: { flex: 1 },
  messagesContent:   {
    paddingHorizontal: 16,
    paddingTop:        16,
    paddingBottom:     8,
  },

  // Bot avatar
  botAvatarContainer: { alignItems: 'center', marginBottom: 16 },
  botAvatar:          { fontSize: 48 },
  sparkle: {
    fontSize: 16,
    position: 'absolute',
    top:      -2,
    right:    '37%',
  },

  // Message rows
  messageWrapper:     {
    flexDirection: 'row',
    marginBottom:  10,
    alignItems:    'flex-end',
  },
  userMessageWrapper: { justifyContent: 'flex-end' },
  botMessageWrapper:  { justifyContent: 'flex-start', gap: 6 },

  // Bubbles
  messageBubble: {
    maxWidth:         '78%',
    borderRadius:     18,
    padding:          10,
    paddingHorizontal: 14,
  },
  userMessage: {
    backgroundColor:      '#6B7FED',
    borderBottomRightRadius: 4,
  },
  botMessage: {
    backgroundColor:     '#FFF',
    borderBottomLeftRadius: 4,
    elevation:           1,
    shadowColor:         '#000',
    shadowOpacity:       0.05,
    shadowRadius:        4,
    shadowOffset:        { width: 0, height: 1 },
  },

  // 👇 NEW — SOS message styles
  sosMessage: {
    backgroundColor: '#FF000015',
    borderLeftWidth: 3,
    borderLeftColor: '#FF0000',
  },
  sosSuccessMessage: {
    backgroundColor: '#00B37415',
    borderLeftWidth: 3,
    borderLeftColor: '#00B374',
  },
  sosMessageText:  { color: '#CC0000', fontWeight: '600' },
  sosSuccessText:  { color: '#00B374', fontWeight: '600' },

  messageText:      { fontSize: 14, lineHeight: 20 },
  userMessageText:  { color: '#FFF' },
  botMessageText:   { color: '#2C3E50' },
  messageImage: {
    width:         '100%',
    height:        160,
    borderRadius:  10,
    marginBottom:  6,
  },

  // Copy button
  copyButton: { padding: 4 },

  // Input area
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
    width:           40,
    height:          40,
    borderRadius:    20,
    backgroundColor: '#6B7FED',
    justifyContent:  'center',
    alignItems:      'center',
    marginRight:     8,
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
  sendButton: {
    width:           40,
    height:          40,
    borderRadius:    20,
    backgroundColor: '#6B7FED',
    justifyContent:  'center',
    alignItems:      'center',
  },
  sendButtonDisabled: { backgroundColor: '#C5CAE9' },
});