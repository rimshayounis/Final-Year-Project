import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../../App';
import { MaterialIcons } from '@expo/vector-icons';

type DoctorDashboardScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'DoctorUnverified'>;
  route: RouteProp<RootStackParamList, 'DoctorUnverified'>;
};

export default function DoctorPendingScreen({ 
  navigation, 
  route 
}: DoctorDashboardScreenProps) {
  const { doctorId,doctorName } = route.params;

  return (
  <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome, {doctorName}</Text>
        <Text style={styles.appName}>TruHeal-Link</Text>
        <View style={styles.statusBadge}>
          <MaterialIcons name="verified" size={16} color="#FFD700" />
          <Text style={styles.statusText}>Pending Verification</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <MaterialIcons name="celebration" size={60} color="#6B7FED" />
          <Text style={styles.successTitle}>Registration Submitted!</Text>
          <Text style={styles.successText}>
            Your doctor account has been created successfully. We're reviewing your 
            credentials and will notify you once verification is complete.
          </Text>
        </View>

        <View style={styles.infoCard}>
          <MaterialIcons name="schedule" size={24} color="#FFA500" />
          <Text style={styles.infoText}>
            Verification typically takes 24-48 hours. You'll receive an email 
            notification once your account is verified.
          </Text>
        </View>

        <View style={styles.featuresContainer}>
          <View style={styles.featureCard}>
            <MaterialIcons name="people" size={40} color="#6B7FED" />
            <Text style={styles.featureTitle}>Patient Management</Text>
            <Text style={styles.featureText}>Available after verification</Text>
          </View>

          <View style={styles.featureCard}>
            <MaterialIcons name="calendar-month" size={40} color="#6B7FED" />
            <Text style={styles.featureTitle}>Appointments</Text>
            <Text style={styles.featureText}>Schedule & manage appointments</Text>
          </View>

         
        </View>

        <View style={styles.documentsCard}>
          <View style={styles.documentsHeader}>
            <MaterialIcons name="folder" size={24} color="#6B7FED" />
            <Text style={styles.documentsTitle}>Submitted Documents</Text>
          </View>
          <View style={styles.documentItem}>
            <MaterialIcons name="check-circle" size={20} color="#4CAF50" />
            <Text style={styles.documentsText}>License Number: Verified</Text>
          </View>
          <View style={styles.documentItem}>
            <MaterialIcons name="check-circle" size={20} color="#4CAF50" />
            <Text style={styles.documentsText}>Specialization: Submitted</Text>
          </View>
          <View style={styles.documentItem}>
            <MaterialIcons name="pending" size={20} color="#FF9800" />
            <Text style={styles.documentsText}>Certificates: Under Review</Text>
          </View>
        </View>

        {/* Extra space at bottom for better scrolling */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#6B7FED',
    paddingTop: 20,
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
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginTop: 10,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
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
    backgroundColor: '#FFF4E6',
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
    marginBottom: 20,
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
  documentsCard: {
    backgroundColor: '#E8F4F8',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  documentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  documentsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C3E50',
    marginLeft: 10,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  documentsText: {
    fontSize: 14,
    color: '#2C3E50',
    marginLeft: 10,
  },
  bottomSpacer: {
    height: 20,
  },
});
