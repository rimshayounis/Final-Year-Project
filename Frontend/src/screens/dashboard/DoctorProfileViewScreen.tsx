import React from 'react';
import { useRoute, useNavigation } from '@react-navigation/native';
import ProfileScreen from './ProfileScreen';

export default function DoctorProfileViewScreen() {
  const route      = useRoute<any>();
  const navigation = useNavigation<any>();
  const { doctorId, userId } = route.params ?? {};

  return (
    <ProfileScreen
      id={doctorId}
      role="doctor"
      onBack={() => navigation.goBack()}
      onBookAppointment={(doctor) =>
        navigation.navigate('DoctorAppointmentDetail', { doctor, userId })
      }
    />
  );
}
