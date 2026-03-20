import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  Image,
  StatusBar,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { postAPI } from "../../services/api";

interface MediaFile {
  uri: string;
  type: "image" | "video";
}

type CreatePostScreenProps = {
  id: string;
  role: "doctor" | "user";
};

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

export default function CreatePostScreen({ id, role }: CreatePostScreenProps) {
  const insets = useSafeAreaInsets();

  const [postTitle, setPostTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [selectedColor, setSelectedColor] = useState("");
  const [loading, setLoading] = useState(false);

  const categories = [
    "Hair & Skin",
    "Mental Health",
    "Nutrition",
    "Fitness",
    "Heart Health",
    "General Health",
  ];

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setShowCategoryModal(false);
  };


  const handlePickMedia = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted")
      return Alert.alert("Permission Needed", "Allow gallery access");

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newMedia: MediaFile[] = result.assets.map((asset) => ({
        uri: asset.uri,
        type: "image",
      }));
      setMediaFiles((prev) => [...prev, ...newMedia]);
      setSelectedColor("");
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted")
      return Alert.alert("Permission Needed", "Allow camera access");

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      setMediaFiles((prev) => [
        ...prev,
        { uri: result.assets[0].uri, type: "image" },
      ]);
      setSelectedColor("");
    }
  };

  const handleMediaOptions = () => {
    Alert.alert("Add Media", "Choose an option", [
      { text: "Take Photo", onPress: handleTakePhoto },
      { text: "Choose from Gallery", onPress: handlePickMedia },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleRemoveMedia = (index: number) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!postTitle.trim() || !description.trim() || !selectedCategory) {
      Alert.alert("Error", "Please fill all required fields");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("userId", id);
      formData.append("title", postTitle);
      formData.append("description", description);
      formData.append("category", selectedCategory);
      formData.append("status", role === "doctor" ? "approved" : "pending");
      formData.append("userModel", role === "doctor" ? "Doctor" : "User"); // ← tells backend which collection
      if (selectedColor) formData.append("backgroundColor", selectedColor);

      mediaFiles.forEach((file) => {
        const fileName = file.uri.split("/").pop() ?? "image.jpg";
        formData.append("media", {
          uri: file.uri,
          name: fileName,
          type: "image/jpeg",
        } as any);
      });

      await postAPI.createPost(formData);
      Alert.alert("Success", "Post created successfully!");

      setPostTitle("");
      setDescription("");
      setSelectedCategory("");
      setSelectedColor("");
      setMediaFiles([]);
    } catch (error: any) {
      console.error(
        "Error creating post:",
        error.response?.data || error.message,
      );
      Alert.alert("Error", "Failed to create post");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#FFF" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor="#6B7FED" />
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.headerTitle}>Create Post</Text>
      </View>

      <View style={styles.formCard}>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Title */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Post Title</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter title"
              value={postTitle}
              onChangeText={setPostTitle}
            />
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>

            {/* Live preview textarea */}
            <View style={[
              styles.descriptionContainer,
              selectedColor ? { backgroundColor: selectedColor } : {},
            ]}>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  selectedColor ? { backgroundColor: "transparent", color: "#FFF" } : {},
                ]}
                placeholder="Enter description"
                placeholderTextColor={selectedColor ? "rgba(255,255,255,0.7)" : "#999"}
                multiline
                value={description}
                onChangeText={setDescription}
              />
            </View>

            {/* Inline color strip — hidden when media is attached */}
            {mediaFiles.length === 0 && <View style={styles.colorStripWrap}>
              <View style={styles.colorStripHeader}>
                <MaterialIcons name="palette" size={15} color="#6B7FED" />
                <Text style={styles.colorStripLabel}>Background color</Text>
                {selectedColor ? (
                  <TouchableOpacity onPress={() => setSelectedColor("")} style={styles.clearColorBtn}>
                    <Text style={styles.clearColorText}>Clear</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false} contentContainerStyle={styles.colorStrip}>
                {/* None swatch */}
                <TouchableOpacity
                  onPress={() => setSelectedColor("")}
                  style={[styles.swatch, styles.swatchNone, !selectedColor && styles.swatchSelected]}
                >
                  <MaterialIcons name="block" size={18} color={!selectedColor ? "#6B7FED" : "#CCC"} />
                </TouchableOpacity>

                {/* Color swatches */}
                {BACKGROUND_COLORS.map((item) => (
                  <TouchableOpacity
                    key={item.color}
                    onPress={() => setSelectedColor(selectedColor === item.color ? "" : item.color)}
                    style={[
                      styles.swatch,
                      { backgroundColor: item.color },
                      selectedColor === item.color && styles.swatchSelected,
                    ]}
                  >
                    {selectedColor === item.color && (
                      <MaterialIcons name="check" size={18} color="#FFF" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {selectedColor ? (
                <Text style={styles.selectedColorLabel}>
                  {BACKGROUND_COLORS.find(c => c.color === selectedColor)?.label} selected
                </Text>
              ) : null}
            </View>}
          </View>

          {/* Category */}
          <TouchableOpacity
            style={styles.categorySelector}
            onPress={() => setShowCategoryModal(true)}
          >
            <Text
              style={[
                styles.categoryText,
                !selectedCategory && styles.categoryPlaceholder,
              ]}
            >
              {selectedCategory || "Select Category"}
            </Text>
            <MaterialIcons name="keyboard-arrow-down" size={24} color="#666" />
          </TouchableOpacity>

          {/* Media */}
          <TouchableOpacity
            style={styles.mediaButton}
            onPress={handleMediaOptions}
          >
            <Text style={styles.mediaButtonText}>
              {mediaFiles.length > 0
                ? `${mediaFiles.length} file${mediaFiles.length > 1 ? "s" : ""} selected`
                : "Add Media"}
            </Text>
            <Ionicons name="camera-outline" size={24} color="#6B7FED" />
          </TouchableOpacity>

          {mediaFiles.length > 0 && (
            <View style={styles.mediaPreviewContainer}>
              {mediaFiles.map((file, i) => (
                <View key={i} style={styles.mediaPreview}>
                  <Image source={{ uri: file.uri }} style={styles.mediaImage} />
                  <TouchableOpacity
                    style={styles.removeMediaButton}
                    onPress={() => handleRemoveMedia(i)}
                  >
                    <MaterialIcons name="close" size={18} color="#FFF" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Submit */}
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitButtonText}>
                {role === "doctor" ? "Publish Post" : "Submit for Review"}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* CATEGORY MODAL */}
      <Modal
        visible={showCategoryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.categoryList}>
              {categories.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.categoryOption,
                    selectedCategory === c && styles.categoryOptionActive,
                  ]}
                  onPress={() => handleCategorySelect(c)}
                >
                  <Text
                    style={[
                      styles.categoryOptionText,
                      selectedCategory === c && styles.categoryOptionTextActive,
                    ]}
                  >
                    {c}
                  </Text>
                  {selectedCategory === c && (
                    <MaterialIcons name="check" size={20} color="#6B7FED" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#6B7FED" },
  header: {
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: "#6B7FED",
  },
  headerTitle: { fontSize: 24, fontWeight: "700", color: "#FFF" },
  formCard: {
    flex: 1,
    backgroundColor: "#FFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 25,
    paddingTop: 30,
  },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: "600", color: "#000", marginBottom: 10 },
  descriptionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  colorPickerButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F4FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 5,
  },
  colorDot: { width: 16, height: 16, borderRadius: 8 },
  colorPickerText: { fontSize: 13, color: "#6B7FED", fontWeight: "600" },
  descriptionContainer: { borderRadius: 10, overflow: "hidden" },
  input: {
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 15,
    color: "#2C3E50",
    minHeight: 50,
  },
  textArea: { minHeight: 120, paddingTop: 12, textAlignVertical: "top" },
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
  categoryPlaceholder: { color: "#999" },
  mediaButton: {
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
  mediaButtonText: { fontSize: 15, color: "#2C3E50" },
  mediaPreviewContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
    gap: 10,
  },
  mediaPreview: {
    width: 100,
    height: 100,
    borderRadius: 10,
    position: "relative",
  },
  mediaImage: { width: "100%", height: "100%", borderRadius: 10 },
  removeMediaButton: {
    position: "absolute",
    top: -5,
    right: -5,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FF4444",
    justifyContent: "center",
    alignItems: "center",
  },
  submitButton: {
    backgroundColor: "#6B7FED",
    borderRadius: 15,
    paddingVertical: 16,
    alignItems: "center",
  },
  submitButtonText: { fontSize: 17, fontWeight: "700", color: "#FFF" },
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
  // Inline color strip
  colorStripWrap: {
    marginTop: 10,
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
});
