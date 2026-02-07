
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
  const [certificates, setCertificates] = useState<string[]>([]);
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
        // Extract file names from the assets array
        const fileNames = result.assets.map(asset => asset.name);
        setCertificates([...certificates, ...fileNames]);
        
        // If you need to store URIs for server upload, you can do:
        // const fileUris = result.assets.map(asset => asset.uri);
      }
    } catch (error) {
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
    return true;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await userAPI.registerDoctor({
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
        licenseNumber: formData.licenseNumber,
        specialization: formData.specialization,
        certificates: certificates,
      });

      if (response.data.success) {
        Alert.alert(
          'Success',
          'Account created! Your profile is pending verification.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Login', { userType: 'doctor' }),
            },
          ]
        );
      }
    } catch (error: any) {
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
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackToLogin}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Create Account</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <TextInput
            style={styles.input}
            placeholder="Enter Your Full Name"
            value={formData.fullName}
            onChangeText={(value) => handleInputChange('fullName', value)}
            placeholderTextColor="#999"
          />
          <MaterialIcons name="person" size={20} color="#999" style={styles.inputIcon} />
        </View>

        <View style={styles.inputGroup}>
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

        <View style={styles.inputGroup}>
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

        <View style={styles.inputGroup}>
          <TextInput
            style={styles.input}
            placeholder="License Number"
            value={formData.licenseNumber}
            onChangeText={(value) => handleInputChange('licenseNumber', value)}
            placeholderTextColor="#999"
          />
          <MaterialIcons name="badge" size={20} color="#999" style={styles.inputIcon} />
        </View>

        <View style={styles.inputGroup}>
          <TextInput
            style={styles.input}
            placeholder="Specialization"
            value={formData.specialization}
            onChangeText={(value) => handleInputChange('specialization', value)}
            placeholderTextColor="#999"
          />
          <MaterialIcons name="medical-services" size={20} color="#999" style={styles.inputIcon} />
        </View>

        <TouchableOpacity
          style={styles.uploadButton}
          onPress={handleUploadCertificates}
        >
          <MaterialIcons name="camera-alt" size={24} color="#6B7FED" />
          <Text style={styles.uploadButtonText}>Upload Certificates</Text>
        </TouchableOpacity>

        {certificates.length > 0 && (
          <View style={styles.certificatesContainer}>
            <Text style={styles.certificatesLabel}>Uploaded: {certificates.length} file(s)</Text>
            {certificates.map((cert, index) => (
              <Text key={index} style={styles.certificateItem}>• {cert}</Text>
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
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
  },
  form: {
    padding: 30,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 16,
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
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#6B7FED',
    borderStyle: 'dashed',
  },
  uploadButtonText: {
    fontSize: 16,
    color: '#6B7FED',
    fontWeight: '600',
    marginLeft: 10,
  },
  certificatesContainer: {
    backgroundColor: '#E8F4F8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  certificatesLabel: {
    fontSize: 14,
    color: '#2C3E50',
    fontWeight: '600',
    marginBottom: 8,
  },
  certificateItem: {
    fontSize: 13,
    color: '#555',
    marginTop: 4,
  },
  signUpButton: {
    backgroundColor: '#6B7FED',
    paddingVertical: 16,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#6B7FED',
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
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  loginText: {
    fontSize: 13,
    color: '#666',
  },
  loginLink: {
    fontSize: 13,
    color: '#6B7FED',
    fontWeight: '600',
  },
});