import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Audio, AVPlaybackStatus } from 'expo-av';

interface VoicePlayerProps {
  audioUri: string;
  duration: number;
  isUserMessage?: boolean; // true = sender (purple bubble), false = receiver (white bubble)
}

export default function VoicePlayer({ audioUri, duration, isUserMessage = false }: VoicePlayerProps) {
  const [sound,          setSound]          = useState<Audio.Sound | null>(null);
  const [isPlaying,      setIsPlaying]      = useState(false);
  const [position,       setPosition]       = useState(0);
  const [isLoading,      setIsLoading]      = useState(false);
  const [playbackSpeed,  setPlaybackSpeed]  = useState(1.0);
  const [isEarpieceMode, setIsEarpieceMode] = useState(false);
  const [totalDuration,  setTotalDuration]  = useState(duration * 1000);

  // Animated progress bar
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    return () => { sound?.unloadAsync(); };
  }, []);

  useEffect(() => {
    const ratio = totalDuration > 0 ? position / totalDuration : 0;
    Animated.timing(progressAnim, {
      toValue: ratio,
      duration: 80,
      useNativeDriver: false,
    }).start();
  }, [position, totalDuration]);

  // ── Colors based on sender / receiver ──────────────────────────────────────
  // isUserMessage = true  → sender   → purple bubble  → white controls
  // isUserMessage = false → receiver → white bubble   → purple controls
  const PLAY_BTN_BG     = isUserMessage ? 'rgba(255,255,255,0.25)' : '#6B7FED';
  const PLAY_ICON_COLOR = isUserMessage ? '#FFFFFF'                : '#FFFFFF';
  const WAVE_ACTIVE     = isUserMessage ? '#FFFFFF'                : '#6B7FED';
  const WAVE_INACTIVE   = isUserMessage ? 'rgba(255,255,255,0.35)' : 'rgba(107,127,237,0.25)';
  const PROGRESS_BG     = isUserMessage ? 'rgba(255,255,255,0.2)'  : 'rgba(107,127,237,0.15)';
  const PROGRESS_FILL   = isUserMessage ? '#FFFFFF'                : '#6B7FED';
  const TIME_COLOR      = isUserMessage ? 'rgba(255,255,255,0.8)'  : '#888888';
  const SPEED_BG        = isUserMessage ? 'rgba(255,255,255,0.2)'  : 'rgba(107,127,237,0.12)';
  const SPEED_COLOR     = isUserMessage ? '#FFFFFF'                : '#6B7FED';
  const SPEAKER_COLOR   = isUserMessage ? 'rgba(255,255,255,0.75)' : '#6B7FED';

  const setupAudioSession = async (useEarpiece: boolean) => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS:         useEarpiece,
        playsInSilentModeIOS:       true,
        staysActiveInBackground:    false,
        shouldDuckAndroid:          true,
        playThroughEarpieceAndroid: useEarpiece,
      });
    } catch (e) { console.error('Audio mode error:', e); }
  };

  const toggleEarpieceMode = async () => {
    if (!sound || !isPlaying) return;
    const newMode = !isEarpieceMode;
    try {
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        const pos = status.positionMillis;
        await sound.stopAsync();
        await setupAudioSession(newMode);
        await sound.setPositionAsync(pos);
        await sound.playAsync();
        setIsEarpieceMode(newMode);
      }
    } catch (e) { Alert.alert('Error', 'Failed to switch audio output'); }
  };

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    setPosition(status.positionMillis);
    if (status.durationMillis) setTotalDuration(status.durationMillis);
    if (status.didJustFinish) {
      setIsPlaying(false);
      setIsEarpieceMode(false);
      setTimeout(() => {
        setPosition(0);
        sound?.setPositionAsync(0);
      }, 400);
    }
  };

  const playSound = async () => {
    console.log('[VoicePlayer] uri:', audioUri, '| duration:', duration);
    try {
      setIsLoading(true);
      if (sound) {
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          if (isPlaying) {
            await sound.pauseAsync();
            setIsPlaying(false);
          } else {
            if (status.positionMillis >= (status.durationMillis || 0) - 100) {
              await sound.setPositionAsync(0);
              setPosition(0);
            }
            await sound.playAsync();
            setIsPlaying(true);
          }
        }
      } else {
        await setupAudioSession(false);
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: audioUri },
          { shouldPlay: true, rate: playbackSpeed, progressUpdateIntervalMillis: 80 },
          onPlaybackStatusUpdate,
        );
        setSound(newSound);
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('[VoicePlayer] error:', error);
      Alert.alert('Playback Error', `Could not play audio.\n${String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const changePlaybackSpeed = async () => {
    const speeds = [1.0, 1.5, 2.0];
    const next = speeds[(speeds.indexOf(playbackSpeed) + 1) % speeds.length];
    try {
      await sound?.setRateAsync(next, true);
      setPlaybackSpeed(next);
    } catch (e) { console.error('Speed error:', e); }
  };

  const formatTime = (millis: number) => {
    const s = Math.floor(millis / 1000);
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  };

  // 30 waveform bars with varied heights (like WhatsApp)
  const bars = Array.from({ length: 30 }, (_, i) => {
    const h = Math.abs(Math.sin(i * 0.8) * 0.6 + Math.sin(i * 0.3) * 0.4);
    return 4 + h * 20;
  });

  const displayDuration = totalDuration > 0 ? totalDuration : duration * 1000;
  const progress        = displayDuration > 0 ? position / displayDuration : 0;

  return (
    <View style={styles.container}>
      {/* ── Play / Pause Button ── */}
      <TouchableOpacity
        onPress={playSound}
        style={[styles.playBtn, { backgroundColor: PLAY_BTN_BG }]}
        disabled={isLoading}
        activeOpacity={0.75}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={PLAY_ICON_COLOR} />
        ) : (
          <MaterialIcons
            name={isPlaying ? 'pause' : 'play-arrow'}
            size={24}
            color={PLAY_ICON_COLOR}
          />
        )}
      </TouchableOpacity>

      {/* ── Right side: waveform + progress + meta ── */}
      <View style={styles.right}>

        {/* Waveform bars */}
        <View style={styles.waveformRow}>
          {bars.map((h, i) => {
            const played = i / bars.length <= progress;
            return (
              <View
                key={i}
                style={[
                  styles.bar,
                  {
                    height: h,
                    backgroundColor: played ? WAVE_ACTIVE : WAVE_INACTIVE,
                    borderRadius: 2,
                  },
                ]}
              />
            );
          })}
        </View>

        {/* Progress track */}
        <View style={[styles.progressTrack, { backgroundColor: PROGRESS_BG }]}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                backgroundColor: PROGRESS_FILL,
                width: progressAnim.interpolate({
                  inputRange:  [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>

        {/* Time + controls row */}
        <View style={styles.metaRow}>
          <Text style={[styles.timeText, { color: TIME_COLOR }]}>
            {isPlaying || position > 0
              ? `${formatTime(position)} / ${formatTime(displayDuration)}`
              : formatTime(displayDuration)}
          </Text>

          <View style={styles.controls}>
            {/* Speaker toggle — only while playing */}
            {isPlaying && (
              <TouchableOpacity onPress={toggleEarpieceMode} style={styles.iconBtn}>
                <MaterialIcons
                  name={isEarpieceMode ? 'hearing' : 'volume-up'}
                  size={15}
                  color={isEarpieceMode ? '#4CAF50' : SPEAKER_COLOR}
                />
              </TouchableOpacity>
            )}
            {/* Speed button — only after first play */}
            {sound && (
              <TouchableOpacity
                onPress={changePlaybackSpeed}
                style={[styles.speedBtn, { backgroundColor: SPEED_BG }]}
              >
                <Text style={[styles.speedText, { color: SPEED_COLOR }]}>
                  {playbackSpeed === 1.0 ? '1×' : `${playbackSpeed}×`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // ✅ Fix
container: {
  flexDirection: 'row', alignItems: 'center',
  gap: 10, paddingVertical: 4,
  width: 220,
},
  playBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  right: {
    flex: 1,
    gap: 4,
  },
  waveformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 28,
  },
  bar: {
    flex: 1,
    minHeight: 3,
    maxHeight: 28,
  },
  progressTrack: {
    height: 2,
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 1,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBtn: {
    padding: 2,
  },
  speedBtn: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  speedText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
