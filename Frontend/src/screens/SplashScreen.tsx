import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';

type SplashScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Splash'>;
};

const { width, height } = Dimensions.get('window');

export default function SplashScreen({ navigation }: SplashScreenProps) {
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.8);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      navigation.replace('LoginType');
    }, 2500);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.illustrationContainer}>
          <View style={styles.circle1} />
          <View style={styles.circle2} />
          <View style={styles.calendar}>
            <View style={styles.calendarHeader}>
              {[...Array(8)].map((_, i) => (
                <View key={i} style={styles.calendarDot} />
              ))}
            </View>
            <View style={styles.calendarGrid}>
              {[...Array(12)].map((_, i) => (
                <View key={i} style={styles.calendarCell} />
              ))}
            </View>
          </View>
          <View style={styles.doctorContainer}>
            <View style={styles.doctorHead}>
              <View style={styles.doctorHair} />
              <View style={styles.doctorFace}>
                <View style={[styles.doctorEye, { left: 20 }]} />
                <View style={[styles.doctorEye, { right: 20 }]} />
                <View style={styles.doctorMouth} />
              </View>
            </View>
            <View style={styles.doctorBody}>
              <View style={styles.stethoscope} />
              <View style={[styles.doctorArm, { left: -10 }]} />
              <View style={[styles.doctorArm, { right: -10 }]} />
            </View>
          </View>
          <View style={styles.medicalIcon1}>
            <Text style={styles.iconText}>💊</Text>
          </View>
          <View style={styles.medicalIcon2}>
            <Text style={styles.iconText}>🩺</Text>
          </View>
        </View>
        <Text style={styles.title}>TruHeal-Link</Text>
      </Animated.View>
      <View style={styles.indicator} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationContainer: {
    width: 300,
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  circle1: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#E8F4F8',
    top: 10,
    left: 10,
  },
  circle2: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#D4E9F7',
    bottom: 20,
    right: 20,
  },
  calendar: {
    position: 'absolute',
    left: 30,
    top: 40,
    width: 80,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 6,
  },
  calendarDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#6B8EF7',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  calendarCell: {
    width: 14,
    height: 14,
    margin: 2,
    backgroundColor: '#E8F4F8',
    borderRadius: 2,
  },
  doctorContainer: {
    alignItems: 'center',
    zIndex: 10,
  },
  doctorHead: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFD1B3',
    overflow: 'visible',
  },
  doctorHair: {
    position: 'absolute',
    top: 0,
    left: 10,
    right: 10,
    height: 30,
    backgroundColor: '#2C3E50',
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
  },
  doctorFace: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doctorEye: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2C3E50',
    top: 12,
  },
  doctorMouth: {
    width: 14,
    height: 7,
    borderBottomLeftRadius: 7,
    borderBottomRightRadius: 7,
    borderWidth: 1.5,
    borderColor: '#2C3E50',
    borderTopWidth: 0,
    position: 'absolute',
    bottom: 8,
  },
  doctorBody: {
    width: 80,
    height: 60,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginTop: -5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stethoscope: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 3,
    borderColor: '#6B8EF7',
    top: 10,
    left: 25,
  },
  doctorArm: {
    position: 'absolute',
    width: 20,
    height: 40,
    backgroundColor: '#FFD1B3',
    borderRadius: 10,
    top: 20,
  },
  medicalIcon1: {
    position: 'absolute',
    right: 40,
    top: 60,
  },
  medicalIcon2: {
    position: 'absolute',
    left: 50,
    bottom: 40,
  },
  iconText: {
    fontSize: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#2C3E50',
    letterSpacing: 0.5,
  },
  indicator: {
    position: 'absolute',
    bottom: 40,
    width: 60,
    height: 4,
    backgroundColor: '#2C3E50',
    borderRadius: 2,
  },
});