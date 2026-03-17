import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Modal, StyleSheet,
  Animated, Dimensions, Clipboard, Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const { width: W, height: H } = Dimensions.get('window');

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

interface Message {
  _id: string;
  senderId: string;
  receiverId: string;
  conversationId: string;
  text?: string;
  fileUrl?: string;
  fileType?: 'image' | 'video' | 'document' | 'voice';
  fileName?: string;
  duration?: number;
  createdAt: string;
  read: boolean;
  isTemp?: boolean;
  reactions?: { emoji: string; userId: string }[];
  edited?: boolean;
}
interface Props {
  visible: boolean;
  message: Message | null;
  isMe: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onReact: (messageId: string, emoji: string) => void;
  onDelete: (messageId: string) => void;
  onEdit: (message: Message) => void;
  onCopy: (text: string) => void;
}

export default function MessageContextMenu({
  visible, message, isMe, position,
  onClose, onReact, onDelete, onEdit, onCopy,
}: Props) {
  const scaleAnim  = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim,   { toValue: 1, friction: 6, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  if (!message) return null;

  // Check if within 2 minutes for edit
  const canEdit = isMe &&
    message.text &&
    (Date.now() - new Date(message.createdAt).getTime()) < 2 * 60 * 1000;

  // Position menu — keep it on screen
  const menuTop = position.y > H / 2 ? position.y - 280 : position.y + 10;
  const menuLeft = isMe ? W - 220 : 16;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      {/* Backdrop */}
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

      <Animated.View
        style={[
          styles.menuContainer,
          { top: menuTop, left: menuLeft },
          { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
        ]}
      >
        {/* ── Emoji reactions ── */}
        <View style={styles.reactionsRow}>
          {REACTIONS.map((emoji) => (
            <TouchableOpacity
              key={emoji}
              style={styles.emojiBtn}
              onPress={() => { onReact(message._id, emoji); onClose(); }}
            >
              <Text style={styles.emoji}>{emoji}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.emojiBtn}>
            <MaterialIcons name="add" size={20} color="#555" />
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {/* ── Actions ── */}

        {/* Copy — only for text messages */}
        {message.text && (
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => { onCopy(message.text!); onClose(); }}
          >
            <Text style={styles.menuText}>Copy</Text>
            <MaterialIcons name="content-copy" size={18} color="#333" />
          </TouchableOpacity>
        )}

        {/* Edit — only mine, only within 2 minutes, only text */}
        {canEdit && (
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => { onEdit(message); onClose(); }}
          >
            <Text style={styles.menuText}>Edit</Text>
            <MaterialIcons name="edit" size={18} color="#333" />
          </TouchableOpacity>
        )}

        {/* Delete — only my messages */}
        {isMe && (
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              onClose();
              Alert.alert(
                'Delete Message',
                'Delete for everyone?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => onDelete(message._id) },
                ],
              );
            }}
          >
            <Text style={[styles.menuText, { color: '#E53935' }]}>Delete</Text>
            <MaterialIcons name="delete" size={18} color="#E53935" />
          </TouchableOpacity>
        )}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  menuContainer: {
    position: 'absolute',
    width: 200,
    backgroundColor: '#fff',
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 10,
    overflow: 'hidden',
  },
  reactionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: '#fff',
  },
  emojiBtn: {
    width: 36, height: 36,
    justifyContent: 'center', alignItems: 'center',
    borderRadius: 18,
  },
  emoji: { fontSize: 22 },
  divider: { height: 1, backgroundColor: '#F0F0F0' },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  menuText: {
    fontSize: 15,
    color: '#1A1A1A',
    fontWeight: '500',
  },
});
