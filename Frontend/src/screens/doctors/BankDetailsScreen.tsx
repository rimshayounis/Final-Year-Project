import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Alert, ActivityIndicator, StatusBar,
  TouchableWithoutFeedback, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import apiClient from '../../services/api';

type Nav   = NativeStackNavigationProp<RootStackParamList, 'BankDetails'>;
type Route = RouteProp<RootStackParamList, 'BankDetails'>;

interface BankData {
  bankName:      string;
  accountName:   string;
  accountNumber: string;
  addedAt:       string;
}

const BANKS = [
  // Big 5 (Scheduled Commercial Banks)
  'HBL – Habib Bank Limited',
  'UBL – United Bank Limited',
  'MCB Bank Limited',
  'ABL – Allied Bank Limited',
  'NBP – National Bank of Pakistan',

  // Islamic Banks
  'Meezan Bank',
  'Bank Islami Pakistan',
  'Dubai Islamic Bank Pakistan',
  'Al Baraka Bank Pakistan',
  'MCB Islamic Bank',
  'Faysal Bank (Islamic)',

  // Private Commercial Banks
  'Bank Alfalah',
  'Faysal Bank',
  'Bank Al-Habib',
  'Askari Bank',
  'JS Bank',
  'Soneri Bank',
  'Standard Chartered Pakistan',
  'Habib Metropolitan Bank',
  'HSBC Bank Oman (Pakistan)',
  'Silk Bank',
  'Summit Bank',
  'SAMBA Bank',
  'First Women Bank',
  'Citibank Pakistan',
  'Deutsche Bank Pakistan',

  // Foreign Banks
  'Bank of China (Pakistan)',
  'Industrial and Commercial Bank of China (ICBC)',

  // Microfinance Banks
  'Khushhali Microfinance Bank',
  'NRSP Microfinance Bank',
  'U Microfinance Bank',
  'Apna Microfinance Bank',
  'FINCA Microfinance Bank',
  'Pak Oman Microfinance Bank',
  'Advans Pakistan Microfinance Bank',
  'Mobilink Microfinance Bank (JazzCash)',

  // Digital / Branchless
  'EasyPaisa (Telenor Microfinance Bank)',
  'SadaPay',
  'NayaPay',
  'Upaisa (U Microfinance Bank)',

  // Development Finance Institutions
  'ZTBL – Zarai Taraqiati Bank',
  'PPCBL – Punjab Provincial Cooperative Bank',
  'SME Bank',
  'Industrial Development Bank',

];

