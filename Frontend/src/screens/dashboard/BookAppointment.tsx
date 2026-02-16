import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function BookAppointment() {
  const categories = [
    { id: 1, name: 'Cancer', icon: '🎗️' },
    { id: 2, name: 'Urology', icon: '🫘' },
    { id: 3, name: 'Cardiology', icon: '❤️' },
    { id: 4, name: 'Neurology', icon: '🧠' },
  ];

  const topDoctors = [
    { id: 1, name: 'Dr. Eugene Salinas', specialty: 'Cancer & Heart', avatar: '👨‍⚕️' },
    { id: 2, name: 'Dr. Cordelia Clemmer', specialty: 'Pediatrician', avatar: '👩‍⚕️' },
  ];

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.notificationButton}>
          <View style={styles.notificationBadge} />
          <MaterialIcons name="notifications" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <Text style={styles.greeting}>Hey,</Text>
        <Text style={styles.subtitle}>Find your favorite doctor!</Text>
        
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search doctor"
            placeholderTextColor="rgba(255,255,255,0.6)"
          />
          <TouchableOpacity style={styles.searchButton}>
            <MaterialIcons name="search" size={24} color="#6B7FED" />
          </TouchableOpacity>
        </View>

        {/* Categories Section */}
        <View style={styles.categoriesHeader}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
          contentContainerStyle={styles.categoriesContent}
        >
          {categories.map((category) => (
            <TouchableOpacity key={category.id} style={styles.categoryCard}>
              <View style={styles.categoryIcon}>
                <Text style={styles.categoryEmoji}>{category.icon}</Text>
              </View>
              <Text style={styles.categoryName}>{category.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Top Doctors Section */}
      <View style={styles.contentWrapper}>
        <View style={styles.topDoctorHeader}>
          <Text style={styles.topDoctorTitle}>Top Doctor</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllTextBlue}>See All</Text>
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.doctorsList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.doctorsContent}
        >
          {topDoctors.map((doctor) => (
            <TouchableOpacity key={doctor.id} style={styles.doctorCard}>
              <View style={styles.doctorAvatar}>
                <Text style={styles.doctorAvatarText}>{doctor.avatar}</Text>
              </View>
              <View style={styles.doctorInfo}>
                <Text style={styles.doctorName}>{doctor.name}</Text>
                <Text style={styles.doctorSpecialty}>{doctor.specialty}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#CCC" />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4FF',
  },
  header: {
    backgroundColor: '#6B7FED',
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  notificationButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF4444',
    borderWidth: 2,
    borderColor: '#6B7FED',
    zIndex: 11,
  },
  greeting: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 15,
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    height: 50,
    color: '#FFFFFF',
    fontSize: 16,
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoriesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  seeAllText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  categoriesScroll: {
    marginBottom: 10,
  },
  categoriesContent: {
    paddingRight: 10,
  },
  categoryCard: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 15,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 130,
  },
  categoryIcon: {
    width: 35,
    height: 35,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  categoryEmoji: {
    fontSize: 20,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  contentWrapper: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  topDoctorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  topDoctorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C3E50',
  },
  seeAllTextBlue: {
    fontSize: 14,
    color: '#6B7FED',
    fontWeight: '500',
  },
  doctorsList: {
    flex: 1,
  },
  doctorsContent: {
    paddingBottom: 20,
  },
  doctorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  doctorAvatar: {
    width: 60,
    height: 60,
    borderRadius: 15,
    backgroundColor: '#E8F4F8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  doctorAvatarText: {
    fontSize: 32,
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 4,
  },
  doctorSpecialty: {
    fontSize: 14,
    color: '#999',
  },
});