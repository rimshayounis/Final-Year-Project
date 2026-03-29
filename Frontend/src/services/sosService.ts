import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Alert } from 'react-native';

const BASE_URL = 'http://10.247.10.86:3000/api'; // 👈 replace with your IP

export const triggerSOS = async (): Promise<void> => {
  try {
    // 1. Get userId from AsyncStorage
    const userString = await AsyncStorage.getItem('user');
    if (!userString) {
      Alert.alert('Error', 'Please login first');
      return;
    }
    const user = JSON.parse(userString);
    const userId = user?._id;

    if (!userId) {
      Alert.alert('Error', 'User ID not found. Please login again.');
      return;
    }

    // 2. Request location permission
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Denied',
        'Please enable location access for SOS to work.',
      );
      return;
    }

    // 3. Get GPS coordinates
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    // 4. Get last chat history
    const chatRaw = await AsyncStorage.getItem('chatHistory');
    const chatHistory = chatRaw ? JSON.parse(chatRaw) : [];

    // 5. Send to NestJS backend
    const response = await axios.post(
      `${BASE_URL}/sos/${userId}/trigger`,
      {
        lat:         location.coords.latitude,
        lng:         location.coords.longitude,
        chatHistory: chatHistory.slice(-3),
      },
    );

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
    console.error('SOS Error:', err.message);
    Alert.alert(
      '❌ SOS Failed',
      'Could not send SOS. Please try again or call emergency services.',
    );
  }
};