export default function BankDetailsScreen() {
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route      = useRoute<Route>();
  const { doctorId } = route.params;

  const [bankData,    setBankData]    = useState<BankData | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);

  // Form fields
  const [bankName,      setBankName]      = useState('');
  const [accountName,   setAccountName]   = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankPickerOpen, setBankPickerOpen] = useState(false);
  const [bankSearch,     setBankSearch]     = useState('');

  // Password confirm modal
  const [pwdModal,   setPwdModal]   = useState(false);
  const [password,   setPassword]   = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdAction,  setPwdAction]  = useState<'save' | 'delete'>('save');

  // Edit mode
  const [editMode, setEditMode] = useState(false);

  const fetchBankDetails = async () => {
    try {
      const res = await apiClient.get(`/doctors/${doctorId}/bank-details`);
      setBankData(res.data?.data ?? null);
    } catch {
      setBankData(null);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchBankDetails(); }, [doctorId]));

  const startAdd = () => {
    setBankName(''); setAccountName(''); setAccountNumber('');
    setEditMode(true);
  };

  const startEdit = () => {
    if (bankData) {
      setBankName(bankData.bankName);
      setAccountName(bankData.accountName);
      setAccountNumber(bankData.accountNumber);
    }
    setMenuVisible(false);
    setEditMode(true);
  };

  const confirmSave = () => {
    if (!bankName.trim() || !accountName.trim() || !accountNumber.trim()) {
      Alert.alert('Missing Fields', 'Please fill in all bank details.');
      return;
    }
    setPwdAction('save');
    setPassword('');
    setPwdModal(true);
  };

  const confirmDelete = () => {
    setMenuVisible(false);
    setPwdAction('delete');
    setPassword('');
    setPwdModal(true);
  };

  const handlePasswordConfirm = async () => {
    if (!password.trim()) {
      Alert.alert('Required', 'Enter your password to continue.');
      return;
    }
    setPwdLoading(true);
    try {
      if (pwdAction === 'save') {
        await apiClient.post(`/doctors/${doctorId}/bank-details`, {
          password,
          bankName:      bankName.trim(),
          accountName:   accountName.trim(),
          accountNumber: accountNumber.trim(),
        });
        Alert.alert('Saved', 'Bank details bound successfully.');
        setEditMode(false);
      } else {
        await apiClient.delete(`/doctors/${doctorId}/bank-details`, {
          data: { password },
        });
        Alert.alert('Removed', 'Bank details have been removed.');
      }
      setPwdModal(false);
      setPassword('');
      await fetchBankDetails();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Something went wrong.');
    } finally {
      setPwdLoading(false);
    }
  };

  const maskAccount = (num: string) =>
    num.length > 4 ? '*'.repeat(num.length - 4) + num.slice(-4) : num;

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color="#6B7FED" />
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={s.screen}>
        <StatusBar barStyle="light-content" backgroundColor="#6B7FED" />

        {/* Header */}
        <View style={[s.header, { paddingTop: insets.top + 4 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Bank Details</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>

          {/* Existing bank card */}
          {bankData && !editMode && (
            <>
              <Text style={s.sectionLabel}>Linked Account</Text>
              <View style={[s.bankCard, { opacity: 0.75 }]}>
                {/* Three-dot menu */}
                <TouchableOpacity
                  style={s.menuBtn}
                  onPress={() => setMenuVisible(true)}
                >
                  <MaterialIcons name="more-vert" size={22} color="#6B7FED" />
                </TouchableOpacity>

                <View style={s.bankIconRow}>
                  <View style={s.bankIconBg}>
                    <Ionicons name="business" size={22} color="#6B7FED" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.bankNameTxt}>{bankData.bankName}</Text>
                    <Text style={s.bankSubTxt}>Linked bank account</Text>
                  </View>
                  <View style={s.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={14} color="#00B374" />
                    <Text style={s.verifiedTxt}>Bound</Text>
                  </View>
                </View>

                <View style={s.bankDetailRow}>
                  <Text style={s.bankDetailLbl}>Account Name</Text>
                  <Text style={s.bankDetailVal}>{bankData.accountName}</Text>
                </View>
                <View style={s.divider} />
                <View style={s.bankDetailRow}>
                  <Text style={s.bankDetailLbl}>Account Number</Text>
                  <Text style={s.bankDetailVal}>{maskAccount(bankData.accountNumber)}</Text>
                </View>
                <View style={s.divider} />
                <View style={s.bankDetailRow}>
                  <Text style={s.bankDetailLbl}>Added On</Text>
                  <Text style={s.bankDetailVal}>
                    {new Date(bankData.addedAt).toLocaleDateString('en-PK', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </Text>
                </View>

                <Text style={s.lockNote}>
                  <Ionicons name="lock-closed" size={12} color="#9099B5" /> Details are secured. Edit to update.
                </Text>
              </View>
            </>
          )}

          {/* Add / Edit form */}
          {(!bankData || editMode) && (
            <>
              <Text style={s.sectionLabel}>{bankData ? 'Edit Bank Details' : 'Add Bank Account'}</Text>

              {/* Bank picker */}
              <Text style={s.inputLabel}>Bank Name</Text>
              <TouchableOpacity
                style={s.pickerBtn}
                onPress={() => setBankPickerOpen(true)}
              >
                <Text style={[s.pickerTxt, !bankName && { color: '#AAA' }]}>
                  {bankName || 'Select your bank'}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#9099B5" />
              </TouchableOpacity>

              <Text style={s.inputLabel}>Account Holder Name</Text>
              <TextInput
                style={s.input}
                value={accountName}
                onChangeText={setAccountName}
                placeholder="As shown on bank account"
                placeholderTextColor="#AAA"
              />

              <Text style={s.inputLabel}>Account Number</Text>
              <TextInput
                style={s.input}
                value={accountNumber}
                onChangeText={setAccountNumber}
                placeholder="Enter account number"
                placeholderTextColor="#AAA"
                keyboardType="numeric"
              />

              <View style={s.formBtnRow}>
                {editMode && bankData && (
                  <TouchableOpacity
                    style={[s.formBtn, { backgroundColor: '#F5F7FF', borderWidth: 1, borderColor: '#E0E4FF' }]}
                    onPress={() => setEditMode(false)}
                  >
                    <Text style={[s.formBtnTxt, { color: '#6B7FED' }]}>Cancel</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[s.formBtn, { flex: 1 }]} onPress={confirmSave}>
                  <Ionicons name="link" size={16} color="#FFF" />
                  <Text style={s.formBtnTxt}>Bind Account</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Add button when card exists */}
          {bankData && !editMode && (
            <TouchableOpacity style={s.addNewBtn} onPress={startAdd}>
              <Ionicons name="add-circle-outline" size={18} color="#6B7FED" />
              <Text style={s.addNewTxt}>Replace with a new account</Text>
            </TouchableOpacity>
          )}

          {/* Info box */}
          <View style={s.infoBox}>
            <Ionicons name="information-circle" size={18} color="#6B7FED" />
            <Text style={s.infoTxt}>
              Your bank details are used for withdrawal processing. Funds are transferred within 24 hours after request.
            </Text>
          </View>
        </ScrollView>

        {/* Three-dot dropdown menu */}
        <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
          <TouchableOpacity style={s.menuOverlay} onPress={() => setMenuVisible(false)}>
            <View style={s.menuBox}>
              <TouchableOpacity style={s.menuItem} onPress={startEdit}>
                <Ionicons name="create-outline" size={18} color="#1A1D2E" />
                <Text style={s.menuItemTxt}>Edit</Text>
              </TouchableOpacity>
              <View style={s.menuDivider} />
              <TouchableOpacity style={s.menuItem} onPress={confirmDelete}>
                <Ionicons name="trash-outline" size={18} color="#E53E3E" />
                <Text style={[s.menuItemTxt, { color: '#E53E3E' }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Bank picker — full screen modal */}
        <Modal
          visible={bankPickerOpen}
          animationType="slide"
          onRequestClose={() => { setBankPickerOpen(false); setBankSearch(''); }}
        >
          <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
          <SafeAreaView style={s.pickerScreen}>
            {/* Header */}
            <View style={s.pickerSheetHeader}>
              <Text style={s.pickerSheetTitle}>Select Bank</Text>
              <TouchableOpacity onPress={() => { setBankPickerOpen(false); setBankSearch(''); }}>
                <Ionicons name="close" size={22} color="#555" />
              </TouchableOpacity>
            </View>

            {/* Search input */}
            <View style={s.pickerSearchRow}>
              <Ionicons name="search" size={18} color="#9099B5" />
              <TextInput
                style={s.pickerSearchInput}
                value={bankSearch}
                onChangeText={setBankSearch}
                placeholder="Search bank..."
                placeholderTextColor="#AAA"
                clearButtonMode="while-editing"
                returnKeyType="search"
              />
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" style={{ flex: 1 }}>
              {BANKS.filter(b =>
                b.toLowerCase().includes(bankSearch.toLowerCase())
              ).map((b) => (
                <TouchableOpacity
                  key={b}
                  style={[s.pickerItem, bankName === b && s.pickerItemActive]}
                  onPress={() => { setBankName(b); setBankPickerOpen(false); setBankSearch(''); }}
                >
                  <Text style={[s.pickerItemTxt, bankName === b && { color: '#6B7FED', fontWeight: '700' }]}>{b}</Text>
                  {bankName === b && <Ionicons name="checkmark" size={18} color="#6B7FED" />}
                </TouchableOpacity>
              ))}
              {BANKS.filter(b => b.toLowerCase().includes(bankSearch.toLowerCase())).length === 0 && (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Text style={{ color: '#9099B5', fontSize: 14 }}>No bank found</Text>
                </View>
              )}
            </ScrollView>
          </SafeAreaView>
        </Modal>

        {/* Password confirm modal */}
        <Modal visible={pwdModal} transparent animationType="fade" onRequestClose={() => setPwdModal(false)}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={s.pwdOverlay}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={s.pwdBox}>
                  <View style={s.pwdIconWrap}>
                    <Ionicons name="lock-closed" size={28} color="#6B7FED" />
                  </View>
                  <Text style={s.pwdTitle}>Confirm Identity</Text>
                  <Text style={s.pwdSubtitle}>
                    {pwdAction === 'save'
                      ? 'Enter your password to bind this bank account.'
                      : 'Enter your password to remove bank details.'}
                  </Text>
                  <TextInput
                    style={s.pwdInput}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter your password"
                    placeholderTextColor="#AAA"
                    secureTextEntry
                    autoFocus
                  />
                  <View style={s.pwdBtnRow}>
                    <TouchableOpacity
                      style={s.pwdCancelBtn}
                      onPress={() => { setPwdModal(false); setPassword(''); }}
                    >
                      <Text style={s.pwdCancelTxt}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.pwdConfirmBtn, pwdAction === 'delete' && { backgroundColor: '#E53E3E' }]}
                      onPress={handlePasswordConfirm}
                      disabled={pwdLoading}
                    >
                      {pwdLoading
                        ? <ActivityIndicator size="small" color="#FFF" />
                        : <Text style={s.pwdConfirmTxt}>{pwdAction === 'save' ? 'Confirm & Bind' : 'Confirm & Delete'}</Text>
                      }
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </View>
    </TouchableWithoutFeedback>
  );
}

const s = StyleSheet.create({
  screen:           { flex: 1, backgroundColor: '#F5F7FF' },
  centered:         { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:           { backgroundColor: '#6B7FED', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14 },
  headerTitle:      { fontSize: 18, fontWeight: '700', color: '#FFF' },
  sectionLabel:     { fontSize: 13, fontWeight: '700', color: '#9099B5', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },

  // Bank card
  bankCard:         { backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginBottom: 20, shadowColor: '#6B7FED', shadowOpacity: 0.1, shadowRadius: 10, elevation: 4, position: 'relative' },
  menuBtn:          { position: 'absolute', top: 14, right: 14, zIndex: 10, padding: 4 },
  bankIconRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18, paddingRight: 30 },
  bankIconBg:       { width: 46, height: 46, borderRadius: 23, backgroundColor: '#F0F4FF', justifyContent: 'center', alignItems: 'center' },
  bankNameTxt:      { fontSize: 15, fontWeight: '700', color: '#1A1D2E' },
  bankSubTxt:       { fontSize: 12, color: '#9099B5', marginTop: 2 },
  verifiedBadge:    { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#D4F8E8', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  verifiedTxt:      { fontSize: 11, fontWeight: '700', color: '#00B374' },
  bankDetailRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  bankDetailLbl:    { fontSize: 13, color: '#9099B5', fontWeight: '500' },
  bankDetailVal:    { fontSize: 13, fontWeight: '700', color: '#1A1D2E' },
  divider:          { height: 1, backgroundColor: '#F0F4FF' },
  lockNote:         { marginTop: 14, fontSize: 11, color: '#9099B5', textAlign: 'center' },

  // Form
  inputLabel:       { fontSize: 12, fontWeight: '600', color: '#555', marginBottom: 6, marginTop: 14 },
  input:            { backgroundColor: '#FFF', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, color: '#1A1D2E', borderWidth: 1, borderColor: '#E8EAF6' },
  pickerBtn:        { backgroundColor: '#FFF', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, borderWidth: 1, borderColor: '#E8EAF6', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pickerTxt:        { fontSize: 14, color: '#1A1D2E' },
  formBtnRow:       { flexDirection: 'row', gap: 10, marginTop: 22 },
  formBtn:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#6B7FED', paddingVertical: 14, borderRadius: 14 },
  formBtnTxt:       { color: '#FFF', fontWeight: '700', fontSize: 14 },
  addNewBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#6B7FED', borderStyle: 'dashed', marginBottom: 20 },
  addNewTxt:        { color: '#6B7FED', fontSize: 13, fontWeight: '600' },
  infoBox:          { flexDirection: 'row', gap: 10, backgroundColor: '#EEF0FF', borderRadius: 12, padding: 14, marginTop: 10 },
  infoTxt:          { flex: 1, fontSize: 12, color: '#555', lineHeight: 18 },

  // Three-dot menu
  menuOverlay:      { flex: 1 },
  menuBox:          { position: 'absolute', top: 140, right: 28, backgroundColor: '#FFF', borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, elevation: 8, minWidth: 140 },
  menuItem:         { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14 },
  menuItemTxt:      { fontSize: 14, fontWeight: '600', color: '#1A1D2E' },
  menuDivider:      { height: 1, backgroundColor: '#F0F4FF' },

  // Bank picker sheet
  pickerScreen:     { flex: 1, backgroundColor: '#FFF' },
  pickerSheetHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: '#F0F4FF' },
  pickerSheetTitle:   { fontSize: 16, fontWeight: '700', color: '#1A1D2E' },
  pickerSearchRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, margin: 12, backgroundColor: '#F5F7FF', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#E8EAF6' },
  pickerSearchInput:  { flex: 1, fontSize: 14, color: '#1A1D2E', padding: 0 },
  pickerItem:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  pickerItemActive: { backgroundColor: '#F0F4FF' },
  pickerItemTxt:    { fontSize: 14, color: '#1A1D2E' },

  // Password modal
  pwdOverlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, paddingBottom: 220 },
  pwdBox:           { backgroundColor: '#FFF', borderRadius: 20, padding: 24, width: '100%', alignItems: 'center' },
  pwdIconWrap:      { width: 60, height: 60, borderRadius: 30, backgroundColor: '#F0F4FF', justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  pwdTitle:         { fontSize: 18, fontWeight: '800', color: '#1A1D2E', marginBottom: 6 },
  pwdSubtitle:      { fontSize: 13, color: '#9099B5', textAlign: 'center', marginBottom: 20, lineHeight: 18 },
  pwdInput:         { width: '100%', backgroundColor: '#F5F7FF', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, color: '#1A1D2E', borderWidth: 1, borderColor: '#E8EAF6', marginBottom: 20 },
  pwdBtnRow:        { flexDirection: 'row', gap: 10, width: '100%' },
  pwdCancelBtn:     { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: '#F5F7FF', alignItems: 'center' },
  pwdCancelTxt:     { color: '#6B7FED', fontWeight: '700', fontSize: 14 },
  pwdConfirmBtn:    { flex: 1.5, paddingVertical: 13, borderRadius: 12, backgroundColor: '#6B7FED', alignItems: 'center' },
  pwdConfirmTxt:    { color: '#FFF', fontWeight: '700', fontSize: 14 },
});
