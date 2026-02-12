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
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../../App';
import { MaterialIcons } from '@expo/vector-icons';
import { doctorAPI } from '../../services/api';
import * as DocumentPicker from 'expo-document-picker';

type CreateDoctorAccountScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CreateDoctorAccount'>;
  route: RouteProp<RootStackParamList, 'CreateDoctorAccount'>;
};

export default function CreateDoctorAccountScreen({
  navigation,
  route,
}: CreateDoctorAccountScreenProps) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    licenseNumber: '',
    specialization: '',
  });
  
  const [certificates, setCertificates] = useState<{uri: string, name: string, mimeType: string}[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleUploadCertificates = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (!result.canceled) {
        Alert.alert('Success', `${result.assets.length} certificate(s) uploaded!`);
        
        const files = result.assets.map(asset => ({
          uri: asset.uri,
          name: asset.name,
          mimeType: asset.mimeType || 'application/pdf',
        }));
        
        setCertificates([...certificates, ...files]);
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Failed to upload certificates');
    }
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      Alert.alert('Error', 'Please enter your full name');
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
    if (!formData.licenseNumber.trim()) {
      Alert.alert('Error', 'Please enter your license number');
      return false;
    }
    if (!formData.specialization.trim()) {
      Alert.alert('Error', 'Please enter your specialization');
      return false;
    }
    if (certificates.length === 0) {
      Alert.alert('Error', 'Please upload at least one certificate');
      return false;
    }
    return true;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const formDataToSend = new FormData();
      
      formDataToSend.append('fullName', formData.fullName);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('password', formData.password);
      formDataToSend.append('licenseNumber', formData.licenseNumber);
      formDataToSend.append('specialization', formData.specialization);
      
      certificates.forEach((cert, index) => {
        const fileExtension = cert.name.split('.').pop()?.toLowerCase();
        let mimeType = cert.mimeType;
        
        if (!mimeType) {
          if (fileExtension === 'pdf') {
            mimeType = 'application/pdf';
          } else if (['jpg', 'jpeg'].includes(fileExtension || '')) {
            mimeType = 'image/jpeg';
          } else if (fileExtension === 'png') {
            mimeType = 'image/png';
          }
        }

        formDataToSend.append('certificates', {
          uri: Platform.OS === 'ios' ? cert.uri.replace('file://', '') : cert.uri,
          type: mimeType,
          name: cert.name,
        } as any);
      });

      console.log('Sending registration request...');
      const response = await doctorAPI.register(formDataToSend);

      console.log('Registration response:', response.data);

      if (response.data.success) {
        Alert.alert(
          'Success',
          'Account created! Your profile is pending verification.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('DoctorDashboard', { 
                doctorId: response.data.doctor._id 
              }),
            },
          ]
        );
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      console.error('Error response:', error.response?.data);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Registration failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.innerContainer}>
            {/* Header - Fixed at top */}
            <View style={styles.header}>
              <TouchableOpacity style={styles.backButton} onPress={handleBackToLogin}>
                <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              
              <Text style={styles.headerTitle}>Create Doctor Account</Text>
            </View>

            {/* Scrollable Form */}
            <ScrollView 
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              bounces={false}
            >
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
                      returnKeyType="next"
                    />
                    <MaterialIcons name="person" size={20} color="#999" style={styles.inputIcon} />
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
                      returnKeyType="next"
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
                      returnKeyType="next"
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
                  <Text style={styles.label}>License Number</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter License Number"
                      value={formData.licenseNumber}
                      onChangeText={(value) => handleInputChange('licenseNumber', value)}
                      placeholderTextColor="#999"
                      returnKeyType="next"
                    />
                    <MaterialIcons name="badge" size={20} color="#999" style={styles.inputIcon} />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Specialization</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., Cardiologist"
                      value={formData.specialization}
                      onChangeText={(value) => handleInputChange('specialization', value)}
                      placeholderTextColor="#999"
                      returnKeyType="done"
                    />
                    <MaterialIcons name="medical-services" size={20} color="#999" style={styles.inputIcon} />
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={handleUploadCertificates}
                >
                  <MaterialIcons name="upload-file" size={24} color="#6B7FED" />
                  <Text style={styles.uploadButtonText}>
                    {certificates.length > 0 ? 'Add More Certificates' : 'Upload Certificates'}
                  </Text>
                </TouchableOpacity>

                {certificates.length > 0 && (
                  <View style={styles.certificatesContainer}>
                    <Text style={styles.certificatesLabel}>Uploaded: {certificates.length} file(s)</Text>
                    {certificates.map((cert, index) => (
                      <View key={index} style={styles.certificateItem}>
                        <MaterialIcons name="description" size={16} color="#6B7FED" />
                        <Text style={styles.certificateText} numberOfLines={1}> {cert.name}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <TouchableOpacity
                  style={styles.signUpButton}
                  onPress={handleSignUp}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.signUpButtonText}>Sign Up</Text>
                  )}
                </TouchableOpacity>

                <View style={styles.loginContainer}>
                  <Text style={styles.loginText}>Already have account? </Text>
                  <TouchableOpacity onPress={handleBackToLogin} disabled={loading}>
                    <Text style={styles.loginLink}>Login</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Extra bottom padding for keyboard */}
              <View style={{ height: 100 }} />
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  keyboardView: {
    flex: 1,
  },
  innerContainer: {
    flex: 1,
  },
  header: {
    backgroundColor: '#6B7FED',
    paddingTop: 20,
    paddingBottom: 25,
    paddingHorizontal: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 15,
    color: '#2C3E50',
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  input: {
    flex: 1,
    height: 52,
    fontSize: 15,
    color: '#2C3E50',
  },
  inputIcon: {
    marginLeft: 10,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#6B7FED',
    borderStyle: 'dashed',
  },
  uploadButtonText: {
    fontSize: 15,
    color: '#6B7FED',
    fontWeight: '600',
    marginLeft: 10,
  },
  certificatesContainer: {
    backgroundColor: '#E8F4F8',
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
  },
  certificatesLabel: {
    fontSize: 14,
    color: '#2C3E50',
    fontWeight: '600',
    marginBottom: 8,
  },
  certificateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  certificateText: {
    fontSize: 13,
    color: '#555',
    marginLeft: 6,
    flex: 1,
  },
  signUpButton: {
    backgroundColor: '#6B7FED',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#6B7FED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  signUpButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    paddingBottom: 10,
  },
  loginText: {
    fontSize: 14,
    color: '#666',
  },
  loginLink: {
    fontSize: 14,
    color: '#6B7FED',
    fontWeight: '600',
  },
});