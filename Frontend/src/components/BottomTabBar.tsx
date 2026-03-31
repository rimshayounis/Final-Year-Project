import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { TabName } from '../screens/dashboard/UserDashboardScreen';

interface BottomTabBarProps {
  activeTab:   TabName;
  onTabChange: (tab: TabName) => void;
}

export default function BottomTabBar({ activeTab, onTabChange }: BottomTabBarProps) {
  return (
    <View style={styles.tabBar}>

      <TouchableOpacity style={styles.tabItem} onPress={() => onTabChange('Feed')}>
        <Ionicons name="paper-plane-outline" size={20} color={activeTab === 'Feed' ? '#6B7FED' : '#999'} />
        <Text style={[styles.tabLabel, activeTab === 'Feed' && styles.tabLabelActive]}>Post</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.tabItem} onPress={() => onTabChange('Chatbot')}>
        <FontAwesome5 name="robot" size={18} color={activeTab === 'Chatbot' ? '#6B7FED' : '#999'} />
        <Text style={[styles.tabLabel, activeTab === 'Chatbot' && styles.tabLabelActive]}>Chatbot</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.centerTabButton} onPress={() => onTabChange('CreatePost')}>
        <View style={[styles.centerTabIcon, activeTab === 'CreatePost' && styles.centerTabIconActive]}>
          <MaterialIcons name="add" size={26} color="#FFFFFF" />
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.tabItem} onPress={() => onTabChange('Appointment')}>
        <MaterialIcons name="calendar-today" size={20} color={activeTab === 'Appointment' ? '#6B7FED' : '#999'} />
        <Text style={[styles.tabLabel, activeTab === 'Appointment' && styles.tabLabelActive]}>Appointment</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.tabItem} onPress={() => onTabChange('Profile')}>
        <MaterialIcons name="person-outline" size={20} color={activeTab === 'Profile' ? '#6B7FED' : '#999'} />
        <Text style={[styles.tabLabel, activeTab === 'Profile' && styles.tabLabelActive]}>Profile</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection:        'row',
    backgroundColor:      '#FFFFFF',
    height:               68,
    paddingBottom:        8,
    paddingTop:           8,
    alignItems:           'center',
    justifyContent:       'space-around',
    borderTopLeftRadius:  20,
    borderTopRightRadius: 20,
    shadowColor:          '#000',
    shadowOffset:         { width: 0, height: -2 },
    shadowOpacity:        0.1,
    shadowRadius:         8,
    elevation:            8,
  },
  tabItem: {
    alignItems:     'center',
    justifyContent: 'center',
    flex:           1,
  },
  tabLabel: {
    fontSize:   9,
    fontWeight: '500',
    color:      '#999',
    marginTop:  3,
  },
  tabLabelActive: {
    color: '#6B7FED',
  },
  centerTabButton: {
    alignItems:     'center',
    justifyContent: 'center',
    flex:           1,
    marginTop:      -28,
  },
  centerTabIcon: {
    width:           54,
    height:          54,
    borderRadius:    27,
    backgroundColor: '#6B7FED',
    justifyContent:  'center',
    alignItems:      'center',
    shadowColor:     '#6B7FED',
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.3,
    shadowRadius:    8,
    elevation:       5,
  },
  centerTabIconActive: {
    backgroundColor: '#5A6FDC',
  },
});
