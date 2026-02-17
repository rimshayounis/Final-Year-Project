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
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [waveformData, setWaveformData] = useState<number[]>(Array(35).fill(2));
  
  const animatedScale = useRef(new Animated.Value(1)).current;
  const pulseAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const meteringInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    startRecording();
    return () => {
      if (meteringInterval.current) {
        clearInterval(meteringInterval.current);
      }
      stopRecording(true);
    };
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, isPaused]);

  const startPulseAnimation = () => {
    pulseAnimation.current = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedScale, {
          toValue: 1.3,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(animatedScale, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.current.start();
  };

  const stopPulseAnimation = () => {
    if (pulseAnimation.current) {
      pulseAnimation.current.stop();
    }
    animatedScale.setValue(1);
  };

  const updateWaveform = (meteringLevel: number) => {
    // meteringLevel ranges from -160 (silence) to 0 (loudest)
    let height;
    
    // More aggressive thresholds for detecting silence
    if (meteringLevel < -80) {
      // Silence or very quiet - completely flat
      height = 2;
    } else if (meteringLevel < -50) {
      // Quiet speech - small bars
      height = ((meteringLevel + 80) / 30) * 8 + 2; // 2-10px
    } else if (meteringLevel < -30) {
      // Normal speech - medium bars
      height = ((meteringLevel + 50) / 20) * 12 + 10; // 10-22px
    } else {
      // Loud speech - tall bars
      height = ((meteringLevel + 30) / 30) * 10 + 22; // 22-32px
    }
    
    height = Math.max(2, Math.min(32, height));
    
    setWaveformData((prev) => {
      const newData = [...prev.slice(1), height];
      return newData;
    });
  };

  const startMetering = (recordingInstance: Audio.Recording) => {
    if (meteringInterval.current) {
      clearInterval(meteringInterval.current);
    }

    meteringInterval.current = setInterval(async () => {
      try {
        const status = await recordingInstance.getStatusAsync();
        if (status.isRecording && status.metering !== undefined) {
          updateWaveform(status.metering);
        } else {
          // If no metering data, keep it flat
          setWaveformData((prev) => [...prev.slice(1), 2]);
        }
      } catch (error) {
        console.error('Error getting metering:', error);
        // Keep it flat on error
        setWaveformData((prev) => [...prev.slice(1), 2]);
      }
    }, 80);
  };

  const stopMetering = () => {
    if (meteringInterval.current) {
      clearInterval(meteringInterval.current);
      meteringInterval.current = null;
    }
  };

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Microphone permission is needed');
        onCancel();
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: recordingInstance } = await Audio.Recording.createAsync(
        {
          isMeteringEnabled: true, // ✅ Ensure metering is enabled
          android: {
            extension: '.m4a',
            outputFormat: Audio.AndroidOutputFormat.MPEG_4,
            audioEncoder: Audio.AndroidAudioEncoder.AAC,
            sampleRate: 44100,
            numberOfChannels: 2,
            bitRate: 128000,
          },
          ios: {
            extension: '.m4a',
            outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
            audioQuality: Audio.IOSAudioQuality.HIGH,
            sampleRate: 44100,
            numberOfChannels: 2,
            bitRate: 128000,
            linearPCMBitDepth: 16,
            linearPCMIsBigEndian: false,
            linearPCMIsFloat: false,
          },
          web: {
            mimeType: 'audio/webm',
            bitsPerSecond: 128000,
          },
        },
        undefined,
        100 // ✅ Poll every 100ms for metering
      );

      setRecording(recordingInstance);
      setIsRecording(true);
      startPulseAnimation();
      startMetering(recordingInstance);
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'Failed to start recording');
      onCancel();
    }
  };

  const pauseRecording = async () => {
    if (recording) {
      try {
        await recording.pauseAsync();
        setIsPaused(true);
        stopPulseAnimation();
        stopMetering();
        setWaveformData(Array(35).fill(2));
      } catch (err) {
        console.error('Failed to pause recording', err);
      }
    }
  };

  const resumeRecording = async () => {
    if (recording) {
      try {
        await recording.startAsync();
        setIsPaused(false);
        startPulseAnimation();
        startMetering(recording);
      } catch (err) {
        console.error('Failed to resume recording', err);
      }
    }
  };

  const stopRecording = async (cancel: boolean = false) => {
    if (recording) {
      try {
        stopPulseAnimation();
        stopMetering();
        await recording.stopAndUnloadAsync();
        
        if (!cancel) {
          const uri = recording.getURI();
          if (uri) {
            onSend(uri, duration);
          }
        }
        
        setRecording(null);
        setIsRecording(false);
      } catch (err) {
        console.error('Failed to stop recording', err);
      }
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
        {/* Delete Button */}
        <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
          <MaterialIcons name="delete" size={24} color="#FF4444" />
        </TouchableOpacity>

        {/* Waveform Visualization */}
        <View style={styles.waveformContainer}>
          {/* Timer at the top */}
          <Text style={styles.duration}>{formatDuration(duration)}</Text>
          
          {/* Waveform */}
          <View style={styles.waveformWrapper}>
            <View style={styles.waveform}>
              {waveformData.map((height, index) => (
                <View
                  key={index}
                  style={[
                    styles.waveformBar,
                    {
                      height: isPaused ? 2 : height,
                    },
                  ]}
                />
              ))}
            </View>
          </View>

          {/* Recording Indicator */}
          <Animated.View
            style={[
              styles.recordingIndicator,
              {
                transform: [{ scale: animatedScale }],
              },
            ]}
          >
            <View style={[styles.recordingDot, isPaused && styles.pausedDot]} />
          </Animated.View>
        </View>

        {/* Pause/Resume Button */}
        <TouchableOpacity
          onPress={isPaused ? resumeRecording : pauseRecording}
          style={styles.pauseButton}
        >
          <MaterialIcons
            name={isPaused ? 'play-arrow' : 'pause'}
            size={28}
            color="#6B7FED"
          />
        </TouchableOpacity>

        {/* Send Button */}
        <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
          <Ionicons name="send" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  deleteButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waveformContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    height: 55,
    justifyContent: 'space-between',
  },
  duration: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
    marginBottom: 2,
  },
  waveformWrapper: {
    flex: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 32,
    gap: 2,
  },
  waveformBar: {
    width: 2.5,
    backgroundColor: '#000000',
    borderRadius: 1.25,
    minHeight: 2,
    maxHeight: 32,
  },
  recordingIndicator: {
    position: 'absolute',
    top: 8,
    right: 10,
    width: 10,
    height: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF4444',
  },
  pausedDot: {
    backgroundColor: '#FFA500',
  },
  pauseButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F0F4FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#6B7FED',
    justifyContent: 'center',
    alignItems: 'center',
  },
});