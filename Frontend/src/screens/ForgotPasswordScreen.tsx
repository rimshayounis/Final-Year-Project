import React, { useState } from 'react';
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
  navigation: NativeStackNavigationProp<RootStackParamList, 'ForgotPassword'>;
  route: RouteProp<RootStackParamList, 'ForgotPassword'>;
};

export default function ForgotPasswordScreen({ navigation, route }: Props) {
  const { userType } = route.params;
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }
    if (!email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email');
      return;
    }

    setLoading(true);
    try {
      const endpoint = userType === 'doctor'
        ? '/doctors/forgot-password'
        : '/users/forgot-password';

      await apiClient.post(endpoint, { email: email.trim().toLowerCase() });

      navigation.navigate('OTPVerification', {
        email: email.trim().toLowerCase(),
        userType,
      });
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to send OTP. Please try again.',
      );
    } finally {
      setLoading(false);
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
        <Text style={styles.headerText}>Forgot{'\n'}Password</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>
          Enter your registered email address. We'll send a 6-digit OTP to verify your identity.
        </Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter Your Email"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />
          <Ionicons name="mail-outline" size={20} color="#999" style={styles.icon} />
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleSendOtp}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#FFF" />
            : <Text style={styles.buttonText}>Send OTP</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()} disabled={loading}>
          <Text style={styles.backText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#E8E8E8' },
  headerCard: {
    backgroundColor: '#6B7FED',
    marginHorizontal: 20, marginTop: 20, marginBottom: 30,
    padding: 40, borderRadius: 20, alignItems: 'center',
  },
  backButton:     { position: 'absolute', top: 20, left: 20 },
  userTypeBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, color: '#FFF', marginBottom: 10,
  },
  headerText:     { fontSize: 28, color: '#FFF', textAlign: 'center' },
  section:        { paddingHorizontal: 20 },
  title:          { fontSize: 24, textAlign: 'center', marginBottom: 10 },
  subtitle:       { fontSize: 13, color: '#666', textAlign: 'center', marginBottom: 30, lineHeight: 20 },
  inputContainer: {
    flexDirection: 'row', backgroundColor: '#FFF',
    borderRadius: 15, padding: 16, marginBottom: 24,
  },
  input:          { flex: 1 },
  icon:           { marginLeft: 10 },
  button: {
    backgroundColor: '#6B7FED', borderRadius: 15,
    paddingVertical: 18, alignItems: 'center', marginBottom: 20,
  },
  buttonText:     { color: '#FFF', fontSize: 16 },
  backText:       { textAlign: 'center', color: '#6B7FED', fontSize: 13 },
});
