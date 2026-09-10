import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import api from '../api/client';
import { interactionUtils } from '../utils/interactionUtils';
import { useTheme } from '../context/ThemeContext';
import { colors } from '../theme/colors';

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
  const { colors: theme } = useTheme();
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

  const fetchMedicines = useCallback(async () => {
    try {
      const { data } = await api.get('/api/v1/medicine/getall');
      setMedicines(data.medicines || []);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to load medicines');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMedicines();
  }, [fetchMedicines]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchMedicines();
  }, [fetchMedicines]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Medicine name is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        name: name.trim(),
        composition: composition.trim(),
        type: type.trim(),
        dose: dose.trim(),
        frequency: frequency.trim(),
        route: route.trim(),
        duration: duration.trim(),
        notes: notes.trim(),
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
            interactionUtils.playClick();
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
    interactionUtils.playClick();
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
      setType('Tablet');
      setDose('');
      setFrequency('');
      setRoute('Oral');
      setDuration('');
      setNotes('');
      setPrice('');
    }
    setIsModalOpen(true);
  };

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return medicines;
    return medicines.filter((m) => {
      return (
        m.name.toLowerCase().includes(q) ||
        (m.composition && m.composition.toLowerCase().includes(q)) ||
        (m.type && m.type.toLowerCase().includes(q))
      );
    });
  }, [medicines, searchQuery]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Top Search & Add Bar */}
      <View style={styles.headerRow}>
        <View style={[styles.searchWrapper, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Ionicons name="search-outline" size={18} color={theme.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: theme.textPrimary }]}
            placeholder="Search medicines, salts..."
            placeholderTextColor={theme.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={theme.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: theme.gold }]}
          onPress={() => openModal()}
        >
          <Ionicons name="add-circle-outline" size={18} color="#ffffff" style={{ marginRight: 4 }} />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Stock count */}
      <View style={styles.infoRow}>
        <Text style={[styles.infoText, { color: theme.textMuted }]}>
          Showing {filtered.length} of {medicines.length} items
        </Text>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="medkit-outline" size={48} color={theme.textMuted} style={{ marginBottom: 8 }} />
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>No medicines in store</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="medical-outline" size={16} color={theme.gold} />
                    <Text style={[styles.name, { color: theme.textPrimary }]}>{item.name}</Text>
                  </View>
                  {item.composition ? (
                    <Text style={[styles.meta, { color: theme.textSecondary }]}>
                      Salt: {item.composition}
                    </Text>
                  ) : null}
                </View>
                {item.price ? (
                  <View style={[styles.priceBadge, { backgroundColor: theme.goldSoft, borderColor: theme.goldBorder }]}>
                    <Text style={[styles.priceText, { color: theme.goldDark }]}>₹{item.price}</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.badgeRow}>
                {item.type ? (
                  <View style={[styles.typeBadge, { backgroundColor: theme.primarySoft, borderColor: theme.primaryMuted }]}>
                    <Text style={[styles.typeBadgeText, { color: theme.primary }]}>{item.type}</Text>
                  </View>
                ) : null}
                {item.dose ? (
                  <View style={[styles.typeBadge, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
                    <Text style={[styles.typeBadgeText, { color: theme.textSecondary }]}>{item.dose}</Text>
                  </View>
                ) : null}
                {item.frequency ? (
                  <View style={[styles.typeBadge, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
                    <Text style={[styles.typeBadgeText, { color: theme.textSecondary }]}>{item.frequency}</Text>
                  </View>
                ) : null}
              </View>

              {item.notes ? (
                <Text style={[styles.notes, { color: theme.textMuted }]}>
                  Note: {item.notes}
                </Text>
              ) : null}

              <View style={[styles.cardActions, { borderTopColor: theme.borderLight }]}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}
                  onPress={() => openModal(item)}
                >
                  <Ionicons name="create-outline" size={14} color={theme.textPrimary} />
                  <Text style={[styles.actionBtnText, { color: theme.textPrimary }]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: theme.dangerSoft, borderColor: theme.dangerBorder }]}
                  onPress={() => handleDelete(item._id)}
                >
                  <Ionicons name="trash-outline" size={14} color={theme.danger} />
                  <Text style={[styles.actionBtnText, { color: theme.danger }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Add / Edit Modal */}
      <Modal visible={isModalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.cardBg }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                  {selectedMedicine ? 'Edit Medicine' : 'Add New Medicine'}
                </Text>
                <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                  <Ionicons name="close-circle-outline" size={24} color={theme.textMuted} />
                </TouchableOpacity>
              </View>
              
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Medicine Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                placeholder="e.g. Paracetamol 650mg"
                placeholderTextColor={theme.textMuted}
                value={name}
                onChangeText={setName}
              />

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Chemical / Generic Salt</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                placeholder="e.g. Acetaminophen"
                placeholderTextColor={theme.textMuted}
                value={composition}
                onChangeText={setComposition}
              />
              
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Form / Type</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                    placeholder="Tablet / Syrup"
                    placeholderTextColor={theme.textMuted}
                    value={type}
                    onChangeText={setType}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Dosage</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                    placeholder="1 Tab / 5ml"
                    placeholderTextColor={theme.textMuted}
                    value={dose}
                    onChangeText={setDose}
                  />
                </View>
              </View>
              
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Frequency</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                    placeholder="1-0-1 (After Food)"
                    placeholderTextColor={theme.textMuted}
                    value={frequency}
                    onChangeText={setFrequency}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Duration</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                    placeholder="5 Days"
                    placeholderTextColor={theme.textMuted}
                    value={duration}
                    onChangeText={setDuration}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Route</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                    placeholder="Oral / Topical"
                    placeholderTextColor={theme.textMuted}
                    value={route}
                    onChangeText={setRoute}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Retail Price (₹)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                    placeholder="0.00"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="numeric"
                    value={price}
                    onChangeText={setPrice}
                  />
                </View>
              </View>

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Special Instructions / Notes</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary, height: 70 }]}
                placeholder="Take with warm water..."
                placeholderTextColor={theme.textMuted}
                multiline
                value={notes}
                onChangeText={setNotes}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, borderWidth: 1 }]}
                  onPress={() => setIsModalOpen(false)}
                >
                  <Text style={[styles.btnCancelText, { color: theme.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: theme.primary }]}
                  onPress={handleSave}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.btnConfirmText}>
                      {selectedMedicine ? 'Update Medicine' : 'Save to Inventory'}
                    </Text>
                  )}
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
  container: {
    flex: 1,
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  searchWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 8,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 12,
    height: 44,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  infoRow: {
    marginBottom: 10,
    marginLeft: 4,
  },
  infoText: {
    fontSize: 12,
    fontWeight: '600',
  },
  list: {
    paddingBottom: 24,
  },
  card: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  name: {
    fontSize: 15,
    fontWeight: '800',
  },
  meta: {
    fontSize: 12,
    marginTop: 2,
  },
  priceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  priceText: {
    fontSize: 12,
    fontWeight: '800',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  notes: {
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 2,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  empty: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
    marginLeft: 2,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    paddingBottom: 20,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnCancelText: {
    fontSize: 14,
    fontWeight: '700',
  },
  btnConfirmText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
