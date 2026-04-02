import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Image, ActivityIndicator, StatusBar,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { chatAPI, API_URL } from '../../services/api';

const BASE_URL = API_URL.replace('/api', '');
const toFullUrl = (path: string | null | undefined): string | null => {
  if (!path) return null;
  return path.startsWith('http') ? path : BASE_URL + path;
};

interface Conversation {
  _id:               string;
  user1Id:           { _id: string; fullName: string; profileImage?: string | null };
  user2Id:           { _id: string; fullName: string; profileImage?: string | null };
  lastMessage:       string;
  lastMessageAt:     string;
  user1UnreadCount:  number;
  user2UnreadCount:  number;
}

interface ConvDisplay {
  convId:        string;
  otherId:       string;
  otherName:     string;
  otherImage:    string | null;
  lastMessage:   string;
  unreadCount:   number;
  lastMessageAt: string;
}

interface Props {
  route: { params: { myUserId: string } };
}

const formatTime = (iso: string) => {
  if (!iso) return '';
  const d    = new Date(iso);
  const now  = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000)    return 'now';
  if (diff < 3600000)  return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  const days = Math.floor(diff / 86400000);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

export default function MessagesScreen({ route }: Props) {
  const { myUserId } = route.params;
  const insets       = useSafeAreaInsets();
  const navigation   = useNavigation<any>();

  const [conversations, setConversations] = useState<ConvDisplay[]>([]);
  const [loading,       setLoading]       = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [myUserId]),
  );

  const loadConversations = async () => {
    if (!myUserId) { setLoading(false); return; }
    try {
      const res  = await chatAPI.getUserToUserConversations(myUserId);
      const raw: Conversation[] = res.data?.data ?? res.data ?? [];
      const mapped: ConvDisplay[] = raw.map((c) => {
        const isUser1 = c.user1Id?._id === myUserId || (c.user1Id as any) === myUserId;
        const other   = isUser1 ? c.user2Id : c.user1Id;
        const unread  = isUser1 ? c.user1UnreadCount : c.user2UnreadCount;
        return {
          convId:        c._id,
          otherId:       other?._id ?? '',
          otherName:     other?.fullName ?? 'Unknown',
          otherImage:    toFullUrl(other?.profileImage),
          lastMessage:   c.lastMessage,
          unreadCount:   unread ?? 0,
          lastMessageAt: c.lastMessageAt,
        };
      }).filter(c => c.otherId);
      setConversations(mapped);
    } catch (e) {
      console.error('MessagesScreen load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const openChat = (conv: ConvDisplay) => {
    navigation.navigate('UserChat', {
      otherUserId:    conv.otherId,
      otherUserName:  conv.otherName,
      conversationId: conv.convId,
      myUserId,
    });
  };

  const viewProfile = (userId: string) => {
    navigation.navigate('UserProfile', { userId, myUserId });
  };

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  const renderItem = ({ item }: { item: ConvDisplay }) => (
    <TouchableOpacity style={styles.convCard} onPress={() => openChat(item)} activeOpacity={0.85}>
      {/* Avatar — tapping goes to profile */}
      <TouchableOpacity onPress={() => viewProfile(item.otherId)} activeOpacity={0.75}>
        <View style={styles.avatarWrap}>
          {item.otherImage ? (
            <Image source={{ uri: item.otherImage }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarLetter}>{item.otherName.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          {item.unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.unreadCount > 9 ? '9+' : item.unreadCount}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      <View style={styles.convInfo}>
        <View style={styles.convRow}>
          <Text style={[styles.convName, item.unreadCount > 0 && styles.convNameBold]} numberOfLines={1}>
            {item.otherName}
          </Text>
          <Text style={styles.convTime}>{formatTime(item.lastMessageAt)}</Text>
        </View>
        <Text style={[styles.convLast, item.unreadCount > 0 && styles.convLastBold]} numberOfLines={1}>
          {item.lastMessage || 'Start a conversation'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#6B7FED" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Messages</Text>
          {totalUnread > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{totalUnread}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Body */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#6B7FED" />
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="chatbubble-outline" size={64} color="#DDD" />
          <Text style={styles.emptyTitle}>No messages yet</Text>
          <Text style={styles.emptySubtitle}>Visit someone's profile and tap Message to start a conversation.</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={item => item.convId}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

const PURPLE = '#6B7FED';

const styles = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: '#F0F4FF',
  },

  /* Header */
  header: {
    backgroundColor:   PURPLE,
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: 16,
    paddingBottom:     16,
    gap:               12,
    elevation:         4,
    shadowColor:       PURPLE,
    shadowOffset:      { width: 0, height: 4 },
    shadowOpacity:     0.25,
    shadowRadius:      8,
  },
  backBtn: { padding: 2 },
  headerCenter: {
    flex:          1,
    flexDirection: 'row',
    alignItems:    'center',
    gap:           8,
  },
  headerTitle: {
    fontSize:   20,
    fontWeight: '700',
    color:      '#fff',
  },
  headerBadge: {
    backgroundColor:   '#FF3B30',
    borderRadius:      10,
    minWidth:          20,
    height:            20,
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: 5,
  },
  headerBadgeText: {
    color:      '#fff',
    fontSize:   11,
    fontWeight: '800',
  },

  /* Loading */
  loadingWrap: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
  },

  /* Empty */
  emptyWrap: {
    flex:              1,
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize:   18,
    fontWeight: '700',
    color:      '#555',
    marginTop:  16,
  },
  emptySubtitle: {
    fontSize:   14,
    color:      '#999',
    textAlign:  'center',
    marginTop:  8,
    lineHeight: 22,
  },

  /* List */
  listContent: {
    paddingTop:    12,
    paddingBottom: 24,
  },
  separator: {
    height:           1,
    backgroundColor:  '#EEF0FD',
    marginHorizontal: 16,
  },

  /* Conversation card */
  convCard: {
    flexDirection:     'row',
    alignItems:        'center',
    backgroundColor:   '#fff',
    paddingHorizontal: 16,
    paddingVertical:   14,
  },

  /* Avatar */
  avatarWrap: {
    position:     'relative',
    marginRight:  14,
  },
  avatarImg: {
    width:        52,
    height:       52,
    borderRadius: 26,
  },
  avatarFallback: {
    width:           52,
    height:          52,
    borderRadius:    26,
    backgroundColor: PURPLE,
    alignItems:      'center',
    justifyContent:  'center',
  },
  avatarLetter: {
    color:      '#fff',
    fontSize:   20,
    fontWeight: '700',
  },
  badge: {
    position:          'absolute',
    top:               -2,
    right:             -2,
    backgroundColor:   '#FF3B30',
    borderRadius:      10,
    minWidth:          20,
    height:            20,
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: 4,
    borderWidth:       2,
    borderColor:       '#fff',
  },
  badgeText: {
    color:      '#fff',
    fontSize:   10,
    fontWeight: '800',
  },

  /* Conversation info */
  convInfo: { flex: 1 },
  convRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   4,
  },
  convName:     { fontSize: 16, fontWeight: '500', color: '#1A1D2E', flex: 1, marginRight: 8 },
  convNameBold: { fontWeight: '700' },
  convTime:     { fontSize: 12, color: '#aaa' },
  convLast:     { fontSize: 14, color: '#888' },
  convLastBold: { color: '#333', fontWeight: '600' },
});
