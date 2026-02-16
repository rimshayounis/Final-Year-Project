import React, { useState } from 'react';
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
  Platform,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface MediaFile {
  uri: string;
  type: 'image' | 'video';
}

const BACKGROUND_COLORS = [
  '#6B7FED', // Blue
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#FFE66D', // Yellow
  '#A8E6CF', // Mint
  '#FF8B94', // Pink
  '#C7CEEA', // Lavender
  '#FFDAB9', // Peach
  '#98D8C8', // Seafoam
  '#F7DC6F', // Gold
  '#BB8FCE', // Purple
  '#85C1E2', // Sky Blue
];

export default function CreatePostScreen() {
  const insets = useSafeAreaInsets();
  const [postTitle, setPostTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showColorModal, setShowColorModal] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [selectedColor, setSelectedColor] = useState('');

  const categories = [
    'Hair & Skin',
    'Mental Health',
    'Nutrition',
    'Fitness',
    'Heart Health',
    'General Health',
    'Other',
  ];

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setShowCategoryModal(false);
  };

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    setShowColorModal(false);
  };

  const handlePickMedia = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'Please grant permission to access your photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const newMedia: MediaFile = {
        uri: result.assets[0].uri,
        type: 'image',
      };
      setMediaFiles([...mediaFiles, newMedia]);
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'Please grant permission to access your camera');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const newMedia: MediaFile = {
        uri: result.assets[0].uri,
        type: 'image',
      };
      setMediaFiles([...mediaFiles, newMedia]);
    }
  };

  const handleMediaOptions = () => {
    Alert.alert(
      'Add Media',
      'Choose an option',
      [
        {
          text: 'Take Photo',
          onPress: handleTakePhoto,
        },
        {
          text: 'Choose from Gallery',
          onPress: handlePickMedia,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
    );
  };

  const handleRemoveMedia = (index: number) => {
    const updatedMedia = mediaFiles.filter((_, i) => i !== index);
    setMediaFiles(updatedMedia);
  };

  const handleSubmit = () => {
    if (!postTitle.trim()) {
      Alert.alert('Error', 'Please enter a post title');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }
    if (!selectedCategory) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    console.log('Post Data:', {
      title: postTitle,
      description,
      category: selectedCategory,
      media: mediaFiles,
      backgroundColor: selectedColor,
    });

    Alert.alert('Success', 'Post created successfully!');
    
    // Clear form
    setPostTitle('');
    setDescription('');
    setSelectedCategory('');
    setMediaFiles([]);
    setSelectedColor('');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#6B7FED" />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.headerTitle}>Create Post</Text>
      </View>

      <View style={styles.formCard}>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Post Title */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Post Title</Text>
            <TextInput
              style={styles.input}
              placeholder=""
              placeholderTextColor="#999"
              value={postTitle}
              onChangeText={setPostTitle}
            />
          </View>

          {/* Description with Background Color */}
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
            <View style={[
              styles.descriptionContainer,
              selectedColor && { backgroundColor: selectedColor }
            ]}>
              <TextInput
                style={[
                  styles.input, 
                  styles.textArea,
                  selectedColor && { backgroundColor: 'transparent' },
                  selectedColor && { color: '#FFFFFF' }
                ]}
                placeholder=""
                placeholderTextColor={selectedColor ? 'rgba(255,255,255,0.7)' : '#999'}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                value={description}
                onChangeText={setDescription}
              />
            </View>
          </View>

          {/* Category Selector */}
          <TouchableOpacity
            style={styles.categorySelector}
            onPress={() => setShowCategoryModal(true)}
          >
            <Text style={[
              styles.categoryText,
              !selectedCategory && styles.categoryPlaceholder
            ]}>
              {selectedCategory || 'Select Category (hair, skin etc)'}
            </Text>
            <MaterialIcons name="keyboard-arrow-down" size={24} color="#666" />
          </TouchableOpacity>

          {/* Add Media */}
          <TouchableOpacity style={styles.mediaButton} onPress={handleMediaOptions}>
            <Text style={styles.mediaButtonText}>Add Media</Text>
            <Ionicons name="camera-outline" size={24} color="#6B7FED" />
          </TouchableOpacity>

          {/* Display Selected Media */}
          {mediaFiles.length > 0 && (
            <View style={styles.mediaPreviewContainer}>
              {mediaFiles.map((media, index) => (
                <View key={index} style={styles.mediaPreview}>
                  <Image source={{ uri: media.uri }} style={styles.mediaImage} />
                  <TouchableOpacity
                    style={styles.removeMediaButton}
                    onPress={() => handleRemoveMedia(index)}
                  >
                    <MaterialIcons name="close" size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>Submit</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Category Selection Modal */}
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
              {categories.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryOption,
                    selectedCategory === category && styles.categoryOptionActive
                  ]}
                  onPress={() => handleCategorySelect(category)}
                >
                  <Text style={[
                    styles.categoryOptionText,
                    selectedCategory === category && styles.categoryOptionTextActive
                  ]}>
                    {category}
                  </Text>
                  {selectedCategory === category && (
                    <MaterialIcons name="check" size={20} color="#6B7FED" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Background Color Selection Modal */}
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
                {/* None Option */}
                <TouchableOpacity
                  style={[
                    styles.colorOption,
                    styles.noneOption,
                    !selectedColor && styles.colorOptionActive
                  ]}
                  onPress={() => handleColorSelect('')}
                >
                  <MaterialIcons name="block" size={24} color="#999" />
                  <Text style={styles.noneText}>None</Text>
                  {!selectedColor && (
                    <View style={styles.checkmark}>
                      <MaterialIcons name="check" size={16} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>

                {/* Color Options */}
                {BACKGROUND_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      selectedColor === color && styles.colorOptionActive
                    ]}
                    onPress={() => handleColorSelect(color)}
                  >
                    {selectedColor === color && (
                      <View style={styles.checkmark}>
                        <MaterialIcons name="check" size={20} color="#FFFFFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#6B7FED',
  },
  header: {
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#6B7FED',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  formCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 25,
    paddingTop: 30,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 10,
  },
  descriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  colorPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F4FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  colorPickerText: {
    fontSize: 13,
    color: '#6B7FED',
    fontWeight: '600',
    marginLeft: 5,
  },
  descriptionContainer: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 15,
    color: '#2C3E50',
    minHeight: 50,
  },
  textArea: {
    minHeight: 120,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  categorySelector: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    minHeight: 50,
  },
  categoryText: {
    fontSize: 15,
    color: '#2C3E50',
  },
  categoryPlaceholder: {
    color: '#999',
  },
  mediaButton: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    minHeight: 50,
  },
  mediaButtonText: {
    fontSize: 15,
    color: '#2C3E50',
  },
  mediaPreviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  mediaPreview: {
    width: 100,
    height: 100,
    borderRadius: 10,
    marginRight: 10,
    marginBottom: 10,
    position: 'relative',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  removeMediaButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: '#6B7FED',
    borderRadius: 15,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#6B7FED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C3E50',
  },
  categoryList: {
    paddingHorizontal: 25,
    paddingTop: 10,
  },
  categoryOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: '#F8F8F8',
  },
  categoryOptionActive: {
    backgroundColor: '#E8F0FE',
  },
  categoryOptionText: {
    fontSize: 16,
    color: '#2C3E50',
  },
  categoryOptionTextActive: {
    color: '#6B7FED',
    fontWeight: '600',
  },
  // Color Picker Styles
  colorList: {
    paddingHorizontal: 25,
    paddingTop: 20,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  colorOption: {
    width: '22%',
    aspectRatio: 1,
    borderRadius: 12,
    marginBottom: 15,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionActive: {
    borderColor: '#2C3E50',
    borderWidth: 3,
  },
  noneOption: {
    backgroundColor: '#F5F5F5',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  noneText: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
    fontWeight: '600',
  },
  checkmark: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});