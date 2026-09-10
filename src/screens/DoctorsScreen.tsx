import React, { useState, useEffect, useCallback, useMemo } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
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
  LayoutAnimation,
  Platform,
  UIManager,
  ScrollView,
  KeyboardAvoidingView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

import { doctorsApi } from '../api/doctors';
import { Doctor, CapacitySlot } from '../types';
import { interactionUtils } from '../utils/interactionUtils';
import { ageToDob } from '../utils/ageUtils';
import { makeNIC } from '../utils/nicMaker';
import { DropdownPicker } from '../components/DropdownPicker';
import { GENDERS, DEPARTMENTS } from '../utils/constants';
import { useTheme } from '../context/ThemeContext';
import { colors } from '../theme/colors';

export const DoctorsScreen: React.FC = () => {
  const { colors: theme } = useTheme();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Capacity Checker state
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [capacityDate, setCapacityDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [capacityData, setCapacityData] = useState<CapacitySlot | null>(null);
  const [isLoadingCapacity, setIsLoadingCapacity] = useState(false);

  // Add doctor modal
  const [isAddDoctorOpen, setIsAddDoctorOpen] = useState(false);
  const [docName, setDocName] = useState('');
  const [docEmail, setDocEmail] = useState('');
  const [docPhone, setDocPhone] = useState('');
  const [docAge, setDocAge] = useState('');
  const [docGender, setDocGender] = useState('Male');
  const [docSpecialty, setDocSpecialty] = useState('');
  const [docDepartment, setDocDepartment] = useState('');
  const [docQualifications, setDocQualifications] = useState('');
  const [docFee, setDocFee] = useState('500');
  const [docCompounder, setDocCompounder] = useState('');
  const [step, setStep] = useState(1);

  const fetchDoctors = useCallback(async () => {
    try {
      const data = await doctorsApi.getAll();
      setDoctors(data);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to fetch doctors');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchDoctors();
  }, [fetchDoctors]);

  const handleCheckCapacity = async (doctorId: string, date: string) => {
    setSelectedDocId(doctorId);
    setIsLoadingCapacity(true);
    try {
      interactionUtils.playClick();
      const cap = await doctorsApi.getCapacity({ doctorId, date });
      setCapacityData(cap);
    } catch {
      setCapacityData(null);
    } finally {
      setIsLoadingCapacity(false);
    }
  };

  const handleAddDoctor = async () => {
    if (!docName || !docEmail || !docSpecialty) {
      Alert.alert('Validation Error', 'Name, Email, and Specialization are required');
      return;
    }

    try {
      interactionUtils.playClick();
      const nameParts = docName.trim().split(' ');
      const firstName = nameParts[0] || 'Dr.';
      const lastName = nameParts.slice(1).join(' ') || 'Physician';

      const doctorData = {
        firstName,
        lastName,
        email: docEmail.trim(),
        phone: docPhone.trim() || '1234567890',
        gender: docGender,
        dob: ageToDob(docAge || '35'),
        nic: makeNIC(docPhone.trim() || '12345678901', docAge || '35'),
        doctorDepartment: docDepartment || 'Pediatrics',
        specialization: docSpecialty,
        qualifications: docQualifications || 'MBBS',
        visitingFee: parseFloat(docFee) || 500,
        compounderName: docCompounder || undefined,
      };

      await doctorsApi.addNew(doctorData);
      interactionUtils.playSuccess();
      Alert.alert('Success', `Dr. ${docName} added successfully`);

      setIsAddDoctorOpen(false);
      setStep(1);
      setDocName('');
      setDocEmail('');
      setDocPhone('');
      setDocAge('');
      setDocSpecialty('');
      setDocDepartment('');
      setDocQualifications('');
      setDocFee('500');
      setDocCompounder('');

      fetchDoctors();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || e.message || 'Failed to add doctor');
    }
  };

  const filteredDoctors = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return doctors;
    return doctors.filter((doc) => {
      const name = (doc.name || `${doc.firstName || ''} ${doc.lastName || ''}`).toLowerCase();
      const spec = (doc.specialization || '').toLowerCase();
      const dept = (doc.department || doc.doctorDepartment || '').toLowerCase();
      return name.includes(q) || spec.includes(q) || dept.includes(q);
    });
  }, [doctors, searchQuery]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Top Search & Add Bar */}
      <View style={styles.headerRow}>
        <View style={[styles.searchWrapper, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Ionicons name="search-outline" size={18} color={theme.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: theme.textPrimary }]}
            placeholder="Search doctors, specialty, dept..."
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
          style={[styles.addBtn, { backgroundColor: theme.primary }]}
          onPress={() => {
            interactionUtils.playClick();
            setIsAddDoctorOpen(true);
          }}
        >
          <Ionicons name="person-add-outline" size={18} color="#ffffff" style={{ marginRight: 4 }} />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Capacity Checker Section */}
      <View style={[styles.capacitySection, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <Ionicons name="calendar-outline" size={16} color={theme.gold} />
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Live OPD Slot Capacity</Text>
        </View>
        <View style={styles.capacityRow}>
          <TouchableOpacity
            style={[styles.dateSelectorBtn, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="time-outline" size={14} color={theme.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.dateText, { color: theme.textPrimary }]}>{capacityDate}</Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={new Date(capacityDate)}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={(event, selected) => {
                setShowDatePicker(false);
                if (selected) {
                  const d = selected.toISOString().split('T')[0];
                  setCapacityDate(d);
                  if (selectedDocId) handleCheckCapacity(selectedDocId, d);
                }
              }}
            />
          )}

          <TouchableOpacity
            style={[styles.checkBtn, { backgroundColor: theme.primarySoft, borderColor: theme.primaryMuted }]}
            onPress={() => {
              if (selectedDocId) handleCheckCapacity(selectedDocId, capacityDate);
              else Alert.alert('Notice', 'Select a doctor below to view live slot availability');
            }}
          >
            <Text style={[styles.checkBtnText, { color: theme.primary }]}>Refresh Slot</Text>
          </TouchableOpacity>
        </View>

        {isLoadingCapacity ? (
          <ActivityIndicator size="small" color={theme.primary} style={{ marginTop: 8 }} />
        ) : capacityData ? (
          <View style={[styles.capacityResults, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
            <Text style={[styles.capacityResultText, { color: theme.textSecondary }]}>
              Total Capacity: <Text style={{ fontWeight: '700', color: theme.textPrimary }}>{capacityData.totalCapacity || '20'}</Text> | Booked: <Text style={{ fontWeight: '700', color: theme.warning }}>{capacityData.bookedSlots || 0}</Text> | Available:{' '}
              <Text style={{ fontWeight: '800', color: theme.success }}>
                {capacityData.availableSlots ?? 20} slots
              </Text>
            </Text>
          </View>
        ) : (
          <Text style={[styles.capacityHint, { color: theme.textMuted }]}>
            Tap any doctor below to inspect real-time schedule & slot availability
          </Text>
        )}
      </View>

      {/* Doctors List */}
      {isLoading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredDoctors}
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
              <Ionicons name="medical-outline" size={48} color={theme.textMuted} style={{ marginBottom: 8 }} />
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>No doctors found</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isSelected = selectedDocId === item._id;
            const docDisplayName = item.name || `Dr. ${item.firstName || ''} ${item.lastName || ''}`;

            return (
              <TouchableOpacity
                style={[
                  styles.doctorCard,
                  { backgroundColor: theme.cardBg, borderColor: theme.border },
                  isSelected && { borderColor: theme.gold, borderWidth: 1.8 },
                ]}
                onPress={() => handleCheckCapacity(item._id, capacityDate)}
              >
                <View style={[styles.avatarCircle, { backgroundColor: theme.primaryDark, borderColor: theme.gold }]}>
                  <Text style={[styles.avatarText, { color: theme.goldBright }]}>
                    {item.name ? item.name.charAt(0).toUpperCase() : 'D'}
                  </Text>
                </View>
                <View style={styles.doctorInfo}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[styles.doctorName, { color: theme.textPrimary }]}>{docDisplayName}</Text>
                    {isSelected && (
                      <View style={[styles.selectedBadge, { backgroundColor: theme.goldSoft, borderColor: theme.goldBorder }]}>
                        <Ionicons name="checkmark-circle" size={12} color={theme.goldDark} />
                        <Text style={[styles.selectedBadgeText, { color: theme.goldDark }]}>Active</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.specialty, { color: theme.primary }]}>{item.specialization}</Text>
                  <View style={styles.metaRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="call-outline" size={12} color={theme.textMuted} />
                      <Text style={[styles.metaText, { color: theme.textSecondary }]}>{item.phone || 'N/A'}</Text>
                    </View>
                    <Text style={[styles.metaText, { color: theme.textMuted }]}>•</Text>
                    <Text style={[styles.metaText, { color: theme.goldDark, fontWeight: '700' }]}>
                      Fee: ₹{item.visitingFee || 500}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Add Doctor Modal */}
      <Modal visible={isAddDoctorOpen} animationType="slide" transparent>
        <KeyboardAvoidingView 
          style={styles.modalOverlay} 
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.cardBg }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                  Add New Doctor (Step {step}/2)
                </Text>
                <TouchableOpacity onPress={() => { setIsAddDoctorOpen(false); setStep(1); }}>
                  <Ionicons name="close-circle-outline" size={24} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              {step === 1 ? (
                <>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Full Name *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                    placeholder="Dr. Full Name"
                    placeholderTextColor={theme.textMuted}
                    value={docName}
                    onChangeText={setDocName}
                  />

                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Official Email *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                    placeholder="doctor@hospital.com"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={docEmail}
                    onChangeText={setDocEmail}
                  />

                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Contact Phone *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                    placeholder="10-digit Phone"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="phone-pad"
                    value={docPhone}
                    onChangeText={setDocPhone}
                  />
                  
                  <View style={{ flexDirection: 'row', gap: 10, zIndex: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Age</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                        placeholder="e.g. 38"
                        placeholderTextColor={theme.textMuted}
                        keyboardType="numeric"
                        value={docAge}
                        onChangeText={setDocAge}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Gender</Text>
                      <DropdownPicker label="" placeholder="Gender" value={docGender} options={GENDERS} onSelect={setDocGender} />
                    </View>
                  </View>

                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      style={[styles.btn, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, borderWidth: 1 }]}
                      onPress={() => { setIsAddDoctorOpen(false); setStep(1); }}
                    >
                      <Text style={[styles.btnCancelText, { color: theme.textSecondary }]}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.btn, { backgroundColor: theme.primary }]}
                      onPress={() => setStep(2)}
                    >
                      <Text style={styles.btnConfirmText}>Next (Step 2)</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Specialization *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                    placeholder="Cardiology / Orthopedics / General"
                    placeholderTextColor={theme.textMuted}
                    value={docSpecialty}
                    onChangeText={setDocSpecialty}
                  />

                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Department</Text>
                  <View style={{ zIndex: 9, marginBottom: 10 }}>
                    <DropdownPicker label="" placeholder="Department" value={docDepartment} options={DEPARTMENTS} onSelect={setDocDepartment} />
                  </View>

                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Qualifications</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                    placeholder="e.g. MBBS, MD (Medicine)"
                    placeholderTextColor={theme.textMuted}
                    value={docQualifications}
                    onChangeText={setDocQualifications}
                  />

                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Consultation Fee (₹)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                    placeholder="500"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="numeric"
                    value={docFee}
                    onChangeText={setDocFee}
                  />

                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Assigned Compounder</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                    placeholder="Compounder Name"
                    placeholderTextColor={theme.textMuted}
                    value={docCompounder}
                    onChangeText={setDocCompounder}
                  />

                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      style={[styles.btn, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, borderWidth: 1 }]}
                      onPress={() => setStep(1)}
                    >
                      <Text style={[styles.btnCancelText, { color: theme.textSecondary }]}>Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.btn, { backgroundColor: theme.primary }]}
                      onPress={handleAddDoctor}
                    >
                      <Text style={styles.btnConfirmText}>Save Doctor</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
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
  },
  headerRow: {
    flexDirection: 'row',
    padding: 14,
    gap: 8,
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
  capacitySection: {
    marginHorizontal: 14,
    marginBottom: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  capacityRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dateSelectorBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '700',
  },
  checkBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  checkBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  capacityResults: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  capacityResultText: {
    fontSize: 12,
    textAlign: 'center',
  },
  capacityHint: {
    fontSize: 11,
    marginTop: 6,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  list: {
    paddingHorizontal: 14,
    paddingBottom: 24,
  },
  doctorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1.5,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '800',
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 15,
    fontWeight: '800',
  },
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  selectedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  specialty: {
    fontSize: 12.5,
    fontWeight: '700',
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  metaText: {
    fontSize: 12,
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
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
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
