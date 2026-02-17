import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Audio, AVPlaybackStatus } from 'expo-av';

interface VoicePlayerProps {
  audioUri: string;
  duration: number;
  isUserMessage?: boolean;
}

export default function VoicePlayer({ audioUri, duration, isUserMessage = false }: VoicePlayerProps) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [isEarpieceMode, setIsEarpieceMode] = useState(false);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  const setupAudioSession = async (useEarpiece: boolean) => {
    try {
      if (useEarpiece) {
        // Earpiece mode - for private listening (like phone call)
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true, // Key: This enables earpiece routing on iOS
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: true,
        });
      } else {
        // Speaker mode - for loud playback
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      }
      console.log(`Audio mode set to: ${useEarpiece ? 'EARPIECE' : 'SPEAKER'}`);
    } catch (error) {
      console.error('Error setting audio mode:', error);
    }
  };

  const toggleEarpieceMode = async () => {
    if (!sound || !isPlaying) return;

    const newMode = !isEarpieceMode;
    
    try {
      // Get current playback position
      const status = await sound.getStatusAsync();
      
      if (status.isLoaded) {
        const currentPosition = status.positionMillis;
        
        // Stop current playback
        await sound.stopAsync();
        
        // Change audio mode
        await setupAudioSession(newMode);
        
        // Resume from same position
        await sound.setPositionAsync(currentPosition);
        await sound.playAsync();
        
        setIsEarpieceMode(newMode);
        
        // Show feedback to user
     
      }
    } catch (error) {
      console.error('Error toggling earpiece mode:', error);
      Alert.alert('Error', 'Failed to switch audio output');
    }
  };

  const playSound = async () => {
    try {
      setIsLoading(true);
      
      if (sound) {
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          if (isPlaying) {
            // Pause
            await sound.pauseAsync();
            setIsPlaying(false);
          } else {
            // Check if finished, replay from start
            if (status.positionMillis >= (status.durationMillis || 0) - 100) {
              await sound.setPositionAsync(0);
              setPosition(0);
            }
            await sound.playAsync();
            setIsPlaying(true);
          }
        }
      } else {
        // Create new sound
        await setupAudioSession(isEarpieceMode);

        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: audioUri },
          { 
            shouldPlay: true, 
            rate: playbackSpeed,
            progressUpdateIntervalMillis: 100,
          },
          onPlaybackStatusUpdate
        );
        
        setSound(newSound);
        setIsPlaying(true);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error playing sound:', error);
      Alert.alert('Error', 'Failed to play audio');
      setIsLoading(false);
    }
  };

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis);
      
      if (status.didJustFinish) {
        setIsPlaying(false);
        setIsEarpieceMode(false); // Reset to speaker when finished
        setTimeout(() => {
          setPosition(0);
          sound?.setPositionAsync(0);
        }, 500);
      }
    }
  };

  const changePlaybackSpeed = async () => {
    if (!sound) return;

    const speeds = [1.0, 1.25, 1.5, 2.0];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    
    try {
      await sound.setRateAsync(nextSpeed, true);
      setPlaybackSpeed(nextSpeed);
    } catch (error) {
      console.error('Error changing playback speed:', error);
    }
  };

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? position / (duration * 1000) : 0;

  const waveformBars = Array.from({ length: 30 }, (_, i) => {
    const amplitude = Math.sin(i * 0.5) * 0.5 + 0.5;
    return 8 + amplitude * 20;
  });

  return (
    <View style={[styles.container, isUserMessage && styles.userContainer]}>
      <TouchableOpacity
        onPress={playSound}
        style={[styles.playButton, isUserMessage && styles.userPlayButton]}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={isUserMessage ? '#6B7FED' : '#FFFFFF'} />
        ) : (
          <MaterialIcons
            name={isPlaying ? 'pause' : 'play-arrow'}
            size={22}
            color={isUserMessage ? '#6B7FED' : '#FFFFFF'}
          />
        )}
      </TouchableOpacity>

      <View style={styles.contentContainer}>
        <View style={styles.waveformContainer}>
          <View style={styles.waveform}>
            {waveformBars.map((height, index) => {
              const barProgress = index / waveformBars.length;
              const isPlayed = barProgress <= progress;
              
              return (
                <View
                  key={index}
                  style={[
                    styles.waveformBar,
                    {
                      height,
                      backgroundColor: isPlayed
                        ? isUserMessage
                          ? '#6B7FED'
                          : '#FFFFFF'
                        : isUserMessage
                        ? 'rgba(107, 127, 237, 0.3)'
                        : 'rgba(255, 255, 255, 0.4)',
                    },
                  ]}
                />
              );
            })}
          </View>
        </View>

        <View style={styles.controlsRow}>
          <View style={styles.timeContainer}>
            <Text style={[styles.timeText, isUserMessage && styles.userTimeText]}>
              {formatTime(position)} / {formatTime(duration * 1000)}
            </Text>
          </View>

          <View style={styles.buttonsContainer}>
            {sound && isPlaying && (
              <TouchableOpacity 
                onPress={toggleEarpieceMode} 
                style={[
                  styles.iconButton,
                  isEarpieceMode && styles.iconButtonActive
                ]}
              >
                <MaterialIcons 
                  name={isEarpieceMode ? 'hearing' : 'volume-up'} 
                  size={14} 
                  color={
                    isEarpieceMode 
                      ? '#4CAF50' 
                      : isUserMessage 
                      ? '#6B7FED' 
                      : 'rgba(255,255,255,0.8)'
                  } 
                />
              </TouchableOpacity>
            )}

            {sound && (
              <TouchableOpacity onPress={changePlaybackSpeed} style={styles.speedButton}>
                <Text style={[styles.speedText, isUserMessage && styles.userSpeedText]}>
                  {playbackSpeed}x
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
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 5,
    minWidth: 200,
  },
  userContainer: {},
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userPlayButton: {
    backgroundColor: '#E8F0FE',
  },
  contentContainer: {
    flex: 1,
    gap: 6,
  },
  waveformContainer: {
    height: 28,
    justifyContent: 'center',
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 28,
  },
  waveformBar: {
    width: 2.5,
    borderRadius: 1.25,
    minHeight: 4,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  timeText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  userTimeText: {
    color: '#666',
  },
  buttonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconButton: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  iconButtonActive: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
  },
  speedButton: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  speedText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  userSpeedText: {
    color: '#6B7FED',
  },
});