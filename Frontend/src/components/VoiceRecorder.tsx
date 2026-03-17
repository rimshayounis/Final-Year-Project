import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

interface VoiceRecorderProps {
  onSend: (audioUri: string, duration: number) => void;
  onCancel: () => void;
}

export default function VoiceRecorder({ onSend, onCancel }: VoiceRecorderProps) {
  const [recording,    setRecording]    = useState<Audio.Recording | null>(null);
  const [isRecording,  setIsRecording]  = useState(false);
  const [isPaused,     setIsPaused]     = useState(false);
  const [duration,     setDuration]     = useState(0);
  const [waveformData, setWaveformData] = useState<number[]>(Array(35).fill(2));

  const animatedScale    = useRef(new Animated.Value(1)).current;
  const pulseAnimation   = useRef<Animated.CompositeAnimation | null>(null);
  const meteringInterval = useRef<NodeJS.Timeout | null>(null);
  // ── keep a ref so the cleanup always sees the latest instance ──
  const recordingRef     = useRef<Audio.Recording | null>(null);
  const isMounted        = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    startRecording();

    return () => {
      isMounted.current = false;
      stopMetering();
      stopPulseAnimation();
      // ── unload whatever recording is still alive ──
      if (recordingRef.current) {
        recordingRef.current
          .stopAndUnloadAsync()
          .catch(() => {});
        recordingRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        if (isMounted.current) setDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, isPaused]);

  // ── pulse ────────────────────────────────────────────────────────────────────

  const startPulseAnimation = () => {
    pulseAnimation.current = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedScale, { toValue: 1.3, duration: 800, useNativeDriver: true }),
        Animated.timing(animatedScale, { toValue: 1,   duration: 800, useNativeDriver: true }),
      ])
    );
    pulseAnimation.current.start();
  };

  const stopPulseAnimation = () => {
    pulseAnimation.current?.stop();
    animatedScale.setValue(1);
  };

  // ── waveform ─────────────────────────────────────────────────────────────────

  const updateWaveform = (meteringLevel: number) => {
    let height: number;
    if      (meteringLevel < -80) height = 2;
    else if (meteringLevel < -50) height = ((meteringLevel + 80) / 30) * 8  + 2;
    else if (meteringLevel < -30) height = ((meteringLevel + 50) / 20) * 12 + 10;
    else                          height = ((meteringLevel + 30) / 30) * 10 + 22;
    height = Math.max(2, Math.min(32, height));
    if (isMounted.current) {
      setWaveformData(prev => [...prev.slice(1), height]);
    }
  };

  const startMetering = (rec: Audio.Recording) => {
    stopMetering();
    meteringInterval.current = setInterval(async () => {
      try {
        const status = await rec.getStatusAsync();
        if (status.isRecording && status.metering !== undefined) {
          updateWaveform(status.metering);
        } else if (isMounted.current) {
          setWaveformData(prev => [...prev.slice(1), 2]);
        }
      } catch {
        if (isMounted.current) setWaveformData(prev => [...prev.slice(1), 2]);
      }
    }, 80);
  };

  const stopMetering = () => {
    if (meteringInterval.current) {
      clearInterval(meteringInterval.current);
      meteringInterval.current = null;
    }
  };

  // ── recording controls ───────────────────────────────────────────────────────

  const startRecording = async () => {
    try {
      // ── unload any leftover recording first ──
      if (recordingRef.current) {
        try { await recordingRef.current.stopAndUnloadAsync(); } catch {}
        recordingRef.current = null;
      }

      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Microphone permission is needed');
        onCancel();
        return;
      }

      // ── reset audio session so the previous session is fully released ──
      await Audio.setAudioModeAsync({
        allowsRecordingIOS:  true,
        playsInSilentModeIOS: true,
      });

      const { recording: rec } = await Audio.Recording.createAsync(
        {
          isMeteringEnabled: true,
          android: {
            extension:      '.m4a',
            outputFormat:   Audio.AndroidOutputFormat.MPEG_4,
            audioEncoder:   Audio.AndroidAudioEncoder.AAC,
            sampleRate:     44100,
            numberOfChannels: 2,
            bitRate:        128000,
          },
          ios: {
            extension:        '.m4a',
            outputFormat:     Audio.IOSOutputFormat.MPEG4AAC,
            audioQuality:     Audio.IOSAudioQuality.HIGH,
            sampleRate:       44100,
            numberOfChannels: 2,
            bitRate:          128000,
            linearPCMBitDepth:   16,
            linearPCMIsBigEndian: false,
            linearPCMIsFloat:     false,
          },
          web: { mimeType: 'audio/webm', bitsPerSecond: 128000 },
        },
        undefined,
        100,
      );

      recordingRef.current = rec;
      if (isMounted.current) {
        setRecording(rec);
        setIsRecording(true);
      }
      startPulseAnimation();
      startMetering(rec);
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'Failed to start recording');
      onCancel();
    }
  };

  const pauseRecording = async () => {
    const rec = recordingRef.current;
    if (!rec) return;
    try {
      await rec.pauseAsync();
      stopPulseAnimation();
      stopMetering();
      if (isMounted.current) {
        setIsPaused(true);
        setWaveformData(Array(35).fill(2));
      }
    } catch (err) {
      console.error('Failed to pause recording', err);
    }
  };

  const resumeRecording = async () => {
    const rec = recordingRef.current;
    if (!rec) return;
    try {
      await rec.startAsync();
      if (isMounted.current) setIsPaused(false);
      startPulseAnimation();
      startMetering(rec);
    } catch (err) {
      console.error('Failed to resume recording', err);
    }
  };

  const stopRecording = async (cancel: boolean = false) => {
    const rec = recordingRef.current;
    if (!rec) return;

    stopPulseAnimation();
    stopMetering();

    try {
      await rec.stopAndUnloadAsync();
    } catch {
      // already unloaded — safe to ignore
    }

    recordingRef.current = null;

    if (isMounted.current) {
      setRecording(null);
      setIsRecording(false);
    }

    if (!cancel) {
      const uri = rec.getURI();
      if (uri) onSend(uri, duration);
    }
  };

  const handleDelete = async () => {
    await stopRecording(true);
    onCancel();
  };

  const handleSend = async () => {
    await stopRecording(false);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
          <MaterialIcons name="delete" size={24} color="#FF4444" />
        </TouchableOpacity>

        <View style={styles.waveformContainer}>
          <Text style={styles.duration}>{formatDuration(duration)}</Text>
          <View style={styles.waveformWrapper}>
            <View style={styles.waveform}>
              {waveformData.map((height, index) => (
                <View
                  key={index}
                  style={[styles.waveformBar, { height: isPaused ? 2 : height }]}
                />
              ))}
            </View>
          </View>
          <Animated.View
            style={[styles.recordingIndicator, { transform: [{ scale: animatedScale }] }]}
          >
            <View style={[styles.recordingDot, isPaused && styles.pausedDot]} />
          </Animated.View>
        </View>

        <TouchableOpacity
          onPress={isPaused ? resumeRecording : pauseRecording}
          style={styles.pauseButton}
        >
          <MaterialIcons name={isPaused ? 'play-arrow' : 'pause'} size={28} color="#6B7FED" />
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
          <Ionicons name="send" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:          { backgroundColor: '#FFFFFF', paddingVertical: 10, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: '#E0E0E0' },
  content:            { flexDirection: 'row', alignItems: 'center', gap: 10 },
  deleteButton:       { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  waveformContainer:  { flex: 1, backgroundColor: '#F5F5F5', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, height: 55, justifyContent: 'space-between' },
  duration:           { fontSize: 11, fontWeight: '600', color: '#666', textAlign: 'center', marginBottom: 2 },
  waveformWrapper:    { flex: 1, justifyContent: 'center', overflow: 'hidden' },
  waveform:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 32, gap: 2 },
  waveformBar:        { width: 2.5, backgroundColor: '#000000', borderRadius: 1.25, minHeight: 2, maxHeight: 32 },
  recordingIndicator: { position: 'absolute', top: 8, right: 10, width: 10, height: 10, justifyContent: 'center', alignItems: 'center' },
  recordingDot:       { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF4444' },
  pausedDot:          { backgroundColor: '#FFA500' },
  pauseButton:        { width: 42, height: 42, borderRadius: 21, backgroundColor: '#F0F4FF', justifyContent: 'center', alignItems: 'center' },
  sendButton:         { width: 42, height: 42, borderRadius: 21, backgroundColor: '#6B7FED', justifyContent: 'center', alignItems: 'center' },
});