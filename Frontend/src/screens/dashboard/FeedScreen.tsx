import React, { useState, useCallback, useEffect } from "react";
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
} from "react-native";
import { MaterialIcons, Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import apiClient, { API_URL } from "../../services/api";

const { width } = Dimensions.get("window");

interface Comment {
  _id: string;
  userId: string;
  userName?: string;
  text: string;
  createdAt: string;
}
interface PostAuthor {
  _id: string;
  fullName: string;
  email?: string;
  profileImage?: string;
}
interface DoctorInfo {
  _id: string;
  fullName: string;
  profileImage?: string;
  specialization?: string;
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
  userId?: PostAuthor | string;
  approvedBy?: string | { _id: string; fullName: string } | null;
  approvedAt?: string | null;
}
type FeedScreenProps = {
  id: string;
  role: "user" | "doctor";
  onNavigateToDoctorProfile?: (doctorId: string) => void;
};

/* ── Reject Modal ── */
function RejectModal({
  visible,
  onClose,
  onConfirm,
  loading,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: (r: string) => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState("");
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
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={rm.overlay} />
        </TouchableWithoutFeedback>
        <View style={rm.sheet}>
          <View style={rm.handle} />
          <View style={rm.header}>
            <Text style={rm.title}>{"Reject Post"}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#555" />
            </TouchableOpacity>
          </View>
          <Text style={rm.label}>{"Reason for rejection"}</Text>
          <TextInput
            style={rm.input}
            value={reason}
            onChangeText={setReason}
            placeholder="Explain why..."
            placeholderTextColor="#AAA"
            multiline
            autoFocus
          />
          <View style={rm.row}>
            <TouchableOpacity style={rm.cancelBtn} onPress={onClose}>
              <Text style={rm.cancelTxt}>{"Cancel"}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[rm.rejectBtn, !reason.trim() && { opacity: 0.4 }]}
              onPress={() => reason.trim() && onConfirm(reason.trim())}
              disabled={!reason.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={rm.rejectTxt}>{"Reject"}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
const rm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: { fontSize: 17, fontWeight: "800", color: "#1A1D2E" },
  label: { fontSize: 13, fontWeight: "600", color: "#555", marginBottom: 8 },
  input: {
    backgroundColor: "#F5F7FF",
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: "#1A1D2E",
    minHeight: 100,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "#E8EAF6",
    marginBottom: 16,
  },
  row: { flexDirection: "row", gap: 10 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E8EAF6",
    alignItems: "center",
  },
  cancelTxt: { fontSize: 15, fontWeight: "700", color: "#555" },
  rejectBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#E53E3E",
    alignItems: "center",
  },
  rejectTxt: { fontSize: 15, fontWeight: "700", color: "#FFF" },
});

