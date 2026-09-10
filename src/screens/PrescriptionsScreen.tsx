import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRoute } from '@react-navigation/native';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Modal,
  RefreshControl,
  KeyboardType,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { prescriptionsApi } from '../api/prescriptions';
import { appointmentsApi } from '../api/appointments';
import { Medicine, PrescriptionItem, Appointment } from '../types';

// Vital field config: label, keyboard type, placeholder hint, min, max
const VITAL_CONFIG: Record<string, { label: string; keyboardType: KeyboardType; placeholder: string; min?: number; max?: number; unit?: string }> = {
  BP:     { label: 'BP (Sys/Dia)', keyboardType: 'default', placeholder: 'e.g. 120/80', unit: 'mmHg' },
  PR:     { label: 'Pulse Rate',   keyboardType: 'numeric',  placeholder: 'e.g. 72',    min: 40, max: 200, unit: 'bpm' },
  SPO2:   { label: 'SpO2',        keyboardType: 'numeric',  placeholder: 'e.g. 98',    min: 80, max: 100, unit: '%' },
  Temp:   { label: 'Temperature', keyboardType: 'numeric',  placeholder: 'e.g. 98.6',  min: 95, max: 106, unit: '°F' },
  Height: { label: 'Height',      keyboardType: 'numeric',  placeholder: 'e.g. 170',   min: 50, max: 250, unit: 'cm' },
  Weight: { label: 'Weight',      keyboardType: 'numeric',  placeholder: 'e.g. 65',    min: 1,  max: 300, unit: 'kg' },
  BMI:    { label: 'BMI',         keyboardType: 'numeric',  placeholder: 'Auto-calculated' },
  Others: { label: 'Others',      keyboardType: 'default',  placeholder: 'Any other findings' },
};

const getVitalWarning = (key: string, val: string): string | null => {
  const cfg = VITAL_CONFIG[key];
  if (!cfg || !val) return null;
  const num = parseFloat(val);
  if (isNaN(num)) return null;
  if (cfg.min !== undefined && num < cfg.min) return `Low! Min: ${cfg.min} ${cfg.unit || ''}`;
  if (cfg.max !== undefined && num > cfg.max) return `High! Max: ${cfg.max} ${cfg.unit || ''}`;
  // Special BMI interpretation
  if (key === 'BMI') {
    if (num < 18.5) return 'Underweight';
    if (num >= 30) return 'Obese';
    if (num >= 25) return 'Overweight';
  }
  return null;
};

