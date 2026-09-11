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
import { Ionicons } from '@expo/vector-icons';
import { prescriptionsApi } from '../api/prescriptions';
import { appointmentsApi } from '../api/appointments';
import { Medicine, PrescriptionItem, Appointment } from '../types';
import { useTheme } from '../context/ThemeContext';
import { PrescriptionTemplateModal } from '../components/PrescriptionTemplateModal';
import { PrescriptionPreviewModal } from '../components/PrescriptionPreviewModal';
import { PrescriptionSettingsModal } from '../components/PrescriptionSettingsModal';
import { PrescriptionTemplate } from '../utils/prescriptionTemplates';
import * as Haptics from 'expo-haptics';

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
  if (key === 'BMI') {
    if (num < 18.5) return 'Underweight';
    if (num >= 30) return 'Obese';
    if (num >= 25) return 'Overweight';
  }
  return null;
};

export const PrescriptionsScreen: React.FC = () => {
  const route = useRoute<any>();
  const { colors } = useTheme();

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
  const [clinical, setClinical] = useState<Record<string, string>>({ polar: '', icterus: '', edema: '', cyanosis: '', clubbing: '', lymph_nodes: '', chest: '', cvs: '', others: '' });

  // Prescription builder state
  const [prescriptionList, setPrescriptionList] = useState<PrescriptionItem[]>([]);
  const [generalAdvice, setGeneralAdvice] = useState('');
  const [dietAdvice, setDietAdvice] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modals state
  const [isAddMedModalOpen, setIsAddMedModalOpen] = useState(false);
  const [selectedMed, setSelectedMed] = useState<Medicine | null>(null);
  const [medDose, setMedDose] = useState('1 Tablet');
  const [medFreq, setMedFreq] = useState('1-0-1 (After Food)');
  const [medDuration, setMedDuration] = useState('5 Days');

  // New templates & preview modals
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isBrandingModalOpen, setIsBrandingModalOpen] = useState(false);

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-calculate BMI
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

  const selectedAppt = appointments.find(a => a._id === selectedApptId) || null;
  const isMale = selectedAppt?.patientGender?.toLowerCase() === 'male' || selectedAppt?.gender?.toLowerCase() === 'male';

  // Populate existing prescription results when appointment is selected
  useEffect(() => {
    if (!selectedApptId || appointments.length === 0) return;
    const appt = appointments.find(a => a._id === selectedApptId);
    if (appt?.result && appt.result.length > 0) {
      const res = appt.result[0];
      if (res.diagnosys) setVitals(prev => ({ ...prev, ...(res.diagnosys as any) }));
      if (res.clinical_findings) setClinical(prev => ({ ...prev, ...(res.clinical_findings as any) }));
      if (res.advice) {
        if (typeof res.advice === 'string') setGeneralAdvice(res.advice);
        else if (res.advice.medication || res.advice.diet) {
          setGeneralAdvice(res.advice.medication || '');
          setDietAdvice(res.advice.diet || '');
        }
      }
      if (res.followUp) setFollowUpDate(res.followUp);
      if (res.medicineAdvice && res.medicineAdvice.length > 0) {
        setPrescriptionList(res.medicineAdvice.map(m => ({
          name: m.name || '',
          dosage: m.dose || '1 Tab',
          frequency: m.frequency || '1-0-1',
          duration: m.duration || '5 Days',
          instructions: m.notes,
        })));
      }
    }
  }, [selectedApptId, appointments]);

  const handleSavePrescription = useCallback(async (isAutoSave = false) => {
    if (!selectedApptId) {
      if (!isAutoSave) Alert.alert('Validation', 'Please select an appointment first.');
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
          advice: {
            medication: generalAdvice,
            diet: dietAdvice,
          },
          followUp: followUpDate,
          medicineAdvice: prescriptionList.map(m => ({
            name: m.name,
            dose: m.dosage,
            frequency: m.frequency,
            duration: m.duration,
            notes: m.instructions,
          }))
        }]
      };
      await appointmentsApi.update(selectedApptId, payload);
      if (!isAutoSave) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Success', 'Prescription saved to appointment!');
      }
    } catch (e: any) {
      if (!isAutoSave) Alert.alert('Error', e?.response?.data?.message || 'Failed to save prescription.');
    } finally {
      if (!isAutoSave) setIsSubmitting(false);
    }
  }, [selectedApptId, vitals, clinical, obgyn, prescriptionList, generalAdvice, dietAdvice, followUpDate]);

  // Auto-save after 30s of inactivity
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
      Alert.alert('Notice', e?.response?.data?.message || 'Failed to load data.');
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
      // silently fail
    }
  };

  const handleApplyTemplate = (tmpl: PrescriptionTemplate) => {
    if (tmpl.vitals) {
      setVitals(prev => ({ ...prev, ...tmpl.vitals }));
    }
    if (tmpl.clinicalFindings) {
      setClinical(prev => ({ ...prev, ...tmpl.clinicalFindings }));
    }
    if (tmpl.medicines && tmpl.medicines.length > 0) {
      setPrescriptionList(prev => [
        ...prev,
        ...tmpl.medicines.map(m => ({
          name: m.name || '',
          dosage: m.dose || '1 Tab',
          frequency: m.frequency || '1-0-1',
          duration: m.duration || '5 Days',
          instructions: m.notes,
        })),
      ]);
    }
    if (tmpl.advice) setGeneralAdvice(tmpl.advice);
    if (tmpl.diet) setDietAdvice(tmpl.diet);
    if (tmpl.followUpDays) {
      const d = new Date();
      d.setDate(d.getDate() + tmpl.followUpDays);
      setFollowUpDate(d.toLocaleDateString('en-GB'));
    }
    Alert.alert('Template Applied', `"${tmpl.name}" preset applied to prescription.`);
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Appointment Selector & Quick Action Bar */}
      <View style={[styles.header, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <View style={styles.headerTopRow}>
          <Text style={[styles.headerText, { color: colors.textPrimary }]}>Select Appointment:</Text>
          <View style={styles.topActionBtns}>
            <TouchableOpacity
              style={[styles.miniBtn, { backgroundColor: colors.goldSoft, borderColor: colors.goldBorder }]}
              onPress={() => setIsTemplateModalOpen(true)}
            >
              <Ionicons name="copy-outline" size={13} color={colors.goldDark} />
              <Text style={[styles.miniBtnText, { color: colors.goldDark }]}>Templates</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.miniBtn, { backgroundColor: colors.primarySoft, borderColor: colors.primaryMuted }]}
              onPress={() => {
                if (!selectedApptId) {
                  Alert.alert('Notice', 'Please select an appointment first to preview prescription.');
                  return;
                }
                setIsPreviewModalOpen(true);
              }}
            >
              <Ionicons name="eye-outline" size={13} color={colors.primary} />
              <Text style={[styles.miniBtnText, { color: colors.primary }]}>Preview</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.iconOnlyBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
              onPress={() => setIsBrandingModalOpen(true)}
            >
              <Ionicons name="settings-outline" size={15} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.pickerContainer, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <Picker
            selectedValue={selectedApptId}
            onValueChange={(itemValue) => setSelectedApptId(itemValue)}
            dropdownIconColor={colors.goldDark}
            style={{ color: colors.textPrimary }}
          >
            <Picker.Item label="-- Choose Patient Appointment --" value="" color={colors.textMuted} />
            {appointments.map(a => (
              <Picker.Item
                key={a._id}
                label={`${a.name || a.patientName || 'Unknown'} (${a.appointmentDate || ''})`}
                value={a._id}
                color={colors.textPrimary}
              />
            ))}
          </Picker>
        </View>
      </View>

      {/* Tab Bar with Icons */}
      <View style={[styles.tabBar, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        {[
          { tab: 'Vitals', icon: 'pulse' },
          { tab: 'ObGyn', icon: 'female' },
          { tab: 'Clinical', icon: 'clipboard' },
          { tab: 'Medicines', icon: 'medkit' },
        ].map(({ tab, icon }) => {
          if (tab === 'ObGyn' && isMale) return null;
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, isActive && { backgroundColor: colors.primary }]}
              onPress={() => setActiveTab(tab as any)}
            >
              <Ionicons
                name={icon as any}
                size={14}
                color={isActive ? colors.textWhite : colors.textSecondary}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.tabText, { color: colors.textSecondary }, isActive && { color: colors.textWhite, fontWeight: '700' }]}>
                {tab}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[colors.primary, colors.gold]} />}
      >
        {/* Vitals Tab */}
        {activeTab === 'Vitals' && (
          <View style={styles.grid}>
            {(Object.keys(vitals) as Array<keyof typeof vitals>).map((k) => {
              const cfg = VITAL_CONFIG[k];
              const warning = getVitalWarning(k, vitals[k]);
              const isBMI = k === 'BMI';
              return (
                <View key={k} style={[styles.gridItem, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                  <View style={styles.labelRow}>
                    <Text style={[styles.label, { color: colors.textPrimary }]}>{cfg?.label || k}</Text>
                    {cfg?.unit && <Text style={[styles.unitText, { color: colors.textMuted }]}>{cfg.unit}</Text>}
                  </View>
                  {warning && (
                    <Text style={[styles.warningText, warning.startsWith('High') ? styles.warningHigh : warning.startsWith('Low') ? styles.warningLow : styles.warningInfo]}>
                      ⚠ {warning}
                    </Text>
                  )}
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight, color: colors.textPrimary }, isBMI && styles.inputDisabled]}
                    placeholder={cfg?.placeholder || `Enter ${k}`}
                    placeholderTextColor={colors.textMuted}
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
          <View style={[styles.formSection, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            {(Object.keys(obgyn) as Array<keyof typeof obgyn>).map((k) => (
              <View key={k} style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>{k}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight, color: colors.textPrimary }]}
                  placeholder={`Enter ${k}`}
                  placeholderTextColor={colors.textMuted}
                  value={obgyn[k]}
                  onChangeText={(val) => setObgyn(prev => ({ ...prev, [k]: val }))}
                />
              </View>
            ))}
          </View>
        )}

        {/* Clinical Findings Tab */}
        {activeTab === 'Clinical' && (
          <View style={[styles.formSection, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            {(Object.keys(clinical) as Array<keyof typeof clinical>).map((k) => (
              <View key={k} style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>{k.replace('_', ' ').toUpperCase()}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight, color: colors.textPrimary }]}
                  placeholder={`Enter ${k.replace('_', ' ')} findings`}
                  placeholderTextColor={colors.textMuted}
                  value={clinical[k]}
                  onChangeText={(val) => setClinical(prev => ({ ...prev, [k]: val }))}
                />
              </View>
            ))}
          </View>
        )}

        {/* Medicines Tab */}
        {activeTab === 'Medicines' && (
          <View>
            {/* Draft Prescription Items */}
            {prescriptionList.length > 0 && (
              <View style={[styles.draftCard, { backgroundColor: colors.primarySoft, borderColor: colors.primaryMuted }]}>
                <View style={styles.draftHeader}>
                  <Text style={[styles.draftTitle, { color: colors.primary }]}>Prescribed Items ({prescriptionList.length})</Text>
                  <TouchableOpacity onPress={() => setPrescriptionList([])}>
                    <Text style={styles.clearText}>Clear All</Text>
                  </TouchableOpacity>
                </View>
                {prescriptionList.map((item, idx) => (
                  <View key={idx} style={[styles.draftItem, { backgroundColor: colors.cardBg, borderColor: colors.borderLight }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.draftItemName, { color: colors.textPrimary }]}>{item.name}</Text>
                      <Text style={[styles.draftItemDetails, { color: colors.textSecondary }]}>
                        {item.dosage} • {item.frequency} • {item.duration}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => handleRemovePrescriptionItem(idx)}>
                      <Ionicons name="trash-outline" size={16} color="#dc2626" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Medicine Store Search */}
            <View style={styles.searchBox}>
              <View style={[styles.tabRow, { backgroundColor: colors.surfaceElevated }]}>
                <TouchableOpacity
                  style={[styles.searchTab, searchType === 'name' && { backgroundColor: colors.cardBg }]}
                  onPress={() => setSearchType('name')}
                >
                  <Text style={[styles.searchTabText, { color: colors.textSecondary }, searchType === 'name' && { color: colors.primary, fontWeight: '700' }]}>
                    By Name
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.searchTab, searchType === 'composition' && { backgroundColor: colors.cardBg }]}
                  onPress={() => setSearchType('composition')}
                >
                  <Text style={[styles.searchTabText, { color: colors.textSecondary }, searchType === 'composition' && { color: colors.primary, fontWeight: '700' }]}>
                    By Composition
                  </Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={[styles.searchInput, { backgroundColor: colors.cardBg, borderColor: colors.border, color: colors.textPrimary }]}
                placeholder={`Search medicines by ${searchType}...`}
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={handleSearch}
              />
            </View>

            {/* Medicine Inventory Results */}
            {medicines.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="medkit-outline" size={36} color={colors.goldMuted} />
                <Text style={[styles.emptyStateText, { color: colors.textMuted }]}>No medicines found</Text>
              </View>
            ) : (
              medicines.map((med) => (
                <View key={med._id} style={[styles.medicineCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.medicineName, { color: colors.textPrimary }]}>{med.name}</Text>
                    {med.genericName ? (
                      <Text style={[styles.compositionText, { color: colors.primary }]}>{med.genericName}</Text>
                    ) : null}
                    <Text style={[styles.metaText, { color: colors.textMuted }]}>
                      {med.dosageForm || 'Form'} • ₹{med.unitPrice || 0}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.addPrescriptionBtn, { backgroundColor: colors.goldSoft, borderColor: colors.goldBorder }]}
                    onPress={() => handleOpenAddMedModal(med)}
                  >
                    <Ionicons name="add" size={16} color={colors.goldDark} />
                    <Text style={[styles.addPrescriptionText, { color: colors.goldDark }]}>Add to Rx</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Footer Action Bar */}
      <View style={[styles.footer, { backgroundColor: colors.cardBg, borderTopColor: colors.border }]}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            style={[styles.previewFooterBtn, { backgroundColor: colors.primarySoft, borderColor: colors.primaryMuted }]}
            onPress={() => {
              if (!selectedApptId) {
                Alert.alert('Notice', 'Please select an appointment first.');
                return;
              }
              setIsPreviewModalOpen(true);
            }}
          >
            <Ionicons name="print-outline" size={18} color={colors.primary} />
            <Text style={[styles.previewFooterText, { color: colors.primary }]}>Preview & PDF</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.gold }]}
            onPress={() => handleSavePrescription(false)}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <Ionicons name="save-outline" size={18} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.saveBtnText}>Save Prescription</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        <Text style={[styles.autoSaveHint, { color: colors.textMuted }]}>Auto-saves periodically when editing appointment</Text>
      </View>

      {/* Add Medicine Modal */}
      <Modal visible={isAddMedModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBg }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{selectedMed?.name}</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>Configure Dosage Instructions</Text>

            <Text style={[styles.modalLabel, { color: colors.textPrimary }]}>Dosage</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.textPrimary }]}
              value={medDose}
              onChangeText={setMedDose}
              placeholder="e.g. 1 Tablet, 5ml"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={[styles.modalLabel, { color: colors.textPrimary }]}>Frequency</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.textPrimary }]}
              value={medFreq}
              onChangeText={setMedFreq}
              placeholder="e.g. 1-0-1 (After Food)"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={[styles.modalLabel, { color: colors.textPrimary }]}>Duration</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.textPrimary }]}
              value={medDuration}
              onChangeText={setMedDuration}
              placeholder="e.g. 5 Days, 1 Month"
              placeholderTextColor={colors.textMuted}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setIsAddMedModalOpen(false)}>
                <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtnConfirm, { backgroundColor: colors.primary }]} onPress={handleConfirmAddMed}>
                <Text style={{ color: '#ffffff', fontWeight: '700' }}>Add to Rx</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Prescription Templates Modal */}
      <PrescriptionTemplateModal
        visible={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        onApplyTemplate={handleApplyTemplate}
        currentVitals={vitals}
        currentClinical={clinical}
        currentMedicines={prescriptionList}
      />

      {/* Prescription Preview & PDF Download Modal */}
      <PrescriptionPreviewModal
        visible={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        appointment={selectedAppt}
        doctorName={selectedAppt?.doctorName || 'Dr. Consultant'}
        doctorSpecialization={selectedAppt?.department || 'General Medicine'}
        vitals={vitals}
        clinicalFindings={clinical}
        medicines={prescriptionList}
        advice={generalAdvice}
        diet={dietAdvice}
        followUp={followUpDate}
      />

      {/* Branding Settings Modal */}
      <PrescriptionSettingsModal
        visible={isBrandingModalOpen}
        onClose={() => setIsBrandingModalOpen(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 12, borderBottomWidth: 1 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  headerText: { fontSize: 13, fontWeight: '700' },
  topActionBtns: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  miniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  miniBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  iconOnlyBtn: {
    padding: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  pickerContainer: { borderWidth: 1, borderRadius: 8, overflow: 'hidden' },
  tabBar: { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 6, borderBottomWidth: 1 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8, marginHorizontal: 2 },
  tabText: { fontSize: 12, fontWeight: '600' },
  content: { flex: 1, padding: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridItem: { width: '48%', padding: 10, borderRadius: 10, borderWidth: 1 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  label: { fontSize: 12, fontWeight: '700' },
  unitText: { fontSize: 10 },
  warningText: { fontSize: 10, marginBottom: 4, fontWeight: '600' },
  warningHigh: { color: '#dc2626' },
  warningLow: { color: '#d97706' },
  warningInfo: { color: '#7c3aed' },
  formSection: { padding: 14, borderRadius: 12, borderWidth: 1, gap: 10 },
  fieldGroup: { marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14 },
  inputDisabled: { opacity: 0.6 },
  searchBox: { marginBottom: 12 },
  tabRow: { flexDirection: 'row', borderRadius: 8, padding: 3, marginBottom: 8 },
  searchTab: { flex: 1, padding: 6, alignItems: 'center', borderRadius: 6 },
  searchTabText: { fontSize: 12 },
  searchInput: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14 },
  emptyState: { padding: 40, alignItems: 'center', gap: 8 },
  emptyStateText: { fontSize: 13 },
  draftCard: { padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  draftHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  draftTitle: { fontSize: 13, fontWeight: '800' },
  clearText: { fontSize: 11, color: '#dc2626', fontWeight: '700' },
  draftItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 8, borderRadius: 6, borderWidth: 1, marginBottom: 6 },
  draftItemName: { fontSize: 13, fontWeight: '700' },
  draftItemDetails: { fontSize: 11, marginTop: 2 },
  medicineCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1 },
  medicineName: { fontSize: 14, fontWeight: '700' },
  compositionText: { fontSize: 11, marginTop: 2, fontWeight: '600' },
  metaText: { fontSize: 10, marginTop: 2 },
  addPrescriptionBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1, gap: 4 },
  addPrescriptionText: { fontWeight: '700', fontSize: 11 },
  footer: { padding: 12, borderTopWidth: 1 },
  previewFooterBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  previewFooterText: { fontSize: 13, fontWeight: '700' },
  saveBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  saveBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  autoSaveHint: { textAlign: 'center', fontSize: 10, marginTop: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { padding: 20, borderRadius: 16 },
  modalTitle: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  modalSubtitle: { fontSize: 12, marginBottom: 12 },
  modalLabel: { fontSize: 12, fontWeight: '700', marginTop: 8, marginBottom: 4 },
  modalInput: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
  modalBtnCancel: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  modalBtnConfirm: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
});
