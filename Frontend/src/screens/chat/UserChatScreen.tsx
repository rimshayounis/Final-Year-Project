import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Image, KeyboardAvoidingView, Platform,
  StatusBar, Animated, Alert, ActivityIndicator, Modal,
  Clipboard,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { io, Socket } from 'socket.io-client';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { chatAPI, userAPI, SOCKET_URL, API_URL } from '../../services/api';
import VoicePlayer        from '../../components/VoicePlayer';
import VoiceRecorder      from '../../components/VoiceRecorder';
import VideoPlayer        from '../../components/VideoPlayer';
import ImageViewer        from '../../components/ImageViewer';
import MessageContextMenu from '../../components/MessageContextMenu';

const BASE_URL = API_URL.replace('/api', '');

interface Reaction { emoji: string; userId: string; }
interface Message {
  _id:            string;
  senderId:       string;
  receiverId:     string;
  conversationId: string;
  text?:          string;
  fileUrl?:       string;
  fileType?:      'image' | 'video' | 'document' | 'voice';
  fileName?:      string;
  duration?:      number;
  createdAt:      string;
  read:           boolean;
  isTemp?:        boolean;
  reactions?:     Reaction[];
  edited?:        boolean;
}

interface RouteParams {
  otherUserId:    string;
  otherUserName:  string;
  conversationId: string;
  myUserId:       string;
}

interface Props { route: { params: RouteParams }; }

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

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

