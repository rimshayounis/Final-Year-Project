
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';

type LoginTypeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'LoginType'>;
};

export default function LoginTypeScreen({ navigation }: LoginTypeScreenProps) {
  const [selectedType, setSelectedType] = useState<'user' | 'doctor' | null>(null);

  const handleSelection = (type: 'user' | 'doctor') => {
    setSelectedType(type);
    
    // Navigate to Login screen with user type
    setTimeout(() => {
      navigation.navigate('Login', { userType: type });
      setSelectedType(null);
    }, 300);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome to</Text>
        <Text style={styles.appName}>TruHeal-Link</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.loginTitle}>Login As</Text>
        <Text style={styles.subtitle}>Choose your account type</Text>

        {/* User Button */}
        <TouchableOpacity
          style={[
            styles.button,
            selectedType === 'user' && styles.buttonActive
          ]}
          onPress={() => handleSelection('user')}
          disabled={selectedType !== null}
        >
          {selectedType === 'user' ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <View style={styles.iconContainer}>
                <Text style={styles.iconText}>👤</Text>
              </View>
              <Text style={styles.buttonText}>User</Text>
              <Text style={styles.buttonSubtext}>Login as a patient</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Doctor Button */}
        <TouchableOpacity
          style={[
            styles.button,
            selectedType === 'doctor' && styles.buttonActive
          ]}
          onPress={() => handleSelection('doctor')}
          disabled={selectedType !== null}
        >
          {selectedType === 'doctor' ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <View style={styles.iconContainer}>
                <Text style={styles.iconText}>⚕️</Text>
              </View>
              <Text style={styles.buttonText}>Doctor</Text>
              <Text style={styles.buttonSubtext}>Login as a healthcare provider</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
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
    paddingBottom: 40,
    paddingHorizontal: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '400',
  },
  appName: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '700',
    marginTop: 5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 50,
    alignItems: 'center',
  },
  loginTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    marginBottom: 40,
  },
  button: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    paddingVertical: 25,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  buttonActive: {
    backgroundColor: '#6B7FED',
    borderColor: '#6B7FED',
  },
  iconContainer: {
    width: 60,
    height: 60,
    backgroundColor: '#F0F0F0',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconText: {
    fontSize: 30,
  },
  buttonText: {
    color: '#2C3E50',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  buttonSubtext: {
    color: '#666',
    fontSize: 13,
  },
});