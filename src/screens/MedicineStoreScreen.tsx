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
  RefreshControl,
} from 'react-native';
import api from '../api/client';
import { interactionUtils } from '../utils/interactionUtils';

interface Medicine {
  _id: string;
  name: string;
  composition?: string;
  type?: string;
  dose?: string;
  frequency?: string;
  route?: string;
  duration?: string;
  notes?: string;
  price?: number;
}

export const MedicineStoreScreen: React.FC = () => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [composition, setComposition] = useState('');
  const [type, setType] = useState('');
  const [dose, setDose] = useState('');
  const [frequency, setFrequency] = useState('');
  const [route, setRoute] = useState('');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [price, setPrice] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchMedicines();
  }, []);

  const fetchMedicines = async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get('/api/v1/medicine/getall');
      setMedicines(data.medicines || []);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to load medicines');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setIsRefreshing(true);
    fetchMedicines();
  }, []);

  const handleSave = async () => {
    if (!name) {
      Alert.alert('Validation Error', 'Medicine name is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        name,
        composition,
        type,
        dose,
        frequency,
        route,
        duration,
        notes,
        price: price ? parseFloat(price) : undefined,
      };

      if (selectedMedicine) {
        await api.put(`/api/v1/medicine/update/${selectedMedicine._id}`, payload);
        interactionUtils.playSuccess();
        Alert.alert('Success', 'Medicine updated');
      } else {
        await api.post(`/api/v1/medicine/add`, payload);
        interactionUtils.playSuccess();
        Alert.alert('Success', 'Medicine added');
      }
      setIsModalOpen(false);
      fetchMedicines();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Confirm Delete', 'Are you sure you want to delete this medicine?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/v1/medicine/delete/${id}`);
            interactionUtils.playSuccess();
            setMedicines(prev => prev.filter(m => m._id !== id));
            Alert.alert('Deleted', 'Medicine deleted successfully');
          } catch (e: any) {
            Alert.alert('Error', 'Failed to delete medicine');
          }
        },
      },
    ]);
  };

  const openModal = (medicine?: Medicine) => {
    if (medicine) {
      setSelectedMedicine(medicine);
      setName(medicine.name || '');
      setComposition(medicine.composition || '');
      setType(medicine.type || '');
      setDose(medicine.dose || '');
      setFrequency(medicine.frequency || '');
      setRoute(medicine.route || '');
      setDuration(medicine.duration || '');
      setNotes(medicine.notes || '');
      setPrice(medicine.price ? String(medicine.price) : '');
    } else {
      setSelectedMedicine(null);
      setName('');
      setComposition('');
      setType('');
      setDose('');
      setFrequency('');
      setRoute('');
      setDuration('');
      setNotes('');
      setPrice('');
    }
    setIsModalOpen(true);
  };

  const filtered = medicines.filter((m) => {
    return m.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Search medicines..."
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
              <Text style={styles.emptyText}>No medicines found</Text>
            </View>
          }
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardInfo}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={styles.name}>{item.name}</Text>
                  {item.price ? <Text style={styles.price}>₹{item.price}</Text> : null}
                </View>
                {item.composition ? <Text style={styles.meta}>Composition: {item.composition}</Text> : null}
                {item.dose ? <Text style={styles.meta}>Dose: {item.dose} ({item.frequency})</Text> : null}
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
              <Text style={styles.modalTitle}>{selectedMedicine ? 'Edit Medicine' : 'Add Medicine'}</Text>
              
              <TextInput style={styles.input} placeholder="Medicine Name *" placeholderTextColor="#94a3b8" value={name} onChangeText={setName} />
              <TextInput style={styles.input} placeholder="Composition" placeholderTextColor="#94a3b8" value={composition} onChangeText={setComposition} />
              
              <View style={styles.row}>
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Type" placeholderTextColor="#94a3b8" value={type} onChangeText={setType} />
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Dose" placeholderTextColor="#94a3b8" value={dose} onChangeText={setDose} />
              </View>
              
              <View style={styles.row}>
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Frequency" placeholderTextColor="#94a3b8" value={frequency} onChangeText={setFrequency} />
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Duration" placeholderTextColor="#94a3b8" value={duration} onChangeText={setDuration} />
              </View>

              <TextInput style={styles.input} placeholder="Route (e.g. Oral)" placeholderTextColor="#94a3b8" value={route} onChangeText={setRoute} />
              <TextInput style={styles.input} placeholder="Price (₹)" placeholderTextColor="#94a3b8" keyboardType="numeric" value={price} onChangeText={setPrice} />
              <TextInput style={[styles.input, { height: 80 }]} placeholder="Notes" placeholderTextColor="#94a3b8" multiline value={notes} onChangeText={setNotes} />

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
  cardInfo: { marginBottom: 10 },
  name: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  price: { fontSize: 16, fontWeight: '700', color: '#059669' },
  meta: { fontSize: 14, color: '#64748b', marginBottom: 2 },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 16 },
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
