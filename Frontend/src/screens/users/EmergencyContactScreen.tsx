

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../../App';
import { MaterialIcons } from '@expo/vector-icons';
import { userAPI, EmergencyContactData } from '../../services/api';

type EmergencyContactScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'EmergencyContact'>;
  route: RouteProp<RootStackParamList, 'EmergencyContact'>;
};

interface EmergencyContact {
  id: string;
  fullName: string;
  phoneNumber: string;
  relationship: string;
}

export default function EmergencyContactScreen({
  navigation,
  route,
}: EmergencyContactScreenProps) {
  const { userId } = route.params;
  const [contacts, setContacts] = useState<EmergencyContact[]>([
    { id: '1', fullName: '', phoneNumber: '', relationship: '' },
  ]);
  const [loading, setLoading] = useState(false);

  const handleContactChange = (
    id: string,
    field: keyof EmergencyContact,
    value: string
  ) => {
    setContacts(
      contacts.map((contact) =>
        contact.id === id ? { ...contact, [field]: value } : contact
      )
    );
  };

  const addAnotherContact = () => {
    if (contacts.length < 3) {
      setContacts([
        ...contacts,
        {
          id: Date.now().toString(),
          fullName: '',
          phoneNumber: '',
          relationship: '',
        },
      ]);
    }
  };

  const removeContact = (id: string) => {
    if (contacts.length > 1) {
      setContacts(contacts.filter((contact) => contact.id !== id));
    }
  };

  const validateContacts = () => {
    for (const contact of contacts) {
      if (!contact.fullName.trim()) {
        Alert.alert('Error', 'Please enter contact name');
        return false;
      }
      if (!contact.phoneNumber.trim() || contact.phoneNumber.length < 10) {
        Alert.alert('Error', 'Please enter a valid phone number (at least 10 digits)');
        return false;
      }
      if (!contact.relationship.trim()) {
        Alert.alert('Error', 'Please select relationship');
        return false;
      }
    }
    return true;
  };

  const handleContinue = async () => {
    if (!validateContacts()) return;

    setLoading(true);
    try {
      const contactsData: EmergencyContactData[] = contacts.map(
        ({ fullName, phoneNumber, relationship }) => ({
          fullName,
          phoneNumber,
          relationship,
        })
      );

      const response = await userAPI.createEmergencyContacts(userId, contactsData);

      if (response.data.success) {
        Alert.alert('Success', 'Account created successfully!', [
          { text: 'OK', onPress: () => navigation.navigate('Dashboard', { userId }) },
        ]);
      }
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to save emergency contacts.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <MaterialIcons name="phone" size={32} color="#FFFFFF" />
        </View>
        
        <Text style={styles.headerTitle}>Emergency Contact</Text>

        <Text style={styles.stepIndicator}>Step 3/3</Text>
      </View>

      <View style={styles.form}>
        {contacts.map((contact, index) => (
          <View key={contact.id} style={styles.contactCard}>
            <View style={styles.contactHeader}>
              <Text style={styles.contactTitle}>Contact {index + 1}</Text>
              {contacts.length > 1 && (
                <TouchableOpacity onPress={() => removeContact(contact.id)}>
                  <MaterialIcons name="close" size={24} color="#FF6B6B" />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter Contact Name"
                value={contact.fullName}
                onChangeText={(value) =>
                  handleContactChange(contact.id, 'fullName', value)
                }
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                placeholder="+923145161073"
                value={contact.phoneNumber}
                onChangeText={(value) =>
                  handleContactChange(contact.id, 'phoneNumber', value)
                }
                keyboardType="phone-pad"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Relationship</Text>
              <View style={styles.relationshipContainer}>
                {['Parent', 'Sibling', 'Spouse', 'Friend', 'Other'].map((rel) => (
                  <TouchableOpacity
                    key={rel}
                    style={[
                      styles.relationshipChip,
                      contact.relationship === rel && styles.relationshipChipActive,
                    ]}
                    onPress={() =>
                      handleContactChange(contact.id, 'relationship', rel)
                    }
                  >
                    <Text
                      style={[
                        styles.relationshipText,
                        contact.relationship === rel &&
                          styles.relationshipTextActive,
                      ]}
                    >
                      {rel}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        ))}

        {contacts.length < 3 && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={addAnotherContact}
          >
            <MaterialIcons name="add" size={24} color="#7B8CDE" />
            <Text style={styles.addButtonText}>Add Another Contact</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.continueButtonText}>Continue</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.requiredNote}>Please complete all required fields</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#6B7FED',
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },

  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },

  stepIndicator: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500',
    textAlign: 'center',
    opacity: 0.85,
  },
  form: {
    padding: 30,
  },
  contactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  contactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C3E50',
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    color: '#2C3E50',
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 50,
    fontSize: 15,
    color: '#2C3E50',
  },
  relationshipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  relationshipChip: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  relationshipChipActive: {
    backgroundColor: '#7B8CDE',
  },
  relationshipText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  relationshipTextActive: {
    color: '#FFFFFF',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#7B8CDE',
    borderStyle: 'dashed',
    borderRadius: 15,
    paddingVertical: 15,
    marginBottom: 30,
  },
  addButtonText: {
    fontSize: 16,
    color: '#7B8CDE',
    fontWeight: '600',
    marginLeft: 8,
  },
  continueButton: {
    backgroundColor: '#7B8CDE',
    paddingVertical: 16,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#7B8CDE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  requiredNote: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 15,
  },
});
