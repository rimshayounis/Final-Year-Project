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

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CreateDoctorAccount'>;
  route: RouteProp<RootStackParamList, 'CreateDoctorAccount'>;
};

interface CertificateFile {
  uri: string;
  name: string;
  mimeType: string;
}

type ProfessionalType = 'doctor' | 'therapist' | null;

export default function CreateDoctorAccountScreen({ navigation }: Props) {
  const [professionalType, setProfessionalType] = useState<ProfessionalType>('doctor');

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    specialization: '',
    licenseNumber: '',
  });

  const [certificates, setCertificates] = useState<CertificateFile[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const isTherapist = professionalType === 'therapist';

  /* ------------------ PROFESSIONAL TYPE SELECTOR ------------------ */
  const handleSelectProfessionalType = (type: 'doctor' | 'therapist') => {
    setProfessionalType(type);
    // Clear fields when switching so nothing carries over
    setFormData(prev => ({ ...prev, specialization: '', licenseNumber: '' }));
  };

  /* ------------------ INPUT HANDLER ------------------ */
  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  /* ------------------ FILE UPLOAD ------------------ */
  const handleUploadCertificates = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const files: CertificateFile[] = result.assets.map(asset => ({
        uri: asset.uri,
        name: asset.name,
        mimeType:
          asset.mimeType ||
          (asset.name.endsWith('.pdf')
            ? 'application/pdf'
            : asset.name.endsWith('.png')
            ? 'image/png'
            : 'image/jpeg'),
      }));

      setCertificates(prev => [...prev, ...files]);
      Alert.alert('Success', `${files.length} certificate(s) uploaded.`);
    } catch (error) {
      console.error('Certificate upload error:', error);
      Alert.alert('Error', 'Failed to upload certificates.');
    }
  };

  /* ------------------ VALIDATION ------------------ */
  const validate = () => {
    if (!professionalType)
      return Alert.alert('Error', 'Please select Doctor or Therapist'), false;

    if (!formData.fullName.trim())
      return Alert.alert('Error', 'Full name is required'), false;

    if (!formData.email.includes('@'))
      return Alert.alert('Error', 'Valid email is required'), false;

    if (formData.password.length < 8)
      return Alert.alert('Error', 'Password must be at least 8 characters'), false;

    if (!formData.specialization.trim())
      return Alert.alert('Error', 'Specialization is required'), false;

    if (!isTherapist && !formData.licenseNumber.trim())
      return Alert.alert('Error', 'PMDC License No. is required for doctors'), false;

    if (certificates.length === 0)
      return Alert.alert('Error', 'Upload at least one certificate'), false;

    return true;
  };

  /* ------------------ SIGNUP ------------------ */
  const handleSignUp = async () => {
    if (!validate()) return;

    setLoading(true);

    try {
      const body = new FormData();

      body.append('fullName', formData.fullName.trim());
      body.append('email', formData.email.trim().toLowerCase());
      body.append('password', formData.password);
      body.append('specialization', formData.specialization.trim());
      body.append('licenseNumber', formData.licenseNumber.trim());
      body.append('professionalType', professionalType!);

      certificates.forEach(cert => {
        body.append('certificates', {
          uri: Platform.OS === 'ios'
            ? cert.uri.replace('file://', '')
            : cert.uri,
          name: cert.name,
          type: cert.mimeType,
        } as any);
      });

      const response = await doctorAPI.register(body);

      if (response.data.success) {
        const doctorId = response.data.doctor._id;
        const doctorName = formData.fullName;

        Alert.alert(
          'Registration Successful',
          'Account created! Please choose a subscription plan to continue.',
          [
            {
              text: 'OK',
              onPress: () =>
                navigation.replace('DoctorSubscription', {
                  doctorId,
                  doctorName,
                }),
            },
          ]
        );
      }
    } catch (error: any) {
      console.error('Doctor registration error:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Registration failed.'
      );
    } finally {
      setLoading(false);
    }
  };

  /* ------------------ UI ------------------ */
  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      {/* Sticky header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Doctor Account</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.form}>

              {/* ── Professional Type Selector ── */}
              <Text style={styles.sectionLabel}>I am a</Text>
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[styles.typeCard, professionalType === 'doctor' && styles.typeCardActive]}
                  onPress={() => handleSelectProfessionalType('doctor')}
                >
                  <MaterialIcons
                    name="local-hospital"
                    size={20}
                    color={professionalType === 'doctor' ? '#fff' : '#6B7FED'}
                  />
                  <Text style={[styles.typeCardText, professionalType === 'doctor' && styles.typeCardTextActive]}>
                    Doctor
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.typeCard, professionalType === 'therapist' && styles.typeCardActive]}
                  onPress={() => handleSelectProfessionalType('therapist')}
                >
                  <MaterialIcons
                    name="psychology"
                    size={20}
                    color={professionalType === 'therapist' ? '#fff' : '#6B7FED'}
                  />
                  <Text style={[styles.typeCardText, professionalType === 'therapist' && styles.typeCardTextActive]}>
                    Therapist
                  </Text>
                </TouchableOpacity>
              </View>

              {/* ── Form Fields ── */}
              {renderInput('Full Name', 'fullName', formData.fullName)}
              {renderInput('Email', 'email', formData.email, 'email-address')}
              {renderPasswordInput()}
              {renderInput('Specialization', 'specialization', formData.specialization)}
              {renderInput(
                isTherapist ? 'PPA / HEC Certification No.' : 'PMDC License No.',
                'licenseNumber',
                formData.licenseNumber,
              )}

              <TouchableOpacity style={styles.uploadBtn} onPress={handleUploadCertificates}>
                <MaterialIcons name="upload-file" size={22} color="#6B7FED" />
                <Text style={styles.uploadText}>
                  {certificates.length
                    ? `Add More Certificates (${certificates.length})`
                    : 'Upload Certificates'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.signUpBtn}
                onPress={handleSignUp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.signUpText}>Sign Up</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  /* ------------------ REUSABLE INPUT ------------------ */
  function renderInput(
    label: string,
    field: keyof typeof formData,
    value: string,
    keyboardType: any = 'default',
  ) {
    const placeholders: Record<keyof typeof formData, string> = {
      fullName:       'name',
      email:          'naveed@example.com',
      password:       'Min. 8 characters',
      specialization: isTherapist ? 'e.g. Clinical Psychologist' : 'e.g. Cardiologist',
      licenseNumber:  isTherapist ? 'Optional — enter if available' : 'e.g. 123456-01-M',
    };

    return (
      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          {label}
          {field === 'licenseNumber' && isTherapist && (
            <Text style={styles.optionalTag}> (optional)</Text>
          )}
        </Text>
        <TextInput
          style={styles.input}
          value={value}
          placeholder={placeholders[field]}
          placeholderTextColor="#AAAAAA"
          keyboardType={keyboardType}
          autoCapitalize="none"
          onChangeText={text => handleChange(field, text)}
        />
      </View>
    );
  }

  function renderPasswordInput() {
    return (
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Password</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={{ flex: 1 }}
            value={formData.password}
            placeholder="Min. 8 characters"
            placeholderTextColor="#AAAAAA"
            secureTextEntry={!showPassword}
            onChangeText={text => handleChange('password', text)}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <MaterialIcons
              name={showPassword ? 'visibility' : 'visibility-off'}
              size={20}
              color="#777"
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  }
}

