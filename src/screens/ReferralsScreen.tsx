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
import api from '../api/client';
import { interactionUtils } from '../utils/interactionUtils';

interface Referral {
  _id: string;
  patientName: string;
  diagnosis: string;
  clinicalNotes: string;
  urgency: string;
  status: string;
  createdAt: string;
}

export const ReferralsScreen: React.FC = () => {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Compose Fields
  const [patientName, setPatientName] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [urgency, setUrgency] = useState('routine'); // routine, urgent, emergency

  useEffect(() => {
    fetchReferrals();
  }, []);

  const fetchReferrals = async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get('/api/v1/referral/all'); // Using the router
      setReferrals(data.data || []);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to load referrals');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!patientName || !diagnosis || !clinicalNotes) {
      Alert.alert('Validation Error', 'Patient Name, Diagnosis, and Notes are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      // Dummy patientId for testing since we need it in schema
      await api.post('/api/v1/referral/create', {
        patientName,
        diagnosis,
        clinicalNotes,
        urgency,
        patientId: '646f6e746b6e6f7779657430', // Just a placeholder Object ID to pass validation
      });
      interactionUtils.playSuccess();
      Alert.alert('Success', 'Referral created successfully');
      setIsModalOpen(false);
      
      setPatientName('');
      setDiagnosis('');
      setClinicalNotes('');
      setUrgency('routine');
      
      fetchReferrals();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to create referral');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Confirm Delete', 'Delete this referral?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/v1/referral/delete/${id}`);
            interactionUtils.playSuccess();
            setReferrals(prev => prev.filter(r => r._id !== id));
          } catch (e: any) {
            Alert.alert('Error', 'Failed to delete referral');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Referrals</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setIsModalOpen(true)}>
          <Text style={styles.addBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={referrals}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No referrals found</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.name}>{item.patientName}</Text>
                <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()}</Text>
              </View>
              <Text style={styles.diagnosis}>Diagnosis: {item.diagnosis}</Text>
              <Text style={styles.notes}>Notes: {item.clinicalNotes}</Text>
              <Text style={[styles.urgency, item.urgency === 'urgent' && {color: 'orange'}, item.urgency === 'emergency' && {color: 'red'}]}>
                Urgency: {item.urgency.toUpperCase()}
              </Text>
              
              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item._id)}>
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Compose Modal */}
      <Modal visible={isModalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>New Referral</Text>
              
              <TextInput style={styles.input} placeholder="Patient Name *" placeholderTextColor="#94a3b8" value={patientName} onChangeText={setPatientName} />
              <TextInput style={styles.input} placeholder="Diagnosis *" placeholderTextColor="#94a3b8" value={diagnosis} onChangeText={setDiagnosis} />
              <TextInput style={[styles.input, { height: 100, textAlignVertical: 'top' }]} placeholder="Clinical Notes *" placeholderTextColor="#94a3b8" multiline value={clinicalNotes} onChangeText={setClinicalNotes} />

              <View style={styles.row}>
                {['routine', 'urgent', 'emergency'].map((u) => (
                  <TouchableOpacity 
                    key={u} 
                    style={[styles.urgencyBtn, urgency === u && styles.urgencyBtnActive]}
                    onPress={() => setUrgency(u)}
                  >
                    <Text style={[styles.urgencyBtnText, urgency === u && styles.urgencyBtnTextActive]}>{u}</Text>
                  </TouchableOpacity>
                ))}
              </View>

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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#0f172a' },
  addBtn: { backgroundColor: '#0284c7', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  list: { paddingBottom: 20 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#94a3b8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: '#f1f5f9' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  name: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  date: { fontSize: 12, color: '#64748b' },
  diagnosis: { fontSize: 14, color: '#334155', fontWeight: '600', marginBottom: 4 },
  notes: { fontSize: 14, color: '#475569', marginBottom: 8 },
  urgency: { fontSize: 12, fontWeight: '700', color: '#059669', marginBottom: 10 },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
  deleteBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#fef2f2', borderRadius: 8 },
  deleteBtnText: { color: '#ef4444', fontWeight: '600' },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#94a3b8', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a', marginBottom: 20, textAlign: 'center' },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, fontSize: 16, color: '#0f172a', marginBottom: 12 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  urgencyBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#f1f5f9', alignItems: 'center' },
  urgencyBtnActive: { backgroundColor: '#0ea5e9' },
  urgencyBtnText: { color: '#475569', fontWeight: '600' },
  urgencyBtnTextActive: { color: '#fff' },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 10, paddingBottom: 20 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnCancel: { backgroundColor: '#f1f5f9' },
  btnCancelText: { color: '#475569', fontSize: 16, fontWeight: '600' },
  btnConfirm: { backgroundColor: '#0284c7' },
  btnConfirmText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
