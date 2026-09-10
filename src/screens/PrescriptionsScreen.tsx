import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Modal,
  RefreshControl,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { prescriptionsApi } from '../api/prescriptions';
import { appointmentsApi } from '../api/appointments';
import { Medicine, PrescriptionItem, Appointment } from '../types';

export const PrescriptionsScreen: React.FC = () => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedApptId, setSelectedApptId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'name' | 'composition'>('name');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'Vitals' | 'ObGyn' | 'Clinical' | 'Medicines'>('Vitals');

  // Vitals State
  const [vitals, setVitals] = useState({ BP: '', PR: '', SPO2: '', Temp: '', Height: '', Weight: '', BMI: '', Others: '' });
  // ObGyn State
  const [obgyn, setObgyn] = useState({ Gravida: '', Parity: '', LMP: '', EDD: '', POG: '', LCB: '', MOD: '' });
  // Clinical Findings State
  const [clinical, setClinical] = useState({ polar: '', icterus: '', edema: '', cyanosis: '', clubbing: '', lymph_nodes: '', chest: '', cvs: '', others: '' });
  
  // Prescription builder state
  const [prescriptionList, setPrescriptionList] = useState<PrescriptionItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add Medicine Modal State
  const [isAddMedModalOpen, setIsAddMedModalOpen] = useState(false);
  const [selectedMed, setSelectedMed] = useState<Medicine | null>(null);
  const [medDose, setMedDose] = useState('1 Tablet');
  const [medFreq, setMedFreq] = useState('1-0-1 (After Food)');
  const [medDuration, setMedDuration] = useState('5 Days');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const autoSaveTimer = React.useRef<NodeJS.Timeout | null>(null);

  // Auto-calculate BMI
  useEffect(() => {
    const w = parseFloat(vitals.Weight);
    const hCm = parseFloat(vitals.Height); // assume cm for height
    if (!isNaN(w) && !isNaN(hCm) && hCm > 0) {
      const hM = hCm / 100;
      const bmi = (w / (hM * hM)).toFixed(1);
      setVitals(prev => ({ ...prev, BMI: bmi }));
    } else {
      setVitals(prev => ({ ...prev, BMI: '' }));
    }
  }, [vitals.Weight, vitals.Height]);

  // Determine if patient is male
  const selectedAppt = appointments.find(a => a._id === selectedApptId);
  const isMale = selectedAppt?.patientGender?.toLowerCase() === 'male' || selectedAppt?.gender?.toLowerCase() === 'male';

  // Auto-save logic
  useEffect(() => {
    if (!selectedApptId) return;
    
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }
    
    autoSaveTimer.current = setTimeout(() => {
      handleSavePrescription(true);
    }, 30000); // 30 seconds
    
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [vitals, obgyn, clinical, prescriptionList]);

  const fetchData = async () => {
    try {
      const [resMeds, resAppts] = await Promise.all([
        prescriptionsApi.getMedicines(1, 50),
        appointmentsApi.getAll()
      ]);
      setMedicines(Array.isArray(resMeds?.medicines) ? resMeds.medicines : []);
      setAppointments(Array.isArray(resAppts) ? resAppts : []);
    } catch (e: any) {
      Alert.alert('Error', 'Failed to load data.');
    } catch (e: any) {
      Alert.alert('Error', 'Failed to load data.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setIsRefreshing(true);
    fetchData();
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      fetchData();
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
      console.warn('Medicine search failed:', e);
    }
  };

  const handleOpenAddMedModal = (med: Medicine) => {
    setSelectedMed(med);
    setMedDose('1 Tablet');
    setMedFreq('1-0-1 (After Food)');
    setMedDuration('5 Days');
    setIsAddMedModalOpen(true);
  };

  const handleConfirmAddMed = () => {
    if (!selectedMed) return;
    const item: PrescriptionItem = {
      medicineId: selectedMed._id,
      name: selectedMed.name,
      dosage: medDose,
      frequency: medFreq,
      duration: medDuration,
    };
    setPrescriptionList((prev) => [...prev, item]);
    setIsAddMedModalOpen(false);
    setSelectedMed(null);
  };

  const handleRemovePrescriptionItem = (index: number) => {
    setPrescriptionList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSavePrescription = async (isAutoSave = false) => {
    if (!selectedApptId) {
      if (!isAutoSave) Alert.alert('Validation', 'Please select an appointment to save the prescription to.');
      return;
    }
    if (!isAutoSave) setIsSubmitting(true);
    try {
      const payload = {
        result: [{
          diagnosys: vitals,
          clinical_findings: clinical,
          Gravida: obgyn.Gravida,
          Parity: obgyn.Parity,
          LMP: obgyn.LMP,
          EDD: obgyn.EDD,
          POG: obgyn.POG,
          LCB: obgyn.LCB,
          MOD: obgyn.MOD,
          medicineAdvice: prescriptionList.map(m => ({
            name: m.name,
            dose: m.dosage,
            frequency: m.frequency,
            duration: m.duration
          }))
        }]
      };
      await appointmentsApi.update(selectedApptId, payload);
      if (!isAutoSave) {
        Alert.alert('Success', 'Prescription saved to appointment!');
        setPrescriptionList([]);
        setVitals({ BP: '', PR: '', SPO2: '', Temp: '', Height: '', Weight: '', BMI: '', Others: '' });
        setObgyn({ Gravida: '', Parity: '', LMP: '', EDD: '', POG: '', LCB: '', MOD: '' });
        setClinical({ polar: '', icterus: '', edema: '', cyanosis: '', clubbing: '', lymph_nodes: '', chest: '', cvs: '', others: '' });
      } else {
        console.log('Auto-saved prescription for appt:', selectedApptId);
      }
    } catch (e: any) {
      if (!isAutoSave) Alert.alert('Error', 'Failed to save prescription.');
    } finally {
      if (!isAutoSave) setIsSubmitting(false);
    }
  };

  // Vital Range checks
  const getVitalWarning = (key: string, val: string) => {
    const num = parseFloat(val);
    if (isNaN(num)) return null;
    if (key === 'PR' && (num < 60 || num > 100)) return 'Range: 60-100';
    if (key === 'SPO2' && (num < 95)) return 'Range: >95%';
    if (key === 'Temp' && (num < 97 || num > 99)) return 'Range: 97-99 °F';
    // BP logic is complex (sys/dia) so just skipping simple num check
    return null;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Select Appointment:</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedApptId}
            onValueChange={(itemValue) => setSelectedApptId(itemValue)}
          >
            <Picker.Item label="-- Select an Appointment --" value="" />
            {appointments.map(a => (
              <Picker.Item 
                key={a._id} 
                label={`${a.name || a.patientName || 'Unknown'} (${a._id.substring(a._id.length - 5)})`} 
                value={a._id} 
              />
            ))}
          </Picker>
        </View>
      </View>

      <View style={styles.tabBar}>
        <View style={styles.tabContainer}>
          {(['Vitals', 'ObGyn', 'Clinical', 'Medicines'] as const).map(tab => {
            if (tab === 'ObGyn' && isMale) return null; // Hide ObGyn for Males
            return (
              <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]} onPress={() => setActiveTab(tab)}>
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      >
        {activeTab === 'Vitals' && (
          <View style={styles.grid}>
            {Object.keys(vitals).map((k) => {
              const warning = getVitalWarning(k, vitals[k as keyof typeof vitals]);
              return (
              <View key={k} style={styles.gridItem}>
                <Text style={styles.label}>{k} {warning && <Text style={{color:'red', fontSize: 10}}>({warning})</Text>}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={`Enter ${k}`}
                  placeholderTextColor="#94a3b8"
                  value={vitals[k as keyof typeof vitals]}
                  onChangeText={(val) => setVitals(prev => ({ ...prev, [k]: val }))}
                  editable={k !== 'BMI'} // BMI is auto-calculated
                />
              </View>
              );
            })}
          </View>
        )}

        {activeTab === 'ObGyn' && (
          <View style={styles.formSection}>
            {Object.keys(obgyn).map((key) => (
              <TextInput key={key} style={styles.input} placeholder={key} value={(obgyn as any)[key]} onChangeText={(val) => setObgyn({...obgyn, [key]: val})} />
            ))}
          </View>
        )}

        {activeTab === 'Clinical' && (
          <View style={styles.formSection}>
            {Object.keys(clinical).map((key) => (
              <TextInput key={key} style={styles.input} placeholder={key.replace('_', ' ').toUpperCase()} value={(clinical as any)[key]} onChangeText={(val) => setClinical({...clinical, [key]: val})} />
            ))}
          </View>
        )}

        {activeTab === 'Medicines' && (
          <View>
            <View style={styles.searchBox}>
              <View style={styles.tabRow}>
                <TouchableOpacity style={[styles.searchTab, searchType === 'name' && styles.searchTabActive]} onPress={() => setSearchType('name')}>
                  <Text style={[styles.searchTabText, searchType === 'name' && styles.searchTabTextActive]}>By Brand Name</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.searchTab, searchType === 'composition' && styles.searchTabActive]} onPress={() => setSearchType('composition')}>
                  <Text style={[styles.searchTabText, searchType === 'composition' && styles.searchTabTextActive]}>By Composition</Text>
                </TouchableOpacity>
              </View>
              <TextInput style={styles.searchInput} placeholder={`Search by ${searchType}...`} value={searchQuery} onChangeText={handleSearch} />
            </View>

            {prescriptionList.length > 0 && (
              <View style={styles.draftCard}>
                <View style={styles.draftHeader}>
                  <Text style={styles.draftTitle}>📝 Draft ({prescriptionList.length})</Text>
                  <TouchableOpacity onPress={() => setPrescriptionList([])}><Text style={styles.clearText}>Clear</Text></TouchableOpacity>
                </View>
                {prescriptionList.map((item, idx) => (
                  <View key={idx} style={styles.draftItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.draftItemName}>{item.name}</Text>
                      <Text style={styles.draftItemDetails}>{item.dosage} • {item.frequency} • {item.duration}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleRemovePrescriptionItem(idx)}><Text style={styles.removeText}>✕</Text></TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {isLoading ? <ActivityIndicator size="large" /> : (
              medicines.map(item => (
                <View key={item._id} style={styles.medicineCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.medicineName}>{item.name}</Text>
                    {item.composition && <Text style={styles.compositionText}>🧪 {item.composition}</Text>}
                  </View>
                  <TouchableOpacity style={styles.addPrescriptionBtn} onPress={() => handleOpenAddMedModal(item)}>
                    <Text style={styles.addPrescriptionText}>+ Add Rx</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Save Button */}
      <View style={{ padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0' }}>
        <TouchableOpacity style={styles.saveBtn} onPress={() => handleSavePrescription(false)} disabled={isSubmitting}>
          {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Prescription Manually</Text>}
        </TouchableOpacity>
        <Text style={{ textAlign: 'center', fontSize: 10, color: '#94a3b8', marginTop: 8 }}>Auto-saves 30s after changes</Text>
      </View>

      <Modal visible={isAddMedModalOpen} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Dosage Details</Text>
            <Text style={styles.modalSubtitle}>{selectedMed?.name}</Text>
            
            <Text style={styles.modalLabel}>Dose</Text>
            <TextInput style={styles.modalInput} value={medDose} onChangeText={setMedDose} />
            
            <Text style={styles.modalLabel}>Frequency</Text>
            <TextInput style={styles.modalInput} value={medFreq} onChangeText={setMedFreq} />
            
            <Text style={styles.modalLabel}>Duration</Text>
            <TextInput style={styles.modalInput} value={medDuration} onChangeText={setMedDuration} />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCancel]} onPress={() => setIsAddMedModalOpen(false)}>
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnConfirm]} onPress={handleConfirmAddMed}>
                <Text style={styles.modalBtnConfirmText}>Add to Draft</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e2e8f0' },
  headerText: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  pickerContainer: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, overflow: 'hidden' },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', padding: 8, borderBottomWidth: 1, borderColor: '#e2e8f0' },
  tab: { flex: 1, padding: 10, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#e0f2fe' },
  tabText: { fontSize: 13, color: '#64748b' },
  tabTextActive: { color: '#0284c7', fontWeight: '700' },
  content: { flex: 1, padding: 12 },
  formSection: { gap: 10 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, fontSize: 14 },
  searchBox: { marginBottom: 12 },
  tabRow: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 8, padding: 3, marginBottom: 8 },
  searchTab: { flex: 1, padding: 6, alignItems: 'center', borderRadius: 6 },
  searchTabActive: { backgroundColor: '#fff' },
  searchTabText: { fontSize: 12, color: '#64748b' },
  searchTabTextActive: { color: '#0284c7', fontWeight: 'bold' },
  searchInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10 },
  draftCard: { backgroundColor: '#eff6ff', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#bfdbfe', marginBottom: 12 },
  draftHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  draftTitle: { fontSize: 14, fontWeight: '700', color: '#1e40af' },
  clearText: { fontSize: 12, color: '#dc2626', fontWeight: '600' },
  draftItem: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', padding: 8, borderRadius: 6, marginBottom: 4 },
  draftItemName: { fontSize: 13, fontWeight: '600' },
  draftItemDetails: { fontSize: 11, color: '#64748b' },
  removeText: { color: '#ef4444', fontWeight: '700', fontSize: 16 },
  medicineCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 14, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  medicineName: { fontSize: 15, fontWeight: '700' },
  compositionText: { fontSize: 12, color: '#0284c7', marginTop: 2 },
  addPrescriptionBtn: { backgroundColor: '#f0f9ff', borderColor: '#0284c7', borderWidth: 1, padding: 10, borderRadius: 8 },
  addPrescriptionText: { color: '#0284c7', fontWeight: '600', fontSize: 12 },
  footer: { padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#e2e8f0' },
  saveBtn: { backgroundColor: '#0284c7', padding: 14, borderRadius: 10, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', padding: 20, borderRadius: 12 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  modalSubtitle: { fontSize: 14, color: '#64748b', marginBottom: 12 },
  modalLabel: { fontSize: 12, fontWeight: '600', color: '#475569', marginTop: 8, marginBottom: 4 },
  modalInput: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, fontSize: 14 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
  modalBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  modalBtnCancel: { backgroundColor: '#f1f5f9' },
  modalBtnCancelText: { color: '#475569', fontWeight: '600' },
  modalBtnConfirm: { backgroundColor: '#0284c7' },
  modalBtnConfirmText: { color: '#fff', fontWeight: '600' }
});