/* ------------------ STYLES ------------------ */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#6B7FED' },

  header: {
    backgroundColor: '#6B7FED',
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },

  keyboardView: { flex: 1, backgroundColor: '#F5F5F5' },
  scrollView: { backgroundColor: '#F5F5F5' },
  scrollContent: { paddingBottom: 80 },

  form: { padding: 24 },

  /* Professional type selector */
  sectionLabel: {
    fontWeight: '700',
    fontSize: 15,
    color: '#333',
    marginBottom: 12,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  typeCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#6B7FED',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  typeCardActive: {
    backgroundColor: '#6B7FED',
    borderColor: '#6B7FED',
  },
  typeCardText: {
    fontWeight: '600',
    fontSize: 13,
    color: '#6B7FED',
  },
  typeCardTextActive: {
    color: '#fff',
  },
  typeCardSub: {
    fontSize: 10,
    color: '#999',
  },
  typeCardSubActive: {
    color: 'rgba(255,255,255,0.75)',
  },

  inputGroup: { marginBottom: 16 },
  label: { fontWeight: '600', marginBottom: 6 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
  },
  inputDisabled: {
    backgroundColor: '#E8E8E8',
    color: '#999',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
  },
  uploadBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#6B7FED',
    padding: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  uploadText: {
    marginLeft: 8,
    color: '#6B7FED',
    fontWeight: '600',
  },
  signUpBtn: {
    backgroundColor: '#6B7FED',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  signUpText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  optionalTag: {
    fontSize: 12,
    fontWeight: '400',
    color: '#999',
  },
});
