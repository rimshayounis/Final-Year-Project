import React, { useState, useRef } from 'react';
import {
  Text,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Animated,
  PanResponder,
  Dimensions,
  View,
} from 'react-native';
import { triggerSOS } from '../services/sosService';

const SIZE = 44;
const { width: W, height: H } = Dimensions.get('window');

const INITIAL_X = 16;
const INITIAL_Y = H - 100 - SIZE;

export default function SOSButton() {
  const [sending, setSending] = useState(false);

  // Press scale feedback
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Draggable position (x = left, y = top)
  const pan      = useRef(new Animated.ValueXY({ x: INITIAL_X, y: INITIAL_Y })).current;
  const dragDist = useRef(0);

  const handleSOS = () => {
    if (sending) return;
    Alert.alert(
      '🚨 Emergency SOS',
      'Your location will be sent to your emergency contacts immediately.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send SOS Now',
          style: 'destructive',
          onPress: async () => {
            setSending(true);
            await triggerSOS();
            setSending(false);
          },
        },
      ],
    );
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,

      onPanResponderGrant: () => {
        pan.extractOffset();
        dragDist.current = 0;
        Animated.spring(scaleAnim, { toValue: 0.9, speed: 50, useNativeDriver: true }).start();
      },

      onPanResponderMove: (_, gs) => {
        dragDist.current = Math.sqrt(gs.dx * gs.dx + gs.dy * gs.dy);
        pan.setValue({ x: gs.dx, y: gs.dy });
      },

      onPanResponderRelease: (_) => {
        pan.flattenOffset();
        Animated.spring(scaleAnim, { toValue: 1, speed: 50, useNativeDriver: true }).start();

        const rawX = (pan.x as any)._value as number;
        const rawY = (pan.y as any)._value as number;
        const clampedX = Math.max(0, Math.min(W - SIZE, rawX));
        const clampedY = Math.max(0, Math.min(H - SIZE, rawY));

        Animated.spring(pan, {
          toValue: { x: clampedX, y: clampedY },
          bounciness: 6,
          useNativeDriver: false,
        }).start();

        if (dragDist.current < 8) {
          handleSOS();
        }
      },
    })
  ).current;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[styles.container, pan.getLayout()]}
    >
      {/* Main button */}
      <Animated.View style={[styles.button, { transform: [{ scale: scaleAnim }] }]}>
        {/* Top-highlight overlay for depth */}
        <View style={styles.highlight} pointerEvents="none" />

        {sending ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Text style={styles.icon}>🚨</Text>
            <Text style={styles.label}>SOS</Text>
          </>
        )}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 999,
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },

  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: '#E8192C',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    // White ring border
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.9)',
    // Drop shadow / glow
    elevation: 14,
    shadowColor: '#C0001A',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },

  // Subtle top-arc highlight for 3-D depth
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SIZE * 0.45,
    borderTopLeftRadius:  SIZE / 2,
    borderTopRightRadius: SIZE / 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },

  icon: {
    fontSize: 16,
    lineHeight: 18,
  },

  label: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    lineHeight: 12,
  },
});
