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
import { RootStackParamList } from '../../../App';
import { MaterialIcons } from '@expo/vector-icons';
import { userAPI, API_URL } from '../../services/api';

type CreateAccountScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CreateAccount'>;
  route: RouteProp<RootStackParamList, 'CreateAccount'>;
};

export default function CreateAccountScreen({
  navigation,
  route,
}: CreateAccountScreenProps) {
  const { userType } = route.params;
  
  const [formData, setFormData] = useState({
    fullName: '',
    age: '',
    email: '',
    password: '',
    gender: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleGenderSelect = (gender: string) => {
    setFormData({ ...formData, gender });
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return false;
    }
    if (!formData.age.trim() || isNaN(Number(formData.age))) {
      Alert.alert('Error', 'Please enter a valid age');
      return false;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email');
      return false;
    }
    if (!formData.password.trim() || formData.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return false;
    }
    if (!formData.gender) {
      Alert.alert('Error', 'Please select your gender');
      return false;
    }
    return true;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    setLoading(true);
    
    const requestData = {
      fullName: formData.fullName,
      age: parseInt(formData.age),
      email: formData.email,
      password: formData.password,
      gender: formData.gender,
      userType: userType,
    };

    try {
      console.log('🔗 API URL:', API_URL);
      console.log('📤 Sending registration request...');
      console.log('📋 Request data:', requestData);

      const response = await userAPI.register(requestData);

      console.log('✅ Registration successful!');
      console.log('📥 Response:', response.data);

      if (response.data.success) {
        // Navigate to next step without showing success message
        navigation.navigate('HealthProfile', { 
          userId: response.data.user._id 
        });
      }
    } catch (error: any) {
      console.log('❌ ===== ERROR DETAILS =====');
      console.log('Error object:', error);
      
      if (error.response) {
        // Server responded with error
        console.log('📛 Server Error Response:');
        console.log('Status:', error.response.status);
        console.log('Data:', error.response.data);
        console.log('Headers:', error.response.headers);
        
        Alert.alert(
          'Registration Failed',
          error.response.data?.message || `Server Error: ${error.response.status}`
        );
      } else if (error.request) {
        // Request made but no response
        console.log('🌐 Network Error - No Response:');
        console.log('Request:', error.request);
        console.log('Message:', error.message);
        
        Alert.alert(
          'Network Error',
          `Cannot connect to server at ${API_URL}\n\nError: ${error.message}\n\nPlease check:\n1. Backend is running\n2. IP address is correct\n3. Same WiFi network`
        );
      } else {
        // Something else happened
        console.log('⚠️ Unknown Error:');
        console.log('Message:', error.message);
        
        Alert.alert(
          'Error',
          error.message || 'Registration failed. Please try again.'
        );
      }
      
      console.log('❌ ===== END ERROR DETAILS =====');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBackToLogin}
          >
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
        </View>
        
        <Text style={styles.headerTitle}>Create Account</Text>
        <Text style={styles.stepIndicator}>Step 1/3</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full Name</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter Your Full Name"
              value={formData.fullName}
              onChangeText={(value) => handleInputChange('fullName', value)}
              placeholderTextColor="#999"
            />
            <MaterialIcons name="person" size={20} color="#999" style={styles.inputIcon} />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Age</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter Your Age"
              value={formData.age}
              onChangeText={(value) => handleInputChange('age', value)}
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
            <MaterialIcons name="calendar-today" size={20} color="#999" style={styles.inputIcon} />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter Your Email"
              value={formData.email}
              onChangeText={(value) => handleInputChange('email', value)}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#999"
            />
            <MaterialIcons name="email" size={20} color="#999" style={styles.inputIcon} />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter Your Password"
              value={formData.password}
              onChangeText={(value) => handleInputChange('password', value)}
              secureTextEntry={!showPassword}
              placeholderTextColor="#999"
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.inputIcon}
            >
              <MaterialIcons
                name={showPassword ? 'visibility' : 'visibility-off'}
                size={20}
                color="#999"
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Gender</Text>
          <View style={styles.genderContainer}>
            <TouchableOpacity
              style={[
                styles.genderButton,
                formData.gender === 'Male' && styles.genderButtonActive,
              ]}
              onPress={() => handleGenderSelect('Male')}
            >
              <Text
                style={[
                  styles.genderText,
                  formData.gender === 'Male' && styles.genderTextActive,
                ]}
              >
                Male
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.genderButton,
                formData.gender === 'Female' && styles.genderButtonActive,
              ]}
              onPress={() => handleGenderSelect('Female')}
            >
              <Text
                style={[
                  styles.genderText,
                  formData.gender === 'Female' && styles.genderTextActive,
                ]}
              >
                Female
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.genderButton,
                formData.gender === 'Other' && styles.genderButtonActive,
              ]}
              onPress={() => handleGenderSelect('Other')}
            >
              <Text
                style={[
                  styles.genderText,
                  formData.gender === 'Other' && styles.genderTextActive,
                ]}
              >
                Other
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={styles.signUpButton}
          onPress={handleSignUp}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.signUpButtonText}>Continue</Text>
          )}
        </TouchableOpacity>
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
  form: {
    padding: 30,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#2C3E50',
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 15,
    color: '#2C3E50',
  },
  inputIcon: {
    marginLeft: 10,
  },
  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  genderButton: {
    flex: 1,
    backgroundColor: '#E8E8E8',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  genderButtonActive: {
    backgroundColor: '#7B8CDE',
  },
  genderText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  genderTextActive: {
    color: '#FFFFFF',
  },
  signUpButton: {
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
  signUpButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
