import React, { useState, useRef } from 'react';
import {
  View, Image, Modal, TouchableOpacity,
  StyleSheet, StatusBar, Dimensions,
  PanResponder, Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface ImageViewerProps {
  uri: string;
  thumbnailStyle?: object;
}

const { width: W, height: H } = Dimensions.get('window');
const MIN_SCALE = 1;
const MAX_SCALE = 5;

function ZoomableImage({ uri }: { uri: string }) {
  const scale        = useRef(new Animated.Value(1)).current;
  const translateX   = useRef(new Animated.Value(0)).current;
  const translateY   = useRef(new Animated.Value(0)).current;

  // Raw values we track outside Animated for math
  const currentScale = useRef(1);
  const currentX     = useRef(0);
  const currentY     = useRef(0);

  // Pinch tracking
  const lastDistance = useRef<number | null>(null);

  // Double tap tracking
  const lastTap = useRef<number>(0);

  const resetZoom = () => {
    currentScale.current = 1;
    currentX.current     = 0;
    currentY.current     = 0;
    Animated.parallel([
      Animated.spring(scale,      { toValue: 1, useNativeDriver: true }),
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
    ]).start();
  };

  const getDistance = (touches: any[]) => {
    const dx = touches[0].pageX - touches[1].pageX;
    const dy = touches[0].pageY - touches[1].pageY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder:        () => true,
      onMoveShouldSetPanResponder:         () => true,
      onStartShouldSetPanResponderCapture: () => true,

      onPanResponderGrant: (evt) => {
        // Double tap detection
        const now = Date.now();
        if (now - lastTap.current < 300) {
          // Double tap
          if (currentScale.current > 1) {
            resetZoom();
          } else {
            currentScale.current = 2.5;
            Animated.spring(scale, { toValue: 2.5, useNativeDriver: true }).start();
          }
        }
        lastTap.current = now;
        lastDistance.current = null;
      },

      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches;

        if (touches.length === 2) {
          // ── Pinch to zoom ──
          const dist = getDistance(touches as any);
          if (lastDistance.current !== null) {
            const delta    = dist / lastDistance.current;
            const newScale = Math.min(
              MAX_SCALE,
              Math.max(MIN_SCALE, currentScale.current * delta),
            );
            currentScale.current = newScale;
            scale.setValue(newScale);
          }
          lastDistance.current = dist;
        } else if (touches.length === 1 && currentScale.current > 1) {
          // ── Pan when zoomed in ──
          const newX = currentX.current + gestureState.dx;
          const newY = currentY.current + gestureState.dy;
          translateX.setValue(newX);
          translateY.setValue(newY);
        }
      },

      onPanResponderRelease: (evt, gestureState) => {
        lastDistance.current = null;
        if (evt.nativeEvent.touches.length === 0) {
          // Save pan position only if we were panning (1 touch)
          if (currentScale.current > 1) {
            currentX.current += gestureState.dx;
            currentY.current += gestureState.dy;
          }
          // Snap back if scale < 1
          if (currentScale.current <= 1) {
            resetZoom();
          }
        }
      },
    })
  ).current;

  return (
    <Animated.View
      style={[
        styles.zoomContainer,
        {
          transform: [
            { translateX },
            { translateY },
            { scale },
          ],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <Image source={{ uri }} style={styles.fullImage} resizeMode="contain" />
    </Animated.View>
  );
}

export default function ImageViewer({ uri, thumbnailStyle }: ImageViewerProps) {
  const [visible, setVisible] = useState(false);

  return (
    <>
      {/* Thumbnail */}
      <TouchableOpacity onPress={() => setVisible(true)} activeOpacity={0.92}>
        <Image
          source={{ uri }}
          style={[styles.thumbnail, thumbnailStyle]}
          resizeMode="cover"
        />
        <View style={styles.expandHint}>
          <MaterialIcons name="fullscreen" size={16} color="#fff" />
        </View>
      </TouchableOpacity>

      {/* Fullscreen modal */}
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setVisible(false)}
      >
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.modalBg}>
          {/* Close button */}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => setVisible(false)}
          >
            <MaterialIcons name="close" size={26} color="#fff" />
          </TouchableOpacity>

          {/* Zoomable image */}
          <ZoomableImage uri={uri} />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  thumbnail: {
    width: 200, height: 150, borderRadius: 12,
    marginBottom: 4, backgroundColor: '#ddd',
  },
  expandHint: {
    position: 'absolute', bottom: 8, right: 6,
    backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 6, padding: 2,
  },
  modalBg: {
    flex: 1, backgroundColor: '#000',
    justifyContent: 'center', alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute', top: 48, right: 20, zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: 6,
  },
  zoomContainer: {
    width: W, height: H,
    justifyContent: 'center', alignItems: 'center',
  },
  fullImage: {
    width: W, height: H,
  },
});
