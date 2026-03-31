import React, { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert:  true,
    shouldPlaySound:  true,
    shouldSetBadge:   false,
    shouldShowBanner: true,
    shouldShowList:   true,
  }),
});

if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('default', {
    name: 'TruHeal Notifications',
    importance: Notifications.AndroidImportance.MAX,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#6B7FED',
    enableVibrate: true,
    showBadge: true,
  });
}

import { StripeProvider } from '@stripe/stripe-react-native';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// ── SOS ───────────────────────────────────────────────────────────────────
import { useShakeSOS } from './src/hooks/useShakeSOS';
import SOSButton from './src/components/SOSButton';

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
import DoctorAppointmentDetailScreen from './src/screens/dashboard/Doctorappointmentdetailscreen';
import DoctorProfileViewScreen from './src/screens/dashboard/DoctorProfileViewScreen';
import PatientChatScreen from './src/screens/chat/PatientChatScreen';
import DoctorChatScreen from './src/screens/chat/DoctorChatScreen';
import UserChatScreen from './src/screens/chat/UserChatScreen';
import PeopleListScreen from './src/screens/dashboard/PeopleScreen';
import UserProfileViewScreen from './src/screens/dashboard/UserProfileViewScreen';
import SettingsScreen from './src/screens/dashboard/SettingsScreen';
import SubscriptionScreen from './src/screens/doctors/SubscriptionScreen';
import WalletScreen from './src/screens/doctors/WalletScreen';
import BankDetailsScreen from './src/screens/doctors/BankDetailsScreen';
import NotificationSettingsScreen from './src/screens/doctors/NotificationSettingsScreen';
import PrivacyPolicyScreen from './src/screens/settings/PrivacyPolicyScreen';
import TermsOfServiceScreen from './src/screens/settings/TermsOfServiceScreen';
import HelpFAQScreen from './src/screens/settings/HelpFAQScreen';
import ContactSupportScreen from './src/screens/settings/ContactSupportScreen';
import ForgotPasswordScreen  from './src/screens/ForgotPasswordScreen';
import OTPVerificationScreen from './src/screens/OtpVerification';
import ResetPasswordScreen   from './src/screens/ResetPasswordScreen';

export type RootStackParamList = {
  Splash: undefined;
  LoginType: undefined;
  Login: { userType: 'user' | 'doctor' };
  CreateAccount: { userType: 'user' | 'doctor' };
  CreateDoctorAccount: undefined;
  DoctorSubscription: { doctorId: string; doctorName: string; isVerified?: boolean };
  DoctorUnverified: { doctorId: string; doctorName: string; selectedPlan?: string };
  HealthProfile: { userId: string };
  EmergencyContact: { userId: string };
  Dashboard: { id: string; role: 'user' | 'doctor' };
  BookAppointments: undefined;
  userSession: undefined;
  CreateAppointment: { doctorId: string };
  Settings: { id: string; role: 'user' | 'doctor' };
  Wallet: { doctorId: string };
  BankDetails: { doctorId: string };
  NotificationSettings: { doctorId: string };
  PrivacyPolicy: undefined;
  TermsOfService: undefined;
  HelpFAQ: undefined;
  ContactSupport: { id: string; role: 'user' | 'doctor' };
  DoctorProfileView: { doctorId: string; userId: string };
  DoctorAppointmentDetail: {
    doctor: {
      _id: string; fullName: string; specialization: string;
      email: string; profileImage?: string; consultationFee?: number;
      sessionDuration?: number; avgRating?: number; ratingCount?: number;
    };
    userId: string;
  };
  DoctorChat: {
    patientId: string; patientName: string;
    patientAvatar?: string; conversationId: string;
  };
  PatientChat: {
    doctorId: string; doctorName: string; doctorAvatar?: string;
    doctorSpecialty?: string; conversationId: string;
  };
  UserChat: {
    otherUserId: string; otherUserName: string;
    conversationId: string; myUserId: string;
  };
  PeopleList:  { myUserId: string };
  UserProfile: { userId: string; myUserId: string };
  ForgotPassword:  { userType: 'user' | 'doctor' };
  OTPVerification: { email: string; userType: 'user' | 'doctor' };
  ResetPassword:   { email: string; otpCode: string; userType: 'user' | 'doctor' };
};

