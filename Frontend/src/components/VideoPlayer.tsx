import React, { useRef, useState, useEffect } from 'react';
import {
  View, TouchableOpacity, StyleSheet, Text,
  ActivityIndicator, Dimensions, Modal, StatusBar,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { MaterialIcons } from '@expo/vector-icons';

// ─────────────────────────────────────────────────────────────────────────────
// Global registry — so playing a new video stops all others
// ─────────────────────────────────────────────────────────────────────────────
type StopFn = () => void;
const globalPlayers: Map<string, StopFn> = new Map();
let playerIdCounter = 0;

const registerPlayer = (id: string, stop: StopFn) => globalPlayers.set(id, stop);
const unregisterPlayer = (id: string) => globalPlayers.delete(id);
const stopAllExcept = (exceptId: string) => {
  globalPlayers.forEach((stop, id) => { if (id !== exceptId) stop(); });
};
// ─────────────────────────────────────────────────────────────────────────────

interface VideoPlayerProps {
  uri: string;
  fileName?: string;
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
//const THUMB_W = Math.min(SCREEN_W * 0.65, 240);
const THUMB_W = 220;
const THUMB_H = 130;
//const THUMB_H = THUMB_W * 0.56;

export default function VideoPlayer({ uri, fileName }: VideoPlayerProps) {
  const playerId   = useRef(`player_${++playerIdCounter}`).current;
  const videoRef   = useRef<Video>(null);
  const fsVideoRef = useRef<Video>(null);

  const [isPlaying,     setIsPlaying]     = useState(false);
  const [isLoading,     setIsLoading]     = useState(false);
  const [hasError,      setHasError]      = useState(false);
  const [duration,      setDuration]      = useState(0);
  const [position,      setPosition]      = useState(0);
  const [showControls,  setShowControls]  = useState(true);
  const [isFullscreen,  setIsFullscreen]  = useState(false);
  const [fsIsPlaying,   setFsIsPlaying]   = useState(false);
  const [fsPosition,    setFsPosition]    = useState(0);
  const [fsDuration,    setFsDuration]    = useState(0);

  // Register this player for global stop
  useEffect(() => {
    registerPlayer(playerId, () => {
      videoRef.current?.pauseAsync();
      setIsPlaying(false);
    });
    return () => { unregisterPlayer(playerId); };
  }, []);

  const onStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) { if ((status as any).error) setHasError(true); return; }
    setIsPlaying(status.isPlaying);
    setIsLoading(status.isBuffering);
    if (status.durationMillis) setDuration(status.durationMillis);
    setPosition(status.positionMillis);
    if (status.didJustFinish) {
      setIsPlaying(false);
      setShowControls(true);
      videoRef.current?.setPositionAsync(0);
    }
  };

  const onFsStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    setFsIsPlaying(status.isPlaying);
    if (status.durationMillis) setFsDuration(status.durationMillis);
    setFsPosition(status.positionMillis);
    if (status.didJustFinish) {
      setFsIsPlaying(false);
      fsVideoRef.current?.setPositionAsync(0);
    }
  };

  const togglePlay = async () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      await videoRef.current.pauseAsync();
      setShowControls(true);
    } else {
      // Stop all other videos first
      stopAllExcept(playerId);
      await videoRef.current.playAsync();
      setTimeout(() => setShowControls(false), 2000);
    }
  };

  const openFullscreen = async () => {
    // Pause inline player
    await videoRef.current?.pauseAsync();
    setIsPlaying(false);
    setShowControls(true);
    setIsFullscreen(true);
  };

  const closeFullscreen = async () => {
    await fsVideoRef.current?.pauseAsync();
    setFsIsPlaying(false);
    setIsFullscreen(false);
  };

  const toggleFsPlay = async () => {
    if (!fsVideoRef.current) return;
    if (fsIsPlaying) {
      await fsVideoRef.current.pauseAsync();
    } else {
      stopAllExcept(playerId);
      await fsVideoRef.current.playAsync();
    }
  };

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  };

  const progress   = duration   > 0 ? (position   / duration)   * 100 : 0;
  const fsProgress = fsDuration > 0 ? (fsPosition / fsDuration) * 100 : 0;

  if (hasError) {
    return (
      <View style={[styles.thumbContainer, { width: THUMB_W, height: THUMB_H }]}>
        <View style={styles.errorBox}>
          <MaterialIcons name="videocam-off" size={28} color="#888" />
          <Text style={styles.errorText}>Video unavailable</Text>
        </View>
      </View>
    );
  }

  return (
    <>
      {/* ── Inline thumbnail player ── */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => setShowControls(p => !p)}
        style={[styles.thumbContainer, { width: THUMB_W, height: THUMB_H }]}
      >
        <Video
          ref={videoRef}
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          resizeMode={ResizeMode.COVER}
          onPlaybackStatusUpdate={onStatusUpdate}
          shouldPlay={false}
          isLooping={false}
          useNativeControls={false}
        />

        {(showControls || !isPlaying) && (
          <View style={styles.overlay}>
            {/* Play/pause */}
            <TouchableOpacity onPress={togglePlay} style={styles.playBtn} activeOpacity={0.85}>
              {isLoading
                ? <ActivityIndicator color="#fff" size="small" />
                : <MaterialIcons name={isPlaying ? 'pause' : 'play-arrow'} size={32} color="#fff" />
              }
            </TouchableOpacity>

            {/* Fullscreen button */}
            <TouchableOpacity onPress={openFullscreen} style={styles.fsBtn}>
              <MaterialIcons name="fullscreen" size={20} color="#fff" />
            </TouchableOpacity>

            {/* Bottom bar */}
            <View style={styles.bottomBar}>
              <Text style={styles.timeText}>{formatTime(position)} / {formatTime(duration)}</Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
            </View>
          </View>
        )}
      </TouchableOpacity>

      {/* ── Fullscreen modal ── */}
      <Modal
        visible={isFullscreen}
        transparent={false}
        animationType="fade"
        statusBarTranslucent
        supportedOrientations={['portrait', 'landscape']}
        onRequestClose={closeFullscreen}
      >
        <StatusBar hidden />
        <View style={styles.fsContainer}>
          <Video
            ref={fsVideoRef}
            source={{ uri }}
            style={StyleSheet.absoluteFill}
            resizeMode={ResizeMode.CONTAIN}
            onPlaybackStatusUpdate={onFsStatusUpdate}
            shouldPlay={false}
            isLooping={false}
            useNativeControls={false}
          />

          {/* FS overlay */}
          <TouchableOpacity
            activeOpacity={1}
            style={StyleSheet.absoluteFill}
            onPress={() => {/* tap anywhere shows controls */}}
          >
            {/* Close */}
            <TouchableOpacity style={styles.fsCloseBtn} onPress={closeFullscreen}>
              <MaterialIcons name="close" size={26} color="#fff" />
            </TouchableOpacity>

            {/* Center play/pause */}
            <View style={styles.fsCenterControls}>
              <TouchableOpacity onPress={toggleFsPlay} style={styles.fsPlayBtn}>
                <MaterialIcons name={fsIsPlaying ? 'pause' : 'play-arrow'} size={40} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Bottom controls */}
            <View style={styles.fsBottomBar}>
              <Text style={styles.fsTimeText}>
                {formatTime(fsPosition)} / {formatTime(fsDuration)}
              </Text>
              <View style={styles.fsProgressTrack}>
                <View style={[styles.fsProgressFill, { width: `${fsProgress}%` }]} />
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // ── Inline thumbnail ──
  thumbContainer: {
    borderRadius: 12, overflow: 'hidden',
    backgroundColor: '#111', marginBottom: 4,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  playBtn: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)',
  },
  fsBtn: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 6, padding: 3,
  },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 10, paddingBottom: 8, paddingTop: 4,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  timeText: { color: '#fff', fontSize: 10, fontWeight: '600', marginBottom: 4 },
  progressTrack: {
    height: 3, backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 2, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#fff', borderRadius: 2 },
  errorBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 6 },
  errorText: { color: '#888', fontSize: 12 },

  // ── Fullscreen modal ──
  fsContainer: {
    flex: 1, backgroundColor: '#000',
    justifyContent: 'center', alignItems: 'center',
  },
  fsCloseBtn: {
    position: 'absolute', top: 48, right: 20, zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20, padding: 8,
  },
  fsCenterControls: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
  },
  fsPlayBtn: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)',
  },
  fsBottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingBottom: 40, paddingTop: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  fsTimeText: { color: '#fff', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  fsProgressTrack: {
    height: 4, backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2, overflow: 'hidden',
  },
  fsProgressFill: { height: '100%', backgroundColor: '#fff', borderRadius: 2 },
});
