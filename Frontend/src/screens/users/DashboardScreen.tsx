import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../../App';
import { MaterialIcons } from '@expo/vector-icons';

type UserDashboardScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;
  route: RouteProp<RootStackParamList, 'Dashboard'>;
};

export default function UserDashboardScreen({ navigation, route }: UserDashboardScreenProps) {
  const { userId } = route.params;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome to</Text>
        <Text style={styles.appName}>TruHeal-Link</Text>
        <Text style={styles.userBadge}>👤 Patient Dashboard</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <MaterialIcons name="celebration" size={60} color="#7B8CDE" />
          <Text style={styles.successTitle}>Account Created Successfully!</Text>
          <Text style={styles.successText}>
            Your TruHeal-Link account is now active and ready to use.
          </Text>
        </View>

        <View style={styles.infoCard}>
          <MaterialIcons name="info-outline" size={24} color="#7B8CDE" />
          <Text style={styles.infoText}>
            You can now connect with doctors, manage your health profile, and access
            emergency contacts anytime.
          </Text>
        </View>

        <View style={styles.featuresContainer}>
          <TouchableOpacity style={styles.featureCard}>
            <MaterialIcons name="medical-services" size={40} color="#7B8CDE" />
            <Text style={styles.featureTitle}>Find Doctors</Text>
            <Text style={styles.featureText}>Connect with verified doctors</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.featureCard}>
            <MaterialIcons name="health-and-safety" size={40} color="#7B8CDE" />
            <Text style={styles.featureTitle}>Health Profile</Text>
            <Text style={styles.featureText}>View your health information</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.featureCard}>
            <MaterialIcons name="contact-phone" size={40} color="#7B8CDE" />
            <Text style={styles.featureTitle}>Emergency Contacts</Text>
            <Text style={styles.featureText}>Manage emergency contacts</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.featureCard}>
            <MaterialIcons name="calendar-today" size={40} color="#7B8CDE" />
            <Text style={styles.featureTitle}>Appointments</Text>
            <Text style={styles.featureText}>Schedule appointments</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    paddingBottom: 30,
    paddingHorizontal: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  greeting: {
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
  userBadge: {
    marginTop: 10,
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  content: {
    flex: 1,
    padding: 30,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2C3E50',
    marginTop: 20,
    textAlign: 'center',
  },
  successText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 24,
  },
  infoCard: {
    backgroundColor: '#E8F4F8',
    borderRadius: 15,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#2C3E50',
    marginLeft: 15,
    lineHeight: 20,
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3E50',
    marginTop: 10,
    textAlign: 'center',
  },
  featureText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
});