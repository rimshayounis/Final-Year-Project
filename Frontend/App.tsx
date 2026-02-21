import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import SplashScreen from './src/screens/SplashScreen';
import LoginTypeScreen from './src/screens/LoginTypeScreen';
import LoginScreen from './src/screens/LoginScreen';
import CreateAccountScreen from './src/screens/users/CreateAccountScreen';
import CreateDoctorAccountScreen from './src/screens/doctors/CreateDoctorAccountScreen';
import DoctorPendingScreen from './src/screens/doctors/DoctorPendingScreen';
import HealthProfileScreen from './src/screens/users/HealthProfileScreen';
import EmergencyContactScreen from './src/screens/users/EmergencyContactScreen';
import UserDashboardScreen from './src/screens/dashboard/UserDashboardScreen';
import BookAppointment from './src/screens/dashboard/BookAppointment';
import UserSession from './src/screens/dashboard/UserSession';
import DoctorCreateAppointmentScreen from './src/screens/doctors/DoctorCreateAppointmentScreen';

export type RootStackParamList = {
  Splash: undefined;
  LoginType: undefined;
  Login: { userType: 'user' | 'doctor' };
  CreateAccount: { userType: 'user' | 'doctor' };
  CreateDoctorAccount: undefined;
  DoctorUnverified: { doctorId: string };
  HealthProfile: { userId: string };
  EmergencyContact: { userId: string };
 Dashboard: {
  id: string;
  role: 'user' | 'doctor';
};
  BookAppointments: undefined; 
  userSession:undefined;
  CreateAppointment:undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Splash"
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right'
          }}
        >
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="LoginType" component={LoginTypeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="CreateAccount" component={CreateAccountScreen} />
          <Stack.Screen name="CreateDoctorAccount" component={CreateDoctorAccountScreen} />
          <Stack.Screen name="DoctorUnverified" component={DoctorPendingScreen} /> 
          <Stack.Screen name="HealthProfile" component={HealthProfileScreen} />
          <Stack.Screen name="EmergencyContact" component={EmergencyContactScreen} />
          <Stack.Screen name="Dashboard" component={UserDashboardScreen} />
          <Stack.Screen name='BookAppointments' component={BookAppointment}/>
          <Stack.Screen name='userSession' component={UserSession}/>
          <Stack.Screen name='CreateAppointment' component={DoctorCreateAppointmentScreen}/>

        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}