// ── Screens where SOS button is HIDDEN ───────────────────────────────────
const HIDE_SOS_SCREENS = [
  'Splash',
  'LoginType',
  'Login',
  'CreateAccount',
  'CreateDoctorAccount',
  'DoctorSubscription',
  'DoctorUnverified',
  'HealthProfile',
  'EmergencyContact',
  'ForgotPassword',
  'OTPVerification',
  'ResetPassword',
];

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {

  // Track current screen name
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const [currentScreen, setCurrentScreen] = useState<string>('Splash');
  const [userRole, setUserRole]           = useState<string | null>(null);

  // Check if SOS should be active (post-login, users only, not doctors)
  const showSOS =
    !HIDE_SOS_SCREENS.includes(currentScreen) &&
    userRole === 'user';

  useShakeSOS(showSOS); // shake × 3 triggers SOS — only after login, users only

  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener((notification) => {
      console.log('[Push] Received:', notification.request.content.title);
    });
    return () => sub.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <StripeProvider publishableKey="pk_test_51TCBMfR4G6lL4JOFxa4zONwnxiuq8c59n03D2gyzirdMdlhhv0Ntk9a2I9aw2PUHRDmPjPAvngQzp8PndA5IQxMh003DjzSFS1">
        <NavigationContainer
          ref={navigationRef}
          onStateChange={() => {
            // Track current screen on every navigation change
            const current = navigationRef.current?.getCurrentRoute();
            if (current?.name) {
              setCurrentScreen(current.name);

              // Track role from Dashboard params
              if (current.name === 'Dashboard') {
                const params = current.params as { role?: string };
                setUserRole(params?.role ?? null);
              }
            }
          }}
        >
          {/* 👇 SOS button — only shows on post-login screens for users */}
          {showSOS && <SOSButton />}

          <Stack.Navigator
            initialRouteName="Splash"
            screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
          >
            <Stack.Screen name="Splash"               component={SplashScreen} />
            <Stack.Screen name="LoginType"            component={LoginTypeScreen} />
            <Stack.Screen name="Login"                component={LoginScreen} />
            <Stack.Screen name="CreateAccount"        component={CreateAccountScreen} />
            <Stack.Screen name="CreateDoctorAccount"  component={CreateDoctorAccountScreen} />
            <Stack.Screen name="DoctorSubscription"   component={SubscriptionScreen} />
            <Stack.Screen name="DoctorUnverified"     component={DoctorPendingScreen} />
            <Stack.Screen name="HealthProfile"        component={HealthProfileScreen} />
            <Stack.Screen name="EmergencyContact"     component={EmergencyContactScreen} />
            <Stack.Screen name="Dashboard"            component={UserDashboardScreen} />
            <Stack.Screen name="BookAppointments"     component={BookAppointment} />
            <Stack.Screen name="userSession"          component={UserSession} />
            <Stack.Screen name="CreateAppointment"    component={DoctorCreateAppointmentScreen} />
            <Stack.Screen name="DoctorAppointmentDetail" component={DoctorAppointmentDetailScreen} />
            <Stack.Screen name="DoctorProfileView"    component={DoctorProfileViewScreen} />
            <Stack.Screen name="DoctorChat"           component={DoctorChatScreen} />
            <Stack.Screen name="PatientChat"          component={PatientChatScreen} />
            <Stack.Screen name="UserChat"             component={UserChatScreen} />
            <Stack.Screen name="PeopleList"           component={PeopleListScreen} />
            <Stack.Screen name="UserProfile"          component={UserProfileViewScreen} />
            <Stack.Screen name="Settings"             component={SettingsScreen} />
            <Stack.Screen name="Wallet"               component={WalletScreen} />
            <Stack.Screen name="BankDetails"          component={BankDetailsScreen} />
            <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
            <Stack.Screen name="PrivacyPolicy"        component={PrivacyPolicyScreen} />
            <Stack.Screen name="TermsOfService"       component={TermsOfServiceScreen} />
            <Stack.Screen name="HelpFAQ"              component={HelpFAQScreen} />
            <Stack.Screen name="ContactSupport"       component={ContactSupportScreen} />
            <Stack.Screen name="ForgotPassword"       component={ForgotPasswordScreen} />
            <Stack.Screen name="OTPVerification"      component={OTPVerificationScreen} />
            <Stack.Screen name="ResetPassword"        component={ResetPasswordScreen} />
          </Stack.Navigator>

        </NavigationContainer>
      </StripeProvider>
    </SafeAreaProvider>
  );
}