/* ── Main Screen ── */
export default function FeedScreen({
  id,
  role,
  onNavigateToDoctorProfile,
}: FeedScreenProps) {
  const insets = useSafeAreaInsets();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedAuthorType, setSelectedAuthorType] = useState("All");
  const [commentModal, setCommentModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [commentText, setCommentText] = useState("");
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [userName, setUserName] = useState("");
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<Post | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [profileImages, setProfileImages] = useState<Record<string, string>>(
    {},
  );
  const [doctorIds, setDoctorIds] = useState<Set<string>>(new Set());
  const [authorNames, setAuthorNames] = useState<Record<string, string>>({});
  // Verified-by doctor info cache: doctorId → DoctorInfo
  const [doctorInfoCache, setDoctorInfoCache] = useState<
    Record<string, DoctorInfo>
  >({});
  // Which post has the verified-by dropdown open
  const [verifiedDropdown, setVerifiedDropdown] = useState<string | null>(null);
  const [slotsRemaining, setSlotsRemaining] = useState<number | null>(null);
  const [doctorPlan, setDoctorPlan] = useState<string>("free_trial");
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const categories = [
    "All",
    "General Health",
    "Hair & Skin",
    "Nutrition",
    "Mental Health",
    "Fitness",
    "Other",
  ];
  const STATUS_TABS = [
    { key: "All", label: "All Posts", color: "#6B7FED" },
    { key: "pending", label: "Pending", color: "#F6A623" },
    { key: "approved", label: "Approved", color: "#00B374" },
  ];

  /* ── Fetch doctor info for verified-by ── */
  const fetchDoctorInfo = async (
    doctorId: string,
  ): Promise<DoctorInfo | null> => {
    if (doctorInfoCache[doctorId]) return doctorInfoCache[doctorId];
    try {
      const r = await apiClient.get(`/doctors/${doctorId}`);
      const d = r.data?.doctor ?? r.data?.data ?? r.data;
      if (!d?.fullName) return null;
      // Fetch profile image
      let profileImage: string | undefined;
      try {
        const pr = await apiClient.get(`/profiles/doctor/${doctorId}`);
        const imgPath = pr.data?.data?.profileImage;
        if (imgPath) {
          const base = API_URL.replace("/api", "");
          profileImage = imgPath.startsWith("http") ? imgPath : base + imgPath;
        }
      } catch {
        /* no image */
      }
      const info: DoctorInfo = {
        _id: doctorId,
        fullName: d.fullName,
        profileImage,
        specialization: d.doctorProfile?.specialization,
      };
      setDoctorInfoCache((prev) => ({ ...prev, [doctorId]: info }));
      return info;
    } catch {
      return null;
    }
  };

  const fetchVerificationSlots = async () => {
    if (role !== "doctor") return;
    try {
      const drRes = await apiClient.get(`/doctors/${id}`);
      const plan = drRes.data?.doctor?.subscriptionPlan ?? "free_trial";
      setDoctorPlan(plan);
      if (plan === "free_trial") {
        setSlotsRemaining(0);
        return;
      }
      const slotsRes = await apiClient.get(
        `/points-reward/${id}/verification-slots?plan=${plan}`,
      );
      setSlotsRemaining(slotsRes.data?.data?.remainingSlots ?? 0);
    } catch {
      setSlotsRemaining(null);
    }
  };

  const fetchPosts = async () => {
    try {
      let list: Post[] = [];
      if (role === "doctor") {
        if (selectedStatus === "pending") {
          list = (await apiClient.get("/posts/pending")).data.data || [];
        } else if (selectedStatus === "approved") {
          const cat = selectedCategory === "All" ? "" : selectedCategory;
          const url = cat
            ? `/posts/category/${encodeURIComponent(cat)}`
            : "/posts/feed";
          list = (await apiClient.get(url)).data.data || [];
        } else {
          const [a, p] = await Promise.all([
            apiClient.get("/posts/feed"),
            apiClient.get("/posts/pending"),
          ]);
          const map = new Map<string, Post>();
          [...(a.data.data || []), ...(p.data.data || [])].forEach((x) =>
            map.set(x._id, x),
          );
          list = Array.from(map.values()).sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );
        }
      } else {
        const cat = selectedCategory === "All" ? "" : selectedCategory;
        const url = cat
          ? `/posts/category/${encodeURIComponent(cat)}`
          : "/posts/feed";
        list = (await apiClient.get(url)).data.data || [];
      }

      const uniqueIds = [
        ...new Set(
          list
            .map((p) =>
              typeof p.userId === "object" ? (p.userId as any)?._id : null,
            )
            .filter(Boolean) as string[],
        ),
      ];
      const dSet = new Set<string>();
      const nMap: Record<string, string> = {};
      const iMap: Record<string, string> = {};

      await Promise.all(
        uniqueIds.map(async (aid) => {
          let name: string | null = null;
          let isDoc = false;
          try {
            const r = await apiClient.get(`/doctors/${aid}`);
            const d = r.data?.doctor ?? r.data?.data ?? r.data;
            if (d?.fullName) {
              name = d.fullName;
              isDoc = true;
            }
          } catch {
            /* not a doctor */
          }
          if (!name) {
            try {
              const r = await apiClient.get(`/users/${aid}`);
              const d = r.data?.user ?? r.data?.data ?? r.data;
              if (d?.fullName) name = d.fullName;
            } catch {
              /* not a user */
            }
          }
          if (name) nMap[aid] = name;
          if (isDoc) dSet.add(aid);
          try {
            const ot = isDoc ? "doctor" : "user";
            const r = await apiClient.get(`/profiles/${ot}/${aid}`);
            const img = r.data?.data?.profileImage;
            if (img) {
              const base = API_URL.replace("/api", "");
              iMap[aid] = img.startsWith("http") ? img : base + img;
            }
          } catch {
            /* no image */
          }
        }),
      );

      setDoctorIds(dSet);
      setAuthorNames((prev) => ({ ...prev, ...nMap }));
      setProfileImages((prev) => ({ ...prev, ...iMap }));

      const filtered =
        selectedAuthorType === "All"
          ? list
          : selectedAuthorType === "professionals"
            ? list.filter((p) => {
                const a =
                  typeof p.userId === "object" ? (p.userId as any)?._id : null;
                return a && dSet.has(a);
              })
            : list.filter((p) => {
                const a =
                  typeof p.userId === "object" ? (p.userId as any)?._id : null;
                return a && !dSet.has(a);
              });

      setPosts(filtered);
    } catch {
      Alert.alert("Error", "Failed to load feed");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchUserName = async () => {
    try {
      const ep = role === "doctor" ? `/doctors/${id}` : `/users/${id}`;
      const res = await apiClient.get(ep);
      const raw = res.data;
      const d = raw?.doctor ?? raw?.user ?? raw?.data ?? raw;
      setUserName(d?.fullName ?? "");
    } catch {
      /* ignore */
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchPosts();
      fetchUserName();
      if (role === "doctor") fetchVerificationSlots();
    }, []),
  );
  useEffect(() => {
    setLoading(true);
    fetchPosts();
  }, [selectedCategory, selectedStatus, selectedAuthorType]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPosts();
  };

  const handleLike = async (postId: string) => {
    if (actionLoading === postId + "_like") return;
    const liked = likedPosts.has(postId);
    setActionLoading(postId + "_like");
    try {
      if (liked) {
        await apiClient.post(`/posts/${postId}/unlike`);
        setPosts((prev) =>
          prev.map((p) =>
            p._id === postId ? { ...p, likes: Math.max(0, p.likes - 1) } : p,
          ),
        );
        setLikedPosts((prev) => {
          const n = new Set(prev);
          n.delete(postId);
          return n;
        });
      } else {
        await apiClient.post(`/posts/${postId}/like`);
        setPosts((prev) =>
          prev.map((p) =>
            p._id === postId ? { ...p, likes: p.likes + 1 } : p,
          ),
        );
        setLikedPosts((prev) => new Set([...prev, postId]));
      }
    } catch {
      Alert.alert("Error", "Failed to update like");
    } finally {
      setActionLoading(null);
    }
  };

  const handleShare = async (post: Post) => {
    setActionLoading(post._id + "_share");
    try {
      await Share.share({
        title: post.title,
        message: `${post.title}\n\n${post.description}`,
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

  const handleOpenComments = async (post: Post) => {
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
      setSelectedPost({
        ...post,
        commentsList: raw.map((c: any) => ({
          _id: c._id?.toString() || Date.now().toString(),
          userId: c.userId?.toString() || "",
          userName: c.userName || "User",
          text: c.text || "",
          createdAt: c.createdAt || new Date().toISOString(),
        })),
      });
    } catch {
      /* ignore */
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
        userName: userName || "User",
      });
      const nc: Comment = {
        _id: res.data.data?._id?.toString() || Date.now().toString(),
        userId: id,
        userName: userName || "You",
        text: commentText,
        createdAt: new Date().toISOString(),
      };
      setSelectedPost((p) =>
        p
          ? {
              ...p,
              comments: p.comments + 1,
              commentsList: [...(p.commentsList || []), nc],
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

  const handleApprove = async (post: Post) => {
    Alert.alert("Approve Post", "Approve this post for the public feed?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Approve",
        onPress: async () => {
          setActionLoading(post._id + "_review");
          try {
            await apiClient.post(`/posts/${post._id}/review`, {
              action: "approved",
              doctorId: id,
            });
            Alert.alert("Approved!", "Post is now visible in the feed.");
            fetchPosts();
            fetchVerificationSlots();
          } catch (e: any) {
            Alert.alert(
              "Error",
              e?.response?.data?.message || "Failed to approve",
            );
          } finally {
            setActionLoading(null);
          }
        },
      },
    ]);
  };

  const handleReject = (post: Post) => {
    setRejectTarget(post);
    setRejectModal(true);
  };
  const handleConfirmReject = async (reason: string) => {
    if (!rejectTarget) return;
    setReviewLoading(true);
    try {
      await apiClient.post(`/posts/${rejectTarget._id}/review`, {
        action: "rejected",
        doctorId: id,
        rejectionReason: reason,
      });
      setRejectModal(false);
      setRejectTarget(null);
      Alert.alert("Rejected", "Post has been rejected.");
      fetchPosts();
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message || "Failed to reject");
    } finally {
      setReviewLoading(false);
    }
  };

  const toggleExpand = (pid: string) =>
    setExpandedPosts((prev) => {
      const n = new Set(prev);
      n.has(pid) ? n.delete(pid) : n.add(pid);
      return n;
    });

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

  /* ── Get approvedBy doctor ID ── */
  const getApprovedById = (post: Post): string | null => {
    if (!post.approvedBy) return null;
    if (typeof post.approvedBy === "string") return post.approvedBy;
    if (typeof post.approvedBy === "object")
      return (post.approvedBy as any)?._id ?? null;
    return null;
  };

  /* ── Verified By Button + Dropdown ── */
  const VerifiedBySection = ({ post }: { post: Post }) => {
    const doctorId = getApprovedById(post);
    if (!doctorId || post.status !== "approved") return null;

    const isOpen = verifiedDropdown === post._id;
    const info = doctorInfoCache[doctorId];
    const base = API_URL.replace("/api", "");

    const handlePress = async () => {
      if (isOpen) {
        setVerifiedDropdown(null);
        return;
      }
      setVerifiedDropdown(post._id);
      if (!info) await fetchDoctorInfo(doctorId);
    };

    return (
      <View style={s.verifiedWrap}>
        <TouchableOpacity style={s.verifiedBtn} onPress={handlePress}>
          <Ionicons name="shield-checkmark" size={13} color="#00B374" />
          <Text style={s.verifiedBtnText}>{"Verified by a Doctor"}</Text>
          <Ionicons
            name={isOpen ? "chevron-up" : "chevron-down"}
            size={13}
            color="#00B374"
          />
        </TouchableOpacity>

        {isOpen ? (
          <View style={s.verifiedDropdown}>
            {info ? (
              <TouchableOpacity
                style={s.verifiedDoctorRow}
                onPress={() => {
                  setVerifiedDropdown(null);
                  if (onNavigateToDoctorProfile)
                    onNavigateToDoctorProfile(doctorId);
                }}
              >
                <View style={s.verifiedAvatar}>
                  {info.profileImage ? (
                    <Image
                      source={{ uri: info.profileImage }}
                      style={s.verifiedAvatarImg}
                    />
                  ) : (
                    <Text style={s.verifiedAvatarText}>
                      {info.fullName.charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.verifiedDoctorName}>
                    {"Dr. " + info.fullName}
                  </Text>
                  {info.specialization ? (
                    <Text style={s.verifiedDoctorSpec}>
                      {info.specialization}
                    </Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={16} color="#888" />
              </TouchableOpacity>
            ) : (
              <View style={s.verifiedLoading}>
                <ActivityIndicator size="small" color="#6B7FED" />
                <Text style={s.verifiedLoadingText}>{"Loading..."}</Text>
              </View>
            )}
          </View>
        ) : null}
      </View>
    );
  };

  /* ── Post Card ── */
  const renderPost = ({ item }: { item: Post }) => {
    const isLiked = likedPosts.has(item._id);
    const isExpanded = expandedPosts.has(item._id);
    const hasColor = !!item.backgroundColor;
    const hasMedia = (item.mediaUrls?.length ?? 0) > 0;
    const descLimit = 150;
    const needsExpand =
      item.description.length > descLimit && !hasColor && !hasMedia;
    const author =
      typeof item.userId === "object" ? (item.userId as PostAuthor) : null;
    const authorId = author?._id ?? "";
    const resolvedName = authorNames[authorId] || author?.fullName || "";
    const isDoc = doctorIds.has(authorId);
    const authorName = resolvedName
      ? (isDoc ? "Dr. " : "") + resolvedName.charAt(0).toUpperCase() + resolvedName.slice(1).toLowerCase()
      : "...";
    const authorInitial = resolvedName
      ? resolvedName.charAt(0).toUpperCase()
      : "?";
    const authorImage = profileImages[authorId] ?? null;
    const baseUrl = API_URL.replace("/api", "");
    const isOwnPost = authorId === id;
    const isReviewing = actionLoading === item._id + "_review";

    return (
      <View style={s.postCard}>
        <View style={s.postHeader}>
          <View style={s.postAuthorRow}>
            <View style={s.postAvatar}>
              {authorImage ? (
                <Image source={{ uri: authorImage }} style={s.postAvatarImg} />
              ) : (
                <Text style={s.postAvatarText}>{authorInitial}</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <View style={s.authorNameRow}>
                <Text style={s.postAuthorName}>{authorName}</Text>
                {isDoc ? (
                  <View style={s.proBadge}>
                    <FontAwesome5 name="user-md" size={9} color="#6B7FED" />
                    <Text style={s.proBadgeText}>{"Pro"}</Text>
                  </View>
                ) : null}
              </View>
              <View style={s.postMetaRow}>
                <Text style={s.postTime}>{formatDate(item.createdAt)}</Text>
                {role === "doctor" && item.status === "pending" ? (
                  <View style={s.pendingBadge}>
                    <View style={s.pendingDot} />
                    <Text style={s.pendingBadgeText}>{"Pending"}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
          {role === "doctor" && !isOwnPost && item.status === "pending" ? (
            <View style={s.reviewBtns}>
              {doctorPlan === "free_trial" ? (
                <View style={s.slotsExhausted}>
                  <Ionicons name="card-outline" size={12} color="#E53E3E" />
                  <Text style={[s.slotsExhaustedText, { color: "#E53E3E" }]}>
                    Buy subscription to verify post
                  </Text>
                </View>
              ) : slotsRemaining === 0 ? (
                <View style={s.slotsExhausted}>
                  <Ionicons name="lock-closed" size={12} color="#F6A623" />
                  <Text style={s.slotsExhaustedText}>
                    Verification limit reached for this month
                  </Text>
                </View>
              ) : (
                <>
                  <TouchableOpacity
                    style={s.approveBtn}
                    onPress={() => handleApprove(item)}
                    disabled={isReviewing}
                  >
                    {isReviewing ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={13} color="#FFF" />
                        <Text style={s.approveBtnText}>{"Approve"}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.rejectBtn}
                    onPress={() => handleReject(item)}
                    disabled={isReviewing}
                  >
                    <Ionicons name="close-circle" size={13} color="#E53E3E" />
                    <Text style={s.rejectBtnText}>{"Reject"}</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          ) : null}
        </View>

        <View style={s.catChip}>
          <Text style={s.catChipText}>{item.category}</Text>
        </View>
        <Text style={s.postTitle}>{item.title}</Text>

        {hasMedia ? (
          <Text style={s.plainDesc}>{item.description}</Text>
        ) : hasColor ? (
          <View
            style={[
              s.coloredPost,
              { backgroundColor: item.backgroundColor as string },
            ]}
          >
            <Text style={s.coloredPostText}>{item.description}</Text>
          </View>
        ) : (
          <View style={s.descBox}>
            <Text style={s.descText}>
              {isExpanded || !needsExpand
                ? item.description
                : item.description.slice(0, descLimit) + "..."}
            </Text>
            {needsExpand ? (
              <TouchableOpacity onPress={() => toggleExpand(item._id)}>
                <Text style={s.seeMore}>
                  {isExpanded ? "See less" : "See more"}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {hasMedia ? (
          <View style={s.mediaContainer}>
            {item.mediaUrls
              .filter((url) => !failedImages.has(url))
              .map((url, i) => {
                const uri = url.startsWith("http") ? url : baseUrl + url;
                return (
                  <Image
                    key={String(i)}
                    source={{ uri }}
                    style={s.mediaImage}
                    resizeMode="cover"
                    onError={() =>
                      setFailedImages((prev) => new Set([...prev, url]))
                    }
                  />
                );
              })}
          </View>
        ) : null}

        {/* Verified by doctor */}
        <VerifiedBySection post={item} />

        <View style={s.statsRow}>
          <View style={s.statsLeft}>
            {item.likes > 0 ? (
              <View style={s.likeRow}>
                <View style={s.likeIcon}>
                  <MaterialIcons name="favorite" size={10} color="#FFF" />
                </View>
                <Text style={s.statText}>{String(item.likes)}</Text>
              </View>
            ) : null}
          </View>
          <View style={s.statsRight}>
            {item.comments > 0 ? (
              <Text style={s.statText}>{item.comments + " comments"}</Text>
            ) : null}
            {item.comments > 0 && item.shares > 0 ? (
              <Text style={s.statText}>{" · "}</Text>
            ) : null}
            {item.shares > 0 ? (
              <Text style={s.statText}>{item.shares + " shares"}</Text>
            ) : null}
          </View>
        </View>

        <View style={s.divider} />
        <View style={s.actionsRow}>
          <TouchableOpacity
            style={s.actionBtn}
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
            <Text style={[s.actionLabel, isLiked ? { color: "#E53E3E" } : {}]}>
              {"Like"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.actionBtn}
            onPress={() => handleOpenComments(item)}
          >
            <Ionicons name="chatbubble-outline" size={19} color="#666" />
            <Text style={s.actionLabel}>{"Comment"}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.actionBtn}
            onPress={() => handleShare(item)}
            disabled={actionLoading === item._id + "_share"}
          >
            {actionLoading === item._id + "_share" ? (
              <ActivityIndicator size="small" color="#6B7FED" />
            ) : (
              <Ionicons name="share-social-outline" size={20} color="#666" />
            )}
            <Text style={s.actionLabel}>{"Share"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  /* ── List Header ── */
  const ListHeader = () => (
    <View style={s.filterWrap}>
      <View style={s.segment}>
        {[
          { k: "All", l: "All" },
          { k: "users", l: "Users" },
          { k: "professionals", l: "Professionals" },
        ].map(({ k, l }) => (
          <TouchableOpacity
            key={k}
            style={[s.segItem, selectedAuthorType === k && s.segItemActive]}
            onPress={() => {
              setSelectedAuthorType(k);
              if (k === "professionals") setSelectedStatus("All");
            }}
          >
            <Text
              style={[s.segText, selectedAuthorType === k && s.segTextActive]}
            >
              {l}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {role === "doctor" && selectedAuthorType !== "professionals" ? (
        <View style={s.statusRow}>
          {STATUS_TABS.map(({ key, label, color }) => (
            <TouchableOpacity
              key={key}
              style={[
                s.statusPillBtn,
                selectedStatus === key && {
                  backgroundColor: color,
                  borderColor: color,
                },
              ]}
              onPress={() => setSelectedStatus(key)}
            >
              <Text
                style={[
                  s.statusPillTxt,
                  selectedStatus === key && { color: "#FFF" },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
      {role !== "doctor" || selectedStatus !== "pending" ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.catScroll}
        >
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                s.catFilter,
                selectedCategory === cat && s.catFilterActive,
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text
                style={[
                  s.catFilterText,
                  selectedCategory === cat && s.catFilterTextActive,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#6B7FED" />
      <View style={[s.topNav, { paddingTop: insets.top + 10 }]}>
        <Text style={s.topNavTitle}>{"Health Feed"}</Text>
        {role === "doctor" ? (
          <View style={s.docBadge}>
            <FontAwesome5 name="user-md" size={11} color="#FFF" />
            <Text style={s.docBadgeText}>{"Doctor"}</Text>
          </View>
        ) : (
          <Ionicons name="newspaper-outline" size={22} color="#FFF" />
        )}
      </View>

      {loading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color="#6B7FED" />
          <Text style={s.loadingText}>{"Loading feed..."}</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item._id}
          renderItem={renderPost}
          ListHeaderComponent={<ListHeader />}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <Ionicons name="newspaper-outline" size={56} color="#D0D5E8" />
              <Text style={s.emptyTitle}>{"No posts yet"}</Text>
              <Text style={s.emptySubtitle}>
                {selectedCategory === "All"
                  ? "No posts available yet."
                  : `No posts in "${selectedCategory}" yet.`}
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
      )}

      {/* Comment Modal */}
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
          <TouchableWithoutFeedback
            onPress={() => {
              setCommentModal(false);
              setCommentText("");
            }}
          >
            <View style={s.cmBackdrop} />
          </TouchableWithoutFeedback>
          <View style={s.cmSheet}>
            <View style={s.cmHandle} />
            <View style={s.cmHeader}>
              <Text
                style={s.cmTitle}
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
            <View style={s.cmDivider} />
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={s.cmList}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {commentsLoading ? (
                <View style={s.cmLoading}>
                  <ActivityIndicator color="#6B7FED" />
                  <Text style={s.cmLoadingText}>{"Loading..."}</Text>
                </View>
              ) : selectedPost?.commentsList &&
                selectedPost.commentsList.length > 0 ? (
                selectedPost.commentsList.map((c) => (
                  <View key={c._id} style={s.cmItem}>
                    <View style={s.cmAvatar}>
                      <Text style={s.cmAvatarText}>
                        {(c.userName || "U").charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={s.cmBubble}>
                      <View style={s.cmBubbleHeader}>
                        <Text style={s.cmUser}>{c.userName || "User"}</Text>
                        <Text style={s.cmTime}>{formatDate(c.createdAt)}</Text>
                      </View>
                      <Text style={s.cmText}>{c.text}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={s.cmEmpty}>
                  <Ionicons
                    name="chatbubbles-outline"
                    size={44}
                    color="#E0E3EF"
                  />
                  <Text style={s.cmEmptyTitle}>{"No comments yet"}</Text>
                  <Text style={s.cmEmptyText}>{"Be the first!"}</Text>
                </View>
              )}
            </ScrollView>
            <View style={s.cmInputWrap}>
              <View style={s.cmAvatar}>
                <Text style={s.cmAvatarText}>
                  {userName?.charAt(0)?.toUpperCase() || "U"}
                </Text>
              </View>
              <View style={s.cmInputBox}>
                <TextInput
                  style={s.cmInput}
                  placeholder="Add a comment..."
                  placeholderTextColor="#AAA"
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity
                  style={[s.cmSend, !commentText.trim() && { opacity: 0.35 }]}
                  onPress={handleSubmitComment}
                  disabled={
                    !commentText.trim() ||
                    actionLoading === selectedPost?._id + "_comment"
                  }
                >
                  {actionLoading === selectedPost?._id + "_comment" ? (
                    <ActivityIndicator size="small" color="#6B7FED" />
                  ) : (
                    <Ionicons name="send" size={17} color="#6B7FED" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <RejectModal
        visible={rejectModal}
        onClose={() => {
          setRejectModal(false);
          setRejectTarget(null);
        }}
        onConfirm={handleConfirmReject}
        loading={reviewLoading}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F2F8" },
  topNav: {
    backgroundColor: "#6B7FED",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  topNavTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: -0.3,
  },
  docBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  docBadgeText: { fontSize: 11, fontWeight: "700", color: "#FFF" },
  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: { fontSize: 14, color: "#6B7FED" },
  emptyWrap: { paddingTop: 80, alignItems: "center", paddingHorizontal: 40 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2C3E50",
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#999",
    marginTop: 6,
    textAlign: "center",
    lineHeight: 20,
  },
  filterWrap: {
    backgroundColor: "#FFF",
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#EAEDF5",
  },
  segment: {
    flexDirection: "row",
    margin: 14,
    marginBottom: 10,
    backgroundColor: "#F0F2F8",
    borderRadius: 12,
    padding: 3,
  },
  segItem: {
    flex: 1,
    paddingVertical: 9,
    alignItems: "center",
    borderRadius: 10,
  },
  segItemActive: {
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  segText: { fontSize: 13, fontWeight: "600", color: "#888" },
  segTextActive: { color: "#6B7FED", fontWeight: "700" },
  statusRow: {
    flexDirection: "row",
    paddingHorizontal: 14,
    gap: 8,
    marginBottom: 8,
  },
  statusPillBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#F0F2F8",
    borderWidth: 1,
    borderColor: "#F0F2F8",
  },
  statusPillTxt: { fontSize: 12, fontWeight: "700", color: "#666" },
  catScroll: { paddingHorizontal: 14, paddingVertical: 4, gap: 8 },
  catFilter: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#F0F2F8",
    borderWidth: 1.5,
    borderColor: "#F0F2F8",
  },
  catFilterActive: { backgroundColor: "#6B7FED", borderColor: "#6B7FED" },
  catFilterText: { fontSize: 12, fontWeight: "600", color: "#888" },
  catFilterTextActive: { color: "#FFF" },
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#6B7FED",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    overflow: "hidden",
  },
  postAvatarImg: { width: 44, height: 44, borderRadius: 22 },
  postAvatarText: { fontSize: 17, fontWeight: "700", color: "#FFF" },
  authorNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  postAuthorName: { fontSize: 14, fontWeight: "800", color: "#1A1D2E" },
  proBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#EEF0FB",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  proBadgeText: { fontSize: 9, fontWeight: "700", color: "#6B7FED" },
  postMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  postTime: { fontSize: 11, color: "#999" },
  pendingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FFF8EC",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  pendingDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#F6A623",
  },
  pendingBadgeText: { fontSize: 10, fontWeight: "700", color: "#F6A623" },
  reviewBtns: { flexDirection: "row", gap: 6, alignItems: "center" },
  approveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#00B374",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  approveBtnText: { fontSize: 11, fontWeight: "700", color: "#FFF" },
  rejectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF5F5",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FFCDD2",
  },
  rejectBtnText: { fontSize: 11, fontWeight: "700", color: "#E53E3E" },
  catChip: {
    alignSelf: "flex-start",
    backgroundColor: "#EEF0FB",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  catChipText: { fontSize: 11, color: "#6B7FED", fontWeight: "600" },
  postTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1D2E",
    marginBottom: 8,
    lineHeight: 22,
  },
  plainDesc: { fontSize: 14, color: "#555", lineHeight: 21, marginBottom: 10 },
  descBox: {
    borderRadius: 10,
    padding: 10,
    backgroundColor: "#F7F8FC",
    marginBottom: 10,
  },
  descText: { fontSize: 14, color: "#555", lineHeight: 21 },
  seeMore: { color: "#6B7FED", fontWeight: "600", fontSize: 13, marginTop: 4 },
  coloredPost: {
    width: width - 32,
    minHeight: 120,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  coloredPostText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFF",
    textAlign: "center",
    lineHeight: 26,
    textShadowColor: "rgba(0,0,0,0.15)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  mediaContainer: { marginBottom: 10, borderRadius: 12, overflow: "hidden" },
  mediaImage: { width: "100%", height: 220, borderRadius: 12, marginBottom: 6 },

  // Verified by section
  verifiedWrap: { marginBottom: 10 },
  verifiedBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    backgroundColor: "#F0FFF8",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#B2EED6",
  },
  verifiedBtnText: { fontSize: 11, fontWeight: "700", color: "#00B374" },
  verifiedDropdown: {
    marginTop: 8,
    backgroundColor: "#F8FFFC",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#C8F0DF",
    overflow: "hidden",
  },
  verifiedDoctorRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 12,
  },
  verifiedAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#6B7FED",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  verifiedAvatarImg: { width: 44, height: 44, borderRadius: 22 },
  verifiedAvatarText: { color: "#FFF", fontWeight: "700", fontSize: 16 },
  verifiedDoctorName: { fontSize: 14, fontWeight: "700", color: "#1A1D2E" },
  verifiedDoctorSpec: { fontSize: 12, color: "#00B374", marginTop: 2 },
  verifiedLoading: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 10,
  },
  verifiedLoadingText: { fontSize: 13, color: "#888" },

  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    minHeight: 18,
  },
  statsLeft: { flexDirection: "row", alignItems: "center" },
  statsRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  likeRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  likeIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#E53E3E",
    justifyContent: "center",
    alignItems: "center",
  },
  statText: { fontSize: 12, color: "#999" },
  divider: { height: 1, backgroundColor: "#F0F2F8", marginBottom: 8 },
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
  cmBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  cmSheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "65%",
    paddingBottom: 16,
  },
  cmHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#DDD",
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  cmHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  cmTitle: { fontSize: 16, fontWeight: "800", color: "#1A1D2E" },
  cmDivider: { height: 1, backgroundColor: "#F0F2F8" },
  cmList: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20 },
  cmLoading: { alignItems: "center", paddingTop: 40, gap: 10 },
  cmLoadingText: { fontSize: 13, color: "#888" },
  cmItem: { flexDirection: "row", marginBottom: 14, alignItems: "flex-start" },
  cmAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#6B7FED",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  cmAvatarText: { color: "#FFF", fontWeight: "700", fontSize: 13 },
  cmBubble: {
    flex: 1,
    backgroundColor: "#F5F7FF",
    borderRadius: 12,
    padding: 10,
  },
  cmBubbleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  cmUser: { fontSize: 12, fontWeight: "700", color: "#1A1D2E" },
  cmTime: { fontSize: 10, color: "#AAA" },
  cmText: { fontSize: 13, color: "#444", lineHeight: 19 },
  cmEmpty: { alignItems: "center", paddingVertical: 40 },
  cmEmptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#555",
    marginTop: 12,
  },
  cmEmptyText: { fontSize: 13, color: "#BBB", marginTop: 4 },
  cmInputWrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F2F8",
    gap: 10,
  },
  cmInputBox: {
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
  cmInput: {
    flex: 1,
    fontSize: 14,
    color: "#1A1D2E",
    maxHeight: 80,
    paddingVertical: 4,
  },
  cmSend: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  slotsExhausted: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFF8EC",
    borderWidth: 1,
    borderColor: "#F6A623",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  slotsExhaustedText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#F6A623",
  },
});