export default function UserChatScreen({ route }: Props) {
  const { otherUserId, otherUserName, conversationId, myUserId } = route.params;

  const insets     = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [otherImage,        setOtherImage]        = useState<string | null>(null);
  const [avatarError,       setAvatarError]       = useState(false);
  const [messages,          setMessages]          = useState<Message[]>([]);
  const [inputText,         setInputText]         = useState('');
  const [isOtherTyping,     setIsOtherTyping]     = useState(false);
  const [isLoading,         setIsLoading]         = useState(true);
  const [uploading,         setUploading]         = useState(false);
  const [isBlocked,         setIsBlocked]         = useState(false);
  const [blockedByThem,     setBlockedByThem]     = useState(false);
  const [menuVisible,       setMenuVisible]       = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [attachMenuOpen,    setAttachMenuOpen]    = useState(false);
  const [contextVisible,    setContextVisible]    = useState(false);
  const [contextMessage,    setContextMessage]    = useState<Message | null>(null);
  const [contextPosition,   setContextPosition]   = useState({ x: 0, y: 0 });
  const [editingMessage,    setEditingMessage]    = useState<Message | null>(null);

  const socketRef     = useRef<Socket | null>(null);
  const flatListRef   = useRef<FlatList>(null);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);
  const pollRef       = useRef<NodeJS.Timeout | null>(null);
  const attachAnim    = useRef(new Animated.Value(0)).current;
  const dot1          = useRef(new Animated.Value(0)).current;
  const dot2          = useRef(new Animated.Value(0)).current;
  const dot3          = useRef(new Animated.Value(0)).current;

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    (async () => {
      await Promise.all([loadHistory(), loadBlockStatus()]);
      chatAPI.markUserConversationRead(conversationId, myUserId).catch(() => {});
      // Fetch other user's profile image
      try {
        const res  = await fetch(`${API_URL}/profiles/user/${otherUserId}`);
        const json = await res.json();
        const path = json?.data?.profileImage;
        if (path && mounted) setOtherImage(path.startsWith('http') ? path : BASE_URL + path);
      } catch {}
      if (mounted) connectSocket();
    })();
    // Poll every 3 seconds as socket fallback
    pollRef.current = setInterval(() => { loadHistory(); }, 3000);
    return () => {
      mounted = false;
      socketRef.current?.disconnect();
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      if (pollRef.current)       clearInterval(pollRef.current);
    };
  }, []);

  // ── Typing animation ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOtherTyping) { [dot1, dot2, dot3].forEach(d => d.setValue(0)); return; }
    [dot1, dot2, dot3].forEach((dot, i) =>
      Animated.loop(Animated.sequence([
        Animated.delay(i * 150),
        Animated.timing(dot, { toValue: -6, duration: 300, useNativeDriver: true }),
        Animated.timing(dot, { toValue: 0,  duration: 300, useNativeDriver: true }),
      ])).start()
    );
  }, [isOtherTyping]);

  // ── Data fetching ────────────────────────────────────────────────────────────
  const loadBlockStatus = async () => {
    try {
      const res = await userAPI.getBlockStatus(myUserId, otherUserId);
      setIsBlocked(res.data?.blockedByMe   ?? false);
      setBlockedByThem(res.data?.blockedByThem ?? false);
    } catch {}
  };

  const loadHistory = useCallback(async () => {
    try {
      const res = await chatAPI.getHistory(conversationId, 1, 50);
      if (res.data?.messages) setMessages([...res.data.messages].reverse());
    } catch (e) {
      console.error('loadHistory error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  // ── Socket ───────────────────────────────────────────────────────────────────
  const connectSocket = () => {
    const socket = io(SOCKET_URL, {
      transports:        ['websocket', 'polling'],
      query:             { userId: myUserId },
      reconnection:      true,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on('connect',    () => { socket.emit('join_conversation', { conversationId }); });
    socket.on('reconnect',  () => { socket.emit('join_conversation', { conversationId }); loadHistory(); });
    socket.on('disconnect', () => setIsOtherTyping(false));

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
      if (String(msg.senderId) === String(otherUserId)) {
        socket.emit('mark_read', { messageId: msg._id, conversationId });
      }
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
    socket.on('user_typing',      ({ userId }: any) => { if (userId !== myUserId) setIsOtherTyping(true);  });
    socket.on('user_stop_typing', ({ userId }: any) => { if (userId !== myUserId) setIsOtherTyping(false); });
    socket.on('message_read',     ({ messageId }: any) => {
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, read: true } : m));
    });
  };

  const scrollToBottom = () =>
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 120);

  // ── Text send / typing ────────────────────────────────────────────────────────
  const sendText = useCallback(() => {
    if (!inputText.trim() || !socketRef.current) return;
    const text = inputText.trim();
    setInputText('');

    if (editingMessage) {
      socketRef.current.emit('edit_message', { messageId: editingMessage._id, text, conversationId });
      setMessages(prev => prev.map(m =>
        m._id === editingMessage._id ? { ...m, text, edited: true } : m
      ));
      setEditingMessage(null);
      return;
    }

    const temp: Message = {
      _id: `temp_${Date.now()}`, senderId: myUserId, receiverId: otherUserId,
      conversationId, text, createdAt: new Date().toISOString(), read: false, isTemp: true,
    };
    setMessages(prev => [...prev, temp]);
    scrollToBottom();
    socketRef.current.emit('send_message', { conversationId, senderId: myUserId, receiverId: otherUserId, text });
    socketRef.current.emit('stop_typing',  { conversationId, userId: myUserId });
  }, [inputText, otherUserId, conversationId, editingMessage, myUserId]);

  const handleTyping = (t: string) => {
    setInputText(t);
    socketRef.current?.emit('typing', { conversationId, userId: myUserId });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socketRef.current?.emit('stop_typing', { conversationId, userId: myUserId });
    }, 1500);
  };

  // ── Context menu actions ──────────────────────────────────────────────────────
  const handleReact  = (messageId: string, emoji: string) => {
    socketRef.current?.emit('react_message', { messageId, emoji, userId: myUserId, conversationId });
  };
  const handleDelete = (messageId: string) => {
    socketRef.current?.emit('delete_message', { messageId, conversationId });
    setMessages(prev => prev.filter(m => m._id !== messageId));
  };
  const handleEdit   = (message: Message) => { setEditingMessage(message); setInputText(message.text || ''); };
  const handleCopy   = (text: string)     => { Clipboard.setString(text); Alert.alert('Copied', 'Message copied'); };
  const handleLongPress = (message: Message, event: any) => {
    const { pageY } = event.nativeEvent;
    setContextMessage(message); setContextPosition({ x: 0, y: pageY }); setContextVisible(true);
  };

  // ── Attach menu toggle ────────────────────────────────────────────────────────
  const toggleAttach = () => {
    Animated.spring(attachAnim, { toValue: attachMenuOpen ? 0 : 1, useNativeDriver: true, friction: 6 }).start();
    setAttachMenuOpen(p => !p);
  };

  // ── Media / file pickers ──────────────────────────────────────────────────────
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
    setUploading(true);
    try {
      const mimeType = getMimeType(name, type);
      const res = await chatAPI.uploadFile(new FormData(), type, {
        uri, name, mimeType, conversationId, receiverId: otherUserId,
        duration: durationSec !== undefined ? String(durationSec) : '0',
      });
      if (res.data?.fileUrl) {
        socketRef.current?.emit('send_message', {
          conversationId, senderId: myUserId, receiverId: otherUserId,
          fileUrl: res.data.fileUrl, fileType: type, fileName: name, duration: durationSec,
        });
      } else Alert.alert('Upload failed', res.data?.message || 'Try again.');
    } catch (err: any) {
      Alert.alert('Upload failed', err?.message || 'Could not send file.');
    } finally { setUploading(false); }
  };

  const handleVoiceSend   = (audioUri: string, dur: number) => { setShowVoiceRecorder(false); uploadAndEmit(audioUri, 'voice', `voice_${Date.now()}.m4a`, dur); };
  const handleVoiceCancel = () => setShowVoiceRecorder(false);

  // ── Block / Unblock ────────────────────────────────────────────────────────────
  const handleBlock = () => {
    setMenuVisible(false);
    Alert.alert(
      'Block User',
      `Block ${otherUserName}? They won't be able to send you messages and won't appear in your suggestions.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block', style: 'destructive',
          onPress: async () => {
            try { await userAPI.blockUser(myUserId, otherUserId); setIsBlocked(true); }
            catch (e: any) { Alert.alert('Block Failed', e?.response?.data?.message ?? 'Please try again.'); }
          },
        },
      ],
    );
  };

  const handleUnblock = () => {
    setMenuVisible(false);
    Alert.alert(
      'Unblock User', `Unblock ${otherUserName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: async () => {
            try { await userAPI.unblockUser(myUserId, otherUserId); setIsBlocked(false); }
            catch { Alert.alert('Error', 'Could not unblock. Please try again.'); }
          },
        },
      ],
    );
  };

  const viewProfile = () => { setMenuVisible(false); navigation.navigate('UserProfile', { userId: otherUserId, myUserId }); };

  // ── File URL resolution ────────────────────────────────────────────────────────
  const resolveFileUrl = (url: string) => {
    if (!url || url.startsWith('http')) return url;
    return BASE_URL + url;
  };

  // ── Message renderer ──────────────────────────────────────────────────────────
  const renderMessage = ({ item }: { item: Message }) => {
    const isMe    = item.senderId === myUserId;
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
            otherImage && !avatarError ? (
              <Image source={{ uri: otherImage }} style={styles.msgAvatar} onError={() => setAvatarError(true)} />
            ) : (
              <View style={[styles.msgAvatar, styles.avatarFallback]}>
                <Text style={styles.avatarFallbackText}>{otherUserName.charAt(0).toUpperCase()}</Text>
              </View>
            )
          )}
          <View style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
            <View style={[
              styles.bubble,
              isMe ? styles.bubbleMe : styles.bubbleThem,
              item.isTemp && { opacity: 0.7 },
              isMedia && { paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0, overflow: 'hidden' },
              item.fileType === 'voice' && { width: 240 },
            ]}>
              {content()}
              <View style={[styles.metaRow, isMedia && { paddingHorizontal: 8, paddingBottom: 6 }]}>
                <Text style={[styles.metaTime, { color: isMe ? 'rgba(255,255,255,0.65)' : '#B0B3C6' }]}>
                  {formatTime(item.createdAt)}
                </Text>
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

  const chatBlocked = isBlocked || blockedByThem;

  // ── Render ─────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#6B7FED" />

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerCenter} onPress={viewProfile} activeOpacity={0.8}>
          <View style={styles.avatarWrap}>
            {otherImage && !avatarError ? (
              <Image source={{ uri: otherImage }} style={styles.headerAvatar} onError={() => setAvatarError(true)} />
            ) : (
              <View style={[styles.headerAvatar, styles.avatarFallback]}>
                <Text style={styles.avatarFallbackText}>{otherUserName?.charAt(0)?.toUpperCase() ?? '?'}</Text>
              </View>
            )}
          </View>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerName}>{otherUserName}</Text>
            <Text style={styles.headerStatus}>
              {isOtherTyping ? 'Typing...' : isBlocked ? 'Blocked' : 'Community Member'}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuBtn}>
          <MaterialIcons name="more-vert" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* ── Dropdown menu ── */}
      <Modal transparent visible={menuVisible} animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View style={[styles.menuBox, { top: insets.top + 56, right: 12 }]}>
            <TouchableOpacity style={styles.menuItem} onPress={viewProfile}>
              <MaterialIcons name="person" size={18} color="#333" />
              <Text style={styles.menuText}>View Profile</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            {isBlocked ? (
              <TouchableOpacity style={styles.menuItem} onPress={handleUnblock}>
                <MaterialIcons name="lock-open" size={18} color="#6B7FED" />
                <Text style={[styles.menuText, { color: '#6B7FED' }]}>Unblock</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.menuItem} onPress={handleBlock}>
                <MaterialIcons name="block" size={18} color="#FF3B30" />
                <Text style={[styles.menuText, { color: '#FF3B30' }]}>Block</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* ── Messages ── */}
        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#6B7FED" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={item => item._id}
            contentContainerStyle={styles.msgList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <MaterialIcons name="chat-bubble-outline" size={50} color="#CCC" />
                <Text style={styles.emptyText}>Say hello to {otherUserName}!</Text>
              </View>
            }
          />
        )}

        {/* Upload indicator */}
        {uploading && (
          <View style={styles.uploadingBar}>
            <ActivityIndicator size="small" color="#6B7FED" />
            <Text style={styles.uploadingText}>Uploading...</Text>
          </View>
        )}

        {/* Typing indicator */}
        {isOtherTyping && (
          <View style={styles.typingRow}>
            {otherImage && !avatarError ? (
              <Image source={{ uri: otherImage }} style={styles.msgAvatar} onError={() => setAvatarError(true)} />
            ) : (
              <View style={[styles.msgAvatar, styles.avatarFallback]}>
                <Text style={[styles.avatarFallbackText, { fontSize: 12 }]}>{otherUserName.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.typingBubble}>
              {[dot1, dot2, dot3].map((d, i) => (
                <Animated.View key={i} style={[styles.typingDot, { transform: [{ translateY: d }] }]} />
              ))}
            </View>
          </View>
        )}

        {/* Attach menu */}
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

        {/* Edit banner */}
        {editingMessage && (
          <View style={styles.editBanner}>
            <MaterialIcons name="edit" size={16} color="#6B7FED" />
            <Text style={styles.editBannerText} numberOfLines={1}>Editing: {editingMessage.text}</Text>
            <TouchableOpacity onPress={() => { setEditingMessage(null); setInputText(''); }}>
              <MaterialIcons name="close" size={18} color="#888" />
            </TouchableOpacity>
          </View>
        )}

        {/* Blocked banner */}
        {chatBlocked && (
          <View style={styles.blockedBanner}>
            <MaterialIcons name="block" size={16} color="#FF3B30" />
            <Text style={styles.blockedText}>
              {isBlocked
                ? `You have blocked ${otherUserName}. Unblock to send messages.`
                : `You can't reply to this conversation.`}
            </Text>
          </View>
        )}

        {/* ── Input bar ── */}
        {!chatBlocked && (
          showVoiceRecorder ? (
            <VoiceRecorder onSend={handleVoiceSend} onCancel={handleVoiceCancel} />
          ) : (
            <View style={[styles.inputBar, { marginBottom: Math.max(insets.bottom, 10) }]}>
              <TouchableOpacity onPress={toggleAttach} style={styles.inputIconBtn}>
                <MaterialIcons name={attachMenuOpen ? 'close' : 'attach-file'} size={22} color="#6B7FED" />
              </TouchableOpacity>
              <TextInput
                style={styles.textInput}
                placeholder={editingMessage ? 'Edit message...' : 'Type a message...'}
                placeholderTextColor="#B0B3C6"
                value={inputText}
                onChangeText={handleTyping}
                multiline
                maxLength={1000}
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

      {/* ── Context menu (long press) ── */}
      <MessageContextMenu
        visible={contextVisible}
        message={contextMessage}
        isMe={contextMessage?.senderId === myUserId}
        position={contextPosition}
        onClose={() => setContextVisible(false)}
        onReact={handleReact}
        onDelete={handleDelete}
        onEdit={handleEdit}
        onCopy={handleCopy}
      />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const PURPLE = '#6B7FED';
const WHITE  = '#FFFFFF';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },

  // Header
  header: {
    backgroundColor:   PURPLE,
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: 12,
    paddingBottom:     14,
    gap:               10,
    elevation:         4,
    shadowColor:       PURPLE,
    shadowOffset:      { width: 0, height: 4 },
    shadowOpacity:     0.25,
    shadowRadius:      8,
  },
  backBtn:      { marginRight: 2, padding: 2 },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarWrap:   { position: 'relative' },
  headerAvatar: {
    width:        40, height: 40, borderRadius: 20,
    borderWidth:  2,  borderColor: WHITE,
  },
  avatarFallback:     { backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center' },
  avatarFallbackText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  headerTextWrap:     { flex: 1 },
  headerName:         { color: WHITE, fontSize: 16, fontWeight: '700' },
  headerStatus:       { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 1 },
  menuBtn:            { padding: 4 },

  // Dropdown menu
  menuOverlay: { flex: 1 },
  menuBox: {
    position:        'absolute',
    backgroundColor: '#fff',
    borderRadius:    12,
    paddingVertical: 6,
    minWidth:        170,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.15,
    shadowRadius:    8,
    elevation:       8,
  },
  menuItem: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: 16,
    paddingVertical:   12,
    gap:               10,
  },
  menuText:    { fontSize: 15, color: '#333', fontWeight: '500' },
  menuDivider: { height: 1, backgroundColor: '#F0F0F0', marginHorizontal: 12 },

  // Messages
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  msgList:     { padding: 16, paddingBottom: 8, flexGrow: 1 },
  emptyWrap:   { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText:   { color: '#AAA', marginTop: 12, fontSize: 14, textAlign: 'center' },

  msgRow:      { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  rowRight:    { justifyContent: 'flex-end' },
  rowLeft:     { justifyContent: 'flex-start' },
  msgAvatar:   { width: 32, height: 32, borderRadius: 16, marginRight: 8 },

  bubble: { borderRadius: 18, paddingHorizontal: 13, paddingTop: 10, paddingBottom: 6, flexShrink: 1 },
  bubbleMe: {
    backgroundColor: PURPLE,
    borderBottomRightRadius: 4,
    shadowColor:     PURPLE,
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.22,
    shadowRadius:    6,
    elevation:       3,
  },
  bubbleThem: {
    backgroundColor: WHITE,
    borderBottomLeftRadius: 4,
    borderWidth:     1.5,
    borderColor:     '#E8ECFF',
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 1 },
    shadowOpacity:   0.06,
    shadowRadius:    4,
    elevation:       2,
  },
  msgText:     { fontSize: 14.5, lineHeight: 21 },
  editedLabel: { fontSize: 10, marginTop: 2 },
  docRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  docName:     { fontSize: 13, fontWeight: '500', flexShrink: 1 },
  metaRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 4 },
  metaTime:    { fontSize: 10.5 },

  // Reactions
  reactionsWrap:  { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  reactionsRight: { justifyContent: 'flex-end' },
  reactionsLeft:  { justifyContent: 'flex-start' },
  reactionPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 12,
    paddingHorizontal: 6, paddingVertical: 2,
    borderWidth: 1, borderColor: '#E8ECFF', gap: 2,
  },
  reactionEmoji: { fontSize: 14 },
  reactionCount: { fontSize: 11, color: '#555', fontWeight: '600' },

  // Typing indicator
  typingRow: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingBottom: 6 },
  typingBubble: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: WHITE, borderRadius: 16, borderBottomLeftRadius: 4,
    borderWidth: 1.5, borderColor: '#E8ECFF',
    paddingHorizontal: 14, paddingVertical: 12, gap: 4,
  },
  typingDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#B0B3C6' },

  // Uploading bar
  uploadingBar:  { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 6, backgroundColor: '#F0F4FF' },
  uploadingText: { fontSize: 12, color: PURPLE, fontWeight: '600' },

  // Attach menu
  attachMenu: {
    backgroundColor:   WHITE,
    borderRadius:      16,
    padding:           14,
    flexDirection:     'row',
    gap:               16,
    borderWidth:       1,
    borderColor:       '#E8ECFF',
    shadowColor:       '#000',
    shadowOffset:      { width: 0, height: 4 },
    shadowOpacity:     0.1,
    shadowRadius:      12,
    elevation:         8,
    marginHorizontal:  16,
    marginBottom:      6,
  },
  attachItem:     { alignItems: 'center', gap: 6 },
  attachIconWrap: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  attachLabel:    { fontSize: 11, color: '#555', fontWeight: '600' },

  // Edit banner
  editBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F0F4FF',
    paddingHorizontal: 16, paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: '#E8ECFF',
  },
  editBannerText: { flex: 1, fontSize: 13, color: '#555' },

  // Blocked banner
  blockedBanner: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               8,
    backgroundColor:   '#FFF0F0',
    paddingHorizontal: 16,
    paddingVertical:   12,
    borderTopWidth:    1,
    borderTopColor:    '#FFD0D0',
  },
  blockedText: { fontSize: 13, color: '#FF3B30', flex: 1 },

  // Input bar
  inputBar: {
    flexDirection:     'row',
    alignItems:        'flex-end',
    backgroundColor:   WHITE,
    paddingHorizontal: 10,
    paddingVertical:   8,
    marginHorizontal:  12,
    marginBottom:      10,
    borderRadius:      28,
    borderWidth:       1.5,
    borderColor:       '#E8ECFF',
    shadowColor:       '#000',
    shadowOffset:      { width: 0, height: 2 },
    shadowOpacity:     0.07,
    shadowRadius:      8,
    elevation:         3,
  },
  inputIconBtn: { padding: 6, marginRight: 2 },
  textInput: {
    flex:              1,
    fontSize:          14.5,
    color:             '#2C3E50',
    maxHeight:         100,
    paddingTop:        4,
    paddingBottom:     4,
  },
  sendBtn: {
    width:           36,
    height:          36,
    borderRadius:    18,
    backgroundColor: PURPLE,
    alignItems:      'center',
    justifyContent:  'center',
    marginLeft:      6,
  },
});
