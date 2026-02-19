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
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import apiClient from "../../services/api";

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
}

type ProfileScreenProps = {
  id: string; // user id
  role?: "user" | "doctor";
};

export default function ProfileScreen({ id, role }: ProfileScreenProps) {
  const insets = useSafeAreaInsets();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [commentModal, setCommentModal] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Fetch posts for the user
  const fetchUserPosts = async () => {
    try {
      const response = await apiClient.get(`/posts/user/${id}`);
      setPosts(response.data.data);
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
      fetchUserPosts();
    }, [id]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchUserPosts();
  };

  // ===== LIKE =====
  const handleLike = async (postId: string) => {
    if (actionLoading === postId + "_like") return;

    const alreadyLiked = likedPosts.has(postId);
    if (alreadyLiked) {
      Alert.alert("", "You already liked this post!");
      return;
    }

    setActionLoading(postId + "_like");
    try {
      await apiClient.post(`/posts/${postId}/like`);

      setPosts((prev) =>
        prev.map((p) => (p._id === postId ? { ...p, likes: p.likes + 1 } : p)),
      );
      setLikedPosts((prev) => new Set([...prev, postId]));
    } catch (error) {
      Alert.alert("Error", "Failed to like post");
    } finally {
      setActionLoading(null);
    }
  };

  // ===== COMMENT =====
  const handleOpenComment = (postId: string) => {
    setSelectedPostId(postId);
    setCommentModal(true);
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim()) {
      Alert.alert("Error", "Please write a comment");
      return;
    }
    if (!selectedPostId) return;

    setActionLoading(selectedPostId + "_comment");
    try {
      await apiClient.post(`/posts/${selectedPostId}/comment`);

      setPosts((prev) =>
        prev.map((p) =>
          p._id === selectedPostId ? { ...p, comments: p.comments + 1 } : p,
        ),
      );

      setCommentText("");
      setCommentModal(false);
      Alert.alert("Success", "Comment added!");
    } catch (error) {
      Alert.alert("Error", "Failed to add comment");
    } finally {
      setActionLoading(null);
    }
  };

  // ===== SHARE =====
  const handleShare = async (post: Post) => {
    setActionLoading(post._id + "_share");
    try {
      const shareMessage = `${post.title}\n\n${post.description}\n\nCategory: ${post.category}`;
      const result = await Share.share({
        message: shareMessage,
        title: post.title,
      });

      if (result.action === Share.sharedAction) {
        await apiClient.post(`/posts/${post._id}/share`);

        setPosts((prev) =>
          prev.map((p) =>
            p._id === post._id ? { ...p, shares: p.shares + 1 } : p,
          ),
        );
      }
    } catch (error) {
      Alert.alert("Error", "Failed to share post");
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "#4CAF50";
      case "rejected":
        return "#F44336";
      default:
        return "#FF9800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return "check-circle";
      case "rejected":
        return "cancel";
      default:
        return "schedule";
    }
  };

  const renderPost = ({ item }: { item: Post }) => {
    const isLiked = likedPosts.has(item._id);

    return (
      <View style={styles.postCard}>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) + "20" },
          ]}
        >
          <MaterialIcons
            name={getStatusIcon(item.status) as any}
            size={14}
            color={getStatusColor(item.status)}
          />
          <Text
            style={[styles.statusText, { color: getStatusColor(item.status) }]}
          >
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>

        <Text style={styles.categoryTag}>{item.category}</Text>
        <Text style={styles.postTitle}>{item.title}</Text>

        <View
          style={[
            styles.descriptionBox,
            item.backgroundColor && { backgroundColor: item.backgroundColor },
          ]}
        >
          <Text
            style={[
              styles.postDescription,
              item.backgroundColor && { color: "#FFF" },
            ]}
            numberOfLines={3}
          >
            {item.description}
          </Text>
        </View>

        {item.mediaUrls && item.mediaUrls.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.mediaScroll}
          >
            {item.mediaUrls.map((url, index) => (
              <Image
                key={index}
                source={{ uri: `http://192.168.100.10:3000${url}` }}
                style={styles.mediaImage}
              />
            ))}
          </ScrollView>
        )}

        {item.status === "rejected" && item.rejectionReason && (
          <View style={styles.rejectionBox}>
            <MaterialIcons name="info" size={14} color="#F44336" />
            <Text style={styles.rejectionText}>{item.rejectionReason}</Text>
          </View>
        )}

        <Text style={styles.dateText}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleLike(item._id)}
            disabled={actionLoading === item._id + "_like"}
          >
            {actionLoading === item._id + "_like" ? (
              <ActivityIndicator size="small" color="#FF4444" />
            ) : (
              <MaterialIcons
                name={isLiked ? "favorite" : "favorite-border"}
                size={22}
                color={isLiked ? "#FF4444" : "#999"}
              />
            )}
            <Text style={[styles.actionText, isLiked && { color: "#FF4444" }]}>
              {item.likes}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleOpenComment(item._id)}
          >
            <MaterialIcons name="chat-bubble-outline" size={22} color="#999" />
            <Text style={styles.actionText}>{item.comments}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleShare(item)}
            disabled={actionLoading === item._id + "_share"}
          >
            {actionLoading === item._id + "_share" ? (
              <ActivityIndicator size="small" color="#6B7FED" />
            ) : (
              <MaterialIcons name="share" size={22} color="#999" />
            )}
            <Text style={styles.actionText}>{item.shares}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <MaterialIcons name="person" size={40} color="#FFF" />
        <Text style={styles.headerTitle}>My Posts</Text>
        <Text style={styles.headerSubtitle}>{posts.length} posts</Text>
      </View>

      <View style={styles.content}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#6B7FED" />
            <Text style={styles.loadingText}>Loading your posts...</Text>
          </View>
        ) : posts.length === 0 ? (
          <View style={styles.centered}>
            <MaterialIcons name="post-add" size={60} color="#CCC" />
            <Text style={styles.emptyTitle}>No Posts Yet</Text>
            <Text style={styles.emptySubtitle}>Create your first post!</Text>
          </View>
        ) : (
          <FlatList
            data={posts}
            keyExtractor={(item) => item._id}
            renderItem={renderPost}
            contentContainerStyle={{ padding: 15 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={["#6B7FED"]}
              />
            }
          />
        )}
      </View>

      {/* Comment Modal */}
      <Modal
        visible={commentModal}
        transparent
        animationType="slide"
        onRequestClose={() => setCommentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Comment</Text>
              <TouchableOpacity
                onPress={() => {
                  setCommentModal(false);
                  setCommentText("");
                }}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.commentInput}
              placeholder="Write your comment..."
              value={commentText}
              onChangeText={setCommentText}
              multiline
              autoFocus
            />

            <TouchableOpacity
              style={styles.submitCommentButton}
              onPress={handleSubmitComment}
              disabled={actionLoading !== null}
            >
              {actionLoading !== null ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitCommentText}>Post Comment</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ===== STYLES (unchanged) =====
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#6B7FED" },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 25,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFF",
    marginTop: 10,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    marginTop: 4,
  },
  content: {
    flex: 1,
    backgroundColor: "#F0F4FF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 80,
  },
  loadingText: { marginTop: 10, color: "#999", fontSize: 15 },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2C3E50",
    marginTop: 15,
  },
  emptySubtitle: { fontSize: 14, color: "#999", marginTop: 5 },
  postCard: {
    backgroundColor: "#FFF",
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 8,
  },
  statusText: { fontSize: 12, fontWeight: "600", marginLeft: 4 },
  categoryTag: {
    fontSize: 12,
    color: "#6B7FED",
    fontWeight: "600",
    marginBottom: 6,
  },
  postTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2C3E50",
    marginBottom: 8,
  },
  descriptionBox: {
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#F8F8F8",
    marginBottom: 10,
  },
  postDescription: { fontSize: 14, color: "#666", lineHeight: 20 },
  mediaScroll: { marginBottom: 10 },
  mediaImage: { width: 120, height: 120, borderRadius: 10, marginRight: 8 },
  rejectionBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFEBEE",
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  rejectionText: { fontSize: 12, color: "#F44336", marginLeft: 5, flex: 1 },
  dateText: { fontSize: 12, color: "#CCC", marginBottom: 10 },
  actionsRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 5,
  },
  actionText: { fontSize: 14, color: "#999", marginLeft: 5, fontWeight: "600" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 25,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: "700", color: "#2C3E50" },
  commentInput: {
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    padding: 15,
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: "top",
    marginBottom: 15,
  },
  submitCommentButton: {
    backgroundColor: "#6B7FED",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitCommentText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
});
