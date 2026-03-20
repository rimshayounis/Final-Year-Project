import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../App';
import apiClient from '../services/api';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'OTPVerification'>;
  route: RouteProp<RootStackParamList, 'OTPVerification'>;
};

export default function OTPVerificationScreen({ navigation, route }: Props) {
  const { email, userType } = route.params;
  const [otp, setOtp]               = useState(['', '', '', '', '', '']);
  const [loading, setLoading]       = useState(false);
  const [resending, setResending]   = useState(false);
  const inputs = useRef<(TextInput | null)[]>([]);

  const handleChange = (value: string, index: number) => {
    // Allow only digits
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next box
    if (value && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpCode = otp.join('');
    if (otpCode.length < 6) {
      Alert.alert('Error', 'Please enter the complete 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const endpoint = userType === 'doctor'
        ? '/doctors/verify-otp'
        : '/users/verify-otp';

      await apiClient.post(endpoint, { email, otpCode });

      navigation.navigate('ResetPassword', { email, otpCode, userType });
    } catch (error: any) {
      Alert.alert(
        'Invalid OTP',
        error.response?.data?.message || 'OTP is incorrect or expired. Please try again.',
      );
      // Clear boxes on failure
      setOtp(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const endpoint = userType === 'doctor'
        ? '/doctors/forgot-password'
        : '/users/forgot-password';

      await apiClient.post(endpoint, { email });
      setOtp(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
      Alert.alert('Sent!', 'A new OTP has been sent to your email.');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to resend OTP.');
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.headerCard}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.userTypeBadge}>
          {userType === 'user' ? '👤 User' : '⚕️ Doctor'}
        </Text>
        <Text style={styles.headerText}>Verify{'\n'}OTP</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.title}>Enter OTP</Text>
        <Text style={styles.subtitle}>
          A 6-digit code was sent to{'\n'}
          <Text style={styles.emailText}>{email}</Text>
        </Text>

        {/* 6-digit OTP boxes */}
        <View style={styles.otpRow}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => { inputs.current[index] = ref; }}
              style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
              value={digit}
              onChangeText={(val) => handleChange(val, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="numeric"
              maxLength={1}
              textAlign="center"
              editable={!loading}
              selectTextOnFocus
            />
          ))}
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleVerify}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#FFF" />
            : <Text style={styles.buttonText}>Verify OTP</Text>
          }
        </TouchableOpacity>

        <View style={styles.resendRow}>
          <Text style={styles.resendLabel}>Didn't receive the code? </Text>
          <TouchableOpacity onPress={handleResend} disabled={resending || loading}>
            {resending
              ? <ActivityIndicator size="small" color="#6B7FED" />
              : <Text style={styles.resendLink}>Resend OTP</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#E8E8E8' },
  headerCard: {
    backgroundColor: '#6B7FED',
    marginHorizontal: 20, marginTop: 20, marginBottom: 30,
    padding: 40, borderRadius: 20, alignItems: 'center',
  },
  backButton:   { position: 'absolute', top: 20, left: 20 },
  userTypeBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, color: '#FFF', marginBottom: 10,
  },
  headerText:   { fontSize: 28, color: '#FFF', textAlign: 'center' },
  section:      { paddingHorizontal: 20 },
  title:        { fontSize: 24, textAlign: 'center', marginBottom: 10 },
  subtitle:     { fontSize: 13, color: '#666', textAlign: 'center', marginBottom: 30, lineHeight: 20 },
  emailText:    { color: '#6B7FED', fontWeight: '600' },
  otpRow:       { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
  otpBox: {
    width: 48, height: 56, backgroundColor: '#FFF',
    borderRadius: 12, fontSize: 22, fontWeight: '700', color: '#333',
    borderWidth: 2, borderColor: '#E0E0E0',
  },
  otpBoxFilled: { borderColor: '#6B7FED' },
  button: {
    backgroundColor: '#6B7FED', borderRadius: 15,
    paddingVertical: 18, alignItems: 'center', marginBottom: 20,
  },
  buttonText:   { color: '#FFF', fontSize: 16 },
  resendRow:    { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  resendLabel:  { fontSize: 13, color: '#666' },
  resendLink:   { fontSize: 13, color: '#6B7FED' },
});
