import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../api/client';
import { interactionUtils } from '../utils/interactionUtils';

interface Compounder {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender: string;
  dob?: string;
  nic?: string;
  assignedDoctors?: { _id: string; firstName: string; lastName: string }[];
}

export const CompoundersScreen: React.FC = () => {
  const [compounders, setCompounders] = useState<Compounder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCompounder, setSelectedCompounder] = useState<Compounder | null>(null);

  // Form Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('Male');
  const [dob, setDob] = useState('');
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [nic, setNic] = useState('');

  useEffect(() => {
    fetchCompounders();
  }, []);

  const fetchCompounders = async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get('/api/v1/user/compounders');
      setCompounders(data.compounders || []);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to load compounders');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!firstName || !lastName || !email || !phone) {
      Alert.alert('Validation Error', 'First name, last name, email, and phone are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        firstName,
        lastName,
        email,
        phone,
        gender,
        dob,
        nic,
      };

      if (selectedCompounder) {
        await api.put(`/api/v1/user/user/${selectedCompounder._id}`, payload);
        interactionUtils.playSuccess();
        Alert.alert('Success', 'Compounder updated');
      } else {
        await api.post(`/api/v1/user/compounder/addnew`, payload);
        interactionUtils.playSuccess();
        Alert.alert('Success', 'Compounder created');
      }
      setIsModalOpen(false);
      fetchCompounders();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Confirm Delete', 'Are you sure you want to delete this compounder?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/v1/user/user/${id}`);
            interactionUtils.playSuccess();
            setCompounders(prev => prev.filter(c => c._id !== id));
            Alert.alert('Deleted', 'Compounder deleted successfully');
          } catch (e: any) {
            Alert.alert('Error', 'Failed to delete compounder');
          }
        },
      },
    ]);
  };

  const openModal = (compounder?: Compounder) => {
    if (compounder) {
      setSelectedCompounder(compounder);
      setFirstName(compounder.firstName || '');
      setLastName(compounder.lastName || '');
      setEmail(compounder.email || '');
      setPhone(compounder.phone || '');
      setGender(compounder.gender || 'Male');
      setDob(compounder.dob ? compounder.dob.substring(0, 10) : '');
      setNic(compounder.nic || '');
    } else {
      setSelectedCompounder(null);
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setGender('Male');
      setDob('');
      setNic('');
    }
    setIsModalOpen(true);
  };

  const filtered = compounders.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.firstName.toLowerCase().includes(q) ||
      c.lastName.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.phone.includes(q)
    );
  });

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Search name, email, phone..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity style={styles.addBtn} onPress={() => openModal()}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No compounders found</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>{item.firstName.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.name}>{item.firstName} {item.lastName}</Text>
                  <Text style={styles.meta}>✉️ {item.email}</Text>
                  <Text style={styles.meta}>📞 {item.phone}</Text>
                  {item.assignedDoctors && item.assignedDoctors.length > 0 && (
                     <Text style={styles.meta}>🩺 Doctors: {item.assignedDoctors.map(d => `${d.firstName} ${d.lastName}`).join(', ')}</Text>
                  )}
                </View>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.editBtn} onPress={() => openModal(item)}>
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item._id)}>
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Form Modal */}
      <Modal visible={isModalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>{selectedCompounder ? 'Edit Compounder' : 'Add Compounder'}</Text>
              
              <TextInput style={styles.input} placeholder="First Name" placeholderTextColor="#94a3b8" value={firstName} onChangeText={setFirstName} />
              <TextInput style={styles.input} placeholder="Last Name" placeholderTextColor="#94a3b8" value={lastName} onChangeText={setLastName} />
              <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#94a3b8" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
              <TextInput style={styles.input} placeholder="Phone" placeholderTextColor="#94a3b8" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
              
              <View style={styles.row}>
                <TouchableOpacity style={[styles.input, { flex: 1, justifyContent: 'center' }]} onPress={() => setShowDobPicker(true)}>
                  <Text style={{ color: dob ? '#0f172a' : '#94a3b8' }}>{dob || 'Select DOB'}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.input, { flex: 1, justifyContent: 'center' }]} 
                  onPress={() => setGender(gender === 'Male' ? 'Female' : 'Male')}
                >
                  <Text style={{ color: '#0f172a' }}>{gender}</Text>
                </TouchableOpacity>
              </View>

              {showDobPicker && (
                <DateTimePicker
                  value={dob ? new Date(dob) : new Date()}
                  mode="date"
                  display="default"
                  onChange={(event, date) => {
                    setShowDobPicker(Platform.OS === 'ios');
                    if (date) setDob(date.toISOString().split('T')[0]);
                  }}
                />
              )}

              <TextInput style={styles.input} placeholder="NIC" placeholderTextColor="#94a3b8" value={nic} onChangeText={setNic} />

              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={() => setIsModalOpen(false)}>
                  <Text style={styles.btnCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, styles.btnConfirm]} onPress={handleSave} disabled={isSubmitting}>
                  {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnConfirmText}>Save</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  headerRow: { flexDirection: 'row', marginBottom: 16, gap: 10 },
  searchInput: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', fontSize: 16, color: '#0f172a' },
  addBtn: { backgroundColor: '#0284c7', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, borderRadius: 12, shadowColor: '#0284c7', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  list: { paddingBottom: 20 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#94a3b8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 3 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  avatarCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#e0f2fe', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  avatarText: { fontSize: 24, fontWeight: '700', color: '#0284c7' },
  cardInfo: { flex: 1 },
  name: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  meta: { fontSize: 14, color: '#64748b', marginBottom: 2 },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, gap: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 16 },
  editBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: '#f1f5f9' },
  editBtnText: { color: '#334155', fontWeight: '600' },
  deleteBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: '#fef2f2' },
  deleteBtnText: { color: '#ef4444', fontWeight: '600' },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#94a3b8', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a', marginBottom: 20, textAlign: 'center' },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, fontSize: 16, color: '#0f172a', marginBottom: 12 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 20, paddingBottom: 20 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnCancel: { backgroundColor: '#f1f5f9' },
  btnCancelText: { color: '#475569', fontSize: 16, fontWeight: '600' },
  btnConfirm: { backgroundColor: '#0284c7' },
  btnConfirmText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
