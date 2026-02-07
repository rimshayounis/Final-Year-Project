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
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { MaterialIcons } from '@expo/vector-icons';
import { userAPI } from '../services/api';

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

  const handleStressLevelSelect = (level: string) => {
    setFormData({ ...formData, stressLevel: level });
  };

  const handleDietPreferenceSelect = (diet: string) => {
    setFormData({ ...formData, dietPreference: diet });
  };

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
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.stepIndicator}>2/3</Text>
        <Text style={styles.headerTitle}>Health Profile</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <View style={styles.sliderHeader}>
            <Text style={styles.label}>Sleep Duration</Text>
            <Text style={styles.sliderValue}>{formData.sleepDuration}h</Text>
          </View>
          <View style={styles.sleepContainer}>
            {[4, 5, 6, 7, 8, 9, 10, 11, 12].map((hours) => (
              <TouchableOpacity
                key={hours}
                style={[
                  styles.hourButton,
                  formData.sleepDuration === hours && styles.hourButtonActive,
                ]}
                onPress={() => setFormData({ ...formData, sleepDuration: hours })}
              >
                <Text
                  style={[
                    styles.hourText,
                    formData.sleepDuration === hours && styles.hourTextActive,
                  ]}
                >
                  {hours}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.recommendation}>
            Recommended: 7-8 hours per night
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Stress Level</Text>
          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={[
                styles.optionButton,
                formData.stressLevel === 'High' && styles.optionButtonActive,
              ]}
              onPress={() => handleStressLevelSelect('High')}
            >
              <Text
                style={[
                  styles.optionText,
                  formData.stressLevel === 'High' && styles.optionTextActive,
                ]}
              >
                High
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.optionButton,
                formData.stressLevel === 'Moderate' && styles.optionButtonActive,
              ]}
              onPress={() => handleStressLevelSelect('Moderate')}
            >
              <Text
                style={[
                  styles.optionText,
                  formData.stressLevel === 'Moderate' && styles.optionTextActive,
                ]}
              >
                Moderate
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.optionButton,
                formData.stressLevel === 'Low' && styles.optionButtonActive,
              ]}
              onPress={() => handleStressLevelSelect('Low')}
            >
              <Text
                style={[
                  styles.optionText,
                  formData.stressLevel === 'Low' && styles.optionTextActive,
                ]}
              >
                Low
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Diet Preference</Text>
          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={[
                styles.optionButton,
                formData.dietPreference === 'Balanced' && styles.optionButtonActive,
              ]}
              onPress={() => handleDietPreferenceSelect('Balanced')}
            >
              <Text
                style={[
                  styles.optionText,
                  formData.dietPreference === 'Balanced' && styles.optionTextActive,
                ]}
              >
                Balanced
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.optionButton,
                formData.dietPreference === 'Vegetarian' &&
                  styles.optionButtonActive,
              ]}
              onPress={() => handleDietPreferenceSelect('Vegetarian')}
            >
              <Text
                style={[
                  styles.optionText,
                  formData.dietPreference === 'Vegetarian' &&
                    styles.optionTextActive,
                ]}
              >
                Vegetarian
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.optionButton,
                formData.dietPreference === 'Keto' && styles.optionButtonActive,
              ]}
              onPress={() => handleDietPreferenceSelect('Keto')}
            >
              <Text
                style={[
                  styles.optionText,
                  formData.dietPreference === 'Keto' && styles.optionTextActive,
                ]}
              >
                Keto
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Additional Note (Optional)</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Any health conditions, allergies, or preferences we should know about?"
            value={formData.additionalNotes}
            onChangeText={(value) =>
              setFormData({ ...formData, additionalNotes: value })
            }
            multiline={true}
            numberOfLines={4}
            textAlignVertical="top"
            placeholderTextColor="#999"
          />
        </View>

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

        <Text style={styles.requiredNote}>Please complete all required fields</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#7B8CDE',
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndicator: {
    position: 'absolute',
    top: 20,
    right: 30,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '700',
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
    marginBottom: 12,
  },
  sliderValue: {
    fontSize: 18,
    color: '#7B8CDE',
    fontWeight: '700',
  },
  sleepContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  hourButton: {
    width: '18%',
    paddingVertical: 10,
    backgroundColor: '#E8E8E8',
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hourButtonActive: {
    backgroundColor: '#7B8CDE',
  },
  hourText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  hourTextActive: {
    color: '#FFFFFF',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  continueButton: {
    backgroundColor: '#7B8CDE',
    paddingVertical: 16,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 30,
    shadowColor: '#7B8CDE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
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
