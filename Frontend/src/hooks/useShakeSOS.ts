import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import { triggerSOS } from '../services/sosService';

const SHAKE_THRESHOLD  = 1.8;  // how hard the shake must be
const SHAKES_NEEDED    = 3;    // how many shakes needed
const RESET_TIME       = 3000; // reset count after 3 seconds

export const useShakeSOS = () => {
  const shakeCount    = useRef(0);
  const lastShakeTime = useRef(0);
  const alertShown    = useRef(false); // prevent duplicate popups

  useEffect(() => {
    // Check every 100ms
    Accelerometer.setUpdateInterval(100);

    const subscription = Accelerometer.addListener(({ x, y, z }) => {
      const force = Math.sqrt(x * x + y * y + z * z);
      const now   = Date.now();

      // Reset if too much time passed
      if (now - lastShakeTime.current > RESET_TIME) {
        shakeCount.current  = 0;
        alertShown.current  = false;
      }

      if (force > SHAKE_THRESHOLD) {
        shakeCount.current   += 1;
        lastShakeTime.current = now;

        // 🚨 3 shakes detected!
        if (shakeCount.current >= SHAKES_NEEDED && !alertShown.current) {
          shakeCount.current = 0;
          alertShown.current = true;

          Alert.alert(
            '🚨 SOS Detected',
            'Do you need emergency help?',
            [
              {
                text:    'I am Fine',
                style:   'cancel',
                onPress: () => { alertShown.current = false; },
              },
              {
                text:    'YES — Send SOS',
                style:   'destructive',
                onPress: () => triggerSOS(),
              },
            ],
          );
        }
      }
    });

    // Cleanup on unmount
    return () => subscription.remove();
  }, []);
};