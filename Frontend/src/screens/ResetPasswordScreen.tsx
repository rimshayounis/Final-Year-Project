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
  navigation: NativeStackNavigationProp<RootStackParamList, 'ResetPassword'>;
  route: RouteProp<RootStackParamList, 'ResetPassword'>;
};

export default function ResetPasswordScreen({ navigation, route }: Props) {
  const { email, otpCode, userType } = route.params;

  const [newPassword,     setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew,         setShowNew]         = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);
  const [loading,         setLoading]         = useState(false);

  const handleReset = async () => {
    if (!newPassword.trim()) {
      Alert.alert('Error', 'Please enter a new password');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const endpoint = userType === 'doctor'
        ? '/doctors/reset-password'
        : '/users/reset-password';

      await apiClient.post(endpoint, { email, otpCode, newPassword });

      Alert.alert(
        'Success! 🎉',
        'Your password has been reset successfully. Please login with your new password.',
        [{ text: 'Login', onPress: () => navigation.navigate('Login', { userType }) }],
      );
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to reset password. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.headerCard}>
        <Text style={styles.userTypeBadge}>
          {userType === 'user' ? '👤 User' : '⚕️ Doctor'}
        </Text>
        <Text style={styles.headerText}>New{'\n'}Password</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.title}>Set New Password</Text>
        <Text style={styles.subtitle}>
          Choose a strong password with at least 6 characters.
        </Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="New Password"
            placeholderTextColor="#999"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showNew}
            autoCapitalize="none"
            editable={!loading}
          />
          <TouchableOpacity onPress={() => setShowNew(!showNew)}>
            <Ionicons name={showNew ? 'eye-outline' : 'eye-off-outline'} size={20} color="#999" style={styles.icon} />
          </TouchableOpacity>
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Confirm New Password"
            placeholderTextColor="#999"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirm}
            autoCapitalize="none"
            editable={!loading}
          />
          <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
            <Ionicons
              name={showConfirm ? 'eye-outline' : 'eye-off-outline'}
              size={20} color="#999" style={styles.icon}
            />
          </TouchableOpacity>
        </View>

        {/* Password match indicator */}
        {confirmPassword.length > 0 && (
          <Text style={[styles.matchText, newPassword === confirmPassword ? styles.matchOk : styles.matchFail]}>
            {newPassword === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
          </Text>
        )}

        <TouchableOpacity
          style={styles.button}
          onPress={handleReset}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#FFF" />
            : <Text style={styles.buttonText}>Reset Password</Text>
          }
        </TouchableOpacity>
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
  userTypeBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, color: '#FFF', marginBottom: 10,
  },
  headerText:   { fontSize: 28, color: '#FFF', textAlign: 'center' },
  section:      { paddingHorizontal: 20 },
  title:        { fontSize: 24, textAlign: 'center', marginBottom: 10 },
  subtitle:     { fontSize: 13, color: '#666', textAlign: 'center', marginBottom: 30, lineHeight: 20 },
  inputContainer: {
    flexDirection: 'row', backgroundColor: '#FFF',
    borderRadius: 15, padding: 16, marginBottom: 16,
  },
  input:        { flex: 1 },
  icon:         { marginLeft: 10 },
  matchText:    { fontSize: 12, marginBottom: 16, marginLeft: 4 },
  matchOk:      { color: '#4CAF50' },
  matchFail:    { color: '#F44336' },
  button: {
    backgroundColor: '#6B7FED', borderRadius: 15,
    paddingVertical: 18, alignItems: 'center', marginTop: 8,
  },
  buttonText:   { color: '#FFF', fontSize: 16 },
});
