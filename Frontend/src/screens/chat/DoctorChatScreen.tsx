import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Image, KeyboardAvoidingView, Platform,
  StatusBar, Animated, Alert, ActivityIndicator,
  Clipboard,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { io, Socket } from 'socket.io-client';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { chatAPI, SOCKET_URL, API_URL } from '../../services/api';
import VoicePlayer        from '../../components/VoicePlayer';
import VoiceRecorder      from '../../components/VoiceRecorder';
import VideoPlayer        from '../../components/VideoPlayer';
import ImageViewer        from '../../components/ImageViewer';
import MessageContextMenu from '../../components/MessageContextMenu';

interface Reaction { emoji: string; userId: string; }
interface Message {
  _id: string; senderId: string; receiverId: string; conversationId: string;
  text?: string; fileUrl?: string; fileType?: 'image' | 'video' | 'document' | 'voice';
  fileName?: string; duration?: number; createdAt: string; read: boolean;
  isTemp?: boolean; reactions?: Reaction[]; edited?: boolean;
}
interface RouteParams {
  patientId: string; patientName: string; patientAvatar?: string; conversationId: string;
  appointmentId?: string; startTime?: string; sessionDuration?: number;
}
interface Props { route: { params: RouteParams }; }

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const formatCountdown = (seconds: number): string => {
  if (seconds <= 0) return '00:00';
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const getMyUserId = async (): Promise<string | null> => {
  try {
    const str = await AsyncStorage.getItem('user');
    if (!str) return null;
    return JSON.parse(str)?._id ?? null;
  } catch { return null; }
};

const getMimeType = (fileName: string, fileType: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (fileType === 'image') {
    if (ext === 'png')  return 'image/png';
    if (ext === 'gif')  return 'image/gif';
    if (ext === 'webp') return 'image/webp';
    return 'image/jpeg';
  }
  if (fileType === 'video') {
    if (ext === 'mov') return 'video/quicktime';
    return 'video/mp4';
  }
  if (fileType === 'voice') return 'audio/m4a';
  return 'application/octet-stream';
};

export default function DoctorChatScreen({ route }: Props) {
  const {
    patientId, patientName, patientAvatar, conversationId,
    appointmentId, startTime, sessionDuration,
  } = route.params;

  const insets     = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [resolvedAvatar,    setResolvedAvatar]    = useState<string | null>(patientAvatar ?? null);
  const [messages,          setMessages]          = useState<Message[]>([]);
  const [inputText,         setInputText]         = useState('');
  const [isPatientTyping,   setIsPatientTyping]   = useState(false);
  const [isPatientOnline,   setIsPatientOnline]   = useState(false);
  const [isLoading,         setIsLoading]         = useState(true);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [attachMenuOpen,    setAttachMenuOpen]    = useState(false);
  const [uploading,         setUploading]         = useState(false);
  const [contextVisible,    setContextVisible]    = useState(false);
  const [contextMessage,    setContextMessage]    = useState<Message | null>(null);
  const [contextPosition,   setContextPosition]   = useState({ x: 0, y: 0 });
  const [editingMessage,    setEditingMessage]    = useState<Message | null>(null);
  const [secondsLeft,       setSecondsLeft]       = useState<number | null>(null);
  const [sessionEnded,      setSessionEnded]      = useState(false);

  const doctorIdRef     = useRef<string>('');
  const socketRef       = useRef<Socket | null>(null);
  const flatListRef     = useRef<FlatList>(null);
  const typingTimeout   = useRef<NodeJS.Timeout | null>(null);
  const attachAnim      = useRef(new Animated.Value(0)).current;
  const dot1            = useRef(new Animated.Value(0)).current;
  const dot2            = useRef(new Animated.Value(0)).current;
  const dot3            = useRef(new Animated.Value(0)).current;
  const sessionEndedRef = useRef(false);
  const countdownRef    = useRef<NodeJS.Timeout | null>(null);

  // Fetch patient's real profile image
  useEffect(() => {
    const base = API_URL.replace('/api', '');
    fetch(`${API_URL}/profiles/user/${patientId}`)
      .then((r) => r.json())
      .then((json) => {
        const imgPath = json?.data?.profileImage;
        if (imgPath) {
          setResolvedAvatar(imgPath.startsWith('http') ? imgPath : base + imgPath);
        }
      })
      .catch(() => {});
  }, [patientId]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const id = await getMyUserId();
      if (!id || !mounted) { setIsLoading(false); return; }
      doctorIdRef.current = id;
      await loadHistory();
      connectSocket(id);
    })();
    return () => {
      mounted = false;
      socketRef.current?.disconnect();
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      if (countdownRef.current)  clearInterval(countdownRef.current);
    };
  }, []);

  useEffect(() => {
    if (!startTime || !sessionDuration) return;
    const endTimeMs = new Date(startTime).getTime() + sessionDuration * 60 * 1000;
    const tick = () => {
      const remaining = Math.max(0, Math.round((endTimeMs - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) handleSessionEnd();
    };
    tick();
    countdownRef.current = setInterval(tick, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [startTime, sessionDuration]);

  const handleSessionEnd = useCallback(() => {
    if (sessionEndedRef.current) return;
    sessionEndedRef.current = true;
    setSessionEnded(true);
    if (countdownRef.current) clearInterval(countdownRef.current);
    setTimeout(() => navigation.goBack(), 2500);
  }, [navigation]);

  const loadHistory = useCallback(async () => {
    if (!conversationId) { setIsLoading(false); return; }
    try {
      const res = await chatAPI.getHistory(conversationId, 1, 50);
      if (res.data?.messages) setMessages([...res.data.messages].reverse());
      else setMessages([]);
    } catch (e) {
      console.error('loadHistory error:', e);
      setMessages([]);
    } finally { setIsLoading(false); }
  }, [conversationId]);

  const connectSocket = (docId: string) => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      query: { userId: docId, role: 'doctor' },
      reconnection: true, reconnectionAttempts: 10,
      reconnectionDelay: 1000, timeout: 20000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_conversation', { conversationId });
      if (appointmentId) socket.emit('join-appointment', appointmentId);
    });
    socket.on('reconnect', () => {
      socket.emit('join_conversation', { conversationId });
      if (appointmentId) socket.emit('join-appointment', appointmentId);
      loadHistory();
    });
    socket.on('appointment-completed', ({ appointmentId: id }: { appointmentId: string }) => {
      if (id === appointmentId) handleSessionEnd();
    });
    socket.on('receive_message', (msg: Message) => {
      setMessages(prev => {
        const withoutTemp = prev.filter(m => {
          if (!m.isTemp) return true;
          return !(String(m.senderId) === String(msg.senderId) &&
            String(m.text ?? '') === String(msg.text ?? '') &&
            (m.fileType ?? '') === (msg.fileType ?? ''));
        });
        if (withoutTemp.some(m => m._id === msg._id)) return withoutTemp;
        return [...withoutTemp, msg];
      });
      scrollToBottom();
    });
    socket.on('message_edited',   ({ messageId, text }: any) => {
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, text, edited: true } : m));
    });
    socket.on('message_deleted',  ({ messageId }: any) => {
      setMessages(prev => prev.filter(m => m._id !== messageId));
    });
    socket.on('message_reaction', ({ messageId, emoji, userId }: any) => {
      setMessages(prev => prev.map(m => {
        if (m._id !== messageId) return m;
        const existing = m.reactions || [];
        const hasIt    = existing.some(r => r.userId === userId && r.emoji === emoji);
        const reactions = hasIt
          ? existing.filter(r => !(r.userId === userId && r.emoji === emoji))
          : [...existing, { emoji, userId }];
        return { ...m, reactions };
      }));
    });
    socket.on('user_typing',      ({ userId }: any) => { if (userId === patientId) setIsPatientTyping(true); });
    socket.on('user_stop_typing', ({ userId }: any) => { if (userId === patientId) setIsPatientTyping(false); });
    socket.on('user_online',      ({ userId }: any) => { if (userId === patientId) setIsPatientOnline(true); });
    socket.on('user_offline',     ({ userId }: any) => { if (userId === patientId) setIsPatientOnline(false); });
    socket.on('message_read',     ({ messageId }: any) => {
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, read: true } : m));
    });
  };

  const scrollToBottom = () =>
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 120);

  useEffect(() => {
    if (!isPatientTyping) { [dot1, dot2, dot3].forEach(d => d.setValue(0)); return; }
    [dot1, dot2, dot3].forEach((dot, i) =>
      Animated.loop(Animated.sequence([
        Animated.delay(i * 150),
        Animated.timing(dot, { toValue: -6, duration: 300, useNativeDriver: true }),
        Animated.timing(dot, { toValue: 0,  duration: 300, useNativeDriver: true }),
      ])).start()
    );
  }, [isPatientTyping]);

  const toggleAttach = () => {
    Animated.spring(attachAnim, { toValue: attachMenuOpen ? 0 : 1, useNativeDriver: true, friction: 6 }).start();
    setAttachMenuOpen(p => !p);
  };

  const sendText = useCallback(() => {
    const myId = doctorIdRef.current;
    if (!inputText.trim() || !myId) return;
    const text = inputText.trim();
    setInputText('');
    if (editingMessage) {
      socketRef.current?.emit('edit_message', { messageId: editingMessage._id, text, conversationId });
      setMessages(prev => prev.map(m =>
        m._id === editingMessage._id ? { ...m, text, edited: true } : m
      ));
      setEditingMessage(null);
      return;
    }
    const temp: Message = {
      _id: `temp_${Date.now()}`, senderId: myId, receiverId: patientId,
      conversationId, text, createdAt: new Date().toISOString(), read: false, isTemp: true,
    };
    setMessages(prev => [...prev, temp]);
    scrollToBottom();
    socketRef.current?.emit('send_message', { conversationId, senderId: myId, receiverId: patientId, text });
    socketRef.current?.emit('stop_typing',  { conversationId, userId: myId });
  }, [inputText, patientId, conversationId, editingMessage]);

  const handleTyping = (t: string) => {
    setInputText(t);
    const myId = doctorIdRef.current;
    if (!myId) return;
    socketRef.current?.emit('typing', { conversationId, userId: myId });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socketRef.current?.emit('stop_typing', { conversationId, userId: myId });
    }, 1500);
  };

  const handleReact  = (messageId: string, emoji: string) => {
    socketRef.current?.emit('react_message', { messageId, emoji, userId: doctorIdRef.current, conversationId });
  };
  const handleDelete = (messageId: string) => {
    socketRef.current?.emit('delete_message', { messageId, conversationId });
    setMessages(prev => prev.filter(m => m._id !== messageId));
  };
  const handleEdit   = (message: Message) => { setEditingMessage(message); setInputText(message.text || ''); };
  const handleCopy   = (text: string) => { Clipboard.setString(text); Alert.alert('Copied', 'Message copied to clipboard'); };
  const handleLongPress = (message: Message, event: any) => {
    const { pageY } = event.nativeEvent;
    setContextMessage(message); setContextPosition({ x: 0, y: pageY }); setContextVisible(true);
  };

  const pickImage = async () => {
    setAttachMenuOpen(false); attachAnim.setValue(0);
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'] as any, quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      const asset    = result.assets[0];
      const isVideo  = asset.type === 'video' || (asset.uri ?? '').endsWith('.mp4') || (asset.uri ?? '').endsWith('.mov');
      const fileType = isVideo ? 'video' : 'image';
      const ext      = (asset.uri ?? '').split('.').pop() || (isVideo ? 'mp4' : 'jpg');
      await uploadAndEmit(asset.uri, fileType as any, asset.fileName || `${fileType}_${Date.now()}.${ext}`);
    }
  };

  const pickDocument = async () => {
    setAttachMenuOpen(false); attachAnim.setValue(0);
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    if (result.assets?.[0]) await uploadAndEmit(result.assets[0].uri, 'document', result.assets[0].name);
  };

  const uploadAndEmit = async (
    uri: string, type: 'image' | 'video' | 'document' | 'voice', name: string, durationSec?: number,
  ) => {
    const myId = doctorIdRef.current;
    if (!myId) return;
    setUploading(true);
    try {
      const mimeType = getMimeType(name, type);
      const res = await chatAPI.uploadFile(new FormData(), type, {
        uri, name, mimeType, conversationId, receiverId: patientId,
        duration: durationSec !== undefined ? String(durationSec) : '0',
      });
      if (res.data?.fileUrl) {
        socketRef.current?.emit('send_message', {
          conversationId, senderId: myId, receiverId: patientId,
          fileUrl: res.data.fileUrl, fileType: type, fileName: name, duration: durationSec,
        });
      } else Alert.alert('Upload failed', res.data?.message || 'Try again.');
    } catch (err: any) {
      Alert.alert('Upload failed', err?.message || 'Could not send file.');
    } finally { setUploading(false); }
  };

  const handleVoiceSend   = (audioUri: string, dur: number) => { setShowVoiceRecorder(false); uploadAndEmit(audioUri, 'voice', `voice_${Date.now()}.m4a`, dur); };
  const handleVoiceCancel = () => setShowVoiceRecorder(false);

  const isWarning = secondsLeft !== null && secondsLeft <= 120 && secondsLeft > 30;
  const isUrgent  = secondsLeft !== null && secondsLeft <= 30 && !sessionEnded;
  const timerBg    = isUrgent ? '#FFE0E0' : isWarning ? '#FFF3E0' : 'rgba(255,255,255,0.2)';
  const timerColor = isUrgent ? '#C0392B' : isWarning ? '#B25E00' : '#FFFFFF';

  const resolveFileUrl = (url: string) => {
    if (!url || url.startsWith('http')) return url;
    return API_URL.replace('/api', '') + url;
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe    = item.senderId === doctorIdRef.current;
    const isMedia = item.fileType === 'image' || item.fileType === 'video';
    const content = () => {
      if (item.fileType === 'voice' && item.fileUrl)
        return <VoicePlayer audioUri={resolveFileUrl(item.fileUrl)} duration={item.duration ?? 0} isUserMessage={isMe} />;
      if (item.fileType === 'image' && item.fileUrl)
        return <ImageViewer uri={resolveFileUrl(item.fileUrl)} thumbnailStyle={{ width: 200, height: 150, borderRadius: 12, marginBottom: 4 }} />;
      if (item.fileType === 'video' && item.fileUrl)
        return <VideoPlayer uri={resolveFileUrl(item.fileUrl)} fileName={item.fileName} />;
      if (item.fileType === 'document')
        return (
          <View style={styles.docRow}>
            <MaterialIcons name="insert-drive-file" size={20} color={isMe ? '#fff' : '#6B7FED'} />
            <Text style={[styles.docName, { color: isMe ? '#fff' : '#2C3E50' }]} numberOfLines={1}>
              {item.fileName || 'Document'}
            </Text>
          </View>
        );
      return (
        <View>
          <Text style={[styles.msgText, { color: isMe ? '#fff' : '#2C3E50' }]}>{item.text}</Text>
          {item.edited && <Text style={[styles.editedLabel, { color: isMe ? 'rgba(255,255,255,0.6)' : '#aaa' }]}>edited</Text>}
        </View>
      );
    };
    const reactionGroups: Record<string, number> = {};
    (item.reactions || []).forEach(r => { reactionGroups[r.emoji] = (reactionGroups[r.emoji] || 0) + 1; });
    const reactionEntries = Object.entries(reactionGroups);
    return (
      <TouchableOpacity activeOpacity={0.85} onLongPress={(e) => !item.isTemp && handleLongPress(item, e)} delayLongPress={350}>
        <View style={[styles.msgRow, isMe ? styles.rowRight : styles.rowLeft]}>
          {!isMe && (
            <Image source={resolvedAvatar ? { uri: resolvedAvatar } : require('../../../assets/icon.png')} style={styles.msgAvatar} />
          )}
          <View style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '74%' }}>
            <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem, item.isTemp && { opacity: 0.7 }, isMedia && { paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0, overflow: 'hidden' }, item.fileType === 'voice' && { width: 260 }]}>
              {content()}
              <View style={[styles.metaRow, isMedia && { paddingHorizontal: 8, paddingBottom: 6 }]}>
                <Text style={[styles.metaTime, { color: isMe ? 'rgba(255,255,255,0.65)' : '#B0B3C6' }]}>{formatTime(item.createdAt)}</Text>
                {isMe && <MaterialIcons name={item.isTemp ? 'access-time' : item.read ? 'done-all' : 'done'} size={13} color={item.read ? '#4ADE80' : 'rgba(255,255,255,0.7)'} />}
              </View>
            </View>
            {reactionEntries.length > 0 && (
              <View style={[styles.reactionsWrap, isMe ? styles.reactionsRight : styles.reactionsLeft]}>
                {reactionEntries.map(([emoji, count]) => (
                  <TouchableOpacity key={emoji} style={styles.reactionPill} onPress={() => handleReact(item._id, emoji)}>
                    <Text style={styles.reactionEmoji}>{emoji}</Text>
                    {count > 1 && <Text style={styles.reactionCount}>{count}</Text>}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#6B7FED" />
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.avatarWrap}>
          <Image source={resolvedAvatar ? { uri: resolvedAvatar } : require('../../../assets/icon.png')} style={styles.headerAvatar} />
          {isPatientOnline && <View style={styles.onlineDot} />}
        </View>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerName}>{patientName}</Text>
          <Text style={styles.headerStatus}>
            {isPatientTyping ? 'Typing...' : isPatientOnline ? 'Online' : 'Offline'}
          </Text>
        </View>

        {secondsLeft !== null && startTime ? (
          <View style={[styles.countdownPill, { backgroundColor: timerBg }]}>
            <MaterialIcons name="timer" size={14} color={timerColor} />
            <Text style={[styles.countdownText, { color: timerColor }]}>
              {sessionEnded ? 'Ended' : formatCountdown(secondsLeft)}
            </Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.headerIconBtn}>
            <MaterialIcons name="notifications" size={22} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#6B7FED" />
            <Text style={styles.loadingText}>Loading messages...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef} data={messages} renderItem={renderMessage}
            keyExtractor={item => item._id} contentContainerStyle={styles.msgList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <MaterialIcons name="chat-bubble-outline" size={50} color="#CCC" />
                <Text style={styles.emptyText}>No messages yet{'\n'}Say hello! 👋</Text>
              </View>
            }
          />
        )}

        {sessionEnded && (
          <View style={styles.sessionEndedBanner}>
            <MaterialIcons name="info-outline" size={16} color="#fff" />
            <Text style={styles.sessionEndedText}>Session has ended. Closing...</Text>
          </View>
        )}

        {uploading && (
          <View style={styles.uploadingBar}>
            <ActivityIndicator size="small" color="#6B7FED" />
            <Text style={styles.uploadingText}>Uploading...</Text>
          </View>
        )}
        {isPatientTyping && (
          <View style={styles.typingRow}>
            <Image source={resolvedAvatar ? { uri: resolvedAvatar } : require('../../../assets/icon.png')} style={styles.msgAvatar} />
            <View style={styles.typingBubble}>
              {[dot1, dot2, dot3].map((d, i) => (
                <Animated.View key={i} style={[styles.typingDot, { transform: [{ translateY: d }] }]} />
              ))}
            </View>
          </View>
        )}
        {attachMenuOpen && (
          <Animated.View style={[styles.attachMenu, { opacity: attachAnim, transform: [{ scale: attachAnim }] }]}>
            <TouchableOpacity style={styles.attachItem} onPress={pickImage}>
              <View style={[styles.attachIconWrap, { backgroundColor: '#E8F0FE' }]}>
                <MaterialIcons name="image" size={24} color="#6B7FED" />
              </View>
              <Text style={styles.attachLabel}>Photo/Video</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachItem} onPress={pickDocument}>
              <View style={[styles.attachIconWrap, { backgroundColor: '#FFF3E0' }]}>
                <MaterialIcons name="insert-drive-file" size={24} color="#FF8C00" />
              </View>
              <Text style={styles.attachLabel}>Document</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
        {editingMessage && (
          <View style={styles.editBanner}>
            <MaterialIcons name="edit" size={16} color="#6B7FED" />
            <Text style={styles.editBannerText} numberOfLines={1}>Editing: {editingMessage.text}</Text>
            <TouchableOpacity onPress={() => { setEditingMessage(null); setInputText(''); }}>
              <MaterialIcons name="close" size={18} color="#888" />
            </TouchableOpacity>
          </View>
        )}

        {!sessionEnded && (
          showVoiceRecorder ? (
            <VoiceRecorder onSend={handleVoiceSend} onCancel={handleVoiceCancel} />
          ) : (
            <View style={styles.inputBar}>
              <TouchableOpacity onPress={toggleAttach} style={styles.inputIconBtn}>
                <MaterialIcons name={attachMenuOpen ? 'close' : 'attach-file'} size={22} color="#6B7FED" />
              </TouchableOpacity>
              <TextInput
                style={styles.textInput}
                placeholder={editingMessage ? 'Edit message...' : 'Type something...'}
                placeholderTextColor="#B0B3C6" value={inputText}
                onChangeText={handleTyping} multiline maxLength={1000}
              />
              {inputText.trim() ? (
                <TouchableOpacity onPress={sendText} style={styles.sendBtn}>
                  <Ionicons name="send" size={18} color="#fff" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => { setAttachMenuOpen(false); attachAnim.setValue(0); setShowVoiceRecorder(true); }}
                  style={styles.sendBtn}
                >
                  <MaterialIcons name="mic" size={20} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
          )
        )}
      </KeyboardAvoidingView>

      <MessageContextMenu
        visible={contextVisible} message={contextMessage}
        isMe={contextMessage?.senderId === doctorIdRef.current}
        position={contextPosition} onClose={() => setContextVisible(false)}
        onReact={handleReact} onDelete={handleDelete} onEdit={handleEdit} onCopy={handleCopy}
      />
    </View>
  );
}

const PURPLE = '#6B7FED';
const WHITE  = '#FFFFFF';
const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#F5F5F5' },
  header:             { backgroundColor: PURPLE, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', elevation: 4, shadowColor: PURPLE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8 },
  backBtn:            { marginRight: 8, padding: 2 },
  avatarWrap:         { position: 'relative' },
  headerAvatar:       { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: WHITE },
  onlineDot:          { position: 'absolute', bottom: 0, right: 0, width: 11, height: 11, borderRadius: 6, backgroundColor: '#4ADE80', borderWidth: 2, borderColor: PURPLE },
  headerTextWrap:     { flex: 1, marginLeft: 10 },
  headerName:         { color: WHITE, fontSize: 16, fontWeight: '700' },
  headerStatus:       { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 1 },
  headerIconBtn:      { padding: 4 },
  countdownPill:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, minWidth: 68, justifyContent: 'center' },
  countdownText:      { fontSize: 13, fontWeight: '700' },
  sessionEndedBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#C0392B', paddingHorizontal: 16, paddingVertical: 10, justifyContent: 'center' },
  sessionEndedText:   { color: '#fff', fontSize: 13, fontWeight: '600' },
  loadingWrap:        { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText:        { marginTop: 12, fontSize: 14, color: '#888' },
  emptyWrap:          { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText:          { marginTop: 12, fontSize: 14, color: '#AAA', textAlign: 'center', lineHeight: 22 },
  uploadingBar:       { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 6, backgroundColor: '#F0F4FF' },
  uploadingText:      { fontSize: 12, color: '#6B7FED', fontWeight: '600' },
  msgList:            { padding: 16, paddingBottom: 8, flexGrow: 1 },
  msgRow:             { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  rowRight:           { justifyContent: 'flex-end' },
  rowLeft:            { justifyContent: 'flex-start' },
  msgAvatar:          { width: 32, height: 32, borderRadius: 16, marginRight: 8 },
  bubble:             { borderRadius: 18, paddingHorizontal: 13, paddingTop: 10, paddingBottom: 6, flexShrink: 1 },
  bubbleMe:           { backgroundColor: PURPLE, borderBottomRightRadius: 4, shadowColor: PURPLE, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.22, shadowRadius: 6, elevation: 3 },
  bubbleThem:         { backgroundColor: WHITE, borderBottomLeftRadius: 4, borderWidth: 1.5, borderColor: '#E8ECFF', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  msgText:            { fontSize: 14.5, lineHeight: 21 },
  editedLabel:        { fontSize: 10, marginTop: 2 },
  docRow:             { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  docName:            { fontSize: 13, fontWeight: '500', flexShrink: 1 },
  metaRow:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 4 },
  metaTime:           { fontSize: 10.5 },
  reactionsWrap:      { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  reactionsRight:     { justifyContent: 'flex-end' },
  reactionsLeft:      { justifyContent: 'flex-start' },
  reactionPill:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: '#E8ECFF', gap: 2 },
  reactionEmoji:      { fontSize: 14 },
  reactionCount:      { fontSize: 11, color: '#555', fontWeight: '600' },
  typingRow:          { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingBottom: 6 },
  typingBubble:       { flexDirection: 'row', alignItems: 'center', backgroundColor: WHITE, borderRadius: 16, borderBottomLeftRadius: 4, borderWidth: 1.5, borderColor: '#E8ECFF', paddingHorizontal: 14, paddingVertical: 12, gap: 4 },
  typingDot:          { width: 7, height: 7, borderRadius: 4, backgroundColor: '#B0B3C6' },
  attachMenu:         { backgroundColor: WHITE, borderRadius: 16, padding: 14, flexDirection: 'row', gap: 16, borderWidth: 1, borderColor: '#E8ECFF', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 8, marginHorizontal: 16, marginBottom: 6 },
  attachItem:         { alignItems: 'center', gap: 6 },
  attachIconWrap:     { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  attachLabel:        { fontSize: 11, color: '#555', fontWeight: '600' },
  editBanner:         { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F0F4FF', paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#E8ECFF' },
  editBannerText:     { flex: 1, fontSize: 13, color: '#555' },
  inputBar:           { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: WHITE, paddingHorizontal: 10, paddingVertical: 8, marginHorizontal: 12, marginBottom: Platform.OS === 'ios' ? 26 : 10, borderRadius: 28, borderWidth: 1.5, borderColor: '#E8ECFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  inputIconBtn:       { padding: 6, marginRight: 2 },
  textInput:          { flex: 1, fontSize: 14.5, color: '#2C3E50', maxHeight: 100, paddingTop: 4, paddingBottom: 4 },
  sendBtn:            { width: 36, height: 36, borderRadius: 18, backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
});