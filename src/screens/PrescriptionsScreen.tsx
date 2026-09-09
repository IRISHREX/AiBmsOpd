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
} from 'react-native';
import { prescriptionsApi } from '../api/prescriptions';
import { Medicine, PrescriptionItem } from '../types';

export const PrescriptionsScreen: React.FC = () => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'name' | 'composition'>('name');
  const [isLoading, setIsLoading] = useState(true);

  // Prescription builder state
  const [prescriptionList, setPrescriptionList] = useState<PrescriptionItem[]>([]);
  const [isAddMedModalOpen, setIsAddMedModalOpen] = useState(false);
  const [medName, setMedName] = useState('');
  const [medComposition, setMedComposition] = useState('');
  const [medDosage, setMedDosage] = useState('1 Tablet');
  const [medFreq, setMedFreq] = useState('1-0-1');
  const [medDuration, setMedDuration] = useState('5 days');

  const fetchMedicines = async () => {
    try {
      const res = await prescriptionsApi.getMedicines(1, 50);
      setMedicines(Array.isArray(res?.medicines) ? res.medicines : []);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || e?.message || 'Failed to load medicines:');
      console.warn('Failed to load medicines:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicines();
  }, []);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      fetchMedicines();
      return;
    }
    try {
      if (searchType === 'name') {
        const results = await prescriptionsApi.searchByName(query);
        setMedicines(Array.isArray(results) ? results : []);
      } else {
        const results = await prescriptionsApi.searchByComposition(query);
        setMedicines(Array.isArray(results) ? results : []);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || e?.message || 'Medicine search failed:');
      console.warn('Medicine search failed:', e);
    }
  };

  const handleAddToPrescription = (med: Medicine) => {
    const item: PrescriptionItem = {
      medicineId: med._id,
      name: med.name,
      dosage: '1 Tablet',
      frequency: '1-0-1 (After Food)',
      duration: '5 Days',
    };
    setPrescriptionList((prev) => [...prev, item]);
    Alert.alert('Added', `${med.name} added to current prescription draft`);
  };

  const handleRemovePrescriptionItem = (index: number) => {
    setPrescriptionList((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchBox}>
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.searchTab, searchType === 'name' && styles.searchTabActive]}
            onPress={() => setSearchType('name')}
          >
            <Text
              style={[
                styles.searchTabText,
                searchType === 'name' && styles.searchTabTextActive,
              ]}
            >
              By Brand Name
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.searchTab,
              searchType === 'composition' && styles.searchTabActive,
            ]}
            onPress={() => setSearchType('composition')}
          >
            <Text
              style={[
                styles.searchTabText,
                searchType === 'composition' && styles.searchTabTextActive,
              ]}
            >
              By Composition
            </Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.searchInput}
          placeholder={`Search by ${searchType}...`}
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={handleSearch}
        />
      </View>

      {/* Prescription Draft Sheet */}
      {prescriptionList.length > 0 && (
        <View style={styles.draftCard}>
          <View style={styles.draftHeader}>
            <Text style={styles.draftTitle}>
              📝 Current Draft ({prescriptionList.length} items)
            </Text>
            <TouchableOpacity onPress={() => setPrescriptionList([])}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          </View>

          {prescriptionList.map((item, idx) => (
            <View key={idx} style={styles.draftItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.draftItemName}>{item.name}</Text>
                <Text style={styles.draftItemDetails}>
                  {item.dosage} • {item.frequency} • {item.duration}
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleRemovePrescriptionItem(idx)}>
                <Text style={styles.removeText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Medicines Catalog List */}
      {isLoading ? (
        <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={medicines}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          initialNumToRender={10}
          maxToRenderPerBatch={5}
          windowSize={11}
          removeClippedSubviews={true}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No medicines match your search</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.medicineCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.medicineName}>{item.name}</Text>
                {item.composition && (
                  <Text style={styles.compositionText}>🧪 {item.composition}</Text>
                )}
                <Text style={styles.medicineMeta}>
                  Form: {item.dosageForm || 'Tablet'} • {item.manufacturer || 'Generic'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.addPrescriptionBtn}
                onPress={() => handleAddToPrescription(item)}
              >
                <Text style={styles.addPrescriptionText}>+ Add Rx</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  searchBox: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 3,
    marginBottom: 8,
  },
  searchTab: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 6,
  },
  searchTabActive: {
    backgroundColor: '#ffffff',
  },
  searchTabText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  searchTabTextActive: {
    color: '#0284c7',
    fontWeight: '700',
  },
  searchInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0f172a',
  },
  draftCard: {
    backgroundColor: '#eff6ff',
    padding: 12,
    margin: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  draftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  draftTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e40af',
  },
  clearText: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '600',
  },
  draftItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 8,
    borderRadius: 6,
    marginBottom: 4,
  },
  draftItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  draftItemDetails: {
    fontSize: 11,
    color: '#64748b',
  },
  removeText: {
    color: '#ef4444',
    fontWeight: '700',
    fontSize: 16,
    paddingHorizontal: 6,
  },
  list: {
    padding: 12,
    paddingBottom: 30,
  },
  medicineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  medicineName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  compositionText: {
    fontSize: 12,
    color: '#0284c7',
    marginTop: 2,
  },
  medicineMeta: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  addPrescriptionBtn: {
    backgroundColor: '#f0f9ff',
    borderColor: '#0284c7',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addPrescriptionText: {
    color: '#0284c7',
    fontWeight: '600',
    fontSize: 12,
  },
  empty: {
    alignItems: 'center',
    padding: 30,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14,
  },
});
