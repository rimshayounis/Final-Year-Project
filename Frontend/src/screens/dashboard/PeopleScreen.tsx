import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Platform, StatusBar, Image,
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
  id?:   string;
}

export default function PeopleScreen({ route }: Props) {
  const id         = route?.params?.myUserId ?? '';
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [suggestions,    setSuggestions]    = useState<Person[]>([]);
  const [searchResults,  setSearchResults]  = useState<Person[]>([]);
  const [conversations,  setConversations]  = useState<ConvDisplay[]>([]);
  const [query,          setQuery]          = useState('');
  const [loading,        setLoading]        = useState(true);
  const [searching,      setSearching]      = useState(false);
  const [searchVisible,  setSearchVisible]  = useState(false);

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

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

  const toggleSearch = () => {
    setSearchVisible(v => !v);
    setQuery('');
    setSearchResults([]);
  };

  const openMessages = () => {
    navigation.navigate('Messages', { myUserId: id });
  };

  const viewProfile = (userId: string) => {
    navigation.navigate('UserProfile', { userId, myUserId: id });
  };

  const renderPerson = ({ item }: { item: Person }) => (
    <TouchableOpacity style={styles.card} onPress={() => viewProfile(item._id)} activeOpacity={0.85}>
      <View style={styles.avatar}>
        {item.profileImage ? (
          <Image source={{ uri: toFullUrl(item.profileImage) ?? item.profileImage }} style={styles.avatarImg} />
        ) : (
          <Text style={styles.avatarText}>{item.fullName?.charAt(0)?.toUpperCase() ?? '?'}</Text>
        )}
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.name}>{item.fullName}</Text>
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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#6B7FED" />

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        {searchVisible ? (
          /* Inline search bar — same pattern as FeedScreen */
          <View style={styles.searchInHeader}>
            <Ionicons name="search" size={15} color="rgba(255,255,255,0.7)" style={{ marginRight: 6 }} />
            <TextInput
              style={styles.searchInHeaderInput}
              placeholder="Search people by name..."
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={query}
              onChangeText={handleSearch}
              autoFocus
              returnKeyType="search"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => { setQuery(''); setSearchResults([]); }}>
                <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            )}
          </View>
        ) : (
          /* Normal title row */
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>People</Text>
            <Text style={styles.headerSub}>Connect with people who share your health interests</Text>
          </View>
        )}

        {/* Search icon toggle */}
        <TouchableOpacity style={styles.headerIconBtn} onPress={toggleSearch}>
          <Ionicons name={searchVisible ? 'close' : 'search-outline'} size={22} color="#FFF" />
        </TouchableOpacity>

        {/* Message icon — navigates to Messages screen */}
        <TouchableOpacity style={styles.headerIconBtn} onPress={openMessages}>
          <Ionicons name="chatbubble-ellipses-outline" size={22} color="#FFF" />
          {totalUnread > 0 && (
            <View style={styles.iconBadge}>
              <Text style={styles.iconBadgeText}>{totalUnread > 9 ? '9+' : totalUnread}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Suggestions list ── */}
      <FlatList
        data={displayList}
        keyExtractor={item => item._id}
        renderItem={renderPerson}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20, paddingTop: 8 }}
        ListHeaderComponent={
          <View style={styles.sectionHeader}>
            {query.trim() ? (
              <><Ionicons name="search" size={16} color="#6B7FED" /><Text style={styles.sectionTitle}>Search Results</Text></>
            ) : (
              <><MaterialIcons name="people" size={16} color="#6B7FED" /><Text style={styles.sectionTitle}>Suggested for You</Text></>
            )}
          </View>
        }
        ListEmptyComponent={
          searching ? (
            <ActivityIndicator size="small" color="#6B7FED" style={{ marginTop: 20 }} />
          ) : (
            <View style={styles.empty}>
              <MaterialIcons name="people-outline" size={60} color="#DDD" />
              <Text style={styles.emptyText}>
                {query.trim()
                  ? 'No users found'
                  : 'No suggestions yet.\nComplete your health profile to connect with others.'}
              </Text>
            </View>
          )
        }
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: '#F0F4FF',
  },

  /* ── Header ── */
  header: {
    backgroundColor:   '#6B7FED',
    paddingHorizontal: 16,
    paddingBottom:     14,
    flexDirection:     'row',
    alignItems:        'center',
    gap:               4,
  },
  headerTitle: {
    fontSize:     22,
    fontWeight:   '700',
    color:        '#fff',
    marginBottom: 2,
  },
  headerSub: {
    fontSize: 12,
    color:    'rgba(255,255,255,0.8)',
  },
  headerIconBtn: {
    width:           36,
    height:          36,
    justifyContent:  'center',
    alignItems:      'center',
    position:        'relative',
  },
  iconBadge: {
    position:          'absolute',
    top:               1,
    right:             1,
    backgroundColor:   '#FF3B30',
    borderRadius:      8,
    minWidth:          15,
    height:            15,
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: 3,
    borderWidth:       1.5,
    borderColor:       '#6B7FED',
  },
  iconBadgeText: {
    color:      '#fff',
    fontSize:   8,
    fontWeight: '800',
  },

  /* Inline search bar (inside header) */
  searchInHeader: {
    flex:              1,
    flexDirection:     'row',
    alignItems:        'center',
    backgroundColor:   'rgba(255,255,255,0.18)',
    borderRadius:      20,
    paddingHorizontal: 12,
    paddingVertical:   Platform.OS === 'ios' ? 7 : 4,
    marginRight:       4,
  },
  searchInHeaderInput: {
    flex:           1,
    fontSize:       14,
    color:          '#FFF',
    paddingVertical: 0,
  },

  /* ── Section header ── */
  sectionHeader: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: 20,
    marginBottom:      10,
    marginTop:         8,
    gap:               6,
  },
  sectionTitle: {
    fontSize:      13,
    fontWeight:    '700',
    color:         '#6B7FED',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  /* ── Suggestion cards ── */
  card: {
    flexDirection:    'row',
    alignItems:       'center',
    backgroundColor:  '#fff',
    borderRadius:     14,
    padding:          14,
    marginHorizontal: 16,
    marginBottom:     10,
    shadowColor:      '#000',
    shadowOffset:     { width: 0, height: 1 },
    shadowOpacity:    0.06,
    shadowRadius:     4,
    elevation:        2,
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
  cardInfo: { flex: 1 },
  name: {
    fontSize:     15,
    fontWeight:   '600',
    color:        '#1A1D2E',
    marginBottom: 2,
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

  /* ── Empty state ── */
  empty: {
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
