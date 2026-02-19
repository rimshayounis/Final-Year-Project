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
  id: string; // user or doctor id
  role: "doctor" | "user";
};

const BACKGROUND_COLORS = [
  "#6B7FED",
  "#FF6B6B",
  "#4ECDC4",
  "#FFE66D",
  "#A8E6CF",
  "#FF8B94",
  "#C7CEEA",
  "#FFDAB9",
  "#98D8C8",
  "#F7DC6F",
  "#BB8FCE",
  "#85C1E2",
];

export default function CreatePostScreen({ id, role }: CreatePostScreenProps) {
  const insets = useSafeAreaInsets();

  const [postTitle, setPostTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showColorModal, setShowColorModal] = useState(false);
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
    "Other",
  ];

  // ---------------- CATEGORY & COLOR ----------------
  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setShowCategoryModal(false);
  };
  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    setShowColorModal(false);
  };

  // ---------------- MEDIA PICKER ----------------
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
      const newMedia: MediaFile = { uri: result.assets[0].uri, type: "image" };
      setMediaFiles((prev) => [...prev, newMedia]);
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

  // ---------------- SUBMIT POST ----------------
  const handleSubmit = async () => {
    if (!postTitle.trim() || !description.trim() || !selectedCategory) {
      Alert.alert("Error", "Please fill all required fields");
      return;
    }

    try {
      setLoading(true);

      // Determine status based on role
      const status = role === "doctor" ? "approved" : "pending";

      const formData = new FormData();
      formData.append("userId", id); // from props
      formData.append("title", postTitle);
      formData.append("description", description);
      formData.append("category", selectedCategory);
      formData.append("status", status);
      if (selectedColor) formData.append("backgroundColor", selectedColor);

      mediaFiles.forEach((file) => {
        const uriParts = file.uri.split("/");
        const fileName = uriParts[uriParts.length - 1];
        formData.append("media", {
          uri: file.uri,
          name: fileName,
          type: "image/jpeg",
        } as any);
      });

      const response = await postAPI.createPost(formData);
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

  // ---------------- RENDER ----------------
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#6B7FED" }}
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
            <View style={styles.descriptionHeader}>
              <Text style={styles.label}>Description</Text>
              <TouchableOpacity
                style={styles.colorPickerButton}
                onPress={() => setShowColorModal(true)}
              >
                <MaterialIcons name="palette" size={20} color="#6B7FED" />
                <Text style={styles.colorPickerText}>Background</Text>
              </TouchableOpacity>
            </View>
            <View
              style={[
                styles.descriptionContainer,
                selectedColor && { backgroundColor: selectedColor },
              ]}
            >
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  selectedColor && {
                    backgroundColor: "transparent",
                    color: "#FFF",
                  },
                ]}
                placeholder="Enter description"
                placeholderTextColor={
                  selectedColor ? "rgba(255,255,255,0.7)" : "#999"
                }
                multiline
                value={description}
                onChangeText={setDescription}
              />
            </View>
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
            <Text style={styles.mediaButtonText}>Add Media</Text>
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
              <Text style={styles.submitButtonText}>Submit</Text>
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

      {/* COLOR MODAL */}
      <Modal
        visible={showColorModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowColorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Background</Text>
              <TouchableOpacity onPress={() => setShowColorModal(false)}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.colorList}>
              <View style={styles.colorGrid}>
                {BACKGROUND_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      selectedColor === color && styles.colorOptionActive,
                    ]}
                    onPress={() => handleColorSelect(color)}
                  >
                    {selectedColor === color && (
                      <View style={styles.checkmark}>
                        <MaterialIcons name="check" size={20} color="#FFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ---------------- STYLES ----------------
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
  },
  colorPickerText: {
    fontSize: 13,
    color: "#6B7FED",
    fontWeight: "600",
    marginLeft: 5,
  },
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
  },
  mediaPreview: {
    width: 100,
    height: 100,
    borderRadius: 10,
    marginRight: 10,
    marginBottom: 10,
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
  colorList: { paddingHorizontal: 25, paddingTop: 20 },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  colorOption: {
    width: "22%",
    aspectRatio: 1,
    borderRadius: 12,
    marginBottom: 15,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    borderWidth: 2,
    borderColor: "transparent",
  },
  colorOptionActive: { borderColor: "#2C3E50", borderWidth: 3 },
  checkmark: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
});
