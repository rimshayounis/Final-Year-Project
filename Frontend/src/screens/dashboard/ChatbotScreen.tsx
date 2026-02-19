
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

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  image?: string;
}

export default function ChatbotScreen() {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hi! I am your TruHeal-Link health assistant. Ask me anything about your health! 😊',
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string>('');

  // ✅ FIXED: using getUser() from storage instead of AsyncStorage directly
  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await getUser();
        if (userData && userData._id) {
          setUserId(userData._id);
        }
      } catch (error) {
        console.error('Failed to load user:', error);
      }
    };
    loadUser();
  }, []);

  // Auto scroll when messages update
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  /* ================= CLEAR CHAT ================= */

  const handleClearChat = () => {
    Alert.alert(
      'Clear Chat',
      'Are you sure you want to clear all messages?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              if (userId) await chatbotAPI.clearHistory(userId);
              setMessages([
                {
                  id: '1',
                  text: 'Chat cleared! How can I help you? 😊',
                  isUser: false,
                  timestamp: new Date(),
                },
              ]);
            } catch (error) {
              Alert.alert('Error', 'Failed to clear chat history');
            }
          },
        },
      ]
    );
  };

  /* ================= COPY MESSAGE ================= */

  const handleCopy = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied', 'Message copied to clipboard');
  };

  /* ================= SEND MESSAGE ================= */

  const handleSend = async (imageUrl?: string, fileUrl?: string) => {
    const textToSend = message.trim();

    if (!textToSend && !imageUrl && !fileUrl) return;

    if (!userId) {
      Alert.alert('Error', 'User session not found. Please login again.');
      return;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      text: textToSend || (imageUrl ? 'Sent an image' : 'Sent a file'),
      isUser: true,
      timestamp: new Date(),
      image: imageUrl,
    };
    setMessages((prev) => [...prev, userMsg]);
    setMessage('');
    setIsLoading(true);

    try {
      const response = await chatbotAPI.sendMessage({
        userId,
        message: textToSend || (imageUrl ? 'Image sent' : 'File sent'),
        imageUrl,
        fileUrl,
      });

      const botData = response.data.data.botResponse;

      const botMsg: Message = {
        id: botData.id,
        text: botData.text,
        isUser: false,
        timestamp: new Date(botData.timestamp),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (error: any) {
      const errorMsg: Message = {
        id: Date.now().toString(),
        text: 'Sorry, I could not process your request. Please try again. 🙏',
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
      console.error('Chatbot error:', error?.response?.data || error.message);
    } finally {
      setIsLoading(false);
    }
  };

  /* ================= MEDIA OPTIONS ================= */

  const handleMediaOptions = () => {
    Alert.alert('Select Option', 'Choose media type', [
      { text: 'Camera', onPress: handleOpenCamera },
      { text: 'Image', onPress: handlePickImage },
      { text: 'File', onPress: handlePickFile },
      { text: 'Cancel', style: 'cancel' },
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
      quality: 0.8,
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

  /* ================= UI ================= */

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor="#6B7FED" />

      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.headerTitle}>Chatbot</Text>
        <TouchableOpacity style={styles.menuButton} onPress={handleClearChat}>
          <MaterialIcons name="more-horiz" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* MESSAGES */}
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
              msg.isUser ? styles.userMessageWrapper : styles.botMessageWrapper,
            ]}
          >
            <View
              style={[
                styles.messageBubble,
                msg.isUser ? styles.userMessage : styles.botMessage,
              ]}
            >
              {msg.image && (
                <Image source={{ uri: msg.image }} style={styles.messageImage} />
              )}
              <Text
                style={[
                  styles.messageText,
                  msg.isUser ? styles.userMessageText : styles.botMessageText,
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
                <MaterialIcons name="content-copy" size={16} color="#999" />
              </TouchableOpacity>
            )}
          </View>
        ))}

        {isLoading && (
          <View style={[styles.messageWrapper, styles.botMessageWrapper]}>
            <View style={[styles.messageBubble, styles.botMessage]}>
              <ActivityIndicator size="small" color="#6B7FED" />
            </View>
          </View>
        )}
      </ScrollView>

      {/* INPUT AREA */}
      <View style={styles.inputContainer}>
        <TouchableOpacity style={styles.mediaButton} onPress={handleMediaOptions}>
          <MaterialIcons name="add" size={24} color="#FFF" />
        </TouchableOpacity>

        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Reply..."
            placeholderTextColor="#999"
            value={message}
            onChangeText={setMessage}
            multiline
            editable={!isLoading}
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

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    backgroundColor: '#6B7FED',
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  menuButton: { padding: 5 },
  messagesContainer: { flex: 1 },
  messagesContent: { padding: 20, paddingBottom: 10 },
  botAvatarContainer: {
    alignItems: 'center',
    marginVertical: 20,
    position: 'relative',
  },
  botAvatar: { fontSize: 80 },
  sparkle: { fontSize: 24, position: 'absolute', top: -5, right: '35%' },
  messageWrapper: { flexDirection: 'row', marginBottom: 15, alignItems: 'flex-end' },
  userMessageWrapper: { justifyContent: 'flex-end' },
  botMessageWrapper: { justifyContent: 'flex-start' },
  messageBubble: { maxWidth: '75%', borderRadius: 20, padding: 12, paddingHorizontal: 16 },
  userMessage: { backgroundColor: '#6B7FED', borderBottomRightRadius: 5 },
  botMessage: { backgroundColor: '#FFF', borderBottomLeftRadius: 5, elevation: 1 },
  messageText: { fontSize: 15, lineHeight: 20 },
  userMessageText: { color: '#FFF' },
  botMessageText: { color: '#2C3E50' },
  messageImage: { width: '100%', height: 200, borderRadius: 10, marginBottom: 8 },
  copyButton: { padding: 8, marginLeft: 8 },
  inputContainer: { flexDirection: 'row', padding: 15, backgroundColor: '#FFF', alignItems: 'flex-end' },
  mediaButton: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: '#6B7FED', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  inputWrapper: { flex: 1, backgroundColor: '#F5F5F5', borderRadius: 25, paddingHorizontal: 15, paddingVertical: 10, marginRight: 10, minHeight: 45, justifyContent: 'center' },
  input: { fontSize: 15, color: '#2C3E50' },
  sendButton: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: '#6B7FED', justifyContent: 'center', alignItems: 'center' },
  sendButtonDisabled: { backgroundColor: '#CCC' },
});