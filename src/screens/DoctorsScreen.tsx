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
import apiClient from '../api/client';
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
  const [compounders, setCompounders] = useState<any[]>([]);
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
  const [docDepartment, setDocDepartment] = useState('General Medicine');
  const [docQualifications, setDocQualifications] = useState('');
  const [docFee, setDocFee] = useState('500');
  const [docCompounder, setDocCompounder] = useState('');
  const [docCompounderId, setDocCompounderId] = useState('');
  const [step, setStep] = useState(1);

  // Edit doctor modal
  const [editModalDoc, setEditModalDoc] = useState<Doctor | null>(null);
  const [editDocName, setEditDocName] = useState('');
  const [editDocEmail, setEditDocEmail] = useState('');
  const [editDocPhone, setEditDocPhone] = useState('');
  const [editDocAge, setEditDocAge] = useState('');
  const [editDocGender, setEditDocGender] = useState('Male');
  const [editDocSpecialty, setEditDocSpecialty] = useState('');
  const [editDocDepartment, setEditDocDepartment] = useState('General Medicine');
  const [editDocQualifications, setEditDocQualifications] = useState('');
  const [editDocFee, setEditDocFee] = useState('500');
  const [editDocCompounder, setEditDocCompounder] = useState('');
  const [editDocCompounderId, setEditDocCompounderId] = useState('');
  const [isUpdatingDoctor, setIsUpdatingDoctor] = useState(false);

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

  const fetchCompounders = useCallback(async () => {
    try {
      const res = await apiClient.get('/api/v1/user/compounders');
      setCompounders(res.data.compounders || []);
    } catch (e) {
      console.warn('Could not load compounders:', e);
    }
  }, []);

  useEffect(() => {
    fetchDoctors();
    fetchCompounders();
  }, [fetchDoctors, fetchCompounders]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchDoctors();
    fetchCompounders();
  }, [fetchDoctors, fetchCompounders]);

  // Autosuggest for compounders in Add modal
  const addCompounderSuggestions = useMemo(() => {
    const q = docCompounder.trim().toLowerCase();
    if (!q || q.length < 1) return [];
    return compounders.filter((c) => {
      const name = `${c.firstName || ''} ${c.lastName || ''}`.toLowerCase();
      const phone = (c.phone || '').toLowerCase();
      return name.includes(q) || phone.includes(q);
    }).slice(0, 5);
  }, [compounders, docCompounder]);

  // Autosuggest for compounders in Edit modal
  const editCompounderSuggestions = useMemo(() => {
    const q = editDocCompounder.trim().toLowerCase();
    if (!q || q.length < 1) return [];
    return compounders.filter((c) => {
      const name = `${c.firstName || ''} ${c.lastName || ''}`.toLowerCase();
      const phone = (c.phone || '').toLowerCase();
      return name.includes(q) || phone.includes(q);
    }).slice(0, 5);
  }, [compounders, editDocCompounder]);

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
    if (!docName.trim() || !docEmail.trim() || !docSpecialty.trim()) {
      Alert.alert('Validation Error', 'Full Name, Official Email, and Specialization are required.');
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
        name: docName.trim(),
        email: docEmail.trim(),
        phone: docPhone.trim() || '9876543210',
        gender: docGender || 'Male',
        dob: ageToDob(docAge || '35'),
        nic: makeNIC(docPhone.trim() || '9876543210', docAge || '35'),
        password: 'Doctor@123',
        doctorDepartment: docDepartment || 'General Medicine',
        specialization: docSpecialty.trim(),
        qualifications: docQualifications.trim() || 'MBBS',
        visitingFee: parseFloat(docFee) || 500,
        consultationFee: parseFloat(docFee) || 500,
        compounderId: docCompounderId || undefined,
        compounderName: docCompounder.trim() || undefined,
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
      setDocDepartment('General Medicine');
      setDocQualifications('');
      setDocFee('500');
      setDocCompounder('');
      setDocCompounderId('');

      fetchDoctors();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || e.message || 'Failed to add doctor');
    }
  };

  const openEditDoctorModal = (doc: Doctor) => {
    interactionUtils.playClick();
    setEditModalDoc(doc);
    const dName = doc.name || `${doc.firstName || ''} ${doc.lastName || ''}`.trim();
    setEditDocName(dName);
    setEditDocEmail(doc.email || '');
    setEditDocPhone(doc.phone || '');
    setEditDocAge(doc.age?.toString() || '35');
    setEditDocGender(doc.gender || 'Male');
    setEditDocSpecialty(doc.specialization || doc.department || '');
    setEditDocDepartment(doc.doctorDepartment || doc.department || 'General Medicine');
    setEditDocQualifications(doc.qualifications || 'MBBS');
    setEditDocFee((doc.visitingFee || doc.consultationFee || 500).toString());
    
    // Set compounder if present
    if (doc.compounders && doc.compounders.length > 0 && typeof doc.compounders[0] === 'object') {
      const c = doc.compounders[0];
      setEditDocCompounder(`${c.firstName || ''} ${c.lastName || ''}`.trim());
      setEditDocCompounderId(c._id);
    } else {
      setEditDocCompounder('');
      setEditDocCompounderId('');
    }
  };

  const handleUpdateDoctor = async () => {
    if (!editModalDoc) return;
    if (!editDocName.trim() || !editDocEmail.trim()) {
      Alert.alert('Required Fields', 'Doctor name and email are required.');
      return;
    }

    try {
      setIsUpdatingDoctor(true);
      const nameParts = editDocName.trim().split(' ');
      const firstName = nameParts[0] || 'Dr.';
      const lastName = nameParts.slice(1).join(' ') || 'Physician';

      const payload = {
        firstName,
        lastName,
        name: editDocName.trim(),
        email: editDocEmail.trim(),
        phone: editDocPhone.trim() || undefined,
        gender: editDocGender,
        age: editDocAge ? Number(editDocAge) : undefined,
        doctorDepartment: editDocDepartment,
        specialization: editDocSpecialty.trim(),
        qualifications: editDocQualifications.trim(),
        visitingFee: parseFloat(editDocFee) || 500,
        consultationFee: parseFloat(editDocFee) || 500,
        compounderId: editDocCompounderId || undefined,
      };

      await doctorsApi.update(editModalDoc._id, payload);
      interactionUtils.playSuccess();
      Alert.alert('Success', `Dr. ${editDocName} updated successfully`);
      setEditModalDoc(null);
      fetchDoctors();
    } catch (e: any) {
      Alert.alert('Update Failed', e.response?.data?.message || e.message || 'Failed to update doctor');
    } finally {
      setIsUpdatingDoctor(false);
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
        <View style={[styles.searchWrapper, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
          <Ionicons name="search-outline" size={18} color={theme.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: theme.textPrimary }]}
            placeholder="Search doctor, dept, spec..."
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
          style={[styles.addBtn, { backgroundColor: theme.goldDark }]}
          onPress={() => {
            interactionUtils.playClick();
            setIsAddDoctorOpen(true);
          }}
        >
          <Ionicons name="person-add" size={16} color="#ffffff" style={{ marginRight: 5 }} />
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Capacity Section */}
      <View style={[styles.capacitySection, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="speedometer-outline" size={16} color={theme.gold} />
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>OPD Capacity</Text>
          </View>
          {selectedDocId && (
            <TouchableOpacity onPress={() => { setSelectedDocId(null); setCapacityData(null); }}>
              <Text style={{ fontSize: 11, color: theme.primary, fontWeight: '700' }}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.capacityRow}>
          <TouchableOpacity
            style={[styles.dateSelectorBtn, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={14} color={theme.primary} style={{ marginRight: 6 }} />
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
                  const dStr = selected.toISOString().split('T')[0];
                  setCapacityDate(dStr);
                  if (selectedDocId) handleCheckCapacity(selectedDocId, dStr);
                }
              }}
            />
          )}

          <TouchableOpacity
            style={[styles.checkBtn, { backgroundColor: theme.primarySoft, borderColor: theme.primary }]}
            onPress={() => {
              if (selectedDocId) handleCheckCapacity(selectedDocId, capacityDate);
              else Alert.alert('Select Doctor', 'Please tap on a doctor card below to view their capacity.');
            }}
          >
            {isLoadingCapacity ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Text style={[styles.checkBtnText, { color: theme.primary }]}>Refresh</Text>
            )}
          </TouchableOpacity>
        </View>

        {capacityData && (
          <View style={[styles.capacityResults, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="medical" size={14} color={theme.primary} />
              <Text style={[styles.capacityResultText, { color: theme.textPrimary, fontWeight: '800' }]}>
                {capacityData.doctorName || 'Selected Doctor'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Ionicons name="people-outline" size={13} color={theme.textMuted} />
                <Text style={[styles.capacityResultText, { color: theme.textSecondary }]}>Cap: {capacityData.totalCapacity || 25}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Ionicons name="calendar-outline" size={13} color={theme.danger} />
                <Text style={[styles.capacityResultText, { color: theme.danger, fontWeight: '700' }]}>Booked: {capacityData.booked || 0}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Ionicons name="checkmark-circle-outline" size={13} color={theme.success} />
                <Text style={[styles.capacityResultText, { color: theme.success, fontWeight: '800' }]}>Avail: {capacityData.available ?? 25}</Text>
              </View>
            </View>
          </View>
        )}

        {!selectedDocId && (
          <Text style={[styles.capacityHint, { color: theme.textMuted }]}>
            Tap any doctor card below to inspect slot availability & live patient capacity.
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
                    
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                      {isSelected && (
                        <View style={[styles.selectedBadge, { backgroundColor: theme.goldSoft, borderColor: theme.goldBorder }]}>
                          <Ionicons name="checkmark-circle" size={12} color={theme.goldDark} />
                          <Text style={[styles.selectedBadgeText, { color: theme.goldDark }]}>Active</Text>
                        </View>
                      )}
                      {/* Edit Doctor Button */}
                      <TouchableOpacity
                        style={[styles.editDocBtn, { backgroundColor: theme.primarySoft, borderColor: theme.primary }]}
                        onPress={() => openEditDoctorModal(item)}
                      >
                        <Ionicons name="create-outline" size={13} color={theme.primary} />
                        <Text style={[styles.editDocBtnText, { color: theme.primary }]}>Edit</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text style={[styles.specialty, { color: theme.primary }]}>
                    {item.specialization || item.department || 'Specialist Physician'}
                  </Text>

                  {item.qualifications ? (
                    <Text style={[styles.metaText, { color: theme.textMuted, marginTop: 2 }]}>
                      {item.qualifications}
                    </Text>
                  ) : null}

                  <View style={styles.metaRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="call-outline" size={12} color={theme.textMuted} />
                      <Text style={[styles.metaText, { color: theme.textSecondary }]}>{item.phone || 'N/A'}</Text>
                    </View>
                    <Text style={[styles.metaText, { color: theme.textMuted }]}>•</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="cash-outline" size={12} color={theme.goldDark} style={{ marginRight: 3 }} />
                      <Text style={[styles.metaText, { color: theme.goldDark, fontWeight: '700' }]}>
                        ₹{item.visitingFee || item.consultationFee || 500}
                      </Text>
                    </View>
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

                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Contact Phone</Text>
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

                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Assigned Compounder (Type to Auto-suggest)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                    placeholder="Type compounder name or phone..."
                    placeholderTextColor={theme.textMuted}
                    value={docCompounder}
                    onChangeText={(t) => {
                      setDocCompounder(t);
                      if (!t) setDocCompounderId('');
                    }}
                  />

                  {/* Autosuggest chips while typing compounder */}
                  {addCompounderSuggestions.length > 0 && (
                    <View style={styles.suggestionsContainer}>
                      <Text style={[styles.suggestionsHeader, { color: theme.goldDark }]}>
                        Matching Compounders (Tap to Select):
                      </Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                        {addCompounderSuggestions.map((comp) => (
                          <TouchableOpacity
                            key={comp._id}
                            style={[styles.suggestChip, { backgroundColor: theme.surfaceElevated, borderColor: theme.goldBorder }]}
                            onPress={() => {
                              setDocCompounder(`${comp.firstName || ''} ${comp.lastName || ''}`.trim());
                              setDocCompounderId(comp._id);
                            }}
                          >
                            <Ionicons name="person" size={12} color={theme.goldDark} />
                            <Text style={[styles.suggestChipText, { color: theme.textPrimary }]}>
                              {comp.firstName} {comp.lastName} ({comp.phone || 'Staff'})
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}

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

      {/* Edit Doctor Modal */}
      <Modal visible={!!editModalDoc} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.cardBg }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                  Edit Doctor Profile
                </Text>
                <TouchableOpacity onPress={() => setEditModalDoc(null)}>
                  <Ionicons name="close-circle-outline" size={24} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Full Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                value={editDocName}
                onChangeText={setEditDocName}
                placeholder="Dr. Full Name"
                placeholderTextColor={theme.textMuted}
              />

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Official Email *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                value={editDocEmail}
                onChangeText={setEditDocEmail}
                placeholder="doctor@hospital.com"
                placeholderTextColor={theme.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Contact Phone</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                    value={editDocPhone}
                    onChangeText={setEditDocPhone}
                    placeholder="Phone"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="phone-pad"
                  />
                </View>
                <View style={{ width: 80 }}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Age</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                    value={editDocAge}
                    onChangeText={setEditDocAge}
                    placeholder="Age"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Specialization *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                value={editDocSpecialty}
                onChangeText={setEditDocSpecialty}
                placeholder="Specialization"
                placeholderTextColor={theme.textMuted}
              />

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Department</Text>
              <View style={{ zIndex: 9, marginBottom: 10 }}>
                <DropdownPicker label="" placeholder="Department" value={editDocDepartment} options={DEPARTMENTS} onSelect={setEditDocDepartment} />
              </View>

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Qualifications</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                value={editDocQualifications}
                onChangeText={setEditDocQualifications}
                placeholder="e.g. MBBS, MD"
                placeholderTextColor={theme.textMuted}
              />

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Consultation Fee (₹)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                value={editDocFee}
                onChangeText={setEditDocFee}
                placeholder="500"
                placeholderTextColor={theme.textMuted}
                keyboardType="numeric"
              />

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Assigned Compounder (Type to Auto-suggest)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                value={editDocCompounder}
                onChangeText={(t) => {
                  setEditDocCompounder(t);
                  if (!t) setEditDocCompounderId('');
                }}
                placeholder="Type compounder name..."
                placeholderTextColor={theme.textMuted}
              />

              {/* Autosuggest chips for edit modal */}
              {editCompounderSuggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  <Text style={[styles.suggestionsHeader, { color: theme.goldDark }]}>
                    Matching Compounders:
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                    {editCompounderSuggestions.map((comp) => (
                      <TouchableOpacity
                        key={comp._id}
                        style={[styles.suggestChip, { backgroundColor: theme.surfaceElevated, borderColor: theme.goldBorder }]}
                        onPress={() => {
                          setEditDocCompounder(`${comp.firstName || ''} ${comp.lastName || ''}`.trim());
                          setEditDocCompounderId(comp._id);
                        }}
                      >
                        <Ionicons name="person" size={12} color={theme.goldDark} />
                        <Text style={[styles.suggestChipText, { color: theme.textPrimary }]}>
                          {comp.firstName} {comp.lastName} ({comp.phone || 'Staff'})
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, borderWidth: 1 }]}
                  onPress={() => setEditModalDoc(null)}
                >
                  <Text style={[styles.btnCancelText, { color: theme.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: theme.primary }]}
                  onPress={handleUpdateDoctor}
                  disabled={isUpdatingDoctor}
                >
                  {isUpdatingDoctor ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.btnConfirmText}>Update Doctor</Text>
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
    fontSize: 13.5,
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
  editDocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  editDocBtnText: {
    fontSize: 11,
    fontWeight: '700',
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
  suggestionsContainer: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  suggestionsHeader: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  suggestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  suggestChipText: {
    fontSize: 11.5,
    fontWeight: '600',
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
