import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform,
  StatusBar, ActivityIndicator, Alert, Modal,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { io, Socket } from 'socket.io-client';
import { chatAPI, userAPI, SOCKET_URL } from '../../services/api';

interface Message {
  _id:            string;
  senderId:       string;
  receiverId:     string;
  conversationId: string;
  text?:          string;
  createdAt:      string;
  read:           boolean;
  isTemp?:        boolean;
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

export default function UserChatScreen({ route }: Props) {
  const { otherUserId, otherUserName, conversationId, myUserId } = route.params;

  const insets     = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [messages,     setMessages]     = useState<Message[]>([]);
  const [inputText,    setInputText]    = useState('');
  const [isLoading,    setIsLoading]    = useState(true);
  const [isTyping,     setIsTyping]     = useState(false);
  const [isBlocked,    setIsBlocked]    = useState(false);   // I blocked them
  const [blockedByThem,setBlockedByThem]= useState(false);   // they blocked me
  const [menuVisible,  setMenuVisible]  = useState(false);

  const socketRef     = useRef<Socket | null>(null);
  const flatListRef   = useRef<FlatList>(null);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      await Promise.all([loadHistory(), loadBlockStatus()]);
      chatAPI.markUserConversationRead(conversationId, myUserId).catch(() => {});
      if (mounted) connectSocket();
    })();
    return () => {
      mounted = false;
      socketRef.current?.disconnect();
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
    };
  }, []);

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

  const connectSocket = () => {
    const socket = io(SOCKET_URL, {
      transports:        ['websocket', 'polling'],
      query:             { userId: myUserId },
      reconnection:      true,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on('receive_message', (msg: Message) => {
      setMessages(prev => {
        const withoutTemp = prev.filter(
          m => !(m.isTemp && m.text === msg.text && m.senderId === msg.senderId),
        );
        const alreadyExists = withoutTemp.some(m => m._id === msg._id);
        if (alreadyExists) return withoutTemp;
        return [...withoutTemp, msg];
      });
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });

    socket.on('user_typing',      ({ userId }: { userId: string }) => { if (userId !== myUserId) setIsTyping(true);  });
    socket.on('user_stop_typing', ({ userId }: { userId: string }) => { if (userId !== myUserId) setIsTyping(false); });
    socket.on('connect',    () => { socket.emit('join_conversation', { conversationId }); });
    socket.on('disconnect', () => setIsTyping(false));
  };

  const sendMessage = () => {
    const text = inputText.trim();
    if (!text || !socketRef.current) return;

    const temp: Message = {
      _id:            `temp-${Date.now()}`,
      senderId:       myUserId,
      receiverId:     otherUserId,
      conversationId,
      text,
      createdAt:      new Date().toISOString(),
      read:           false,
      isTemp:         true,
    };

    setMessages(prev => [...prev, temp]);
    setInputText('');
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    socketRef.current.emit('send_message', {
      conversationId,
      senderId:   myUserId,
      receiverId: otherUserId,
      text,
    });
    socketRef.current.emit('stop_typing', { conversationId, userId: myUserId });
  };

  const handleTyping = (text: string) => {
    setInputText(text);
    if (!socketRef.current) return;
    socketRef.current.emit('typing', { conversationId, userId: myUserId });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socketRef.current?.emit('stop_typing', { conversationId, userId: myUserId });
    }, 1500);
  };

  const handleBlock = () => {
    setMenuVisible(false);
    Alert.alert(
      'Block User',
      `Block ${otherUserName}? They won't be able to send you messages and won't appear in your suggestions.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              await userAPI.blockUser(myUserId, otherUserId);
              setIsBlocked(true);
            } catch (e: any) {
              const msg = e?.response?.data?.message ?? e?.message ?? 'Please try again.';
              Alert.alert('Block Failed', msg);
            }
          },
        },
      ],
    );
  };

  const handleUnblock = () => {
    setMenuVisible(false);
    Alert.alert(
      'Unblock User',
      `Unblock ${otherUserName}? You'll be able to send and receive messages again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: async () => {
            try {
              await userAPI.unblockUser(myUserId, otherUserId);
              setIsBlocked(false);
            } catch {
              Alert.alert('Error', 'Could not unblock user. Please try again.');
            }
          },
        },
      ],
    );
  };

  const viewProfile = () => {
    setMenuVisible(false);
    navigation.navigate('UserProfile', { userId: otherUserId, myUserId });
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.senderId === myUserId;
    return (
      <View style={[styles.msgRow, isMe ? styles.rowRight : styles.rowLeft]}>
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem, item.isTemp && { opacity: 0.7 }]}>
          {item.text ? (
            <Text style={[styles.msgText, isMe ? styles.msgTextMe : styles.msgTextThem]}>
              {item.text}
            </Text>
          ) : null}
          <View style={styles.metaRow}>
            <Text style={[styles.metaTime, { color: isMe ? 'rgba(255,255,255,0.65)' : '#B0B3C6' }]}>
              {formatTime(item.createdAt)}
            </Text>
            {isMe && (
              <MaterialIcons
                name={item.isTemp ? 'access-time' : item.read ? 'done-all' : 'done'}
                size={13}
                color={item.read ? '#4ADE80' : 'rgba(255,255,255,0.7)'}
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  const chatBlocked = isBlocked || blockedByThem;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#6B7FED" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        {/* Avatar + name — tappable to view profile */}
        <TouchableOpacity style={styles.headerCenter} onPress={viewProfile} activeOpacity={0.8}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {otherUserName?.charAt(0)?.toUpperCase() ?? '?'}
            </Text>
          </View>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerName}>{otherUserName}</Text>
            <Text style={styles.headerStatus}>
              {isTyping ? 'Typing...' : isBlocked ? 'Blocked' : 'Community Member'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Three-dot menu */}
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuBtn}>
          <MaterialIcons name="more-vert" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Dropdown menu */}
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
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

        {/* Input bar */}
        {!chatBlocked && (
          <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={handleTyping}
              placeholder="Type a message..."
              placeholderTextColor="#999"
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[styles.sendBtn, !inputText.trim() && { opacity: 0.4 }]}
              onPress={sendMessage}
              disabled={!inputText.trim()}
            >
              <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#F0F4FF' },
  header: {
    backgroundColor:   '#6B7FED',
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: 12,
    paddingBottom:     14,
    gap:               10,
  },
  backBtn:      { padding: 4 },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarCircle: {
    width:           38,
    height:          38,
    borderRadius:    19,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems:      'center',
    justifyContent:  'center',
  },
  avatarText:     { color: '#fff', fontWeight: '700', fontSize: 16 },
  headerTextWrap: { flex: 1 },
  headerName:     { color: '#fff', fontWeight: '700', fontSize: 16 },
  headerStatus:   { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 1 },
  menuBtn:        { padding: 4 },

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

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  msgList:     { padding: 16, paddingBottom: 8 },
  emptyWrap:   { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText:   { color: '#999', marginTop: 12, fontSize: 14 },
  msgRow:      { marginBottom: 8, flexDirection: 'row' },
  rowRight:    { justifyContent: 'flex-end' },
  rowLeft:     { justifyContent: 'flex-start' },
  bubble: {
    maxWidth:          '75%',
    borderRadius:      16,
    paddingHorizontal: 12,
    paddingVertical:   8,
  },
  bubbleMe:    { backgroundColor: '#6B7FED', borderBottomRightRadius: 4 },
  bubbleThem:  { backgroundColor: '#fff',    borderBottomLeftRadius:  4 },
  msgText:     { fontSize: 15, lineHeight: 21 },
  msgTextMe:   { color: '#fff' },
  msgTextThem: { color: '#1A1D2E' },
  metaRow:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, justifyContent: 'flex-end' },
  metaTime:    { fontSize: 10 },

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

  inputBar: {
    flexDirection:     'row',
    alignItems:        'flex-end',
    backgroundColor:   '#fff',
    paddingHorizontal: 12,
    paddingTop:        10,
    borderTopWidth:    1,
    borderTopColor:    '#F0F0F0',
    gap:               8,
  },
  input: {
    flex:              1,
    backgroundColor:   '#F5F6FA',
    borderRadius:      22,
    paddingHorizontal: 16,
    paddingVertical:   10,
    fontSize:          15,
    color:             '#1A1D2E',
    maxHeight:         120,
  },
  sendBtn: {
    width:           44,
    height:          44,
    borderRadius:    22,
    backgroundColor: '#6B7FED',
    alignItems:      'center',
    justifyContent:  'center',
  },
});
