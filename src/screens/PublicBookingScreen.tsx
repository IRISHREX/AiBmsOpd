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
import { useAuth } from '../context/AuthContext';
import { resetToMain } from '../navigation/AppNavigator';

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

const ANY_DOCTOR: Doctor = {
  _id: '',
  name: 'Any Available Specialist / General OPD',
  email: 'opd@hospital.local',
  role: 'doctor',
  doctorDepartment: 'General OPD & Triage',
  specialization: 'General OPD / All Available Physicians',
  visitingFee: 500,
  qualifications: 'MBBS / Registered Medical Practitioner',
  phone: 'OPD Helpline',
};

export const PublicBookingScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors: theme } = useTheme();
  const { isAuthenticated } = useAuth();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
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
  const [applicantName, setApplicantName] = useState('');
  const [applicantPhone, setApplicantPhone] = useState('');
  const [urgency, setUrgency] = useState<'routine' | 'urgent' | 'emergency'>('routine');
  const [symptoms, setSymptoms] = useState('');

  const fetchDoctors = useCallback(async () => {
    try {
      setLoadError(null);
      const data = await doctorsApi.getAll();
      setDoctors(data);
    } catch (e: any) {
      console.warn('Failed to load doctors for booking:', e);
      setLoadError(e?.message || 'Unable to connect to server. Please tap to retry.');
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
      Alert.alert('Required Fields', 'Please provide Patient Name, Phone Number, and Reason/Symptoms.');
      return;
    }

    if (applicantBy !== 'Self (Patient)' && !applicantName.trim()) {
      Alert.alert('Applicant Name Required', 'Since you are booking for someone else, please enter your name in the Applicant Name field.');
      return;
    }

    try {
      setIsSubmitting(true);
      const isAny = !selectedDoctor?._id;
      const doctorDisplayName = isAny
        ? 'Any Available Specialist / General OPD'
        : (selectedDoctor?.name || `Dr. ${selectedDoctor?.firstName || ''} ${selectedDoctor?.lastName || ''}`.trim());

      const payload = {
        patientName: patientName.trim(),
        patientPhone: patientPhone.trim(),
        patientEmail: patientEmail.trim() || undefined,
        patientAddress: patientAddress.trim() || undefined,
        age: age ? Number(age) : undefined,
        gender: gender.toLowerCase(),
        targetDoctorId: selectedDoctor?._id ? selectedDoctor._id : undefined,
        targetDoctorName: doctorDisplayName,
        department: selectedDoctor?.doctorDepartment || selectedDoctor?.department || 'General',
        appointmentDate,
        appointmentSlot: selectedSlot,
        applicantBy,
        applicantName: applicantBy === 'Self (Patient)' ? patientName.trim() : applicantName.trim(),
        applicantPhone: applicantPhone.trim() || patientPhone.trim(),
        urgency,
        symptoms: symptoms.trim(),
        clinicalNotes: symptoms.trim(),
      };

      await apiClient.post('/api/v1/referral/book', payload);
      interactionUtils.playSuccess();

      Alert.alert(
        urgency === 'emergency' ? '🚨 EMERGENCY Referral Submitted!' : 'Referral Request Submitted!',
        `Your appointment referral request for ${doctorDisplayName} (${urgency.toUpperCase()}) has been received.\n\nThe OPD clinic team will review and register it as an official appointment.`,
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
              setApplicantName('');
              setApplicantPhone('');
              setUrgency('routine');
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
      {/* Top Header Card */}
      <View style={[styles.headerCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        {/* Top bar with Staff Login on Top-Left */}
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={[styles.loginBtn, { backgroundColor: theme.primary, borderColor: theme.gold }]}
            onPress={() => {
              interactionUtils.playClick();
              if (isAuthenticated) {
                resetToMain();
              } else {
                navigation.navigate('Login');
              }
            }}
          >
            <Ionicons name={isAuthenticated ? "home" : "log-in-outline"} size={17} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.loginBtnText}>{isAuthenticated ? "Dashboard" : "Staff Login"}</Text>
          </TouchableOpacity>

          <View style={styles.headerRightActions}>
            <View style={[styles.hospitalBadge, { backgroundColor: theme.goldSoft, borderColor: theme.goldBorder }]}>
              <Ionicons name="shield-checkmark" size={12} color={theme.goldDark} />
              <Text style={[styles.hospitalBadgeText, { color: theme.goldDark }]}>AI BMS OPD</Text>
            </View>
          </View>
        </View>

        <View style={{ marginTop: 12 }}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>OPD Referral & Doctor Booking</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textMuted }]}>
            Select a specialist, choose Any Available Doctor, or submit an Emergency referral
          </Text>
        </View>

        {/* Search doctors */}
        <View style={[styles.searchWrapper, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
          <Ionicons name="search-outline" size={18} color={theme.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: theme.textPrimary }]}
            placeholder="Search doctor, specialization, department..."
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
          ListHeaderComponent={
            <View style={{ marginBottom: 14 }}>
              {/* Option: Any Available Doctor / General OPD */}
              <View style={[styles.anyDoctorCard, { backgroundColor: theme.surfaceElevated, borderColor: theme.gold }]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.avatarCircle, { backgroundColor: theme.goldSoft, borderColor: theme.gold }]}>
                    <Ionicons name="medical" size={26} color={theme.goldDark} />
                  </View>
                  <View style={styles.doctorInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.doctorName, { color: theme.textPrimary }]}>Any Available Doctor</Text>
                      <View style={[styles.priorityChip, { backgroundColor: theme.goldSoft, borderColor: theme.goldBorder }]}>
                        <Text style={[styles.priorityChipText, { color: theme.goldDark }]}>Fastest</Text>
                      </View>
                    </View>
                    <Text style={[styles.specialty, { color: theme.primary }]}>
                      General OPD / Immediate Clinical Triage
                    </Text>
                    <Text style={[styles.deptText, { color: theme.textSecondary }]}>
                      Assigned to first available consultant on duty
                    </Text>
                    <View style={styles.metaRow}>
                      <Ionicons name="cash-outline" size={14} color={theme.goldDark} />
                      <Text style={[styles.feeText, { color: theme.goldDark }]}>
                        Standard Fee: ₹500
                      </Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.bookBtn, { backgroundColor: theme.goldDark }]}
                  onPress={() => openBookingModal(ANY_DOCTOR)}
                >
                  <Ionicons name="flash-outline" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.bookBtnText}>Select Any Doctor (Instant Triage)</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>
                Available Consultants & Specialists ({filteredDoctors.length})
              </Text>
            </View>
          }
          ListEmptyComponent={
            loadError ? (
              <View style={styles.empty}>
                <Ionicons name="cloud-offline-outline" size={48} color={theme.danger} style={{ marginBottom: 8 }} />
                <Text style={[styles.emptyText, { color: theme.danger, fontWeight: '700' }]}>Connection Error</Text>
                <Text style={{ color: theme.textSecondary, textAlign: 'center', marginVertical: 6, fontSize: 12 }}>
                  {loadError}
                </Text>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, marginTop: 8 }}
                  onPress={fetchDoctors}
                >
                  <Ionicons name="refresh-outline" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 13 }}>Retry Connection</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.empty}>
                <Ionicons name="fitness-outline" size={48} color={theme.textMuted} style={{ marginBottom: 8 }} />
                <Text style={[styles.emptyText, { color: theme.textMuted }]}>No doctors matching query</Text>
              </View>
            )
          }
          renderItem={({ item }) => {
            const docDisplayName = item.name || `Dr. ${item.firstName || ''} ${item.lastName || ''}`;
            const fee = item.visitingFee || item.consultationFee || 500;

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
                    
                    <View style={styles.badgeRow}>
                      <View style={[styles.tagBadge, { backgroundColor: theme.primarySoft, borderColor: theme.primary }]}>
                        <Text style={[styles.tagBadgeText, { color: theme.primary }]}>
                          {item.specialization || 'Consultant Specialist'}
                        </Text>
                      </View>
                      {item.doctorDepartment || item.department ? (
                        <View style={[styles.tagBadge, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
                          <Text style={[styles.tagBadgeText, { color: theme.textSecondary }]}>
                            {item.doctorDepartment || item.department}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {item.qualifications ? (
                      <View style={styles.infoLine}>
                        <Ionicons name="school-outline" size={12} color={theme.textMuted} />
                        <Text style={[styles.deptText, { color: theme.textSecondary }]}>
                          {item.qualifications}
                        </Text>
                      </View>
                    ) : null}

                    <View style={styles.infoLine}>
                      <Ionicons name="time-outline" size={12} color={theme.textMuted} />
                      <Text style={[styles.deptText, { color: theme.textMuted }]}>
                        Mon - Sat: 09:30 AM - 07:00 PM
                      </Text>
                    </View>

                    <View style={styles.metaRow}>
                      <Ionicons name="cash-outline" size={14} color={theme.goldDark} style={{ marginRight: 4 }} />
                      <Text style={[styles.feeText, { color: theme.goldDark }]}>
                        ₹{fee}
                      </Text>
                      <Text style={{ fontSize: 11, color: theme.textMuted, marginLeft: 4 }}>/ visit</Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.bookBtn, { backgroundColor: theme.primary }]}
                  onPress={() => openBookingModal(item)}
                >
                  <Ionicons name="calendar" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.bookBtnText}>Book Appointment</Text>
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
                  <Ionicons name="close-circle-outline" size={26} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Urgency Selection */}
              <Text style={[styles.fieldLabel, { color: theme.textPrimary, marginTop: 4 }]}>Consultation Urgency *</Text>
              <View style={styles.urgencyRow}>
                {[
                  { key: 'routine', label: 'Routine OPD', icon: 'shield-outline', color: theme.primary },
                  { key: 'urgent', label: '⚠️ Urgent', icon: 'warning-outline', color: '#d97706' },
                  { key: 'emergency', label: '🚨 EMERGENCY', icon: 'alert-circle', color: '#dc2626' },
                ].map((u) => {
                  const isSelected = urgency === u.key;
                  return (
                    <TouchableOpacity
                      key={u.key}
                      style={[
                        styles.urgencyChip,
                        { backgroundColor: theme.surfaceElevated, borderColor: theme.border },
                        isSelected && {
                          backgroundColor: u.key === 'emergency' ? '#fee2e2' : theme.primarySoft,
                          borderColor: u.key === 'emergency' ? '#dc2626' : theme.primary,
                          borderWidth: 1.8,
                        },
                      ]}
                      onPress={() => setUrgency(u.key as any)}
                    >
                      <Ionicons
                        name={u.icon as any}
                        size={14}
                        color={isSelected ? (u.key === 'emergency' ? '#dc2626' : theme.primary) : theme.textMuted}
                        style={{ marginRight: 4 }}
                      />
                      <Text
                        style={[
                          styles.urgencyChipText,
                          { color: isSelected ? (u.key === 'emergency' ? '#dc2626' : theme.primary) : theme.textSecondary },
                          isSelected && { fontWeight: '800' },
                        ]}
                      >
                        {u.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {urgency === 'emergency' && (
                <View style={[styles.emergencyBanner, { backgroundColor: '#fef2f2', borderColor: '#fca5a5' }]}>
                  <Ionicons name="alert-circle" size={18} color="#dc2626" style={{ marginRight: 8 }} />
                  <Text style={styles.emergencyBannerText}>
                    Emergency Request: The patient will be marked with highest priority for immediate clinic attention.
                  </Text>
                </View>
              )}

              {/* Applicant By Selector */}
              <Text style={[styles.fieldLabel, { color: theme.textPrimary, marginTop: 10 }]}>Booking By (Applicant) *</Text>
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

              {/* If booked for someone else, Applicant Name is mandatory */}
              {applicantBy !== 'Self (Patient)' && (
                <View style={[styles.applicantNameBox, { backgroundColor: theme.surfaceElevated, borderColor: theme.goldBorder }]}>
                  <Text style={[styles.fieldLabel, { color: theme.goldDark }]}>
                    Applicant's Full Name * (Who is submitting this referral)
                  </Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.cardBg, borderColor: theme.border, color: theme.textPrimary }]}
                    placeholder="e.g. Rahul Sharma (Relative / Agent)"
                    placeholderTextColor={theme.textMuted}
                    value={applicantName}
                    onChangeText={setApplicantName}
                  />
                </View>
              )}

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Patient Full Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                placeholder="Patient Full Name"
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

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Symptoms / Reason for Consultation *</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.surfaceElevated,
                    borderColor: theme.border,
                    color: theme.textPrimary,
                    minHeight: 70,
                    textAlignVertical: 'top',
                  },
                ]}
                placeholder="Describe current complaints, duration, fever, pain, etc."
                placeholderTextColor={theme.textMuted}
                multiline
                numberOfLines={3}
                value={symptoms}
                onChangeText={setSymptoms}
              />

              {/* Submit Buttons */}
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, borderWidth: 1 }]}
                  onPress={() => setIsBookingOpen(false)}
                >
                  <Text style={[styles.modalBtnCancel, { color: theme.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modalBtn,
                    { backgroundColor: urgency === 'emergency' ? '#dc2626' : theme.primary },
                  ]}
                  onPress={handleBookingSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.modalBtnConfirm}>
                      {urgency === 'emergency' ? '🚨 Submit Emergency Request' : 'Submit Referral Request'}
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
  },
  headerCard: {
    padding: 16,
    borderBottomWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  loginBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hospitalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  hospitalBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 12.5,
    marginTop: 3,
    lineHeight: 17,
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
  sectionHeading: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 2,
  },
  list: {
    padding: 14,
    paddingBottom: 28,
  },
  anyDoctorCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  priorityChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  priorityChipText: {
    fontSize: 10,
    fontWeight: '800',
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
    alignItems: 'flex-start',
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
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 4,
  },
  tagBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  tagBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  infoLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  deptText: {
    fontSize: 11.5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  feeText: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  bookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 2,
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
  urgencyRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  urgencyChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  urgencyChipText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  emergencyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
  },
  emergencyBannerText: {
    flex: 1,
    color: '#b91c1c',
    fontSize: 11.5,
    fontWeight: '700',
    lineHeight: 16,
  },
  applicantGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
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
  applicantNameBox: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
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
