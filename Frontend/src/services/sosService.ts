import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Alert } from 'react-native';
import { API_URL } from './api'; // 👈 import from api.ts

export const triggerSOS = async (): Promise<void> => {
  try {
    // 1. Get userId from AsyncStorage
    const userString = await AsyncStorage.getItem('user');
    console.log('👤 User from storage:', userString); // 👈 debug

    if (!userString) {
      Alert.alert('Error', 'Please login first');
      return;
    }

    const user   = JSON.parse(userString);
    const userId = user?._id;
    console.log('🆔 userId:', userId); // 👈 debug
    console.log('🌐 API_URL:', API_URL); // 👈 debug
    console.log('🚨 Full SOS URL:', `${API_URL}/sos/${userId}/trigger`); // 👈 debug

    if (!userId) {
      Alert.alert('Error', 'User ID not found. Please login again.');
      return;
    }

    // 2. Request location permission
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Please enable location access for SOS.');
      return;
    }

    // 3. Get GPS coordinates
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    console.log('📍 Location:', location.coords.latitude, location.coords.longitude); // 👈 debug

    // 4. Get last chat history
    const chatRaw     = await AsyncStorage.getItem('chatHistory');
    const chatHistory = chatRaw ? JSON.parse(chatRaw) : [];

    // 5. Send to NestJS backend
    const response = await axios.post(
      `${API_URL}/sos/${userId}/trigger`,
      {
        lat:         location.coords.latitude,
        lng:         location.coords.longitude,
        chatHistory: chatHistory.slice(-3),
      },
    );

    console.log('✅ SOS Response:', response.data); // 👈 debug

    if (response.data.success) {
      const count = response.data.notified?.length ?? 0;
      Alert.alert(
        '✅ SOS Sent!',
        `Emergency alert sent to ${count} contact(s). Help is on the way!`,
        [{ text: 'OK' }],
      );
    } else {
      Alert.alert(
        '⚠️ SOS Warning',
        response.data.message ?? 'Something went wrong.',
      );
    }

  } catch (err: any) {
    console.error('❌ SOS Error full:', err.response?.data); // 👈 debug
    console.error('❌ SOS Error status:', err.response?.status); // 👈 debug
    console.error('❌ SOS Error message:', err.message); // 👈 debug
    Alert.alert(
      '❌ SOS Failed',
      'Could not send SOS. Please try again or call emergency services.',
    );
  }
};