export const PrescriptionsScreen: React.FC = () => {
  const route = useRoute<any>();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedApptId, setSelectedApptId] = useState(route?.params?.appointmentId || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'name' | 'composition'>('name');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'Vitals' | 'ObGyn' | 'Clinical' | 'Medicines'>('Vitals');
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-calculate BMI whenever Weight or Height changes
  useEffect(() => {
    const w = parseFloat(vitals.Weight);
    const hCm = parseFloat(vitals.Height);
    if (!isNaN(w) && !isNaN(hCm) && hCm > 0) {
      const hM = hCm / 100;
      const bmi = (w / (hM * hM)).toFixed(1);
      setVitals(prev => ({ ...prev, BMI: bmi }));
    } else {
      setVitals(prev => ({ ...prev, BMI: '' }));
    }
  }, [vitals.Weight, vitals.Height]);

  // Determine if selected patient is male (hide ObGyn tab)
  const selectedAppt = appointments.find(a => a._id === selectedApptId);
  const isMale = selectedAppt?.patientGender?.toLowerCase() === 'male' || selectedAppt?.gender?.toLowerCase() === 'male';

  const handleSavePrescription = useCallback(async (isAutoSave = false) => {
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
            duration: m.duration,
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
      }
      // Auto-save is silent — no console.log in production
    } catch (e: any) {
      if (!isAutoSave) Alert.alert('Error', e?.response?.data?.message || 'Failed to save prescription.');
    } finally {
      if (!isAutoSave) setIsSubmitting(false);
    }
  }, [selectedApptId, vitals, clinical, obgyn, prescriptionList]);

  // Auto-save after 30s of inactivity when an appointment is selected
  useEffect(() => {
    if (!selectedApptId) return;

    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);

    autoSaveTimer.current = setTimeout(() => {
      handleSavePrescription(true);
    }, 30000);

    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [vitals, obgyn, clinical, prescriptionList, selectedApptId, handleSavePrescription]);

  const fetchData = async () => {
    try {
      const [resMeds, resAppts] = await Promise.all([
        prescriptionsApi.getMedicines(1, 50),
        appointmentsApi.getAll(),
      ]);
      setMedicines(Array.isArray(resMeds?.medicines) ? resMeds.medicines : []);
      setAppointments(Array.isArray(resAppts) ? resAppts : []);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to load data.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchData();
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  // When navigated with an appointmentId param, pre-select it once data loads
  useEffect(() => {
    if (route?.params?.appointmentId && appointments.length > 0) {
      setSelectedApptId(route.params.appointmentId);
    }
  }, [route?.params?.appointmentId, appointments]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      fetchData();
      return;
    }
    try {
      const results = searchType === 'name'
        ? await prescriptionsApi.searchByName(query)
        : await prescriptionsApi.searchByComposition(query);
      setMedicines(Array.isArray(results) ? results : []);
    } catch (e: any) {
      // silently fail — previous results remain visible
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
    setPrescriptionList(prev => [...prev, item]);
    setIsAddMedModalOpen(false);
    setSelectedMed(null);
  };

  const handleRemovePrescriptionItem = (index: number) => {
    setPrescriptionList(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <View style={styles.container}>
      {/* Appointment Selector */}
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
                label={`${a.name || a.patientName || 'Unknown'} (${a.appointmentDate || ''})`}
                value={a._id}
              />
            ))}
          </Picker>
        </View>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {(['Vitals', 'ObGyn', 'Clinical', 'Medicines'] as const).map(tab => {
          if (tab === 'ObGyn' && isMale) return null; // Hide ObGyn tab for males
          return (
            <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]} onPress={() => setActiveTab(tab)}>
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      >
        {/* Vitals Tab */}
        {activeTab === 'Vitals' && (
          <View style={styles.grid}>
            {(Object.keys(vitals) as Array<keyof typeof vitals>).map((k) => {
              const cfg = VITAL_CONFIG[k];
              const warning = getVitalWarning(k, vitals[k]);
              const isBMI = k === 'BMI';
              return (
                <View key={k} style={styles.gridItem}>
                  <View style={styles.labelRow}>
                    <Text style={styles.label}>{cfg?.label || k}</Text>
                    {cfg?.unit && <Text style={styles.unitText}>{cfg.unit}</Text>}
                  </View>
                  {warning && (
                    <Text style={[styles.warningText, warning.startsWith('High') ? styles.warningHigh : warning.startsWith('Low') ? styles.warningLow : styles.warningInfo]}>
                      ⚠ {warning}
                    </Text>
                  )}
                  <TextInput
                    style={[styles.input, isBMI && styles.inputDisabled]}
                    placeholder={cfg?.placeholder || `Enter ${k}`}
                    placeholderTextColor="#94a3b8"
                    value={vitals[k]}
                    onChangeText={(val) => setVitals(prev => ({ ...prev, [k]: val }))}
                    editable={!isBMI}
                    keyboardType={cfg?.keyboardType || 'default'}
                  />
                </View>
              );
            })}
          </View>
        )}

        {/* ObGyn Tab */}
        {activeTab === 'ObGyn' && (
          <View style={styles.formSection}>
            {(Object.keys(obgyn) as Array<keyof typeof obgyn>).map((key) => (
              <View key={key} style={styles.fieldGroup}>
                <Text style={styles.label}>{key}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={`Enter ${key}`}
                  placeholderTextColor="#94a3b8"
                  value={obgyn[key]}
                  onChangeText={(val) => setObgyn(prev => ({ ...prev, [key]: val }))}
                />
              </View>
            ))}
          </View>
        )}

        {/* Clinical Findings Tab */}
        {activeTab === 'Clinical' && (
          <View style={styles.formSection}>
            {(Object.keys(clinical) as Array<keyof typeof clinical>).map((key) => (
              <View key={key} style={styles.fieldGroup}>
                <Text style={styles.label}>{key.replace(/_/g, ' ').toUpperCase()}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={`Enter ${key.replace(/_/g, ' ')}`}
                  placeholderTextColor="#94a3b8"
                  value={clinical[key]}
                  onChangeText={(val) => setClinical(prev => ({ ...prev, [key]: val }))}
                />
              </View>
            ))}
          </View>
        )}

        {/* Medicines Tab */}
        {activeTab === 'Medicines' && (
          <View>
            {/* Search Bar */}
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

            {/* Draft Prescription */}
            {prescriptionList.length > 0 && (
              <View style={styles.draftCard}>
                <View style={styles.draftHeader}>
                  <Text style={styles.draftTitle}>📝 Draft ({prescriptionList.length})</Text>
                  <TouchableOpacity onPress={() => setPrescriptionList([])}><Text style={styles.clearText}>Clear All</Text></TouchableOpacity>
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

            {/* Medicine List */}
            {isLoading ? (
              <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 40 }} />
            ) : medicines.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No medicines found</Text>
              </View>
            ) : (
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

      {/* Save Button Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveBtn} onPress={() => handleSavePrescription(false)} disabled={isSubmitting}>
          {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>💾 Save Prescription</Text>}
        </TouchableOpacity>
        <Text style={styles.autoSaveHint}>Auto-saves 30s after changes</Text>
      </View>

      {/* Add Medicine Dosage Modal */}
      <Modal visible={isAddMedModalOpen} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Dosage Details</Text>
            <Text style={styles.modalSubtitle}>{selectedMed?.name}</Text>

            <Text style={styles.modalLabel}>Dose</Text>
            <TextInput style={styles.modalInput} value={medDose} onChangeText={setMedDose} placeholder="e.g. 1 Tablet" />

            <Text style={styles.modalLabel}>Frequency</Text>
            <TextInput style={styles.modalInput} value={medFreq} onChangeText={setMedFreq} placeholder="e.g. 1-0-1 (After Food)" />

            <Text style={styles.modalLabel}>Duration</Text>
            <TextInput style={styles.modalInput} value={medDuration} onChangeText={setMedDuration} placeholder="e.g. 5 Days" />

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
  header: { padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e2e8f0' },
  headerText: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 8 },
  pickerContainer: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, overflow: 'hidden', backgroundColor: '#f8fafc' },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 8, paddingVertical: 6, borderBottomWidth: 1, borderColor: '#e2e8f0' },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8, marginHorizontal: 2 },
  tabActive: { backgroundColor: '#e0f2fe' },
  tabText: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  tabTextActive: { color: '#0284c7', fontWeight: '700' },
  content: { flex: 1, padding: 12 },
  // Vitals Grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridItem: { width: '48%', backgroundColor: '#fff', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  label: { fontSize: 12, fontWeight: '600', color: '#475569' },
  unitText: { fontSize: 10, color: '#94a3b8' },
  warningText: { fontSize: 10, marginBottom: 4, fontWeight: '600' },
  warningHigh: { color: '#dc2626' },
  warningLow: { color: '#d97706' },
  warningInfo: { color: '#7c3aed' },
  // Form
  formSection: { gap: 10 },
  fieldGroup: { marginBottom: 8 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, fontSize: 14, color: '#1e293b' },
  inputDisabled: { backgroundColor: '#f1f5f9', color: '#94a3b8' },
  // Medicines
  searchBox: { marginBottom: 12 },
  tabRow: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 8, padding: 3, marginBottom: 8 },
  searchTab: { flex: 1, padding: 6, alignItems: 'center', borderRadius: 6 },
  searchTabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  searchTabText: { fontSize: 12, color: '#64748b' },
  searchTabTextActive: { color: '#0284c7', fontWeight: 'bold' },
  searchInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, fontSize: 14 },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyStateText: { color: '#94a3b8', fontSize: 14 },
  // Draft
  draftCard: { backgroundColor: '#eff6ff', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#bfdbfe', marginBottom: 12 },
  draftHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  draftTitle: { fontSize: 14, fontWeight: '700', color: '#1e40af' },
  clearText: { fontSize: 12, color: '#dc2626', fontWeight: '600' },
  draftItem: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', padding: 8, borderRadius: 6, marginBottom: 4 },
  draftItemName: { fontSize: 13, fontWeight: '600', color: '#1e293b' },
  draftItemDetails: { fontSize: 11, color: '#64748b' },
  removeText: { color: '#ef4444', fontWeight: '700', fontSize: 18, paddingHorizontal: 4 },
  // Medicine Card
  medicineCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 14, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  medicineName: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  compositionText: { fontSize: 12, color: '#0284c7', marginTop: 2 },
  addPrescriptionBtn: { backgroundColor: '#f0f9ff', borderColor: '#0284c7', borderWidth: 1, padding: 10, borderRadius: 8 },
  addPrescriptionText: { color: '#0284c7', fontWeight: '600', fontSize: 12 },
  // Footer
  footer: { padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  saveBtn: { backgroundColor: '#0284c7', padding: 14, borderRadius: 10, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  autoSaveHint: { textAlign: 'center', fontSize: 10, color: '#94a3b8', marginTop: 6 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', padding: 20, borderRadius: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 4 },
  modalSubtitle: { fontSize: 14, color: '#64748b', marginBottom: 12 },
  modalLabel: { fontSize: 12, fontWeight: '600', color: '#475569', marginTop: 8, marginBottom: 4 },
  modalInput: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, fontSize: 14 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
  modalBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  modalBtnCancel: { backgroundColor: '#f1f5f9' },
  modalBtnCancelText: { color: '#475569', fontWeight: '600' },
  modalBtnConfirm: { backgroundColor: '#0284c7' },
  modalBtnConfirmText: { color: '#fff', fontWeight: '600' },
});
