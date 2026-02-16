import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../../App';
import BottomTabBar from '../../components/BottomTabBar';
import FeedScreen from './FeedScreen';
import ChatbotScreen from './ChatbotScreen';
import CreatePostScreen from './CreatePostScreen';
import AppointmentScreen from './AppointmentScreen';
import ProfileScreen from './ProfileScreen';

// Export this type so BottomTabBar can use it
export type TabName = 'Feed' | 'Chatbot' | 'CreatePost' | 'Appointment' | 'Profile';

type UserDashboardScreenProps = {
  route: RouteProp<RootStackParamList, 'Dashboard'>;
};

export default function UserDashboardScreen({ route }: UserDashboardScreenProps) {
  const { userId } = route.params;
  const [activeTab, setActiveTab] = useState<TabName>('Feed');

  const renderScreen = () => {
    switch (activeTab) {
      case 'Feed':
        return <FeedScreen />;
      case 'Chatbot':
        return <ChatbotScreen />;
      case 'CreatePost':
        return <CreatePostScreen />;
      case 'Appointment':
        return <AppointmentScreen />;
      case 'Profile':
        return <ProfileScreen />;
      default:
        return <FeedScreen />;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={[]}>
      <View style={styles.mainContainer}>
        {renderScreen()}
        <BottomTabBar activeTab={activeTab} onTabChange={setActiveTab} />
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