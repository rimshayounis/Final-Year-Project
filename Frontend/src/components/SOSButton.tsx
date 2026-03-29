import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  Alert,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import { triggerSOS } from '../services/sosService';

export default function SOSButton() {
  const [sending, setSending] = useState(false);

  const handlePress = () => {
    Alert.alert(
      '🚨 SOS Alert',
      'This will immediately alert your emergency contacts with your location!',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text:    'YES — Send SOS',
          style:   'destructive',
          onPress: async () => {
            setSending(true);
            await triggerSOS();
            setSending(false);
          },
        },
      ],
    );
  };

  return (
    <TouchableOpacity
      style={[styles.button, sending && styles.sending]}
      onPress={handlePress}
      disabled={sending}
      activeOpacity={0.8}
    >
      {sending ? (
        <ActivityIndicator color="#fff" size="small" />
      ) : (
        <Text style={styles.text}>🚨{'\n'}SOS</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position:        'absolute',
    bottom:          30,
    right:           20,
    zIndex:          999,
    width:           65,
    height:          65,
    borderRadius:    33,
    backgroundColor: '#FF0000',
    justifyContent:  'center',
    alignItems:      'center',
    // Shadow Android
    elevation: 10,
    // Shadow iOS
    shadowColor:   '#FF0000',
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius:  8,
  },
  sending: {
    backgroundColor: '#cc0000',
    opacity:         0.8,
  },
  text: {
    color:      '#fff',
    fontSize:   14,
    fontWeight: 'bold',
    textAlign:  'center',
  },
});