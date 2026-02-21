import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Share,
  Modal,
  TextInput,
  Dimensions,
} from "react-native";
import { MaterialIcons, Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import apiClient from "../../services/api";

const { width } = Dimensions.get("window");

interface Comment {
  _id: string;
  userId: string;
  userName?: string;
  text: string;
  createdAt: string;
}

interface Post {
  _id: string;
  title: string;
  description: string;
  category: string;
  mediaUrls: string[];
  backgroundColor: string | null;
  status: "pending" | "approved" | "rejected";
  likes: number;
  comments: number;
  shares: number;
  createdAt: string;
  rejectionReason?: string;
  commentsList?: Comment[];
}

interface UserProfile {
  _id: string;
  fullName: string;
  email: string;
  age?: number;
  gender?: string;
  profileImage?: string;
  bio?: string;
  userType?: string;
}

type ProfileScreenProps = {
  id: string;
  role?: "user" | "doctor";
};

export default function ProfileScreen({ id, role }: ProfileScreenProps) {
  const insets = useSafeAreaInsets();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const [editModal, setEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  const [commentModal, setCommentModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [commentText, setCommentText] = useState("");
  const [commentsLoading, setCommentsLoading] = useState(false);

  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());

  /* ===== FETCH PROFILE ===== */
  const fetchProfile = async () => {
    try {
      const endpoint = role === "doctor" ? `/doctors/${id}` : `/users/${id}`;
      const response = await apiClient.get(endpoint);
      // Handle both { data: {...} } and direct object responses
      const data = response.data?.data || response.data;
      console.log("PROFILE DATA:", JSON.stringify(data));
      setUserProfile(data);
      setEditName(data.fullName || "");
      setEditBio(data.bio || "");
    } catch (error) {
      console.error("Failed to load profile:", error);
    }
  };

  /* ===== FETCH POSTS ===== */
  const fetchUserPosts = async () => {
    try {
      const response = await apiClient.get(`/posts/user/${id}`);
      setPosts(response.data.data || []);
    } catch (error: any) {
      Alert.alert("Error", "Failed to load posts");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchProfile();
      fetchUserPosts();
    }, [id])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchProfile();
    fetchUserPosts();
  };

  /* ===== EDIT PROFILE ===== */
  const handleEditProfile = async () => {
    if (!editName.trim()) {
      Alert.alert("Error", "Name cannot be empty");
      return;
    }
    setEditLoading(true);
    try {
      const endpoint = role === "doctor" ? `/doctors/${id}` : `/users/${id}`;
      await apiClient.put(endpoint, { fullName: editName, bio: editBio });
      setUserProfile((prev) =>
        prev ? { ...prev, fullName: editName, bio: editBio } : prev
      );
      setEditModal(false);
      Alert.alert("Success", "Profile updated!");
    } catch (error) {
      Alert.alert("Error", "Failed to update profile");
    } finally {
      setEditLoading(false);
    }
  };

  /* ===== PICK PROFILE PHOTO ===== */
  const handlePickProfilePhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Needed", "Allow gallery access");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets.length > 0) {
      try {
        const formData = new FormData();
        formData.append("profileImage", {
          uri: result.assets[0].uri,
          name: "profile.jpg",
          type: "image/jpeg",
        } as any);
        const endpoint = role === "doctor" ? `/doctors/${id}` : `/users/${id}`;
        await apiClient.put(endpoint, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setUserProfile((prev) =>
          prev ? { ...prev, profileImage: result.assets[0].uri } : prev
        );
      } catch (error) {
        Alert.alert("Error", "Failed to update profile photo");
      }
    }
  };

  /* ===== LIKE ===== */
  const handleLike = async (postId: string) => {
    if (actionLoading === postId + "_like") return;
    if (likedPosts.has(postId)) {
      Alert.alert("", "You already liked this post!");
      return;
    }
    setActionLoading(postId + "_like");
    try {
      await apiClient.post(`/posts/${postId}/like`);
      setPosts((prev) =>
        prev.map((p) => (p._id === postId ? { ...p, likes: p.likes + 1 } : p))
      );
      setLikedPosts((prev) => new Set([...prev, postId]));
      if (selectedPost?._id === postId) {
        setSelectedPost((prev) =>
          prev ? { ...prev, likes: prev.likes + 1 } : prev
        );
      }
    } catch (error) {
      Alert.alert("Error", "Failed to like post");
    } finally {
      setActionLoading(null);
    }
  };

  /* ===== OPEN COMMENTS ===== */
  // ← KEY FIX: always fetch fresh, never skip
  const handleOpenComment = async (post: Post) => {
    setSelectedPost({ ...post, commentsList: [] });
    setCommentModal(true);
    setCommentsLoading(true);

    try {
      const response = await apiClient.get(`/posts/${post._id}/comments`);
      console.log("COMMENTS RAW:", JSON.stringify(response.data));

      const raw = Array.isArray(response.data.data)
        ? response.data.data
        : Array.isArray(response.data)
        ? response.data
        : [];

      const commentsList: Comment[] = raw.map((c: any) => ({
        _id: c._id?.toString() || Date.now().toString(),
        userId: c.userId?.toString() || "",
        userName: c.userName || "User",
        text: c.text || "",
        createdAt: c.createdAt || new Date().toISOString(),
      }));

      console.log("PARSED comments count:", commentsList.length);

      setPosts((prev) =>
        prev.map((p) => (p._id === post._id ? { ...p, commentsList } : p))
      );
      setSelectedPost({ ...post, commentsList });
    } catch (error) {
      console.error("Failed to load comments:", error);
    } finally {
      setCommentsLoading(false);
    }
  };

  /* ===== SUBMIT COMMENT ===== */
  const handleSubmitComment = async () => {
    if (!commentText.trim()) {
      Alert.alert("Error", "Please write a comment");
      return;
    }
    if (!selectedPost) return;

    setActionLoading(selectedPost._id + "_comment");
    try {
      const response = await apiClient.post(
        `/posts/${selectedPost._id}/comment`,
        {
          userId: id,
          text: commentText,
          userName: userProfile?.fullName || "User",
        }
      );

      const newComment: Comment = {
        _id: response.data.data?._id?.toString() || Date.now().toString(),
        userId: response.data.data?.userId?.toString() || id,
        userName:
          response.data.data?.userName || userProfile?.fullName || "You",
        text: response.data.data?.text || commentText,
        createdAt:
          response.data.data?.createdAt || new Date().toISOString(),
      };

      setPosts((prev) =>
        prev.map((p) =>
          p._id === selectedPost._id
            ? {
                ...p,
                comments: p.comments + 1,
                commentsList: [...(p.commentsList || []), newComment],
              }
            : p
        )
      );

      setSelectedPost((prev) =>
        prev
          ? {
              ...prev,
              comments: prev.comments + 1,
              commentsList: [...(prev.commentsList || []), newComment],
            }
          : prev
      );

      setCommentText("");
    } catch (error) {
      Alert.alert("Error", "Failed to add comment");
    } finally {
      setActionLoading(null);
    }
  };

  /* ===== SHARE ===== */
  const handleShare = async (post: Post) => {
    setActionLoading(post._id + "_share");
    try {
      const shareContent = {
        title: post.title,
        message: `📋 ${post.title}\n\n${post.description}\n\n🏷️ Category: ${post.category}\n\n🔗 Shared via TruHeal-Link`,
        url:
          post.mediaUrls?.length > 0
            ? `http://192.168.100.10:3000${post.mediaUrls[0]}`
            : undefined,
      };
      const result = await Share.share(shareContent);
      if (result.action === Share.sharedAction) {
        await apiClient.post(`/posts/${post._id}/share`);
        setPosts((prev) =>
          prev.map((p) =>
            p._id === post._id ? { ...p, shares: p.shares + 1 } : p
          )
        );
      }
    } catch (error) {
      Alert.alert("Error", "Failed to share post");
    } finally {
      setActionLoading(null);
    }
  };

  const toggleExpand = (postId: string) => {
    setExpandedPosts((prev) => {
      const next = new Set(prev);
      next.has(postId) ? next.delete(postId) : next.add(postId);
      return next;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "#00B374";
      case "rejected": return "#E53E3E";
      default: return "#F6A623";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "approved": return "Published";
      case "rejected": return "Rejected";
      default: return "Under Review";
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  /* ===== RENDER POST ===== */
  const renderPost = ({ item }: { item: Post }) => {
    const isLiked = likedPosts.has(item._id);
    const isExpanded = expandedPosts.has(item._id);
    const descLimit = 120;
    const needsExpand = item.description.length > descLimit;

    return (
      <View style={styles.postCard}>
        <View style={styles.postHeader}>
          <View style={styles.postAuthorRow}>
            <View style={styles.postAvatar}>
              {userProfile?.profileImage ? (
                <Image
                  source={{ uri: userProfile.profileImage }}
                  style={styles.postAvatarImg}
                />
              ) : (
                <Text style={styles.postAvatarText}>
                  {userProfile?.fullName?.charAt(0)?.toUpperCase() || "U"}
                </Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.postAuthorName}>
                {userProfile?.fullName || "You"}
              </Text>
              <View style={styles.postMeta}>
                <Text style={styles.postTime}>{formatDate(item.createdAt)}</Text>
                <Text style={styles.postMetaDot}>·</Text>
                <View
                  style={[
                    styles.statusPill,
                    { backgroundColor: getStatusColor(item.status) + "18" },
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: getStatusColor(item.status) },
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusPillText,
                      { color: getStatusColor(item.status) },
                    ]}
                  >
                    {getStatusLabel(item.status)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
          <View style={styles.categoryChip}>
            <Text style={styles.categoryChipText}>{item.category}</Text>
          </View>
        </View>

        <Text style={styles.postTitle}>{item.title}</Text>

        <View
          style={[
            styles.descriptionBox,
            item.backgroundColor
              ? { backgroundColor: item.backgroundColor }
              : null,
          ]}
        >
          <Text
            style={[
              styles.postDescription,
              item.backgroundColor ? { color: "#FFF" } : null,
            ]}
          >
            {isExpanded || !needsExpand
              ? item.description
              : item.description.slice(0, descLimit) + "..."}
          </Text>
          {needsExpand && (
            <TouchableOpacity onPress={() => toggleExpand(item._id)}>
              <Text style={styles.seeMoreText}>
                {isExpanded ? "See less" : "See more"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {item.mediaUrls?.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.mediaScroll}
          >
            {item.mediaUrls.map((url, i) => (
              <Image
                key={i}
                source={{ uri: `http://192.168.100.10:3000${url}` }}
                style={styles.mediaImage}
                resizeMode="cover"
              />
            ))}
          </ScrollView>
        )}

        {item.status === "rejected" && item.rejectionReason && (
          <View style={styles.rejectionBox}>
            <Ionicons name="alert-circle" size={14} color="#E53E3E" />
            <Text style={styles.rejectionText}>{item.rejectionReason}</Text>
          </View>
        )}

        <View style={styles.statsRow}>
          <View style={styles.statsLeft}>
            {item.likes > 0 && (
              <View style={styles.statItem}>
                <View style={styles.likeIconSmall}>
                  <MaterialIcons name="favorite" size={10} color="#FFF" />
                </View>
                <Text style={styles.statText}>{item.likes}</Text>
              </View>
            )}
          </View>
          <View style={styles.statsRight}>
            {item.comments > 0 && (
              <Text style={styles.statText}>{item.comments} comments</Text>
            )}
            {item.comments > 0 && item.shares > 0 && (
              <Text style={styles.statDivider}>·</Text>
            )}
            {item.shares > 0 && (
              <Text style={styles.statText}>{item.shares} shares</Text>
            )}
          </View>
        </View>

        <View style={styles.actionDivider} />

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleLike(item._id)}
            disabled={actionLoading === item._id + "_like"}
          >
            {actionLoading === item._id + "_like" ? (
              <ActivityIndicator size="small" color="#6B7FED" />
            ) : (
              <MaterialIcons
                name={isLiked ? "favorite" : "favorite-border"}
                size={20}
                color={isLiked ? "#E53E3E" : "#666"}
              />
            )}
            <Text style={[styles.actionLabel, isLiked && { color: "#E53E3E" }]}>
              Like
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleOpenComment(item)}
          >
            <Ionicons name="chatbubble-outline" size={19} color="#666" />
            <Text style={styles.actionLabel}>Comment</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleShare(item)}
            disabled={actionLoading === item._id + "_share"}
          >
            {actionLoading === item._id + "_share" ? (
              <ActivityIndicator size="small" color="#6B7FED" />
            ) : (
              <Ionicons name="share-social-outline" size={20} color="#666" />
            )}
            <Text style={styles.actionLabel}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  /* ===== PROFILE HEADER ===== */
  const ProfileHeader = () => (
    <View style={styles.profileHeaderWrap}>
      <View style={styles.coverBanner} />

      <View style={styles.avatarSection}>
        <View style={styles.avatarWrapper}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={handlePickProfilePhoto}
          >
            {userProfile?.profileImage ? (
              <Image
                source={{ uri: userProfile.profileImage }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {userProfile?.fullName?.charAt(0)?.toUpperCase() || "U"}
                </Text>
              </View>
            )}
            <View style={styles.cameraIconBadge}>
              <Ionicons name="camera" size={12} color="#FFF" />
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.editProfileBtn}
          onPress={() => setEditModal(true)}
        >
          <Ionicons name="pencil" size={14} color="#6B7FED" />
          <Text style={styles.editProfileBtnText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.profileInfo}>
        <Text style={styles.profileName}>
          {userProfile?.fullName || "Loading..."}
        </Text>
        {role === "doctor" && (
          <View style={styles.doctorBadge}>
            <FontAwesome5 name="user-md" size={11} color="#6B7FED" />
            <Text style={styles.doctorBadgeText}>Verified Doctor</Text>
          </View>
        )}
        <Text style={styles.profileBio}>
          {userProfile?.bio || "No bio yet. Tap Edit Profile to add one."}
        </Text>

        <View style={styles.profileMetaRow}>
          {userProfile?.gender && (
            <View style={styles.profileMetaItem}>
              <Ionicons name="person-outline" size={13} color="#888" />
              <Text style={styles.profileMetaText}>{userProfile.gender}</Text>
            </View>
          )}
          {userProfile?.age && (
            <View style={styles.profileMetaItem}>
              <Ionicons name="calendar-outline" size={13} color="#888" />
              <Text style={styles.profileMetaText}>{userProfile.age} yrs</Text>
            </View>
          )}
          {userProfile?.email && (
            <View style={styles.profileMetaItem}>
              <Ionicons name="mail-outline" size={13} color="#888" />
              <Text style={styles.profileMetaText} numberOfLines={1}>
                {userProfile.email}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.statsCardRow}>
          <View style={styles.statsCard}>
            <Text style={styles.statsCardNum}>{posts.length}</Text>
            <Text style={styles.statsCardLabel}>Posts</Text>
          </View>
          <View style={styles.statsCardDivider} />
          <View style={styles.statsCard}>
            <Text style={styles.statsCardNum}>
              {posts.reduce((a, p) => a + p.likes, 0)}
            </Text>
            <Text style={styles.statsCardLabel}>Likes</Text>
          </View>
          <View style={styles.statsCardDivider} />
          <View style={styles.statsCard}>
            <Text style={styles.statsCardNum}>
              {posts.filter((p) => p.status === "approved").length}
            </Text>
            <Text style={styles.statsCardLabel}>Published</Text>
          </View>
        </View>
      </View>

      <View style={styles.postsSectionHeader}>
        <Text style={styles.postsSectionTitle}>Activity</Text>
        <Text style={styles.postsSectionSub}>{posts.length} posts</Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#6B7FED" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item._id}
          renderItem={renderPost}
          ListHeaderComponent={<ProfileHeader />}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="document-text-outline" size={52} color="#D0D5E8" />
              <Text style={styles.emptyTitle}>No posts yet</Text>
              <Text style={styles.emptySubtitle}>
                Your posts will appear here once created.
              </Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 30 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={["#6B7FED"]}
              tintColor="#6B7FED"
            />
          }
        />
      )}

      {/* ===== EDIT PROFILE MODAL ===== */}
      <Modal
        visible={editModal}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.modalInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Your full name"
              placeholderTextColor="#AAA"
            />

            <Text style={styles.inputLabel}>Bio</Text>
            <TextInput
              style={[
                styles.modalInput,
                { minHeight: 90, textAlignVertical: "top" },
              ]}
              value={editBio}
              onChangeText={setEditBio}
              placeholder="Tell something about yourself..."
              placeholderTextColor="#AAA"
              multiline
            />

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleEditProfile}
              disabled={editLoading}
            >
              {editLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.saveBtnText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ===== COMMENT MODAL ===== */}
      <Modal
        visible={commentModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setCommentModal(false);
          setCommentText("");
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { maxHeight: "85%" }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>
                Comments ({selectedPost?.comments || 0})
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setCommentModal(false);
                  setCommentText("");
                }}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ flex: 1, marginBottom: 10 }}
              showsVerticalScrollIndicator={false}
            >
              {commentsLoading ? (
                <ActivityIndicator
                  color="#6B7FED"
                  style={{ marginVertical: 20 }}
                />
              ) : selectedPost?.commentsList &&
                selectedPost.commentsList.length > 0 ? (
                selectedPost.commentsList.map((c) => (
                  <View key={c._id} style={styles.commentItem}>
                    <View style={styles.commentAvatar}>
                      <Text style={styles.commentAvatarText}>
                        {(c.userName || "U").charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.commentBubble}>
                      <Text style={styles.commentUser}>
                        {c.userName || "User"}
                      </Text>
                      <Text style={styles.commentText}>{c.text}</Text>
                      <Text style={styles.commentTime}>
                        {formatDate(c.createdAt)}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.noComments}>
                  <Ionicons name="chatbubbles-outline" size={36} color="#DDD" />
                  <Text style={styles.noCommentsText}>
                    No comments yet. Be first!
                  </Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.commentInputRow}>
              <View style={styles.commentInputAvatar}>
                <Text style={styles.commentAvatarText}>
                  {userProfile?.fullName?.charAt(0)?.toUpperCase() || "U"}
                </Text>
              </View>
              <TextInput
                style={styles.commentTextInput}
                placeholder="Add a comment..."
                placeholderTextColor="#AAA"
                value={commentText}
                onChangeText={setCommentText}
                multiline
              />
              <TouchableOpacity
                style={[
                  styles.commentSendBtn,
                  !commentText.trim() && { opacity: 0.4 },
                ]}
                onPress={handleSubmitComment}
                disabled={
                  !commentText.trim() ||
                  actionLoading === selectedPost?._id + "_comment"
                }
              >
                {actionLoading === selectedPost?._id + "_comment" ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Ionicons name="send" size={16} color="#FFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ===== STYLES ===== */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F2F8" },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  loadingText: { marginTop: 12, color: "#6B7FED", fontSize: 14 },
  profileHeaderWrap: { backgroundColor: "#F0F2F8" },
  coverBanner: { height: 110, backgroundColor: "#6B7FED" },
  avatarSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    marginTop: -36,
    marginBottom: 4,
  },
  avatarWrapper: {},
  avatarContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: "#FFF",
    overflow: "visible",
    position: "relative",
  },
  avatarImage: { width: 82, height: 82, borderRadius: 41 },
  avatarPlaceholder: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: "#6B7FED",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: { fontSize: 32, fontWeight: "800", color: "#FFF" },
  cameraIconBadge: {
    position: "absolute",
    bottom: 2,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  editProfileBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#6B7FED",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 5,
    marginBottom: 8,
  },
  editProfileBtnText: { color: "#6B7FED", fontSize: 13, fontWeight: "600" },
  profileInfo: {
    backgroundColor: "#FFF",
    marginHorizontal: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    marginBottom: 8,
  },
  profileName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1A1D2E",
    marginBottom: 4,
  },
  doctorBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 6,
  },
  doctorBadgeText: { fontSize: 12, color: "#6B7FED", fontWeight: "700" },
  profileBio: { fontSize: 14, color: "#555", lineHeight: 20, marginBottom: 10 },
  profileMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },
  profileMetaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  profileMetaText: { fontSize: 12, color: "#888" },
  statsCardRow: {
    flexDirection: "row",
    backgroundColor: "#F7F8FC",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
  },
  statsCard: { flex: 1, alignItems: "center" },
  statsCardNum: { fontSize: 20, fontWeight: "800", color: "#1A1D2E" },
  statsCardLabel: { fontSize: 11, color: "#888", marginTop: 2 },
  statsCardDivider: { width: 1, height: 32, backgroundColor: "#E0E3EF" },
  postsSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EAEDF5",
    marginBottom: 8,
  },
  postsSectionTitle: { fontSize: 16, fontWeight: "700", color: "#1A1D2E" },
  postsSectionSub: { fontSize: 12, color: "#888" },
  postCard: {
    backgroundColor: "#FFF",
    marginHorizontal: 0,
    marginBottom: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  postHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  postAuthorRow: { flexDirection: "row", alignItems: "center", flex: 1 },
  postAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#6B7FED",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    overflow: "hidden",
  },
  postAvatarImg: { width: 42, height: 42, borderRadius: 21 },
  postAvatarText: { fontSize: 16, fontWeight: "700", color: "#FFF" },
  postAuthorName: { fontSize: 14, fontWeight: "700", color: "#1A1D2E" },
  postMeta: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  postTime: { fontSize: 11, color: "#999" },
  postMetaDot: { fontSize: 11, color: "#CCC", marginHorizontal: 5 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 20,
    gap: 4,
  },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusPillText: { fontSize: 10, fontWeight: "700" },
  categoryChip: {
    backgroundColor: "#EEF0FB",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryChipText: { fontSize: 11, color: "#6B7FED", fontWeight: "600" },
  postTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1D2E",
    marginBottom: 8,
    lineHeight: 22,
  },
  descriptionBox: {
    borderRadius: 10,
    padding: 10,
    backgroundColor: "#F7F8FC",
    marginBottom: 10,
  },
  postDescription: { fontSize: 14, color: "#555", lineHeight: 21 },
  seeMoreText: {
    color: "#6B7FED",
    fontWeight: "600",
    fontSize: 13,
    marginTop: 4,
  },
  mediaScroll: { marginBottom: 10 },
  mediaImage: { width: 160, height: 120, borderRadius: 10, marginRight: 8 },
  rejectionBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFF5F5",
    borderLeftWidth: 3,
    borderLeftColor: "#E53E3E",
    padding: 8,
    borderRadius: 6,
    marginBottom: 10,
    gap: 6,
  },
  rejectionText: { fontSize: 12, color: "#E53E3E", flex: 1 },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    minHeight: 18,
  },
  statsLeft: { flexDirection: "row", alignItems: "center" },
  statsRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  statItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  likeIconSmall: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#E53E3E",
    justifyContent: "center",
    alignItems: "center",
  },
  statText: { fontSize: 12, color: "#999" },
  statDivider: { fontSize: 12, color: "#CCC" },
  actionDivider: { height: 1, backgroundColor: "#F0F2F8", marginBottom: 8 },
  actionsRow: { flexDirection: "row", justifyContent: "space-around" },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 6,
    gap: 6,
  },
  actionLabel: { fontSize: 13, color: "#666", fontWeight: "600" },
  emptyWrap: { paddingTop: 60, alignItems: "center", paddingHorizontal: 30 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2C3E50",
    marginTop: 14,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#999",
    marginTop: 6,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  modalHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#DDD",
    alignSelf: "center",
    marginBottom: 16,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#1A1D2E" },
  inputLabel: { fontSize: 13, fontWeight: "600", color: "#555", marginBottom: 6 },
  modalInput: {
    backgroundColor: "#F5F7FF",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#1A1D2E",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E8EAF6",
  },
  saveBtn: {
    backgroundColor: "#6B7FED",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 4,
  },
  saveBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  commentItem: {
    flexDirection: "row",
    marginBottom: 14,
    alignItems: "flex-start",
  },
  commentAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#6B7FED",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  commentAvatarText: { color: "#FFF", fontWeight: "700", fontSize: 13 },
  commentBubble: {
    flex: 1,
    backgroundColor: "#F5F7FF",
    borderRadius: 12,
    padding: 10,
  },
  commentUser: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1A1D2E",
    marginBottom: 3,
  },
  commentText: { fontSize: 13, color: "#444", lineHeight: 19 },
  commentTime: { fontSize: 10, color: "#AAA", marginTop: 4 },
  noComments: { alignItems: "center", paddingVertical: 30 },
  noCommentsText: { color: "#BBB", marginTop: 8, fontSize: 13 },
  commentInputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#EEE",
    paddingTop: 12,
    gap: 8,
  },
  commentInputAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#6B7FED",
    justifyContent: "center",
    alignItems: "center",
  },
  commentTextInput: {
    flex: 1,
    backgroundColor: "#F5F7FF",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    color: "#1A1D2E",
    maxHeight: 80,
    borderWidth: 1,
    borderColor: "#E8EAF6",
  },
  commentSendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#6B7FED",
    justifyContent: "center",
    alignItems: "center",
  },
});