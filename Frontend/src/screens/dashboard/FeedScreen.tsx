import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

// Add props type
type FeedScreenProps = {
  id: string; // user or doctor id
  role: 'user' | 'doctor';
};

export default function FeedScreen({ id, role }: FeedScreenProps) {
  return (
    <View style={styles.container}>
      <MaterialIcons name="person" size={60} color="#6B7FED" />
      <Text style={styles.title}>Post Feed Screen</Text>
      <Text style={styles.subtitle}>
        Coming Soon for {role} (ID: {id})
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2C3E50',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
});
