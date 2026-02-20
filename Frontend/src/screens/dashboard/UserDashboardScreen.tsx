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

export type TabName =
  | 'Feed'
  | 'Chatbot'
  | 'CreatePost'
  | 'Appointment'
  | 'Profile';

type DashboardScreenProps = {
  route: RouteProp<RootStackParamList, 'Dashboard'>;
};

export default function DashboardScreen({ route }: DashboardScreenProps) {
  const { id, role } = route.params; // ✅ Use id and role directly

  const [activeTab, setActiveTab] = useState<TabName>('Feed');

  const renderScreen = () => {
    switch (activeTab) {
      case 'Feed':
        return <FeedScreen id={id} role={role} />;

      case 'Chatbot':
        return <ChatbotScreen id={id} role={role} />;

      case 'CreatePost':
        return role === 'doctor'
          ? <CreatePostScreen id={id} role={role} />
          : <FeedScreen id={id} role={role} />;

      case 'Appointment':
        return <AppointmentScreen id={id} role={role} />;

      case 'Profile':
        return <ProfileScreen id={id} role={role} />;

      default:
        return <FeedScreen id={id} role={role} />;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={[]}>
      <View style={styles.mainContainer}>
        {renderScreen()}
        <BottomTabBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
         // optional: customize tabs by role
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
