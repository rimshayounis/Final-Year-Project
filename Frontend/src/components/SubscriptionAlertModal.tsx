import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface Props {
  visible: boolean;
  plan?: string;
  endDate?: string;
  onChoosePlan: () => void;
  onDismiss?: () => void;
}

export const SubscriptionAlertModal: React.FC<Props> = ({
  visible,
  plan,
  endDate,
  onChoosePlan,
  onDismiss,
}) => {
  if (!visible) return null;

  const isPaidPlan = plan && plan !== 'free_trial';
  const formattedDate = endDate ? new Date(endDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }) : '';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          scrollEnabled={false}
        >
          <View style={styles.modalContent}>
            {/* Icon */}
            <View style={styles.iconContainer}>
              <MaterialIcons name="schedule" size={56} color="#d32f2f" />
            </View>

            {/* Title */}
            <Text style={styles.title}>Subscription Expired</Text>

            {/* Message */}
            {isPaidPlan ? (
              <>
                <Text style={styles.message}>
                  Your {plan?.replace(/_/g, ' ')} plan expired on {formattedDate}.
                </Text>
                <Text style={styles.subtitle}>
                  Please purchase a new plan to continue using all features and unlocking premium capabilities.
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.message}>
                  Your free trial has ended.
                </Text>
                <Text style={styles.subtitle}>
                  Upgrade to a paid plan to unlock premium features and continue enjoying our services.
                </Text>
              </>
            )}

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={onChoosePlan}
              >
                <MaterialIcons name="shopping-cart" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.primaryButtonText}>Choose a Plan</Text>
              </TouchableOpacity>

              {onDismiss && (
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={onDismiss}
                >
                  <Text style={styles.secondaryButtonText}>Dismiss</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 24,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 21,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  secondaryButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  secondaryButtonText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
