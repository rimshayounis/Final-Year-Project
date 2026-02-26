import React, { useState, useCallback } from "react";
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
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { MaterialIcons, Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import apiClient, { API_URL } from "../../services/api";

const { width } = Dimensions.get("window");
const COLORED_POST_SIZE = width - 32;

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
  isActive?: boolean; // true = public, false = private
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

/* ── Keyboard-aware bottom sheet modal ── */
function BottomSheetModal({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={bsStyles.overlay} />
        </TouchableWithoutFeedback>
        <View style={bsStyles.sheet}>
          <View style={bsStyles.handle} />
          <View style={bsStyles.headerRow}>
            <Text style={bsStyles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const bsStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#DDD",
    alignSelf: "center",
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: { fontSize: 18, fontWeight: "700", color: "#1A1D2E" },
});

export default function ProfileScreen({ id, role }: ProfileScreenProps) {
  const insets = useSafeAreaInsets();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Name edit
  const [editModal, setEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // Bio edit
  const [bioModal, setBioModal] = useState(false);
  const [bioText, setBioText] = useState("");

  // Comments
  const [commentModal, setCommentModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [commentText, setCommentText] = useState("");
  const [commentsLoading, setCommentsLoading] = useState(false);

  // Three-dot menu
  const [menuPost, setMenuPost] = useState<Post | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);

  // Edit post
  const [editPostModal, setEditPostModal] = useState(false);
  const [editPostTitle, setEditPostTitle] = useState("");
  const [editPostDesc, setEditPostDesc] = useState("");
  const [editPostLoading, setEditPostLoading] = useState(false);

  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());

  /* ── Fetch profile ── */
  const fetchProfile = async () => {
    try {
      const endpoint = role === "doctor" ? `/doctors/${id}` : `/users/${id}`;
      const res = await apiClient.get(endpoint);
      // Unwrap any nesting: { doctor:{} } | { user:{} } | { data:{} } | direct
      const raw = res.data;
      const data = raw?.doctor ?? raw?.user ?? raw?.data ?? raw;
      console.log("Profile name:", data?.fullName);
      setUserProfile(data);
      setEditName(data?.fullName ?? "");
      setBioText(data?.bio ?? "");
    } catch (e) {
      console.error("fetchProfile error:", e);
    }
  };

  const fetchUserPosts = async () => {
    try {
      const res = await apiClient.get(`/posts/user/${id}`);
      setPosts(res.data.data || []);
    } catch {
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
    }, [id]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchProfile();
    fetchUserPosts();
  };

  /* ── Save name ── */
  const handleSaveName = async () => {
    if (!editName.trim()) {
      Alert.alert("Error", "Name cannot be empty");
      return;
    }
    setEditLoading(true);
    try {
      const ep = role === "doctor" ? `/doctors/${id}` : `/users/${id}`;
      await apiClient.put(ep, { fullName: editName.trim() });
      setUserProfile((p) => (p ? { ...p, fullName: editName.trim() } : p));
      setEditModal(false);
    } catch {
      Alert.alert("Error", "Failed to update name");
    } finally {
      setEditLoading(false);
    }
  };

  /* ── Save bio ── */
  const handleSaveBio = async () => {
    setEditLoading(true);
    try {
      const ep = role === "doctor" ? `/doctors/${id}` : `/users/${id}`;
      await apiClient.put(ep, { bio: bioText });
      setUserProfile((p) => (p ? { ...p, bio: bioText } : p));
      setBioModal(false);
    } catch {
      Alert.alert("Error", "Failed to update bio");
    } finally {
      setEditLoading(false);
    }
  };

  /* ── Pick photo ── */
  const handlePickPhoto = async () => {
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
        const ep = role === "doctor" ? `/doctors/${id}` : `/users/${id}`;
        await apiClient.put(ep, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setUserProfile((p) =>
          p ? { ...p, profileImage: result.assets[0].uri } : p,
        );
      } catch {
        Alert.alert("Error", "Failed to update photo");
      }
    }
  };

  /* ── Like toggle ── */
  const handleLike = async (postId: string) => {
    if (actionLoading === postId + "_like") return;
    const isCurrentlyLiked = likedPosts.has(postId);
    setActionLoading(postId + "_like");
    try {
      if (isCurrentlyLiked) {
        // Unlike
        await apiClient.post(`/posts/${postId}/unlike`);
        setPosts((prev) =>
          prev.map((p) =>
            p._id === postId ? { ...p, likes: Math.max(0, p.likes - 1) } : p,
          ),
        );
        setLikedPosts((prev) => {
          const next = new Set(prev);
          next.delete(postId);
          return next;
        });
      } else {
        // Like
        await apiClient.post(`/posts/${postId}/like`);
        setPosts((prev) =>
          prev.map((p) =>
            p._id === postId ? { ...p, likes: p.likes + 1 } : p,
          ),
        );
        setLikedPosts((prev) => new Set([...prev, postId]));
      }
    } catch {
      Alert.alert(
        "Error",
        isCurrentlyLiked ? "Failed to unlike" : "Failed to like post",
      );
    } finally {
      setActionLoading(null);
    }
  };

  /* ── Comments ── */
  const handleOpenComment = async (post: Post) => {
    setSelectedPost({ ...post, commentsList: [] });
    setCommentModal(true);
    setCommentsLoading(true);
    try {
      const res = await apiClient.get(`/posts/${post._id}/comments`);
      const raw = Array.isArray(res.data.data)
        ? res.data.data
        : Array.isArray(res.data)
          ? res.data
          : [];
      const commentsList: Comment[] = raw.map((c: any) => ({
        _id: c._id?.toString() || Date.now().toString(),
        userId: c.userId?.toString() || "",
        userName: c.userName || "User",
        text: c.text || "",
        createdAt: c.createdAt || new Date().toISOString(),
      }));
      setSelectedPost({ ...post, commentsList });
    } catch {
      console.error("Failed to load comments");
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !selectedPost) return;
    setActionLoading(selectedPost._id + "_comment");
    try {
      const res = await apiClient.post(`/posts/${selectedPost._id}/comment`, {
        userId: id,
        text: commentText,
        userName: userProfile?.fullName || "User",
      });
      const newComment: Comment = {
        _id: res.data.data?._id?.toString() || Date.now().toString(),
        userId: id,
        userName: userProfile?.fullName || "You",
        text: commentText,
        createdAt: new Date().toISOString(),
      };
      setSelectedPost((p) =>
        p
          ? {
              ...p,
              comments: p.comments + 1,
              commentsList: [...(p.commentsList || []), newComment],
            }
          : p,
      );
      setPosts((prev) =>
        prev.map((p) =>
          p._id === selectedPost._id ? { ...p, comments: p.comments + 1 } : p,
        ),
      );
      setCommentText("");
    } catch {
      Alert.alert("Error", "Failed to add comment");
    } finally {
      setActionLoading(null);
    }
  };

  /* ── Share ── */
  const handleShare = async (post: Post) => {
    setActionLoading(post._id + "_share");
    try {
      await Share.share({
        title: post.title,
        message: `📋 ${post.title}\n\n${post.description}`,
      });
      await apiClient.post(`/posts/${post._id}/share`);
      setPosts((prev) =>
        prev.map((p) =>
          p._id === post._id ? { ...p, shares: p.shares + 1 } : p,
        ),
      );
    } catch {
      Alert.alert("Error", "Failed to share");
    } finally {
      setActionLoading(null);
    }
  };

  /* ── Three-dot menu actions ── */
  const handleToggleVisibility = async (post: Post) => {
    setMenuVisible(false);
    // isActive=true means public (visible to all), isActive=false means private (only owner sees it)
    const makePrivate = post.isActive !== false; // currently public → make private
    try {
      await apiClient.patch(`/posts/${post._id}`, {
        userId: id,
        isActive: !makePrivate,
      });
      setPosts((prev) =>
        prev.map((p) =>
          p._id === post._id ? { ...p, isActive: !makePrivate } : p,
        ),
      );
      Alert.alert(
        "Updated",
        makePrivate ? "Post is now private" : "Post is now public",
      );
    } catch (e: any) {
      Alert.alert(
        "Error",
        e?.response?.data?.message || "Failed to update visibility",
      );
    }
  };

  const handleOpenEditPost = (post: Post) => {
    setMenuVisible(false);
    if (post.status !== "pending") {
      Alert.alert("Cannot Edit", "Only pending posts can be edited.");
      return;
    }
    setEditPostTitle(post.title);
    setEditPostDesc(post.description);
    setEditPostModal(true);
  };

  const handleSavePost = async () => {
    if (!menuPost) return;
    setEditPostLoading(true);
    try {
      // Backend: PATCH /posts/:id — requires userId in body, only pending posts
      await apiClient.patch(`/posts/${menuPost._id}`, {
        userId: id,
        title: editPostTitle,
        description: editPostDesc,
      });
      setPosts((prev) =>
        prev.map((p) =>
          p._id === menuPost._id
            ? { ...p, title: editPostTitle, description: editPostDesc }
            : p,
        ),
      );
      setEditPostModal(false);
      Alert.alert("Success", "Post updated!");
    } catch (e: any) {
      Alert.alert(
        "Error",
        e?.response?.data?.message || "Failed to update post",
      );
    } finally {
      setEditPostLoading(false);
    }
  };

  const handleDeletePost = (post: Post) => {
    setMenuVisible(false);
    Alert.alert("Delete Post", "Are you sure you want to delete this post?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await apiClient.delete(`/posts/${post._id}/${id}`);
            setPosts((prev) => prev.filter((p) => p._id !== post._id));
          } catch (e: any) {
            Alert.alert(
              "Error",
              e?.response?.data?.message || "Failed to delete post",
            );
          }
        },
      },
    ]);
  };

  const toggleExpand = (postId: string) => {
    setExpandedPosts((prev) => {
      const next = new Set(prev);
      next.has(postId) ? next.delete(postId) : next.add(postId);
      return next;
    });
  };

  const statusColor = (s: string) =>
    s === "approved" ? "#00B374" : s === "rejected" ? "#E53E3E" : "#F6A623";
  const statusLabel = (s: string) =>
    s === "approved" ? "Published" : s === "rejected" ? "Rejected" : "Pending";

  const formatDate = (d: string) => {
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const publishedCount = posts.filter((p) => p.status === "approved").length;
  const pendingCount = posts.filter((p) => p.status === "pending").length;

  /* ══════════════════════════════════
     Profile Header
  ══════════════════════════════════ */
  const ProfileHeader = () => (
    <View>
      {/* White Profile Card */}
      <View style={styles.profileCard}>
        {/* Row: Avatar | Name+Stats */}
        <View style={styles.profileTopRow}>
          {/* Avatar */}
          <TouchableOpacity
            onPress={handlePickPhoto}
            style={styles.avatarTouchable}
          >
            {userProfile?.profileImage ? (
              <Image
                source={{ uri: userProfile.profileImage }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {userProfile?.fullName?.charAt(0)?.toUpperCase() ?? "?"}
                </Text>
              </View>
            )}
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={11} color="#FFF" />
            </View>
          </TouchableOpacity>

          {/* Name + Stats */}
          <View style={styles.nameStatsCol}>
            <View style={styles.nameRow}>
              <Text style={styles.profileName} numberOfLines={1}>
                {userProfile?.fullName?.toUpperCase() ?? "—"}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setEditName(userProfile?.fullName ?? "");
                  setEditModal(true);
                }}
                style={styles.pencilBtn}
              >
                <Ionicons name="pencil" size={13} color="#6B7FED" />
              </TouchableOpacity>
            </View>

            {role === "doctor" && (
              <View style={styles.doctorBadge}>
                <FontAwesome5 name="user-md" size={10} color="#6B7FED" />
                <Text style={styles.doctorBadgeText}>Verified Doctor</Text>
              </View>
            )}

            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNum}>{posts.length}</Text>
                <Text style={styles.statLabel}>Posts</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNum}>{pendingCount}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNum}>{publishedCount}</Text>
                <Text style={styles.statLabel}>Published</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Bio */}
        <View style={styles.bioSection}>
          <View style={styles.bioHeaderRow}>
            <Text style={styles.bioSectionLabel}>About yourself</Text>
            <TouchableOpacity
              onPress={() => {
                setBioText(userProfile?.bio ?? "");
                setBioModal(true);
              }}
              style={styles.pencilBtn}
            >
              <Ionicons name="pencil" size={13} color="#6B7FED" />
            </TouchableOpacity>
          </View>
          <Text style={styles.bioText}>
            {userProfile?.bio || "No bio yet. Tap the pencil to add one."}
          </Text>
          <View style={styles.metaRow}>
            {userProfile?.email ? (
              <View style={styles.metaItem}>
                <Ionicons name="mail-outline" size={12} color="#999" />
                <Text style={styles.metaText} numberOfLines={1}>
                  {userProfile.email}
                </Text>
              </View>
            ) : null}
            {userProfile?.gender ? (
              <View style={styles.metaItem}>
                <Ionicons name="person-outline" size={12} color="#999" />
                <Text style={styles.metaText}>{userProfile.gender}</Text>
              </View>
            ) : null}
            {userProfile?.age ? (
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={12} color="#999" />
                <Text style={styles.metaText}>{userProfile.age} yrs</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      {/* Activity header */}
      <View style={styles.activityHeader}>
        <Text style={styles.activityTitle}>Activity</Text>
        <Text style={styles.activityCount}>{posts.length} posts</Text>
      </View>
    </View>
  );

  /* ══════════════════════════════════
     Post Card
  ══════════════════════════════════ */
  const renderPost = ({ item }: { item: Post }) => {
    const isLiked = likedPosts.has(item._id);
    const isExpanded = expandedPosts.has(item._id);
    const hasColor = !!item.backgroundColor;
    const descLimit = 120;
    const needsExpand = item.description.length > descLimit && !hasColor;
    const baseUrl = API_URL.replace("/api", "");

    const avatarEl = userProfile?.profileImage ? (
      <Image
        source={{ uri: userProfile.profileImage }}
        style={styles.postAvatarImg}
      />
    ) : (
      <Text style={styles.postAvatarText}>
        {userProfile?.fullName?.charAt(0)?.toUpperCase() ?? "U"}
      </Text>
    );

    const likeEl =
      actionLoading === item._id + "_like" ? (
        <ActivityIndicator size="small" color="#6B7FED" />
      ) : (
        <MaterialIcons
          name={isLiked ? "favorite" : "favorite-border"}
          size={20}
          color={isLiked ? "#E53E3E" : "#666"}
        />
      );

    const shareEl =
      actionLoading === item._id + "_share" ? (
        <ActivityIndicator size="small" color="#6B7FED" />
      ) : (
        <Ionicons name="share-social-outline" size={20} color="#666" />
      );

    return (
      <View style={styles.postCard}>
        <View style={styles.postHeader}>
          <View style={styles.postAuthorRow}>
            <View style={styles.postAvatar}>{avatarEl}</View>
            <View style={{ flex: 1 }}>
              <Text style={styles.postAuthorName}>
                {userProfile?.fullName?.toUpperCase() ?? "YOU"}
              </Text>
              <View style={styles.postMeta}>
                <Text style={styles.postTime}>
                  {formatDate(item.createdAt)}
                </Text>
                {role !== "doctor" ? (
                  <Text style={styles.postMetaDot}>{" · "}</Text>
                ) : null}
                {role !== "doctor" ? (
                  <View
                    style={[
                      styles.statusPill,
                      { backgroundColor: statusColor(item.status) + "18" },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: statusColor(item.status) },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusPillText,
                        { color: statusColor(item.status) },
                      ]}
                    >
                      {statusLabel(item.status)}
                    </Text>
                  </View>
                ) : null}
                {item.isActive === false ? (
                  <Ionicons
                    name="lock-closed"
                    size={11}
                    color="#999"
                    style={{ marginLeft: 6 }}
                  />
                ) : null}
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={styles.dotsBtn}
            onPress={() => {
              setMenuPost(item);
              setMenuVisible(true);
            }}
          >
            <MaterialIcons name="more-vert" size={22} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={styles.categoryChip}>
          <Text style={styles.categoryChipText}>{item.category}</Text>
        </View>

        <Text style={styles.postTitle}>{item.title}</Text>

        {/* Description logic:
            - has image            → plain text, no background at all
            - no image + has color → colored background box, centered text
            - no image + no color  → light gray background box with see more
        */}
        {item.mediaUrls?.length > 0 ? (
          <Text style={styles.plainDescription}>{item.description}</Text>
        ) : hasColor ? (
          <View
            style={[
              styles.coloredPost,
              { backgroundColor: item.backgroundColor as string },
            ]}
          >
            <Text style={styles.coloredPostDesc}>{item.description}</Text>
          </View>
        ) : (
          <View style={styles.descriptionBox}>
            <Text style={styles.postDescription}>
              {isExpanded || !needsExpand
                ? item.description
                : item.description.slice(0, descLimit) + "..."}
            </Text>
            {needsExpand ? (
              <TouchableOpacity onPress={() => toggleExpand(item._id)}>
                <Text style={styles.seeMoreText}>
                  {isExpanded ? "See less" : "See more"}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {item.mediaUrls?.length > 0 ? (
          <View style={styles.mediaContainer}>
            {item.mediaUrls.map((url, i) => {
              const imgUri = url.startsWith("http") ? url : baseUrl + url;
              return (
                <Image
                  key={String(i)}
                  source={{ uri: imgUri }}
                  style={styles.mediaImage}
                  resizeMode="cover"
                  onError={() => console.log("Image load failed:", imgUri)}
                />
              );
            })}
          </View>
        ) : null}

        {item.status === "rejected" && item.rejectionReason ? (
          <View style={styles.rejectionBox}>
            <Ionicons name="alert-circle" size={14} color="#E53E3E" />
            <Text style={styles.rejectionText}>{item.rejectionReason}</Text>
          </View>
        ) : null}

        <View style={styles.statsCountRow}>
          <View style={styles.statsLeft}>
            {item.likes > 0 ? (
              <View style={styles.statCountItem}>
                <View style={styles.likeIconSmall}>
                  <MaterialIcons name="favorite" size={10} color="#FFF" />
                </View>
                <Text style={styles.statCountText}>{String(item.likes)}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.statsRight}>
            {item.comments > 0 ? (
              <Text style={styles.statCountText}>
                {String(item.comments) + " comments"}
              </Text>
            ) : null}
            {item.comments > 0 && item.shares > 0 ? (
              <Text style={styles.statCountDivider}>{" · "}</Text>
            ) : null}
            {item.shares > 0 ? (
              <Text style={styles.statCountText}>
                {String(item.shares) + " shares"}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.actionDivider} />

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleLike(item._id)}
            disabled={actionLoading === item._id + "_like"}
          >
            {likeEl}
            <Text
              style={[styles.actionLabel, isLiked ? { color: "#E53E3E" } : {}]}
            >
              {"Like"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleOpenComment(item)}
          >
            <Ionicons name="chatbubble-outline" size={19} color="#666" />
            <Text style={styles.actionLabel}>{"Comment"}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleShare(item)}
            disabled={actionLoading === item._id + "_share"}
          >
            {shareEl}
            <Text style={styles.actionLabel}>{"Share"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" backgroundColor="#6B7FED" />
        <ActivityIndicator size="large" color="#6B7FED" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#6B7FED" />

      {/* ── Sticky Top Nav ── */}
      <View style={[styles.topNav, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.topNavTitle}>
          {userProfile?.fullName?.toUpperCase() || "PROFILE"}
        </Text>
        <TouchableOpacity>
          <Ionicons name="settings-outline" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

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
        contentContainerStyle={{ paddingBottom: 40 }}
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

      {/* ══ Edit Name Modal ══ */}
      <BottomSheetModal
        visible={editModal}
        onClose={() => setEditModal(false)}
        title="Edit Name"
      >
        <Text style={styles.inputLabel}>Full Name</Text>
        <TextInput
          style={styles.modalInput}
          value={editName}
          onChangeText={setEditName}
          placeholder="Your full name"
          placeholderTextColor="#AAA"
          autoFocus
        />
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSaveName}
          disabled={editLoading}
        >
          {editLoading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveBtnText}>Save</Text>
          )}
        </TouchableOpacity>
      </BottomSheetModal>

      {/* ══ Edit Bio Modal ══ */}
      <BottomSheetModal
        visible={bioModal}
        onClose={() => setBioModal(false)}
        title="About Yourself"
      >
        <Text style={styles.inputLabel}>Bio</Text>
        <TextInput
          style={[
            styles.modalInput,
            { minHeight: 110, textAlignVertical: "top" },
          ]}
          value={bioText}
          onChangeText={setBioText}
          placeholder="Tell something about yourself..."
          placeholderTextColor="#AAA"
          multiline
          autoFocus
        />
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSaveBio}
          disabled={editLoading}
        >
          {editLoading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveBtnText}>Save Bio</Text>
          )}
        </TouchableOpacity>
      </BottomSheetModal>

      {/* ══ Three-dot Menu ══ */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
          <View style={styles.menuOverlay} />
        </TouchableWithoutFeedback>
        <View style={styles.menuSheet}>
          <View style={styles.menuHandle} />
          <Text style={styles.menuTitle} numberOfLines={1}>
            {menuPost?.title}
          </Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => menuPost && handleToggleVisibility(menuPost)}
          >
            <Ionicons
              name={
                menuPost?.isActive === false
                  ? "earth-outline"
                  : "lock-closed-outline"
              }
              size={20}
              color="#333"
            />
            <Text style={styles.menuItemText}>
              {menuPost?.isActive === false ? "Make Public" : "Make Private"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => menuPost && handleOpenEditPost(menuPost)}
          >
            <Ionicons name="pencil-outline" size={20} color="#333" />
            <Text style={styles.menuItemText}>Edit Post</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, styles.menuItemDanger]}
            onPress={() => menuPost && handleDeletePost(menuPost)}
          >
            <Ionicons name="trash-outline" size={20} color="#E53E3E" />
            <Text style={[styles.menuItemText, { color: "#E53E3E" }]}>
              Delete Post
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ══ Edit Post Modal ══ */}
      <BottomSheetModal
        visible={editPostModal}
        onClose={() => setEditPostModal(false)}
        title="Edit Post"
      >
        <Text style={styles.inputLabel}>Title</Text>
        <TextInput
          style={styles.modalInput}
          value={editPostTitle}
          onChangeText={setEditPostTitle}
          placeholder="Post title"
          placeholderTextColor="#AAA"
        />
        <Text style={styles.inputLabel}>Description</Text>
        <TextInput
          style={[
            styles.modalInput,
            { minHeight: 100, textAlignVertical: "top" },
          ]}
          value={editPostDesc}
          onChangeText={setEditPostDesc}
          placeholder="Post description"
          placeholderTextColor="#AAA"
          multiline
        />
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSavePost}
          disabled={editPostLoading}
        >
          {editPostLoading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveBtnText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </BottomSheetModal>

      {/* ══ Comment Modal — slide-up sheet ══ */}
      <Modal
        visible={commentModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setCommentModal(false);
          setCommentText("");
        }}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          {/* Dim backdrop — tap to close */}
          <TouchableWithoutFeedback
            onPress={() => {
              setCommentModal(false);
              setCommentText("");
            }}
          >
            <View style={styles.commentBackdrop} />
          </TouchableWithoutFeedback>

          {/* Sheet */}
          <View style={styles.commentSheet}>
            {/* Drag handle */}
            <View style={styles.commentSheetHandle} />

            {/* Header */}
            <View style={styles.commentSheetHeader}>
              <Text
                style={styles.commentSheetTitle}
              >{`Comments${selectedPost?.comments ? " (" + selectedPost.comments + ")" : ""}`}</Text>
              <TouchableOpacity
                onPress={() => {
                  setCommentModal(false);
                  setCommentText("");
                }}
              >
                <Ionicons name="close" size={22} color="#555" />
              </TouchableOpacity>
            </View>

            <View style={styles.commentDivider} />

            {/* Scrollable list */}
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.commentListContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {commentsLoading ? (
                <View style={styles.commentLoadingWrap}>
                  <ActivityIndicator color="#6B7FED" size="large" />
                  <Text style={styles.commentLoadingText}>
                    Loading comments...
                  </Text>
                </View>
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
                      <View style={styles.commentBubbleHeader}>
                        <Text style={styles.commentUser}>
                          {c.userName || "User"}
                        </Text>
                        <Text style={styles.commentTime}>
                          {formatDate(c.createdAt)}
                        </Text>
                      </View>
                      <Text style={styles.commentText}>{c.text}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.noComments}>
                  <Ionicons
                    name="chatbubbles-outline"
                    size={48}
                    color="#E0E3EF"
                  />
                  <Text style={styles.noCommentsTitle}>No comments yet</Text>
                  <Text style={styles.noCommentsText}>
                    Be the first to share your thoughts!
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Sticky input */}
            <View style={styles.commentInputWrap}>
              <View style={styles.commentInputAvatar}>
                <Text style={styles.commentAvatarText}>
                  {userProfile?.fullName?.charAt(0)?.toUpperCase() || "U"}
                </Text>
              </View>
              <View style={styles.commentInputBox}>
                <TextInput
                  style={styles.commentTextInput}
                  placeholder="Add a comment..."
                  placeholderTextColor="#AAA"
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity
                  style={[
                    styles.commentSendBtn,
                    !commentText.trim() && { opacity: 0.35 },
                  ]}
                  onPress={handleSubmitComment}
                  disabled={
                    !commentText.trim() ||
                    actionLoading === selectedPost?._id + "_comment"
                  }
                >
                  {actionLoading === selectedPost?._id + "_comment" ? (
                    <ActivityIndicator size="small" color="#6B7FED" />
                  ) : (
                    <Ionicons name="send" size={18} color="#6B7FED" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F2F8" },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F0F2F8",
  },
  loadingText: { marginTop: 12, color: "#6B7FED", fontSize: 14 },

  // Top Nav
  topNav: {
    backgroundColor: "#6B7FED",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
  topNavTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: -0.3,
  },

  // Profile Card
  profileCard: {
    backgroundColor: "#FFF",
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 20,
    marginBottom: 8,
  },
  profileTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 18,
  },

  // Avatar
  avatarTouchable: { position: "relative", marginRight: 18 },
  avatarImage: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 2.5,
    borderColor: "#6B7FED",
  },
  avatarPlaceholder: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: "#6B7FED",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: { fontSize: 30, fontWeight: "800", color: "#FFF" },
  cameraBadge: {
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

  // Name + Stats
  nameStatsCol: { flex: 1, justifyContent: "center" },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    gap: 8,
  },
  profileName: { fontSize: 17, fontWeight: "800", color: "#1A1D2E", flex: 1 },
  pencilBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#EEF0FB",
    justifyContent: "center",
    alignItems: "center",
  },
  doctorBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  doctorBadgeText: { fontSize: 11, color: "#6B7FED", fontWeight: "700" },
  statsRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  statItem: { flex: 1, alignItems: "center" },
  statNum: { fontSize: 17, fontWeight: "800", color: "#1A1D2E" },
  statLabel: { fontSize: 11, color: "#888", marginTop: 1 },
  statDivider: { width: 1, height: 26, backgroundColor: "#E8EAF6" },

  // Bio
  bioSection: { borderTopWidth: 1, borderTopColor: "#F0F2F8", paddingTop: 14 },
  bioHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  bioSectionLabel: { fontSize: 13, fontWeight: "700", color: "#555" },
  bioText: { fontSize: 14, color: "#444", lineHeight: 21, marginBottom: 10 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12, color: "#888" },

  // Activity header
  activityHeader: {
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
  activityTitle: { fontSize: 15, fontWeight: "700", color: "#1A1D2E" },
  activityCount: { fontSize: 12, color: "#888" },

  // Post Card
  postCard: {
    backgroundColor: "#FFF",
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
  postMetaDot: { fontSize: 11, color: "#CCC", marginHorizontal: 4 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 20,
    gap: 3,
  },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusPillText: { fontSize: 10, fontWeight: "700" },
  dotsBtn: { padding: 4, marginLeft: 4 },
  lockRow: { flexDirection: "row", alignItems: "center" },

  // Category chip
  categoryChip: {
    alignSelf: "flex-start",
    backgroundColor: "#EEF0FB",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  categoryChipText: { fontSize: 11, color: "#6B7FED", fontWeight: "600" },

  // Post content
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
  plainDescription: {
    fontSize: 14,
    color: "#555",
    lineHeight: 21,
    marginBottom: 10,
  },
  postDescription: { fontSize: 14, color: "#555", lineHeight: 21 },
  seeMoreText: {
    color: "#6B7FED",
    fontWeight: "600",
    fontSize: 13,
    marginTop: 4,
  },

  // Colored post — square with centered text
  coloredPost: {
    width: COLORED_POST_SIZE,
    height: COLORED_POST_SIZE * 0.75,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    padding: 24,
  },
  coloredPostTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FFF",
    textAlign: "center",
    marginBottom: 10,
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  }, // kept for safety
  coloredPostDesc: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFF",
    textAlign: "center",
    lineHeight: 26,
    textShadowColor: "rgba(0,0,0,0.15)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  mediaContainer: { marginBottom: 10, borderRadius: 12, overflow: "hidden" },
  mediaImage: { width: "100%", height: 220, borderRadius: 12, marginBottom: 6 },
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

  statsCountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    minHeight: 18,
  },
  statsLeft: { flexDirection: "row", alignItems: "center" },
  statsRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  statCountItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  likeIconSmall: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#E53E3E",
    justifyContent: "center",
    alignItems: "center",
  },
  statCountText: { fontSize: 12, color: "#999" },
  statCountDivider: { fontSize: 12, color: "#CCC" },
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

  // Empty
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

  // Three-dot menu
  menuOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  menuSheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  menuHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#DDD",
    alignSelf: "center",
    marginBottom: 12,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#888",
    marginBottom: 16,
    textAlign: "center",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F2F8",
  },
  menuItemDanger: { borderBottomWidth: 0 },
  menuItemText: { fontSize: 15, fontWeight: "600", color: "#1A1D2E" },

  // Modals
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555",
    marginBottom: 6,
  },
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

  // Comments
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
    fontSize: 14,
    color: "#1A1D2E",
    maxHeight: 80,
    paddingVertical: 4,
  },

  // Comment sheet styles
  commentBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  commentSheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "65%",
    paddingBottom: 16,
  },
  commentSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#DDD",
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  commentSheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  commentSheetTitle: { fontSize: 16, fontWeight: "800", color: "#1A1D2E" },

  commentModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F2F8",
    backgroundColor: "#FFF",
  },
  commentModalBack: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  commentModalTitle: { fontSize: 17, fontWeight: "800", color: "#1A1D2E" },
  commentPostPreview: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: "#FFF",
  },
  commentPostAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#6B7FED",
    justifyContent: "center",
    alignItems: "center",
  },
  commentPostAuthor: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1A1D2E",
    marginBottom: 2,
  },
  commentPostSnippet: { fontSize: 12, color: "#888", lineHeight: 17 },
  commentDivider: { height: 1, backgroundColor: "#F0F2F8" },
  commentListContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  commentLoadingWrap: { alignItems: "center", paddingTop: 60, gap: 12 },
  commentLoadingText: { fontSize: 14, color: "#888" },
  commentBubbleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  noCommentsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#555",
    marginTop: 16,
  },
  commentInputWrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F2F8",
    backgroundColor: "#FFF",
    gap: 10,
  },
  commentInputBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "#F5F7FF",
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#E8EAF6",
    gap: 8,
  },
  commentSendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
});
