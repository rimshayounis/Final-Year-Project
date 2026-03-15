import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import BottomTabBar from '../../components/BottomTabBar';
import FeedScreen from './FeedScreen';
import ChatbotScreen from './ChatbotScreen';
import CreatePostScreen from './CreatePostScreen';
import AppointmentScreen from './AppointmentScreen';
import ProfileScreen from './ProfileScreen';

export type TabName =
  | 'Feed'
  | 'Chatbot'
  | 'CreatePost'
  | 'Appointment'
  | 'Profile';

type DashboardScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;
  route: RouteProp<RootStackParamList, 'Dashboard'>;
};

export default function DashboardScreen({ route, navigation }: DashboardScreenProps) {
  const { id, role } = route.params;

  const [activeTab, setActiveTab] = useState<TabName>('Feed');
  const [viewingDoctorId, setViewingDoctorId] = useState<string | null>(null);

  const handleNavigateToDoctorProfile = useCallback((doctorId: string) => {
    setViewingDoctorId(doctorId);
  }, []);

  const handleBackFromDoctor = useCallback(() => {
    setViewingDoctorId(null);
  }, []);

  const renderScreen = () => {
    // Viewing a doctor's profile from the feed — keep bottom nav visible
    if (viewingDoctorId) {
      return (
        <ProfileScreen
          id={viewingDoctorId}
          role="doctor"
          onBack={handleBackFromDoctor}
          onBookAppointment={
            role === 'user'
              ? (doctor) =>
                  navigation.navigate('DoctorAppointmentDetail', {
                    doctor,
                    userId: id,
                  })
              : undefined
          }
        />
      );
    }

    switch (activeTab) {
      case 'Feed':
        return (
          <FeedScreen
            id={id}
            role={role}
            onNavigateToDoctorProfile={handleNavigateToDoctorProfile}
          />
        );

      case 'Chatbot':
        return <ChatbotScreen id={id} role={role} />;

      case 'CreatePost':
        return <CreatePostScreen id={id} role={role} />;

      case 'Appointment':
        return <AppointmentScreen id={id} role={role} />;

      case 'Profile':
        return (
          <ProfileScreen
            id={id}
            role={role}
            onCreateAppointment={
              role === 'doctor'
                ? () => navigation.navigate('CreateAppointment', { doctorId: id })
                : undefined
            }
            onOpenSettings={() => navigation.navigate('Settings', { id, role })}
          />
        );

      default:
        return (
          <FeedScreen
            id={id}
            role={role}
            onNavigateToDoctorProfile={handleNavigateToDoctorProfile}
          />
        );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={[]}>
      <View style={styles.mainContainer}>
        {renderScreen()}
        <BottomTabBar
          activeTab={activeTab}
          onTabChange={(tab) => {
            setViewingDoctorId(null);
            setActiveTab(tab);
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F0F4FF',
  },
  mainContainer: {
    flex: 1,
  },
});
