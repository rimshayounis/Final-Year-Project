import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
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
  PanResponder,
} from "react-native";
import { MaterialIcons, Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import axios from 'axios';
import apiClient, { API_URL, postAPI, reportAPI, feedbackAPI, chatAPI } from "../../services/api";

const BACKGROUND_COLORS = [
  { color: "#6B7FED", label: "Indigo"   },
  { color: "#FF6B6B", label: "Coral"    },
  { color: "#4ECDC4", label: "Teal"     },
  { color: "#FFE66D", label: "Yellow"   },
  { color: "#A8E6CF", label: "Mint"     },
  { color: "#FF8B94", label: "Pink"     },
  { color: "#C7CEEA", label: "Lavender" },
  { color: "#FFDAB9", label: "Peach"    },
  { color: "#98D8C8", label: "Seafoam"  },
  { color: "#F7DC6F", label: "Gold"     },
  { color: "#BB8FCE", label: "Plum"     },
  { color: "#85C1E2", label: "Sky"      },
];

const POST_CATEGORIES = [
  "Hair & Skin",
  "Mental Health",
  "Nutrition",
  "Fitness",
  "Heart Health",
  "General Health",
];

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
  specialization?: string;
  subscriptionPlan?: string;
  completedCount?: number;
}

type ProfileScreenProps = {
  id: string;
  role?: "user" | "doctor";
  isOwner?: boolean; // true = viewing own profile; private posts are visible
  viewerId?: string;       // id of the logged-in user (reporter)
  viewerRole?: "user" | "doctor"; // role of the logged-in user
  onBack?: () => void;
  onBookAppointment?: (doctor: {
    _id: string;
    fullName: string;
    specialization: string;
    email: string;
    profileImage?: string;
  }) => void;
  onCreateAppointment?: () => void;
  onOpenSettings?: () => void;
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

export default function ProfileScreen({ id, role, isOwner = false, viewerId, viewerRole, onBack, onBookAppointment, onCreateAppointment, onOpenSettings }: ProfileScreenProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [messagingLoading, setMessagingLoading] = useState(false);

  const handleMessageUser = async () => {
    if (!viewerId || isOwner || role !== 'user') return;
    setMessagingLoading(true);
    try {
      const res = await chatAPI.getOrCreateUserConversation(viewerId, id);
      const conv = res.data;
      navigation.navigate('UserChat', {
        otherUserId:    id,
        otherUserName:  userProfile?.fullName ?? 'User',
        conversationId: conv._id,
        myUserId:       viewerId,
      });
    } catch {
      Alert.alert('Error', 'Could not open chat. Please try again.');
    } finally {
      setMessagingLoading(false);
    }
  };
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [approvedByDoctorCount, setApprovedByDoctorCount] = useState<number>(0);
  const [appointmentCount, setAppointmentCount] = useState<number>(0);
  // Sync completedCount from doctor document whenever profile loads
  useEffect(() => {
    if (role === 'doctor' && userProfile?.completedCount !== undefined) {
      setAppointmentCount(userProfile.completedCount);
    }
  }, [userProfile?.completedCount]);
  const [pointsSummary, setPointsSummary] = useState<{
    totalPoints: number;
    cashValue: number;
  } | null>(null);
  const [mentorLevel, setMentorLevel] = useState<{
    level: number;
    title: string;
    score: number;
    nextScore: number | null;
  } | null>(null);
  const avatarSource = useMemo(
    () => userProfile?.profileImage ? { uri: userProfile.profileImage } : null,
    [userProfile?.profileImage],
  );
  const [pointsRefreshing, setPointsRefreshing] = useState(false);

  // Doctor ratings & feedbacks
  const [doctorRating, setDoctorRating] = useState<{
    avgRating: number;
    ratingCount: number;
    feedbacks: Array<{ _id: string; rating: number; description: string; createdAt: string; userId?: { fullName?: string } }>;
  } | null>(null);

  // Points conversion modal
  const [convertModal, setConvertModal] = useState(false);
  const [convertInput, setConvertInput] = useState("");
  const [convertLoading, setConvertLoading] = useState(false);
  const [verificationSlots, setVerificationSlots] = useState<{
    remainingSlots: number;
    totalSlots: number;
    usedSlots: number;
  } | null>(null);

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
  const [editPostCategory, setEditPostCategory] = useState("");
  const [editPostColor, setEditPostColor] = useState("");
  const [editPostExistingMedia, setEditPostExistingMedia] = useState<string[]>([]);
  const [editPostNewMedia, setEditPostNewMedia] = useState<Array<{ uri: string }>>([]);
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  const [editPostLoading, setEditPostLoading] = useState(false);

  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [doctorIsActive, setDoctorIsActive] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"approved" | "pending" | "rejected">("approved");

  // Report
  const [reportMenuVisible, setReportMenuVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSubmitted, setReportSubmitted] = useState(false);

  const TAB_ORDER = ["approved", "pending", "rejected"] as const;

  const swipePan = useRef(
    PanResponder.create({
      // Only capture clearly horizontal movements so vertical scroll still works
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        Math.abs(dx) > Math.abs(dy) * 2 && Math.abs(dx) > 12,
      onPanResponderRelease: (_, { dx }) => {
        if (Math.abs(dx) < 40) return;
        setActiveTab((prev) => {
          const idx = TAB_ORDER.indexOf(prev);
          if (dx < 0 && idx < TAB_ORDER.length - 1) return TAB_ORDER[idx + 1];
          if (dx > 0 && idx > 0) return TAB_ORDER[idx - 1];
          return prev;
        });
      },
    })
  ).current;

  /* ── Fetch profile ── */
  const fetchProfile = async () => {
    try {
      const endpoint = role === "doctor" ? `/doctors/${id}` : `/users/${id}`;
      const res = await apiClient.get(endpoint);
      const raw = res.data;
      const data = raw?.doctor ?? raw?.user ?? raw?.data ?? raw;

      // Fetch bio + profileImage from separate UserProfile collection
      const ownerType = role === "doctor" ? "doctor" : "user";
      let bio: string | null = null;
      let profileImage: string | null = null;
      try {
        const profileRes = await apiClient.get(`/profiles/${ownerType}/${id}`);
        const pd = profileRes.data?.data;
        bio = pd?.bio ?? null;
        if (pd?.profileImage) {
          const baseUrl = API_URL.replace("/api", "");
          profileImage = pd.profileImage.startsWith("http")
            ? pd.profileImage
            : baseUrl + pd.profileImage;
        }
      } catch {
        // No profile doc yet — fine, will be created on first save
      }

      const merged = {
        ...data,
        bio,
        profileImage,
        specialization: data.doctorProfile?.specialization ?? data.specialization,
      };
      setUserProfile(merged);
      setEditName(merged?.fullName ?? "");
      setBioText(merged?.bio ?? "");
    } catch (e) {
      console.error("fetchProfile error:", e);
    }
  };

  const fetchUserPosts = async () => {
    try {
      const res = await apiClient.get(`/posts/user/${id}`);
      const all: Post[] = res.data.data || [];
      // Non-owners must not see private posts
      setPosts(isOwner ? all : all.filter((p) => p.isActive !== false));
    } catch {
      Alert.alert("Error", "Failed to load posts");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchApprovedByCount = async () => {
    try {
      const res = await apiClient.get(`/posts/approved-by/${id}/count`);
      const count = res.data?.data?.count;
      setApprovedByDoctorCount(typeof count === "number" ? count : 0);
    } catch (e: any) {
      console.error("fetchApprovedByCount error:", e?.response?.status, e?.response?.data ?? e?.message);
    }
  };

  const fetchAppointmentCount = () => {
    // no-op — count is derived from userProfile below
  };

  const fetchPointsSummary = async () => {
    try {
      await apiClient.post(`/points-reward/${id}/recalculate`);
      const [summaryRes, mentorRes] = await Promise.all([
        apiClient.get(`/points-reward/${id}/summary`),
        apiClient.get(`/points-reward/${id}/mentor-level`),
      ]);
      setPointsSummary(summaryRes.data?.data ?? null);
      setMentorLevel(mentorRes.data?.data ?? null);
    } catch {
      // silent
    }
  };

  const fetchVerificationSlots = async () => {
    try {
      const docRes = await apiClient.get(`/doctors/${id}`);
      const dr = docRes.data?.doctor ?? docRes.data ?? {};
      const plan = dr.subscriptionPlan ?? 'free_trial';
      const slotsRes = await apiClient.get(`/points-reward/${id}/verification-slots?plan=${plan}`);
      setVerificationSlots(slotsRes.data?.data ?? null);
    } catch {
      // silent
    }
  };

  const fetchDoctorActiveStatus = async () => {
    try {
      const res = await apiClient.get(`/appointment-availability/doctor/${id}`);
      setDoctorIsActive(res.data?.data?.isActive ?? false);
    } catch {
      setDoctorIsActive(false);
    }
  };

  const fetchDoctorRating = async () => {
    try {
      const res = await feedbackAPI.getDoctorFeedbacks(id);
      setDoctorRating(res.data?.data ?? null);
    } catch {
      // silent
    }
  };

  const handlePointsRefresh = async () => {
    setPointsRefreshing(true);
    await Promise.all([fetchPointsSummary(), fetchVerificationSlots()]);
    setPointsRefreshing(false);
  };

  const handleConvertPoints = async () => {
    const pts = parseInt(convertInput, 10);
    if (!pts || pts <= 0) {
      Alert.alert("Invalid", "Enter a valid number of points.");
      return;
    }
    if (pointsSummary && pts > pointsSummary.totalPoints) {
      Alert.alert("Insufficient Points", `You only have ${pointsSummary.totalPoints} points.`);
      return;
    }
    setConvertLoading(true);
    try {
      await apiClient.post("/wallet/convert", { doctorId: id, points: pts });
      setConvertModal(false);
      setConvertInput("");
      Alert.alert("Success", `PKR ${(pts * 0.1).toFixed(2)} has been added to your wallet.`);
      await Promise.all([fetchPointsSummary(), fetchVerificationSlots()]);
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message || "Conversion failed.");
    } finally {
      setConvertLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchProfile();
      fetchUserPosts();
      if (role === "doctor") {
        fetchApprovedByCount();
        fetchAppointmentCount();
        fetchPointsSummary();
        fetchDoctorRating();
        if (!onBookAppointment) fetchVerificationSlots();
        if (onBookAppointment) fetchDoctorActiveStatus();
      }

      return () => {};
    }, [id, isOwner]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchProfile();
    fetchUserPosts();
    if (role === "doctor") {
      fetchApprovedByCount();
      fetchAppointmentCount();
      fetchPointsSummary();
      fetchDoctorRating();
      if (!onBookAppointment) fetchVerificationSlots();
      if (onBookAppointment) fetchDoctorActiveStatus();
    }
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
      const ownerType = role === "doctor" ? "doctor" : "user";
      await apiClient.put(`/profiles/${ownerType}/${id}`, { bio: bioText });
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
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission Needed", "Allow gallery access to set a profile photo.");
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
        const asset     = result.assets[0];
        const ownerType = role === "doctor" ? "doctor" : "user";

        const formData = new FormData();
        formData.append("profileImage", {
          uri:  asset.uri,
          name: "profile.jpg",
          type: "image/jpeg",
        } as any);

        const res = await axios.put(
          `${API_URL}/profiles/${ownerType}/${id}/image`,
          formData,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 30000,
          },
        );
        const savedPath = res.data?.data?.profileImage;
        const baseUrl   = API_URL.replace("/api", "");
        const displayUrl = savedPath
          ? savedPath.startsWith("http") ? savedPath : baseUrl + savedPath
          : asset.uri;

        setUserProfile((p) => (p ? { ...p, profileImage: displayUrl } : p));
      } catch (e: any) {
        Alert.alert("Error", e?.message ?? "Failed to update photo");
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
    setEditPostTitle(post.title);
    setEditPostDesc(post.description);
    setEditPostCategory(post.category);
    setEditPostColor(post.backgroundColor || "");
    setEditPostExistingMedia(post.mediaUrls || []);
    setEditPostNewMedia([]);
    setEditPostModal(true);
  };

  const handleSavePost = async () => {
    if (!menuPost) return;
    if (!editPostTitle.trim() || !editPostDesc.trim() || !editPostCategory) {
      Alert.alert("Error", "Please fill all required fields");
      return;
    }
    setEditPostLoading(true);
    try {
      const formData = new FormData();
      formData.append("userId", id);
      formData.append("title", editPostTitle.trim());
      formData.append("description", editPostDesc.trim());
      formData.append("category", editPostCategory);
      if (editPostColor) formData.append("backgroundColor", editPostColor);

      // Existing media URLs the user wants to keep
      editPostExistingMedia.forEach((url) => formData.append("mediaUrls", url));

      // New media files to upload
      editPostNewMedia.forEach((file) => {
        const fileName = file.uri.split("/").pop() ?? "image.jpg";
        formData.append("media", {
          uri: file.uri,
          name: fileName,
          type: "image/jpeg",
        } as any);
      });

      const res = await postAPI.updatePost(menuPost._id, formData);
      const updatedPost = res.data?.data;

      setPosts((prev) =>
        prev.map((p) =>
          p._id === menuPost._id
            ? {
                ...p,
                title: editPostTitle.trim(),
                description: editPostDesc.trim(),
                category: editPostCategory,
                backgroundColor: editPostColor || null,
                mediaUrls: updatedPost?.mediaUrls ?? editPostExistingMedia,
              }
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

  const handlePickEditMedia = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted)
      return Alert.alert("Permission Needed", "Allow gallery access");

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newFiles = result.assets.map((a) => ({ uri: a.uri }));
      setEditPostNewMedia((prev) => [...prev, ...newFiles]);
      setEditPostColor(""); // clear bg color when media added
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

  const canEditPost = (post: Post) => {
    if (role === "doctor") return post.status === "pending" || post.status === "approved";
    return post.status === "pending";
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

  /* ── Display name: title-cased as entered by user ── */
  const displayName = (name?: string, fallback = "—") => {
    if (!name) return fallback;
    return name.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  };

  const publishedCount = posts.filter((p) => p.status === "approved").length;
  const pendingCount = posts.filter((p) => p.status === "pending").length;

  /* ══════════════════════════════════
     Profile Header — memoized so the avatar image does not reload
     when modal-only state (bioText, editName, etc.) changes
  ══════════════════════════════════ */
/* ══════════════════════════════════
   Profile Header — Memoized
══════════════════════════════════ */
const ProfileHeader = useCallback(() => (
  <View>
    {/* White Profile Card */}
    <View style={styles.profileCard}>
      {/* Row: Avatar | Name+Stats */}
      <View style={styles.profileTopRow}>
        {/* Avatar */}
        <TouchableOpacity
          onPress={isOwner ? handlePickPhoto : undefined}
          activeOpacity={isOwner ? 0.7 : 1}
          style={styles.avatarTouchable}
        >
          {avatarSource ? (
            <Image
              source={avatarSource}
              style={styles.avatarImage}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>
                {userProfile?.fullName?.charAt(0)?.toUpperCase() ?? "?"}
              </Text>
            </View>
          )}
          {isOwner && (
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={11} color="#FFF" />
            </View>
          )}
        </TouchableOpacity>

        {/* Name + Stats */}
        <View style={styles.nameStatsCol}>
          <View style={styles.nameRow}>
            <View style={styles.nameWithTick}>
              <Text style={styles.profileName} numberOfLines={1}>
                {displayName(userProfile?.fullName)}
              </Text>
              {role === "doctor" && userProfile?.subscriptionPlan === "premium" && (
                <Ionicons name="checkmark-circle" size={17} color="#1D9BF0" />
              )}
            </View>
            {isOwner && (
              <TouchableOpacity
                onPress={() => {
                  setEditName(userProfile?.fullName ?? "");
                  setEditModal(true);
                }}
                style={styles.pencilBtn}
              >
                <Ionicons name="pencil" size={13} color="#6B7FED" />
              </TouchableOpacity>
            )}
          </View>

          {role === "doctor" && (
            <View style={styles.doctorBadge}>
              <FontAwesome5 name="user-md" size={10} color="#6B7FED" />
              <Text style={styles.doctorBadgeText}>Verified by PMDC</Text>
              {userProfile?.specialization ? (
                <>
                  <View style={styles.badgeDivider} />
                  <Text style={styles.doctorBadgeSpec}>{userProfile.specialization}</Text>
                </>
              ) : null}
            </View>
          )}

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{posts.length}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            {role === "doctor" ? (
              <>
                <View style={styles.statItem}>
                  <Text style={styles.statNum}>{approvedByDoctorCount}</Text>
                  <Text style={styles.statLabel}>Approved</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNum}>{appointmentCount}</Text>
                  <Text style={styles.statLabel}>Sessions</Text>
                </View>
                <View style={styles.statItem}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                    <Ionicons name="star" size={13} color="#F6A623" />
                    <Text style={styles.statNum}>
                      {doctorRating && doctorRating.ratingCount > 0
                        ? doctorRating.avgRating.toFixed(1)
                        : '—'}
                    </Text>
                  </View>
                  <Text style={styles.statLabel}>Rating</Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.statItem}>
                  <Text style={styles.statNum}>{pendingCount}</Text>
                  <Text style={styles.statLabel}>Pending</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNum}>{publishedCount}</Text>
                  <Text style={styles.statLabel}>Published</Text>
                </View>
              </>
            )}
          </View>
        </View>
      </View>

      {/* Bio */}
      <View style={styles.bioSection}>
        <View style={styles.bioHeaderRow}>
          <Text style={styles.bioSectionLabel}>
            {isOwner ? "About yourself" : "About"}
          </Text>
          {isOwner && (
            <TouchableOpacity
              onPress={() => {
                setBioText(userProfile?.bio ?? "");
                setBioModal(true);
              }}
              style={styles.pencilBtn}
            >
              <Ionicons name="pencil" size={13} color="#6B7FED" />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.bioText}>
          {userProfile?.bio || (isOwner ? "No bio yet. Tap the pencil to add one." : "No bio available.")}
        </Text>
      </View>

      {/* ── Points & Mentor Level ── */}
      {role === "doctor" && (pointsSummary !== null || mentorLevel !== null) && (
        <View style={styles.pointsCard}>
          {/* Header (Only for Owner) */}
          {isOwner && (
            <View style={styles.pointsCardHeader}>
              <Text style={styles.pointsCardTitle}>Points & Rewards</Text>
              <TouchableOpacity onPress={handlePointsRefresh} disabled={pointsRefreshing} style={styles.pointsRefreshBtn}>
                {pointsRefreshing
                  ? <ActivityIndicator size={14} color="#6B7FED" />
                  : <Ionicons name="refresh" size={16} color="#6B7FED" />}
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.pointsRow}>
            {/* Points (HIDDEN FOR VISITORS) */}
            {isOwner && pointsSummary && (
              <>
                <TouchableOpacity
                  style={styles.pointsItem}
                  onPress={() => { setConvertInput(""); setConvertModal(true); }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="star" size={18} color="#F6A623" />
                  <Text style={styles.pointsNum}>{pointsSummary.totalPoints}</Text>
                  <Text style={styles.pointsLabel}>My Points</Text>
                  <Text style={styles.pointsCash}>
                    PKR {pointsSummary.cashValue.toFixed(0)}
                  </Text>
                  <Text style={styles.pointsTapHint}>Tap to convert</Text>
                </TouchableOpacity>
                <View style={styles.pointsVertDivider} />
              </>
            )}

            {/* Mentor Level (VISIBLE TO ALL) */}
            {mentorLevel && (
              <View style={styles.pointsItem}>
                <Ionicons
                  name="ribbon"
                  size={18}
                  color={
                    mentorLevel.level === 5 ? "#7B1FA2"
                    : mentorLevel.level === 4 ? "#F9A825"
                    : mentorLevel.level === 3 ? "#6B7FED"
                    : mentorLevel.level === 2 ? "#00B374"
                    : "#999"
                  }
                />
                <Text style={styles.pointsNum}>Lv.{mentorLevel.level}</Text>
                <Text style={styles.pointsLabel}>{mentorLevel.title}</Text>
                <Text style={styles.pointsCash}>
                  {mentorLevel.nextScore
                    ? `${mentorLevel.score}/${mentorLevel.nextScore}`
                    : `${mentorLevel.score} pts`}
                </Text>
              </View>
            )}
          </View>

          {/* Hint & Slots (HIDDEN FOR VISITORS) */}
          {isOwner && (
            <>
              <View style={styles.pointsHint}>
                <Ionicons name="information-circle-outline" size={13} color="#6B7FED" />
                <Text style={styles.pointsHintText}>
                  Earn pts when posts you approve go viral · 1 pt = PKR 0.10
                </Text>
              </View>

              {verificationSlots !== null && (
                <View style={styles.slotsRow}>
                  <Ionicons name="checkmark-circle" size={14} color="#00B374" />
                  <Text style={styles.slotsLabel}>Post verify credits this month:</Text>
                  <View style={styles.slotsPillWrap}>
                    {Array.from({ length: verificationSlots.totalSlots }).map((_, i) => (
                      <View
                        key={i}
                        style={[
                          styles.slotPill,
                          i < verificationSlots.usedSlots ? styles.slotPillUsed : styles.slotPillFree,
                        ]}
                      />
                    ))}
                  </View>
                  <Text style={styles.slotsCount}>
                    {verificationSlots.remainingSlots}/{verificationSlots.totalSlots}
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      )}

      {/* Message button (Visitor View Only) */}
      {!isOwner && viewerId && role === 'user' && (
        <TouchableOpacity
          style={profileMsgStyles.msgBtn}
          onPress={handleMessageUser}
          disabled={messagingLoading}
          activeOpacity={0.8}
        >
          {messagingLoading
            ? <ActivityIndicator size="small" color="#FFF" />
            : <>
                <Ionicons name="chatbubble-outline" size={18} color="#FFF" />
                <Text style={profileMsgStyles.msgBtnText}>Message</Text>
              </>
          }
        </TouchableOpacity>
      )}

      {/* Book Appointment (Visitor View Only) */}
      {!isOwner && onBookAppointment && doctorIsActive && (
        <TouchableOpacity
          style={styles.bookBtn}
          onPress={() =>
            onBookAppointment({
              _id: id,
              fullName: userProfile?.fullName ?? "",
              specialization: userProfile?.specialization ?? "",
              email: userProfile?.email ?? "",
              profileImage: userProfile?.profileImage,
            })
          }
        >
          <Ionicons name="calendar-outline" size={18} color="#FFF" />
          <Text style={styles.bookBtnText}>Book Appointment</Text>
        </TouchableOpacity>
      )}

      {/* Create Appointments (Owner Only) */}
      {isOwner && onCreateAppointment && (
        <TouchableOpacity
          style={styles.createAppointmentBtn}
          onPress={onCreateAppointment}
        >
          <Ionicons name="add-circle-outline" size={18} color="#6B7FED" />
          <Text style={styles.createAppointmentBtnText}>Create Appointments</Text>
        </TouchableOpacity>
      )}

      {/* Patient Reviews (Visible to ALL) */}
      {role === "doctor" && doctorRating !== null && (
        <View style={styles.reviewsSection}>
          <View style={styles.reviewsHeader}>
            <Ionicons name="star" size={16} color="#F6A623" />
            <Text style={styles.reviewsTitle}>Patient Reviews</Text>
            {doctorRating.ratingCount > 0 && (
              <Text style={styles.reviewsAvg}>
                {doctorRating.avgRating.toFixed(1)} · {doctorRating.ratingCount} {doctorRating.ratingCount === 1 ? 'review' : 'reviews'}
              </Text>
            )}
          </View>

          {doctorRating.feedbacks.length === 0 ? (
            <Text style={styles.reviewsEmpty}>No reviews yet.</Text>
          ) : (
            doctorRating.feedbacks.map(fb => (
              <View key={fb._id} style={styles.reviewCard}>
                <View style={styles.reviewTopRow}>
                  <View style={styles.reviewStars}>
                    {[1,2,3,4,5].map(s => (
                      <Ionicons
                        key={s}
                        name={s <= fb.rating ? 'star' : 'star-outline'}
                        size={13}
                        color={s <= fb.rating ? '#F6A623' : '#DDD'}
                      />
                    ))}
                  </View>
                  <Text style={styles.reviewName}>
                    {fb.userId?.fullName ?? 'Anonymous'}
                  </Text>
                  <Text style={styles.reviewDate}>
                    {new Date(fb.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                </View>
                {!!fb.description && (
                  <Text style={styles.reviewDesc}>{fb.description}</Text>
                )}
              </View>
            ))
          )}
        </View>
      )}
    </View>

    {/* Post Status Tabs (Only for User Role) */}
    {role !== "doctor" && (
      <View style={styles.postTabsRow}>
        {(
          [
            { key: "approved", icon: "checkmark-circle", color: "#00B374" },
            { key: "pending",  icon: "time",             color: "#F6A623" },
            { key: "rejected", icon: "close-circle",     color: "#E53E3E" },
          ] as const
        ).map((tab, index, arr) => {
          const isActive = activeTab === tab.key;
          return (
            <React.Fragment key={tab.key}>
              <TouchableOpacity
                style={[styles.postTab, isActive && { borderBottomColor: tab.color }]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={tab.icon}
                  size={20}
                  color={isActive ? tab.color : "#CCC"}
                />
              </TouchableOpacity>
              {index < arr.length - 1 && (
                <View style={styles.statDivider} />
              )}
            </React.Fragment>
          );
        })}
      </View>
    )}
  </View>
), [
  userProfile, avatarSource, posts, isOwner, role,
  approvedByDoctorCount, appointmentCount,
  pointsSummary, pointsRefreshing, verificationSlots,
  doctorIsActive, onBookAppointment, onCreateAppointment,
  activeTab, pendingCount, publishedCount, doctorRating
]);

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

    const avatarEl = avatarSource ? (
      <Image
        source={avatarSource}
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
                {displayName(userProfile?.fullName, "You")}
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
          {isOwner && (
            <TouchableOpacity
              style={styles.dotsBtn}
              onPress={() => {
                setMenuPost(item);
                setMenuVisible(true);
              }}
            >
              <MaterialIcons name="more-vert" size={22} color="#666" />
            </TouchableOpacity>
          )}
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
            {item.mediaUrls
              .filter((url) => !failedImages.has(url))
              .map((url, i) => {
                const imgUri = url.startsWith("http") ? url : baseUrl + url;
                return (
                  <Image
                    key={String(i)}
                    source={{ uri: imgUri }}
                    style={styles.mediaImage}
                    resizeMode="cover"
                    onError={() =>
                      setFailedImages((prev) => new Set([...prev, url]))
                    }
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
    <View style={styles.container} {...(role !== "doctor" ? swipePan.panHandlers : {})}>
      <StatusBar barStyle="light-content" backgroundColor="#6B7FED" />

      {/* ── Sticky Top Nav ── */}
      <View style={[styles.topNav, { paddingTop: insets.top + 4 }]}>
        {/* Left — back arrow + role label */}
        {onBack ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <TouchableOpacity onPress={onBack}>
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.navRoleText}>
              {role === "doctor" ? "Doctor" : "User"}
            </Text>
          </View>
        ) : (
          <View style={{ width: 24 }} />
        )}

        <View style={{ flex: 1 }} />

        {/* Right — three-dot report menu OR settings icon */}
        {onBack ? (
          <TouchableOpacity onPress={() => setReportMenuVisible(true)} style={{ padding: 2 }}>
            <MaterialIcons name="more-horiz" size={24} color="#FFF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={onOpenSettings}>
            <Ionicons name="settings-outline" size={24} color="#FFF" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={role !== "doctor" ? posts.filter((p) => p.status === activeTab) : posts}
        keyExtractor={(item) => item._id}
        renderItem={renderPost}
        ListHeaderComponent={<ProfileHeader />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons
              name={
                activeTab === "approved" ? "checkmark-circle-outline" :
                activeTab === "pending"  ? "time-outline" :
                "close-circle-outline"
              }
              size={52}
              color="#D0D5E8"
            />
            <Text style={styles.emptyTitle}>
              {activeTab === "approved" ? "No published posts" :
               activeTab === "pending"  ? "No pending posts" :
               "No rejected posts"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === "approved" ? "Approved posts will appear here." :
               activeTab === "pending"  ? "Posts awaiting review will appear here." :
               "Rejected posts will appear here."}
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

      {/* ══ Points Conversion Modal ══ */}
      <Modal
        visible={convertModal}
        transparent
        animationType="fade"
        onRequestClose={() => setConvertModal(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.convertOverlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
          <View style={styles.convertBox}>
            {/* Modal header */}
            <View style={styles.convertHeader}>
              <Text style={styles.convertTitle}>Convert Points</Text>
              <TouchableOpacity onPress={() => setConvertModal(false)}>
                <Ionicons name="close" size={22} color="#555" />
              </TouchableOpacity>
            </View>

            <Text style={styles.convertAvailLbl}>Available Points</Text>
            <Text style={styles.convertAvailVal}>{pointsSummary?.totalPoints ?? 0} pts</Text>

            <View style={styles.convertRow}>
              {/* Points input */}
              <View style={styles.convertBoxLeft}>
                <Text style={styles.convertBoxLbl}>Points</Text>
                <TextInput
                  style={styles.convertInput}
                  value={convertInput}
                  onChangeText={(v) => {
                    const digits = v.replace(/[^0-9]/g, "");
                    const max = pointsSummary?.totalPoints ?? 0;
                    const num = parseInt(digits, 10);
                    if (!digits || isNaN(num)) { setConvertInput(""); return; }
                    setConvertInput(String(Math.min(num, max)));
                  }}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#CCC"
                />
                <TouchableOpacity
                  style={styles.convertMaxBtn}
                  onPress={() => setConvertInput(String(pointsSummary?.totalPoints ?? 0))}
                >
                  <Text style={styles.convertMaxTxt}>Max</Text>
                </TouchableOpacity>
              </View>

              {/* Arrow */}
              <View style={styles.convertArrow}>
                <Ionicons name="arrow-forward" size={20} color="#6B7FED" />
              </View>

              {/* PKR preview */}
              <View style={styles.convertBoxRight}>
                <Text style={styles.convertBoxLbl}>PKR</Text>
                <Text style={styles.convertPkrVal}>
                  {convertInput && parseInt(convertInput, 10) > 0
                    ? (parseInt(convertInput, 10) * 0.1).toFixed(2)
                    : "0.00"}
                </Text>
                <Text style={styles.convertRateLbl}>1 pt = PKR 0.10</Text>
              </View>
            </View>

            <Text style={styles.convertMinHint}>Minimum 5,000 points required to convert</Text>

            <TouchableOpacity
              style={[styles.convertBtn, (convertLoading || parseInt(convertInput || "0", 10) < 5000) && { opacity: 0.4 }]}
              onPress={handleConvertPoints}
              disabled={convertLoading || parseInt(convertInput || "0", 10) < 5000}
            >
              {convertLoading
                ? <ActivityIndicator color="#FFF" size="small" />
                : <Text style={styles.convertBtnTxt}>Convert</Text>}
            </TouchableOpacity>
          </View>
          </TouchableWithoutFeedback>
        </View>
        </TouchableWithoutFeedback>
      </Modal>

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
            style={[styles.menuItem, menuPost && !canEditPost(menuPost) && { opacity: 0.4 }]}
            onPress={() => {
              if (!menuPost || !canEditPost(menuPost)) {
                Alert.alert(
                  "Cannot Edit",
                  role === "doctor"
                    ? "Rejected posts cannot be edited."
                    : "Only pending posts can be edited.",
                );
                return;
              }
              handleOpenEditPost(menuPost);
            }}
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

      {/* ══ Report — three-dot dropdown ══ */}
      <Modal
        visible={reportMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setReportMenuVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setReportMenuVisible(false)}>
          <View style={styles.menuOverlay} />
        </TouchableWithoutFeedback>
        <View style={styles.reportDropdown}>
          <TouchableOpacity
            style={styles.reportDropdownItem}
            onPress={() => {
              setReportMenuVisible(false);
              setReportReason("");
              setReportSubmitted(false);
              setReportModalVisible(true);
            }}
          >
            <Ionicons name="flag-outline" size={18} color="#E53E3E" />
            <Text style={styles.reportDropdownText}>Report</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ══ Report — reason modal ══ */}
      <Modal
        visible={reportModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setReportModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.reportOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.reportCard}>
                {reportSubmitted ? (
                  <>
                    <Ionicons name="checkmark-circle" size={44} color="#00B374" style={{ alignSelf: "center", marginBottom: 12 }} />
                    <Text style={styles.reportSuccessTitle}>Thank you</Text>
                    <Text style={styles.reportSuccessMsg}>
                      We will review your request and take appropriate action.
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.reportCardTitle}>Report Profile</Text>
                    <Text style={styles.reportCardSubtitle}>
                      Tell us why you're reporting this profile.
                    </Text>
                    <TextInput
                      style={styles.reportInput}
                      placeholder="Describe the issue..."
                      placeholderTextColor="#AAA"
                      value={reportReason}
                      onChangeText={setReportReason}
                      multiline
                      textAlignVertical="top"
                    />
                    <TouchableOpacity
                      style={[styles.reportSubmitBtn, !reportReason.trim() && { opacity: 0.4 }]}
                      disabled={!reportReason.trim()}
                      onPress={async () => {
                        try {
                          await reportAPI.submit({
                            reporterId:    viewerId ?? id,
                            reporterModel: viewerRole === "doctor" ? "Doctor" : "User",
                            reportedId:    id,
                            reportedModel: role === "doctor" ? "Doctor" : "User",
                            reason:        reportReason.trim(),
                          });
                        } catch {
                          // silently continue — still show success to user
                        }
                        setReportSubmitted(true);
                        setTimeout(() => {
                          setReportModalVisible(false);
                          setReportSubmitted(false);
                          setReportReason("");
                        }, 2200);
                      }}
                    >
                      <Text style={styles.reportSubmitText}>Submit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setReportModalVisible(false)} style={{ marginTop: 10, alignItems: "center" }}>
                      <Text style={{ fontSize: 13, color: "#999" }}>Cancel</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ══ Edit Post Full-Screen Modal ══ */}
      <Modal
        visible={editPostModal}
        animationType="slide"
        onRequestClose={() => setEditPostModal(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: "#FFF" }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {/* Header */}
          <View style={editStyles.header}>
            <TouchableOpacity onPress={() => setEditPostModal(false)} style={editStyles.closeBtn}>
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={editStyles.headerTitle}>Edit Post</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView
            contentContainerStyle={editStyles.body}
            keyboardShouldPersistTaps="handled"
          >
            {/* Title */}
            <Text style={editStyles.label}>Post Title</Text>
            <TextInput
              style={editStyles.input}
              placeholder="Enter title"
              value={editPostTitle}
              onChangeText={setEditPostTitle}
              placeholderTextColor="#999"
            />

            {/* Description + color preview */}
            <Text style={editStyles.label}>Description</Text>
            <View style={[editStyles.descContainer, editPostColor ? { backgroundColor: editPostColor } : {}]}>
              <TextInput
                style={[
                  editStyles.input,
                  editStyles.textArea,
                  editPostColor ? { backgroundColor: "transparent", color: "#FFF" } : {},
                ]}
                placeholder="Enter description"
                placeholderTextColor={editPostColor ? "rgba(255,255,255,0.7)" : "#999"}
                multiline
                value={editPostDesc}
                onChangeText={setEditPostDesc}
              />
            </View>

            {/* Background color strip — hidden when media present */}
            {editPostExistingMedia.length === 0 && editPostNewMedia.length === 0 && (
              <View style={editStyles.colorStripWrap}>
                <View style={editStyles.colorStripHeader}>
                  <MaterialIcons name="palette" size={15} color="#6B7FED" />
                  <Text style={editStyles.colorStripLabel}>Background color</Text>
                  {editPostColor ? (
                    <TouchableOpacity onPress={() => setEditPostColor("")} style={editStyles.clearColorBtn}>
                      <Text style={editStyles.clearColorText}>Clear</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={editStyles.colorStrip}>
                  <TouchableOpacity
                    onPress={() => setEditPostColor("")}
                    style={[editStyles.swatch, editStyles.swatchNone, !editPostColor && editStyles.swatchSelected]}
                  >
                    <MaterialIcons name="block" size={18} color={!editPostColor ? "#6B7FED" : "#CCC"} />
                  </TouchableOpacity>
                  {BACKGROUND_COLORS.map((item) => (
                    <TouchableOpacity
                      key={item.color}
                      onPress={() => setEditPostColor(editPostColor === item.color ? "" : item.color)}
                      style={[
                        editStyles.swatch,
                        { backgroundColor: item.color },
                        editPostColor === item.color && editStyles.swatchSelected,
                      ]}
                    >
                      {editPostColor === item.color && (
                        <MaterialIcons name="check" size={18} color="#FFF" />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {editPostColor ? (
                  <Text style={editStyles.selectedColorLabel}>
                    {BACKGROUND_COLORS.find((c) => c.color === editPostColor)?.label} selected
                  </Text>
                ) : null}
              </View>
            )}

            {/* Category */}
            <Text style={editStyles.label}>Category</Text>
            <TouchableOpacity
              style={editStyles.categorySelector}
              onPress={() => setShowEditCategoryModal(true)}
            >
              <Text style={[editStyles.categoryText, !editPostCategory && { color: "#999" }]}>
                {editPostCategory || "Select Category"}
              </Text>
              <MaterialIcons name="keyboard-arrow-down" size={24} color="#666" />
            </TouchableOpacity>

            {/* Media */}
            <Text style={editStyles.label}>Images</Text>
            <TouchableOpacity style={editStyles.mediaBtn} onPress={handlePickEditMedia}>
              <Text style={editStyles.mediaBtnText}>Add Images</Text>
              <Ionicons name="camera-outline" size={24} color="#6B7FED" />
            </TouchableOpacity>

            {/* Existing media thumbnails */}
            {(editPostExistingMedia.length > 0 || editPostNewMedia.length > 0) && (
              <View style={editStyles.mediaGrid}>
                {editPostExistingMedia.map((url, i) => {
                  const baseUrl = API_URL.replace("/api", "");
                  const imgUri = url.startsWith("http") ? url : baseUrl + url;
                  return (
                    <View key={"ex_" + i} style={editStyles.mediaThumb}>
                      <Image source={{ uri: imgUri }} style={editStyles.thumbImg} />
                      <TouchableOpacity
                        style={editStyles.removeThumb}
                        onPress={() => setEditPostExistingMedia((prev) => prev.filter((_, idx) => idx !== i))}
                      >
                        <MaterialIcons name="close" size={16} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  );
                })}
                {editPostNewMedia.map((file, i) => (
                  <View key={"new_" + i} style={editStyles.mediaThumb}>
                    <Image source={{ uri: file.uri }} style={editStyles.thumbImg} />
                    <TouchableOpacity
                      style={editStyles.removeThumb}
                      onPress={() => setEditPostNewMedia((prev) => prev.filter((_, idx) => idx !== i))}
                    >
                      <MaterialIcons name="close" size={16} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Save button */}
            <TouchableOpacity
              style={editStyles.saveBtn}
              onPress={handleSavePost}
              disabled={editPostLoading}
            >
              {editPostLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={editStyles.saveBtnText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Category picker modal */}
        <Modal
          visible={showEditCategoryModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowEditCategoryModal(false)}
        >
          <View style={editStyles.modalOverlay}>
            <View style={editStyles.modalContent}>
              <View style={editStyles.modalHeader}>
                <Text style={editStyles.modalTitle}>Select Category</Text>
                <TouchableOpacity onPress={() => setShowEditCategoryModal(false)}>
                  <MaterialIcons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              <ScrollView style={editStyles.categoryList}>
                {POST_CATEGORIES.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[editStyles.categoryOption, editPostCategory === c && editStyles.categoryOptionActive]}
                    onPress={() => { setEditPostCategory(c); setShowEditCategoryModal(false); }}
                  >
                    <Text style={[editStyles.categoryOptionText, editPostCategory === c && editStyles.categoryOptionTextActive]}>
                      {c}
                    </Text>
                    {editPostCategory === c && <MaterialIcons name="check" size={20} color="#6B7FED" />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </Modal>

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
    paddingBottom: 8,
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
    paddingBottom: 0,
    marginBottom: 0,
  },
  bookBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6B7FED",
    borderRadius: 12,
    paddingVertical: 13,
    marginTop: 16,
    gap: 8,
  },
  bookBtnText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
  },
  createAppointmentBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: 13,
    marginTop: 10,
    gap: 8,
    borderWidth: 1.5,
    borderColor: "#6B7FED",
    backgroundColor: "#F0F3FF",
  },
  createAppointmentBtnText: {
    color: "#6B7FED",
    fontSize: 15,
    fontWeight: "700",
  },
  profileTopRow: {
    flexDirection: "row",
    alignItems: "center",
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
  profileName: { fontSize: 17, fontWeight: "800", color: "#1A1D2E" },
  nameWithTick: { flexDirection: "row", alignItems: "center", gap: 4, flexShrink: 1, flex: 1 },
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
  badgeDivider: { width: 1, height: 11, backgroundColor: "#C5CBEF", marginHorizontal: 6 },
  doctorBadgeSpec: { fontSize: 11, color: "#6B7FED", fontWeight: "700", textTransform: "capitalize" },
  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  premiumBadgeText: { fontSize: 11, color: "#C8960C", fontWeight: "700" },
  statsRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  statItem: { flex: 1, alignItems: "flex-start" },
  statNum: { fontSize: 17, fontWeight: "800", color: "#1A1D2E" },
  statLabel: { fontSize: 11, color: "#888", marginTop: 1 },
  statDivider: { width: 1, height: 26, backgroundColor: "#E8EAF6" },

  // Points card
  pointsCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  pointsCardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#3D4A8A",
  },
  pointsRefreshBtn: {
    padding: 4,
  },
  pointsCard: {
    backgroundColor: "#F0F4FF",
    borderRadius: 14,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#E0E6FF",
  },
  pointsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  pointsItem: { alignItems: "center", flex: 1 },
  pointsNum: { fontSize: 16, fontWeight: "800", color: "#1A1D2E", marginTop: 4 },
  pointsLabel: { fontSize: 11, color: "#888", marginTop: 1 },
  pointsCash: { fontSize: 11, color: "#6B7FED", fontWeight: "600", marginTop: 2 },
  pointsVertDivider: { width: 1, height: 50, backgroundColor: "#D8DCEF" },
  pointsHint: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 10,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 8,
    gap: 5,
  },
  pointsHintText: { fontSize: 11, color: "#6B7FED", flex: 1, lineHeight: 16 },
  pointsTapHint: { fontSize: 10, color: "#6B7FED", marginTop: 2, opacity: 0.7 },

  // Convert modal
  convertOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  convertBox: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 24,
    width: "100%",
  },
  convertHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  convertTitle: { fontSize: 17, fontWeight: "800", color: "#1A1D2E" },
  convertAvailLbl: { fontSize: 11, color: "#9099B5", fontWeight: "600" },
  convertAvailVal: { fontSize: 22, fontWeight: "800", color: "#F6A623", marginBottom: 20 },
  convertRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  convertBoxLeft: {
    flex: 1,
    backgroundColor: "#F5F7FF",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E8EAF6",
  },
  convertBoxRight: {
    flex: 1,
    backgroundColor: "#F0FFF9",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#C6F6E6",
  },
  convertBoxLbl: { fontSize: 11, fontWeight: "700", color: "#9099B5", marginBottom: 6 },
  convertInput: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1A1D2E",
    textAlign: "center",
    width: "100%",
  },
  convertMaxBtn: {
    marginTop: 6,
    backgroundColor: "#6B7FED",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  convertMaxTxt: { color: "#FFF", fontSize: 11, fontWeight: "700" },
  convertArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F0F4FF",
    justifyContent: "center",
    alignItems: "center",
  },
  convertPkrVal: { fontSize: 24, fontWeight: "800", color: "#00B374" },
  convertRateLbl: { fontSize: 10, color: "#9099B5", marginTop: 6 },
  convertMinHint: { fontSize: 11, color: "#E53E3E", textAlign: "center", marginBottom: 12 },
  convertBtn: {
    backgroundColor: "#6B7FED",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  convertBtnTxt: { color: "#FFF", fontSize: 15, fontWeight: "700" },
  slotsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E0E6FF",
  },
  slotsLabel: { fontSize: 11, color: "#555", fontWeight: "600" },
  slotsPillWrap: { flexDirection: "row", gap: 4, flexWrap: "wrap", flex: 1 },
  slotPill: { width: 14, height: 14, borderRadius: 7 },
  slotPillFree: { backgroundColor: "#00B374" },
  slotPillUsed: { backgroundColor: "#E0E0E0" },
  slotsCount: { fontSize: 12, fontWeight: "700", color: "#1A1D2E" },
  slotsNone: { fontSize: 11, color: "#F6A623", fontStyle: "italic" },

  // Reviews section
  reviewsSection: {
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#F0F2F8",
    paddingTop: 14,
    paddingBottom: 6,
    marginTop: 10,
  },
  reviewsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  reviewsTitle: { fontSize: 14, fontWeight: "700", color: "#1A1D2E", flex: 1 },
  reviewsAvg:   { fontSize: 13, fontWeight: "600", color: "#F6A623" },
  reviewsEmpty: { fontSize: 13, color: "#AAA", fontStyle: "italic", paddingHorizontal: 16, marginBottom: 8 },
  reviewCard: {
    backgroundColor: "#F8F9FF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    marginHorizontal: 16,
  },
  reviewTopRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  reviewStars:  { flexDirection: "row", gap: 2 },
  reviewName:   { fontSize: 12, fontWeight: "700", color: "#444", flex: 1 },
  reviewDate:   { fontSize: 11, color: "#AAA" },
  reviewDesc:   { fontSize: 13, color: "#555", lineHeight: 19, marginTop: 4 },

  // Bio
  bioSection: { borderTopWidth: 1, borderTopColor: "#F0F2F8", paddingTop: 10, paddingBottom: 10 },
  bioHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  bioSectionLabel: { fontSize: 13, fontWeight: "700", color: "#555" },
  bioText: { fontSize: 14, color: "#444", lineHeight: 21, marginBottom: 0 },
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
    minHeight: 120,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    paddingHorizontal: 24,
    paddingVertical: 28,
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

  // Post status tabs
  postTabsRow: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#F0F2F8",
  },
  postTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },

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

  // Header role label
  navRoleText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },

  // Report dropdown
  reportDropdown: {
    position: "absolute",
    top: 72,
    right: 16,
    backgroundColor: "#FFF",
    borderRadius: 10,
    paddingVertical: 4,
    minWidth: 130,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  reportDropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  reportDropdownText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#E53E3E",
  },

  // Report modal
  reportOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  reportCard: {
    width: "100%",
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 24,
  },
  reportCardTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1A1D2E",
    marginBottom: 6,
  },
  reportCardSubtitle: {
    fontSize: 13,
    color: "#888",
    marginBottom: 16,
  },
  reportInput: {
    backgroundColor: "#F5F7FF",
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: "#1A1D2E",
    minHeight: 100,
    borderWidth: 1,
    borderColor: "#E8EAF6",
    marginBottom: 16,
  },
  reportSubmitBtn: {
    backgroundColor: "#E53E3E",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  reportSubmitText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
  },
  reportSuccessTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1A1D2E",
    textAlign: "center",
    marginBottom: 8,
  },
  reportSuccessMsg: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 21,
  },
});

// ── Edit Post full-screen modal styles ─────────────────────────────────────
const editStyles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#6B7FED",
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
  },
  closeBtn: { width: 40, alignItems: "flex-start" },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#FFF" },
  body: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 50 },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2C3E50",
    marginBottom: 8,
    marginTop: 4,
  },
  input: {
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 15,
    color: "#2C3E50",
    minHeight: 50,
    marginBottom: 16,
  },
  textArea: { minHeight: 120, paddingTop: 12, textAlignVertical: "top" },
  descContainer: { borderRadius: 10, overflow: "hidden" },

  // Color strip
  colorStripWrap: {
    marginBottom: 16,
    backgroundColor: "#F8F9FF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E8ECFF",
    overflow: "hidden",
  },
  colorStripHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  colorStripLabel: { flex: 1, fontSize: 12, fontWeight: "600", color: "#6B7FED" },
  clearColorBtn: {
    backgroundColor: "#FFE8E8",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  clearColorText: { fontSize: 11, fontWeight: "700", color: "#FF4444" },
  colorStrip: { gap: 10, paddingVertical: 4, paddingHorizontal: 4 },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2.5,
    borderColor: "transparent",
  },
  swatchNone: {
    backgroundColor: "#FFF",
    borderWidth: 1.5,
    borderColor: "#DDD",
    borderStyle: "dashed",
  },
  swatchSelected: {
    borderColor: "#2C3E50",
    transform: [{ scale: 1.15 }],
  },
  selectedColorLabel: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7FED",
    textAlign: "center",
  },

  // Category selector
  categorySelector: {
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    minHeight: 50,
  },
  categoryText: { fontSize: 15, color: "#2C3E50" },

  // Media
  mediaBtn: {
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    minHeight: 50,
  },
  mediaBtnText: { fontSize: 15, color: "#2C3E50" },
  mediaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  mediaThumb: {
    width: 90,
    height: 90,
    borderRadius: 10,
    position: "relative",
  },
  thumbImg: { width: "100%", height: "100%", borderRadius: 10 },
  removeThumb: {
    position: "absolute",
    top: -5,
    right: -5,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FF4444",
    justifyContent: "center",
    alignItems: "center",
  },

  // Save button
  saveBtn: {
    backgroundColor: "#6B7FED",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  saveBtnText: { fontSize: 16, fontWeight: "700", color: "#FFF" },

  // Category picker modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 25,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  modalTitle: { fontSize: 20, fontWeight: "700", color: "#2C3E50" },
  categoryList: { paddingHorizontal: 25, paddingTop: 10 },
  categoryOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: "#F8F8F8",
  },
  categoryOptionActive: { backgroundColor: "#E8F0FE" },
  categoryOptionText: { fontSize: 16, color: "#2C3E50" },
  categoryOptionTextActive: { color: "#6B7FED", fontWeight: "600" },
});

const profileMsgStyles = StyleSheet.create({
  msgBtn: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'center',
    gap:               8,
    backgroundColor:   '#6B7FED',
    paddingVertical:   12,
    paddingHorizontal: 28,
    borderRadius:      22,
    marginTop:         14,
    marginHorizontal:  20,
    shadowColor:       '#6B7FED',
    shadowOffset:      { width: 0, height: 3 },
    shadowOpacity:     0.3,
    shadowRadius:      6,
    elevation:         4,
  },
  msgBtnText: {
    color:      '#FFF',
    fontSize:   15,
    fontWeight: '700',
  },
});
