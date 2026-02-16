import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

export default function AppointmentScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const appointments = [
    {
      id: '1',
      patient: 'Ali Khan',
      doctor: 'Dr. Sarah Ahmed',
      date: '18 Feb 2026',
      time: '10:30 AM',
      duration: '30 Minutes',
      status: 'Active',
    },
    {
      id: '2',
      patient: 'Hassan Raza',
      doctor: 'Dr. John Smith',
      date: '20 Feb 2026',
      time: '02:00 PM',
      duration: '45 Minutes',
      status: 'Pending',
    },
  ];

  const handleBookAppointment = () => {
    navigation.navigate('BookAppointments');
  };

  const handleContinueSession = () => {
    console.log('appointment start');

  navigation.navigate('userSession', {
    doctorName: 'Dr. Sarah Ahmed',
    doctorImage: 'https://i.pravatar.cc/150?img=12',
    duration: 1800,
  });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#6B7FED" />

      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.headerTitle}>Appointments</Text>

        <TouchableOpacity style={styles.notificationButton}>
          <MaterialIcons name="notifications" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* BODY */}
      <ScrollView contentContainerStyle={styles.content}>
        {appointments.map((item) => (
          <View key={item.id} style={styles.card}>
            
            {/* Status Badge */}
            <View
              style={[
                styles.statusBadge,
                item.status === 'Active'
                  ? styles.activeBadge
                  : styles.pendingBadge,
              ]}
            >
              <Text style={styles.statusText}>{item.status}</Text>
            </View>

            <Text style={styles.label}>
              Patient: <Text style={styles.value}>{item.patient}</Text>
            </Text>

            <Text style={styles.label}>
              Doctor: <Text style={styles.value}>{item.doctor}</Text>
            </Text>

            <Text style={styles.label}>
              Date: <Text style={styles.value}>{item.date}</Text>
            </Text>

            <Text style={styles.label}>
              Time: <Text style={styles.value}>{item.time}</Text>
            </Text>

            <Text style={styles.label}>
              Duration: <Text style={styles.value}>{item.duration}</Text>
            </Text>

            {/* Continue Session Button (Only if Active) */}
            {item.status === 'Active' && (
              <TouchableOpacity
                style={styles.continueButton}
                onPress={handleContinueSession}
              >
                <Text style={styles.continueButtonText}>
                  Continue Session
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ))}

        {/* BOOK BUTTON */}
        <TouchableOpacity
          style={styles.bookButton}
          onPress={handleBookAppointment}
        >
          <Text style={styles.bookButtonText}>Book Appointment</Text>
        </TouchableOpacity>
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
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  notificationButton: {
    padding: 5,
  },

  content: {
    padding: 20,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    elevation: 3,
    borderWidth: 1.5,
    borderColor: '#6B7FED', // Blue theme border
  },

  label: {
    fontSize: 14,
    color: '#555',
    marginBottom: 6,
  },

  value: {
    fontWeight: '600',
    color: '#2C3E50',
  },

  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 10,
  },

  activeBadge: {
    backgroundColor: '#D4F8E8',
  },

  pendingBadge: {
    backgroundColor: '#FFE8C7',
  },

  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },

  continueButton: {
    backgroundColor: '#6B7FED',
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 12,
  },

  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  bookButton: {
    backgroundColor: '#6B7FED',
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 10,
  },

  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
