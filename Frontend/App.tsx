
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SplashScreen from './src/screens/SplashScreen';
import LoginTypeScreen from './src/screens/LoginTypeScreen';
import LoginScreen from './src/screens/LoginScreen';
import CreateAccountScreen from './src/screens/CreateAccountScreen';
import CreateDoctorAccountScreen from './src/screens/CreateDoctorAccountScreen'; // ✅ NEW
import HealthProfileScreen from './src/screens/HealthProfileScreen';
import EmergencyContactScreen from './src/screens/EmergencyContactScreen';
import DashboardScreen from './src/screens/DashboardScreen';

export type RootStackParamList = {
  Splash: undefined;
  LoginType: undefined;
  Login: { userType: 'user' | 'doctor' };
  CreateAccount: { userType: 'user' | 'doctor' };
  CreateDoctorAccount: undefined; // ✅ NEW
  HealthProfile: { userId: string };
  EmergencyContact: { userId: string };
  Dashboard: { userId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
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
        <Stack.Screen name="HealthProfile" component={HealthProfileScreen} />
        <Stack.Screen name="EmergencyContact" component={EmergencyContactScreen} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}