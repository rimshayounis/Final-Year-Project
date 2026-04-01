import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, StatusBar, Image,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { userAPI, chatAPI, API_URL } from '../../services/api';

const BASE_URL = API_URL.replace('/api', '');
const toFullUrl = (path: string | null | undefined): string | null => {
  if (!path) return null;
  return path.startsWith('http') ? path : BASE_URL + path;
};

interface Person {
  _id:             string;
  fullName:        string;
  gender:          string;
  age:             number;
  profileImage:    string | null;
  interests:       string[];
  sharedInterests: string[];
}

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
  route?: { params: { myUserId: string } };
  id?:   string;   // kept for backward compat (not used anymore)
}

export default function PeopleScreen({ route }: Props) {
  const id         = route?.params?.myUserId ?? '';
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [suggestions,   setSuggestions]   = useState<Person[]>([]);
  const [searchResults, setSearchResults] = useState<Person[]>([]);
  const [conversations, setConversations] = useState<ConvDisplay[]>([]);
  const [query,         setQuery]         = useState('');
  const [loading,       setLoading]       = useState(true);
  const [searching,     setSearching]     = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [id]),
  );

  const loadAll = async () => {
    if (!id) { setLoading(false); return; }
    try {
      const [sugRes, convRes] = await Promise.all([
        userAPI.getFriendSuggestions(id),
        chatAPI.getUserToUserConversations(id),
      ]);
      setSuggestions(sugRes.data?.data ?? []);

      const raw: Conversation[] = convRes.data?.data ?? convRes.data ?? [];
      const mapped: ConvDisplay[] = raw.map((c) => {
        const isUser1 = c.user1Id?._id === id || (c.user1Id as any) === id;
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
      console.error('PeopleScreen load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = useCallback(async (text: string) => {
    setQuery(text);
    if (!text.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await userAPI.searchUsers(text.trim(), id);
      setSearchResults(res.data?.data ?? []);
    } catch (e) {
      console.error('Search error:', e);
    } finally {
      setSearching(false);
    }
  }, [id]);

  const openChatWithPerson = async (personId: string, personName: string) => {
    try {
      const res  = await chatAPI.getOrCreateUserConversation(id, personId);
      const conv = res.data;
      navigation.navigate('UserChat', {
        otherUserId:    personId,
        otherUserName:  personName,
        conversationId: conv._id,
        myUserId:       id,
      });
    } catch (e) {
      console.error('Open chat error:', e);
    }
  };

  const openChatFromConv = (conv: ConvDisplay) => {
    navigation.navigate('UserChat', {
      otherUserId:    conv.otherId,
      otherUserName:  conv.otherName,
      conversationId: conv.convId,
      myUserId:       id,
    });
  };

  const viewProfile = (userId: string) => {
    navigation.navigate('UserProfile', { userId, myUserId: id });
  };

  const formatTime = (iso: string) => {
    if (!iso) return '';
    const d    = new Date(iso);
    const now  = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000)    return 'now';
    if (diff < 3600000)  return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return `${Math.floor(diff / 86400000)}d`;
  };

  const renderConversation = (item: ConvDisplay) => (
    <TouchableOpacity key={item.convId} style={styles.convCard} onPress={() => openChatFromConv(item)} activeOpacity={0.85}>
      <TouchableOpacity onPress={() => viewProfile(item.otherId)} activeOpacity={0.75}>
        <View style={styles.convAvatar}>
          {item.otherImage ? (
            <Image source={{ uri: item.otherImage }} style={styles.convAvatarImg} />
          ) : (
            <Text style={styles.convAvatarText}>{item.otherName.charAt(0).toUpperCase()}</Text>
          )}
          {item.unreadCount > 0 && (
            <View style={styles.convBadge}>
              <Text style={styles.convBadgeText}>{item.unreadCount > 9 ? '9+' : item.unreadCount}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
      <View style={styles.convInfo}>
        <View style={styles.convRow}>
          <Text style={[styles.convName, item.unreadCount > 0 && styles.convNameUnread]}>{item.otherName}</Text>
          <Text style={styles.convTime}>{formatTime(item.lastMessageAt)}</Text>
        </View>
        <Text style={[styles.convLast, item.unreadCount > 0 && styles.convLastUnread]} numberOfLines={1}>
          {item.lastMessage || 'Start a conversation'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderPerson = ({ item }: { item: Person }) => (
    <TouchableOpacity style={styles.card} onPress={() => openChatWithPerson(item._id, item.fullName)} activeOpacity={0.85}>
      <View style={styles.avatar}>
        {item.profileImage ? (
          <Image source={{ uri: toFullUrl(item.profileImage) ?? item.profileImage }} style={styles.avatarImg} />
        ) : (
          <Text style={styles.avatarText}>{item.fullName?.charAt(0)?.toUpperCase() ?? '?'}</Text>
        )}
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.name}>{item.fullName}</Text>
        <Text style={styles.meta}>{item.gender} · {item.age} yrs</Text>
        {item.sharedInterests?.length > 0 && (
          <View style={styles.pillRow}>
            {item.sharedInterests.slice(0, 3).map((interest, i) => (
              <View key={i} style={styles.pill}>
                <Text style={styles.pillText}>{interest}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      <View style={styles.chatIcon}>
        <Ionicons name="chatbubble-ellipses-outline" size={22} color="#6B7FED" />
      </View>
    </TouchableOpacity>
  );

  const displayList = query.trim() ? searchResults : suggestions;

  if (loading) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#6B7FED" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor="#6B7FED" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>People</Text>
            <Text style={styles.headerSub}>Connect with people who share your health interests</Text>
          </View>
        </View>
      </View>

      {/* Search bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#999" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name..."
          placeholderTextColor="#999"
          value={query}
          onChangeText={handleSearch}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(''); setSearchResults([]); }}>
            <Ionicons name="close-circle" size={18} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={displayList}
        keyExtractor={item => item._id}
        renderItem={renderPerson}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListHeaderComponent={
          <>
            {/* Messages section — shown when not searching */}
            {!query.trim() && conversations.length > 0 && (
              <View>
                <View style={styles.sectionHeader}>
                  <Ionicons name="chatbubbles-outline" size={16} color="#6B7FED" />
                  <Text style={styles.sectionTitle}>Messages</Text>
                </View>
                {conversations.map(conv => renderConversation(conv))}
              </View>
            )}

            {/* Suggestions / Search label */}
            {!query.trim() ? (
              <View style={styles.sectionHeader}>
                <MaterialIcons name="people" size={16} color="#6B7FED" />
                <Text style={styles.sectionTitle}>Suggested for You</Text>
              </View>
            ) : (
              <View style={styles.sectionHeader}>
                <Ionicons name="search" size={16} color="#6B7FED" />
                <Text style={styles.sectionTitle}>Search Results</Text>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          searching ? (
            <ActivityIndicator size="small" color="#6B7FED" style={{ marginTop: 20 }} />
          ) : (
            <View style={styles.empty}>
              <MaterialIcons name="people-outline" size={60} color="#DDD" />
              <Text style={styles.emptyText}>
                {query.trim() ? 'No users found' : 'No suggestions yet.\nComplete your health profile to connect with others.'}
              </Text>
            </View>
          )
        }
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4FF',
  },
  header: {
    backgroundColor:   '#6B7FED',
    paddingHorizontal: 16,
    paddingBottom:     18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           10,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize:     22,
    fontWeight:   '700',
    color:        '#fff',
    marginBottom: 4,
  },
  headerSub: {
    fontSize: 13,
    color:    'rgba(255,255,255,0.8)',
  },
  searchBar: {
    flexDirection:     'row',
    alignItems:        'center',
    backgroundColor:   '#fff',
    margin:            16,
    borderRadius:      12,
    paddingHorizontal: 14,
    paddingVertical:   10,
    shadowColor:       '#000',
    shadowOffset:      { width: 0, height: 1 },
    shadowOpacity:     0.06,
    shadowRadius:      4,
    elevation:         2,
  },
  searchInput: {
    flex:     1,
    fontSize: 14,
    color:    '#333',
  },
  sectionHeader: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: 20,
    marginBottom:      10,
    marginTop:         4,
    gap:               6,
  },
  sectionTitle: {
    fontSize:      13,
    fontWeight:    '700',
    color:         '#6B7FED',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Conversation cards
  convCard: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom:    8,
    borderRadius:    14,
    padding:         14,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 1 },
    shadowOpacity:   0.06,
    shadowRadius:    4,
    elevation:       2,
  },
  convAvatar: {
    width:           46,
    height:          46,
    borderRadius:    23,
    backgroundColor: '#6B7FED',
    alignItems:      'center',
    justifyContent:  'center',
    marginRight:     12,
    position:        'relative',
  },
  convAvatarText: {
    color:      '#fff',
    fontSize:   18,
    fontWeight: '700',
  },
  convAvatarImg: {
    width:        46,
    height:       46,
    borderRadius: 23,
  },
  convBadge: {
    position:          'absolute',
    top:               -2,
    right:             -2,
    backgroundColor:   '#FF3B30',
    borderRadius:      9,
    minWidth:          18,
    height:            18,
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: 3,
    borderWidth:       2,
    borderColor:       '#fff',
  },
  convBadgeText: {
    color:      '#fff',
    fontSize:   10,
    fontWeight: '700',
  },
  convInfo: {
    flex: 1,
  },
  convRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   2,
  },
  convName: {
    fontSize:   15,
    fontWeight: '500',
    color:      '#1A1D2E',
  },
  convNameUnread: {
    fontWeight: '700',
  },
  convTime: {
    fontSize: 11,
    color:    '#aaa',
  },
  convLast: {
    fontSize: 13,
    color:    '#888',
  },
  convLastUnread: {
    color:      '#333',
    fontWeight: '600',
  },
  // Suggestion cards
  card: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: '#fff',
    borderRadius:    14,
    padding:         14,
    marginHorizontal: 16,
    marginBottom:    10,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 1 },
    shadowOpacity:   0.06,
    shadowRadius:    4,
    elevation:       2,
  },
  avatar: {
    width:           46,
    height:          46,
    borderRadius:    23,
    backgroundColor: '#6B7FED',
    alignItems:      'center',
    justifyContent:  'center',
    marginRight:     12,
  },
  avatarText: {
    color:      '#fff',
    fontSize:   18,
    fontWeight: '700',
  },
  avatarImg: {
    width:        46,
    height:       46,
    borderRadius: 23,
  },
  cardInfo: {
    flex: 1,
  },
  name: {
    fontSize:     15,
    fontWeight:   '600',
    color:        '#1A1D2E',
    marginBottom: 2,
  },
  meta: {
    fontSize:     12,
    color:        '#888',
    marginBottom: 6,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           4,
  },
  pill: {
    backgroundColor:   '#EEF0FD',
    paddingHorizontal: 8,
    paddingVertical:   3,
    borderRadius:      20,
  },
  pillText: {
    fontSize:   11,
    color:      '#6B7FED',
    fontWeight: '600',
  },
  chatIcon: {
    padding: 6,
  },
  empty: {
    flex:              1,
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: 40,
    paddingTop:        40,
    paddingBottom:     60,
  },
  emptyText: {
    marginTop:  12,
    fontSize:   14,
    color:      '#999',
    textAlign:  'center',
    lineHeight: 22,
  },
});
