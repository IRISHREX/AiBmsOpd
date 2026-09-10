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
  ScrollView,
  Platform,
  RefreshControl,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { doctorsApi } from '../api/doctors';
import { Doctor } from '../types';
import apiClient from '../api/client';
import { interactionUtils } from '../utils/interactionUtils';
import { useTheme } from '../context/ThemeContext';
import { colors } from '../theme/colors';

const APPLICANT_TYPES = [
  'Self (Patient)',
  'Relative / Family Member',
  'Primary Health Center / Clinic',
  'Health Worker / Agent',
  'Other',
];

const TIME_SLOTS = [
  '09:30 AM',
  '10:30 AM',
  '11:30 AM',
  '02:30 PM',
  '04:00 PM',
  '05:30 PM',
  '07:00 PM',
];

export const PublicBookingScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors: theme } = useTheme();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Booking Modal State
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [patientAddress, setPatientAddress] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [appointmentDate, setAppointmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(TIME_SLOTS[0]);
  const [applicantBy, setApplicantBy] = useState(APPLICANT_TYPES[0]);
  const [applicantPhone, setApplicantPhone] = useState('');
  const [symptoms, setSymptoms] = useState('');

  const fetchDoctors = useCallback(async () => {
    try {
      const data = await doctorsApi.getAll();
      setDoctors(data);
    } catch (e: any) {
      console.warn('Failed to load doctors for booking:', e);
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

  const openBookingModal = (doc: Doctor) => {
    interactionUtils.playClick();
    setSelectedDoctor(doc);
    setIsBookingOpen(true);
  };

  const handleBookingSubmit = async () => {
    if (!patientName.trim() || !patientPhone.trim() || !symptoms.trim()) {
      Alert.alert('Required Fields', 'Please provide Patient Name, Phone Number, and Reason for Consultation.');
      return;
    }

    try {
      setIsSubmitting(true);
      const doctorDisplayName = selectedDoctor?.name || `Dr. ${selectedDoctor?.firstName || ''} ${selectedDoctor?.lastName || ''}`.trim();

      const payload = {
        patientName: patientName.trim(),
        patientPhone: patientPhone.trim(),
        patientEmail: patientEmail.trim() || undefined,
        patientAddress: patientAddress.trim() || undefined,
        age: age ? Number(age) : undefined,
        gender: gender.toLowerCase(),
        targetDoctorId: selectedDoctor?._id,
        targetDoctorName: doctorDisplayName,
        department: selectedDoctor?.doctorDepartment || selectedDoctor?.department || 'General',
        appointmentDate,
        appointmentSlot: selectedSlot,
        applicantBy,
        applicantPhone: applicantPhone.trim() || patientPhone.trim(),
        symptoms: symptoms.trim(),
        clinicalNotes: symptoms.trim(),
      };

      await apiClient.post('/api/v1/referral/book', payload);
      interactionUtils.playSuccess();

      Alert.alert(
        'Referral Request Submitted!',
        `Your appointment request for ${doctorDisplayName} has been received as a referral.\n\nThe doctor's clinic will review and add it as an official appointment.`,
        [
          {
            text: 'OK',
            onPress: () => {
              setIsBookingOpen(false);
              setPatientName('');
              setPatientPhone('');
              setPatientEmail('');
              setPatientAddress('');
              setAge('');
              setSymptoms('');
              setApplicantPhone('');
            },
          },
        ]
      );
    } catch (e: any) {
      Alert.alert('Booking Error', e.response?.data?.message || 'Failed to submit booking referral.');
    } finally {
      setIsSubmitting(false);
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
      {/* Top Header / Nav */}
      <View style={[styles.headerCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Doctor Appointment Booking</Text>
            <Text style={[styles.headerSubtitle, { color: theme.textMuted }]}>
              Select a doctor to submit an appointment referral
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.closeHeaderBtn, { backgroundColor: theme.surfaceElevated }]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="close" size={20} color={theme.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Search doctors */}
        <View style={[styles.searchWrapper, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
          <Ionicons name="search-outline" size={18} color={theme.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: theme.textPrimary }]}
            placeholder="Search by doctor name, specialty, dept..."
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
      </View>

      {/* Doctor List */}
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
              <Ionicons name="fitness-outline" size={48} color={theme.textMuted} style={{ marginBottom: 8 }} />
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>No doctors available for booking</Text>
            </View>
          }
          renderItem={({ item }) => {
            const docDisplayName = item.name || `Dr. ${item.firstName || ''} ${item.lastName || ''}`;

            return (
              <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.avatarCircle, { backgroundColor: theme.primaryDark, borderColor: theme.gold }]}>
                    <Text style={[styles.avatarText, { color: theme.goldBright }]}>
                      {item.name ? item.name.charAt(0).toUpperCase() : 'D'}
                    </Text>
                  </View>
                  <View style={styles.doctorInfo}>
                    <Text style={[styles.doctorName, { color: theme.textPrimary }]}>{docDisplayName}</Text>
                    <Text style={[styles.specialty, { color: theme.primary }]}>
                      {item.specialization || item.department || 'Specialist Physician'}
                    </Text>
                    {item.department ? (
                      <Text style={[styles.deptText, { color: theme.textSecondary }]}>
                        Dept: {item.department || item.doctorDepartment}
                      </Text>
                    ) : null}
                    <View style={styles.metaRow}>
                      <Ionicons name="cash-outline" size={14} color={theme.goldDark} />
                      <Text style={[styles.feeText, { color: theme.goldDark }]}>
                        Fee: ₹{item.visitingFee || 500}
                      </Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.bookBtn, { backgroundColor: theme.primary }]}
                  onPress={() => openBookingModal(item)}
                >
                  <Ionicons name="calendar-outline" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.bookBtnText}>Book Appointment (Referral)</Text>
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}

      {/* Booking Form Modal */}
      <Modal visible={isBookingOpen} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.cardBg }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Appointment Referral Form</Text>
                  <Text style={[styles.modalSubtitle, { color: theme.primary }]}>
                    Doctor: {selectedDoctor?.name || `Dr. ${selectedDoctor?.firstName || ''} ${selectedDoctor?.lastName || ''}`}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setIsBookingOpen(false)}>
                  <Ionicons name="close-circle-outline" size={24} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Applicant By Selector */}
              <Text style={[styles.fieldLabel, { color: theme.textPrimary }]}>Applicant By (Referred By) *</Text>
              <View style={styles.applicantGrid}>
                {APPLICANT_TYPES.map((appType) => {
                  const isSelected = applicantBy === appType;
                  return (
                    <TouchableOpacity
                      key={appType}
                      style={[
                        styles.applicantChip,
                        { backgroundColor: theme.surfaceElevated, borderColor: theme.border },
                        isSelected && { backgroundColor: theme.primarySoft, borderColor: theme.primary },
                      ]}
                      onPress={() => setApplicantBy(appType)}
                    >
                      <Ionicons
                        name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                        size={14}
                        color={isSelected ? theme.primary : theme.textMuted}
                        style={{ marginRight: 5 }}
                      />
                      <Text
                        style={[
                          styles.applicantChipText,
                          { color: isSelected ? theme.primary : theme.textSecondary },
                          isSelected && { fontWeight: '800' },
                        ]}
                      >
                        {appType}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Patient Full Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                placeholder="Patient Name"
                placeholderTextColor={theme.textMuted}
                value={patientName}
                onChangeText={setPatientName}
              />

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Patient Mobile *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                    placeholder="10-digit Phone"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="phone-pad"
                    value={patientPhone}
                    onChangeText={setPatientPhone}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Applicant Phone</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                    placeholder="If different"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="phone-pad"
                    value={applicantPhone}
                    onChangeText={setApplicantPhone}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Age</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                    placeholder="e.g. 32"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="numeric"
                    value={age}
                    onChangeText={setAge}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Gender</Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                    {['Male', 'Female', 'Other'].map((g) => (
                      <TouchableOpacity
                        key={g}
                        style={[
                          styles.genderBtn,
                          { backgroundColor: theme.surfaceElevated, borderColor: theme.border },
                          gender === g && { backgroundColor: theme.goldSoft, borderColor: theme.gold },
                        ]}
                        onPress={() => setGender(g)}
                      >
                        <Text
                          style={[
                            styles.genderBtnText,
                            { color: gender === g ? theme.goldDark : theme.textSecondary },
                            gender === g && { fontWeight: '800' },
                          ]}
                        >
                          {g}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* Date & Time Slot */}
              <Text style={[styles.fieldLabel, { color: theme.textSecondary, marginTop: 6 }]}>Preferred Appointment Date</Text>
              <TouchableOpacity
                style={[styles.dateSelector, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={16} color={theme.primary} style={{ marginRight: 8 }} />
                <Text style={[styles.dateText, { color: theme.textPrimary }]}>{appointmentDate}</Text>
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={new Date(appointmentDate)}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  onChange={(event, selected) => {
                    setShowDatePicker(false);
                    if (selected) {
                      setAppointmentDate(selected.toISOString().split('T')[0]);
                    }
                  }}
                />
              )}

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Preferred Slot</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {TIME_SLOTS.map((slot) => (
                    <TouchableOpacity
                      key={slot}
                      style={[
                        styles.slotChip,
                        { backgroundColor: theme.surfaceElevated, borderColor: theme.border },
                        selectedSlot === slot && { backgroundColor: theme.primarySoft, borderColor: theme.primary },
                      ]}
                      onPress={() => setSelectedSlot(slot)}
                    >
                      <Text
                        style={[
                          styles.slotText,
                          { color: selectedSlot === slot ? theme.primary : theme.textSecondary },
                          selectedSlot === slot && { fontWeight: '800' },
                        ]}
                      >
                        {slot}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Patient Residential Address</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                placeholder="City / Village / Landmark"
                placeholderTextColor={theme.textMuted}
                value={patientAddress}
                onChangeText={setPatientAddress}
              />

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Symptoms / Consultation Reason *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary, height: 80, textAlignVertical: 'top' }]}
                placeholder="Describe condition, symptoms, or why this referral is needed..."
                placeholderTextColor={theme.textMuted}
                multiline
                value={symptoms}
                onChangeText={setSymptoms}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, borderWidth: 1 }]}
                  onPress={() => setIsBookingOpen(false)}
                >
                  <Text style={[styles.modalBtnCancel, { color: theme.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: theme.primary }]}
                  onPress={handleBookingSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.modalBtnConfirm}>Submit as Referral</Text>
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
  headerCard: {
    padding: 16,
    borderBottomWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeHeaderBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    height: 42,
    marginTop: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 6,
  },
  list: {
    padding: 14,
    paddingBottom: 28,
  },
  card: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 2,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '800',
  },
  specialty: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  deptText: {
    fontSize: 11.5,
    marginTop: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  feeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  bookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  bookBtnText: {
    color: '#ffffff',
    fontSize: 13,
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
    maxHeight: '92%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
    marginLeft: 2,
  },
  applicantGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  applicantChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  applicantChipText: {
    fontSize: 11.5,
    fontWeight: '600',
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
  genderBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  genderBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '700',
  },
  slotChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  slotText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    paddingBottom: 24,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalBtnCancel: {
    fontSize: 14,
    fontWeight: '700',
  },
  modalBtnConfirm: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
