import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../../App';
import { MaterialIcons } from '@expo/vector-icons';
import { userAPI } from '../../services/api';

type HealthProfileScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'HealthProfile'>;
  route: RouteProp<RootStackParamList, 'HealthProfile'>;
};

export default function HealthProfileScreen({
  navigation,
  route,
}: HealthProfileScreenProps) {
  const { userId } = route.params;

  const [formData, setFormData] = useState({
    sleepDuration: 7,
    stressLevel: 'Moderate',
    dietPreference: 'Balanced',
    additionalNotes: '',
  });

  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    setLoading(true);
    try {
      const response = await userAPI.createHealthProfile(userId, {
        sleepDuration: formData.sleepDuration,
        stressLevel: formData.stressLevel,
        dietPreference: formData.dietPreference,
        additionalNotes: formData.additionalNotes,
      });

      if (response.data.success) {
        navigation.navigate('EmergencyContact', { userId });
      }
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to save health profile.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* FIXED HEADER */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

        </View>

        <Text style={styles.headerTitle}>Health Profile</Text>
        
        <Text style={styles.stepIndicator}>Step 2/3</Text>
      </View>

      {/* SCROLLABLE FORM */}
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          {/* Sleep Duration Slider */}
          <View style={styles.inputGroup}>
            <View style={styles.sliderHeader}>
              <Text style={styles.label}>Sleep Duration</Text>
              <Text style={styles.sliderValue}>
                {formData.sleepDuration}h
              </Text>
            </View>

            <Slider
              style={styles.slider}
              minimumValue={4}
              maximumValue={12}
              step={1}
              value={formData.sleepDuration}
              onValueChange={(value) =>
                setFormData({ ...formData, sleepDuration: value })
              }
              minimumTrackTintColor="#7B8CDE"
              maximumTrackTintColor="#E0E0E0"
              thumbTintColor="#7B8CDE"
            />

            <Text style={styles.recommendation}>
              Recommended: 7-9 hours per night
            </Text>
          </View>

          {/* Stress Level */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Stress Level</Text>
            <View style={styles.optionsContainer}>
              {['High', 'Moderate', 'Low'].map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.optionButton,
                    formData.stressLevel === level &&
                      styles.optionButtonActive,
                  ]}
                  onPress={() =>
                    setFormData({ ...formData, stressLevel: level })
                  }
                >
                  <Text
                    style={[
                      styles.optionText,
                      formData.stressLevel === level &&
                        styles.optionTextActive,
                    ]}
                  >
                    {level}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Diet Preference */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Diet Preference</Text>
            <View style={styles.optionsContainer}>
              {['Balanced', 'Vegetarian', 'Keto'].map((diet) => (
                <TouchableOpacity
                  key={diet}
                  style={[
                    styles.optionButton,
                    formData.dietPreference === diet &&
                      styles.optionButtonActive,
                  ]}
                  onPress={() =>
                    setFormData({ ...formData, dietPreference: diet })
                  }
                >
                  <Text
                    style={[
                      styles.optionText,
                      formData.dietPreference === diet &&
                        styles.optionTextActive,
                    ]}
                  >
                    {diet}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Additional Notes */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Additional Note (Optional)</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Any health conditions, allergies, or preferences we should know about?"
              value={formData.additionalNotes}
              onChangeText={(value) =>
                setFormData({ ...formData, additionalNotes: value })
              }
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              placeholderTextColor="#999"
            />
          </View>

          {/* Continue Button */}
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.continueButtonText}>Continue</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.requiredNote}>
            Please complete all required fields
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },

  header: {
    backgroundColor: '#6B7FED',
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },

  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },

  stepIndicator: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500',
    textAlign: 'center',
    opacity: 0.85,
  },

  scrollContent: {
    flex: 1,
  },

  form: {
    padding: 30,
  },

  inputGroup: {
    marginBottom: 25,
  },

  label: {
    fontSize: 14,
    color: '#2C3E50',
    fontWeight: '600',
    marginBottom: 12,
  },

  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },

  sliderValue: {
    fontSize: 18,
    color: '#7B8CDE',
    fontWeight: '700',
  },

  slider: {
    width: '100%',
    height: 50,
  },

  recommendation: {
    fontSize: 12,
    color: '#7B8CDE',
    marginTop: 8,
    fontStyle: 'italic',
  },

  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  optionButton: {
    flex: 1,
    backgroundColor: '#E8E8E8',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 5,
  },

  optionButtonActive: {
    backgroundColor: '#7B8CDE',
  },

  optionText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },

  optionTextActive: {
    color: '#FFFFFF',
  },

  textArea: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    fontSize: 15,
    color: '#2C3E50',
    minHeight: 100,
    elevation: 2,
  },

  continueButton: {
    backgroundColor: '#7B8CDE',
    paddingVertical: 16,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 30,
    elevation: 5,
  },

  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },

  requiredNote: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 15,
  },
});
