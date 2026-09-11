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
  BackHandler,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { doctorsApi } from '../api/doctors';
import { referralsApi } from '../api/referrals';
import { Doctor } from '../types';
import apiClient from '../api/client';
import { interactionUtils } from '../utils/interactionUtils';
import { useTheme } from '../context/ThemeContext';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { resetToMain } from '../navigation/AppNavigator';
import { REFERRAL_TRANSLATIONS, ReferralLanguage } from '../utils/referralTranslations';

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
  const { isAuthenticated, user, loginWithToken } = useAuth();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Multilingual Support
  const [lang, setLang] = useState<ReferralLanguage>('en');
  const t = REFERRAL_TRANSLATIONS[lang];

  // Simplified Top Referral Form State
  const [bookingForSomeoneElse, setBookingForSomeoneElse] = useState(false);
  const [topPatientName, setTopPatientName] = useState('');
  const [topPatientPhone, setTopPatientPhone] = useState('');
  const [topPatientAddress, setTopPatientAddress] = useState('');
  const [topProblem, setTopProblem] = useState('');
  const [topPatientEmail, setTopPatientEmail] = useState('');
  const [topAge, setTopAge] = useState('');
  const [topGender, setTopGender] = useState<'Male' | 'Female' | 'Other'>('Male');

  // Booker / Applicant fields (For "Someone Else")
  const [topBookerName, setTopBookerName] = useState('');
  const [topBookerPhone, setTopBookerPhone] = useState('');
  const [topBookerEmail, setTopBookerEmail] = useState('');

  // Consultation Urgency Prompt State
  const [showUrgencyModal, setShowUrgencyModal] = useState(false);
  const [isSubmittingTopForm, setIsSubmittingTopForm] = useState(false);

  // Individual Doctor Booking Modal State (from doctor list)
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [isSubmittingModal, setIsSubmittingModal] = useState(false);
  const [modalPatientName, setModalPatientName] = useState('');
  const [modalPatientPhone, setModalPatientPhone] = useState('');
  const [modalPatientEmail, setModalPatientEmail] = useState('');
  const [modalPatientAddress, setModalPatientAddress] = useState('');
  const [modalAge, setModalAge] = useState('');
  const [modalGender, setModalGender] = useState('Male');
  const [modalAppointmentDate, setModalAppointmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [modalSlot, setModalSlot] = useState(TIME_SLOTS[0]);
  const [modalApplicantBy, setModalApplicantBy] = useState(APPLICANT_TYPES[0]);
  const [modalApplicantName, setModalApplicantName] = useState('');
  const [modalApplicantPhone, setModalApplicantPhone] = useState('');
  const [modalUrgency, setModalUrgency] = useState<'routine' | 'urgent' | 'emergency'>('routine');
  const [modalSymptoms, setModalSymptoms] = useState('');

  // Pre-fill logged in user info for booker
  useEffect(() => {
    if (isAuthenticated && user) {
      setTopBookerName(user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim());
      setTopBookerPhone(user.phone || '');
      setTopBookerEmail(user.email || '');
    }
  }, [isAuthenticated, user]);

  // Android Back Button handler to dismiss modals
  useEffect(() => {
    const onBackPress = () => {
      if (showUrgencyModal) {
        setShowUrgencyModal(false);
        return true;
      }
      if (isBookingOpen) {
        setIsBookingOpen(false);
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [showUrgencyModal, isBookingOpen]);

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

  const openDoctorModal = (doc: Doctor) => {
    interactionUtils.playClick();
    setSelectedDoctor(doc);
    setIsBookingOpen(true);
  };

  // Step 1 of Top Form: Validate inputs, then open Urgency Prompt Modal
  const handleOpenUrgencyPrompt = () => {
    interactionUtils.playClick();
    const cleanPatientPhone = topPatientPhone.trim().replace(/[^0-9]/g, '');

    if (!topPatientName.trim()) {
      Alert.alert('Required Field', t.validationNameRequired);
      return;
    }
    if (!/^[0-9]{10}$/.test(cleanPatientPhone)) {
      Alert.alert('Invalid Phone', t.validationPhoneInvalid);
      return;
    }
    if (!topPatientAddress.trim()) {
      Alert.alert('Required Field', t.validationAddressRequired);
      return;
    }
    if (!topProblem.trim()) {
      Alert.alert('Required Field', t.validationProblemRequired);
      return;
    }
    if (topAge.trim()) {
      const a = Number(topAge.trim());
      if (isNaN(a) || a < 0 || a > 150) {
        Alert.alert('Invalid Age', t.validationAgeInvalid);
        return;
      }
    }

    if (bookingForSomeoneElse) {
      const cleanBookerPhone = topBookerPhone.trim().replace(/[^0-9]/g, '');
      if (!topBookerName.trim()) {
        Alert.alert('Required Field', t.validationBookerNameRequired);
        return;
      }
      if (!/^[0-9]{10}$/.test(cleanBookerPhone)) {
        Alert.alert('Invalid Phone', t.validationBookerPhoneInvalid);
        return;
      }
    }

    setShowUrgencyModal(true);
  };

  // Step 2 of Top Form: On urgency selection, play Woooosh sound and submit referral
  const handleSelectUrgencyAndSubmit = async (chosenUrgency: 'emergency' | 'general' | 'routine') => {
    setShowUrgencyModal(false);
    interactionUtils.playWoosh();

    try {
      setIsSubmittingTopForm(true);
      const cleanPatientPhone = topPatientPhone.trim().replace(/[^0-9]/g, '');
      const cleanBookerPhone = topBookerPhone.trim().replace(/[^0-9]/g, '');

      const payload = {
        patientName: topPatientName.trim(),
        patientPhone: cleanPatientPhone,
        patientEmail: topPatientEmail.trim() || undefined,
        patientAddress: topPatientAddress.trim(),
        age: topAge ? Number(topAge) : undefined,
        gender: topGender.toLowerCase(),
        applicantBy: bookingForSomeoneElse ? 'Referrer' : 'Self',
        applicantName: bookingForSomeoneElse ? topBookerName.trim() : topPatientName.trim(),
        applicantPhone: bookingForSomeoneElse ? cleanBookerPhone : cleanPatientPhone,
        applicantEmail: bookingForSomeoneElse ? topBookerEmail.trim() : (topPatientEmail.trim() || undefined),
        symptoms: topProblem.trim(),
        clinicalNotes: topProblem.trim(),
        urgency: chosenUrgency,
        department: 'General',
        commissionPercent: 5,
      };

      const res = await referralsApi.bookPatient(payload);
      interactionUtils.playSuccess();

      // If guest user auto-login token was generated, log them in instantly
      if (res.token && res.user && !isAuthenticated) {
        await loginWithToken(res.token, res.user);
      }

      // Clear form inputs
      setTopPatientName('');
      setTopPatientPhone('');
      setTopPatientAddress('');
      setTopProblem('');
      setTopPatientEmail('');
      setTopAge('');

      let msg = `${t.successMessage}\n\nUrgency: ${chosenUrgency.toUpperCase()}`;
      if (res.tempPassword) {
        msg += `\n\n🔑 ${t.tempPassNotice}: ${res.tempPassword}`;
      }

      Alert.alert(
        t.successTitle,
        msg,
        [
          {
            text: 'View Referrals',
            onPress: () => {
              if (isAuthenticated || res.token) {
                navigation.navigate('Main', { screen: 'Referrals' });
              } else {
                navigation.navigate('Referrals');
              }
            },
          },
        ]
      );
    } catch (e: any) {
      Alert.alert('Booking Error', e?.response?.data?.message || e?.message || 'Failed to submit referral.');
    } finally {
      setIsSubmittingTopForm(false);
    }
  };

  // Handler for individual doctor modal booking
  const handleModalBookingSubmit = async () => {
    const cleanPhone = modalPatientPhone.trim().replace(/[^0-9]/g, '');
    if (!modalPatientName.trim() || !/^[0-9]{10}$/.test(cleanPhone) || !modalSymptoms.trim()) {
      Alert.alert('Required Fields', 'Please provide valid Patient Name, 10-digit Phone, and Reason/Symptoms.');
      return;
    }

    if (modalApplicantBy !== 'Self (Patient)' && !modalApplicantName.trim()) {
      Alert.alert('Applicant Name Required', 'Please enter your name as the applicant/referrer.');
      return;
    }

    try {
      setIsSubmittingModal(true);
      const isAny = !selectedDoctor?._id;
      const doctorDisplayName = isAny
        ? 'Any Available Specialist / General OPD'
        : (selectedDoctor?.name || `Dr. ${selectedDoctor?.firstName || ''} ${selectedDoctor?.lastName || ''}`.trim());

      const payload = {
        patientName: modalPatientName.trim(),
        patientPhone: cleanPhone,
        patientEmail: modalPatientEmail.trim() || undefined,
        patientAddress: modalPatientAddress.trim() || undefined,
        age: modalAge ? Number(modalAge) : undefined,
        gender: modalGender.toLowerCase(),
        targetDoctorId: selectedDoctor?._id ? selectedDoctor._id : undefined,
        targetDoctorName: doctorDisplayName,
        department: selectedDoctor?.doctorDepartment || selectedDoctor?.department || 'General',
        appointmentDate: modalAppointmentDate,
        appointmentSlot: modalSlot,
        applicantBy: modalApplicantBy,
        applicantName: modalApplicantBy === 'Self (Patient)' ? modalPatientName.trim() : modalApplicantName.trim(),
        applicantPhone: modalApplicantPhone.trim().replace(/[^0-9]/g, '') || cleanPhone,
        urgency: modalUrgency,
        symptoms: modalSymptoms.trim(),
        clinicalNotes: modalSymptoms.trim(),
        commissionPercent: 5,
      };

      const res = await referralsApi.bookPatient(payload);
      interactionUtils.playWoosh();
      interactionUtils.playSuccess();

      if (res.token && res.user && !isAuthenticated) {
        await loginWithToken(res.token, res.user);
      }

      setIsBookingOpen(false);
      setModalPatientName('');
      setModalPatientPhone('');
      setModalPatientEmail('');
      setModalPatientAddress('');
      setModalAge('');
      setModalSymptoms('');
      setModalApplicantName('');
      setModalApplicantPhone('');

      Alert.alert(
        'Referral Request Submitted!',
        `Your booking referral for ${doctorDisplayName} has been submitted.\n\n` +
        (res.tempPassword ? `Temporary Password: ${res.tempPassword}\n\n` : '') +
        'You can track status in the Referrals section.',
        [
          {
            text: 'OK',
            onPress: () => {
              if (isAuthenticated || res.token) {
                navigation.navigate('Main', { screen: 'Referrals' });
              }
            },
          },
        ]
      );
    } catch (e: any) {
      Alert.alert('Booking Error', e?.response?.data?.message || 'Failed to submit booking referral.');
    } finally {
      setIsSubmittingModal(false);
    }
  };

  const filteredDoctors = useMemo(() => {
    if (!searchQuery.trim()) return doctors;
    const q = searchQuery.toLowerCase();
    return doctors.filter(
      (d) =>
        (d.name && d.name.toLowerCase().includes(q)) ||
        (d.specialization && d.specialization.toLowerCase().includes(q)) ||
        (d.doctorDepartment && d.doctorDepartment.toLowerCase().includes(q))
    );
  }, [doctors, searchQuery]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Scrollable Main Content containing Header, Top Referral Form, and Doctor Directory */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        {/* Top Bar with Staff Login, Language Selector, and Hospital Badge */}
        <View style={[styles.topBar, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
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
            <Ionicons name={isAuthenticated ? 'home' : 'log-in-outline'} size={16} color="#ffffff" style={{ marginRight: 5 }} />
            <Text style={styles.loginBtnText}>{isAuthenticated ? 'Dashboard' : 'Staff Login'}</Text>
          </TouchableOpacity>

          {/* Language Switcher Pills */}
          <View style={styles.langSelectorRow}>
            {(['en', 'bn', 'hi', 'ur'] as ReferralLanguage[]).map((l) => (
              <TouchableOpacity
                key={l}
                style={[
                  styles.langPill,
                  lang === l
                    ? { backgroundColor: theme.primary, borderColor: theme.gold }
                    : { backgroundColor: theme.surfaceElevated, borderColor: theme.border },
                ]}
                onPress={() => {
                  interactionUtils.playClick();
                  setLang(l);
                }}
              >
                <Text
                  style={[
                    styles.langPillText,
                    lang === l ? { color: '#ffffff', fontWeight: '800' } : { color: theme.textSecondary },
                  ]}
                >
                  {l === 'en' ? 'EN' : l === 'bn' ? 'বাংলা' : l === 'hi' ? 'हिंदी' : 'اردو'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={[styles.hospitalBadge, { backgroundColor: theme.goldSoft, borderColor: theme.goldBorder }]}>
            <Ionicons name="shield-checkmark" size={12} color={theme.goldDark} />
            <Text style={[styles.hospitalBadgeText, { color: theme.goldDark }]}>BMS OPD</Text>
          </View>
        </View>

        {/* 🌟 SIMPLIFIED INSTANT REFERRAL FORM (Prominently Placed at the Top) */}
        <View style={[styles.topReferralCard, { backgroundColor: theme.cardBg, borderColor: theme.goldBorder }]}>
          <View style={styles.formHeaderRow}>
            <View style={[styles.formIconBadge, { backgroundColor: theme.primarySoft, borderColor: theme.primaryMuted }]}>
              <Ionicons name="git-network" size={20} color={theme.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.formTitle, { color: theme.textPrimary }]}>{t.formTitle}</Text>
              <Text style={[styles.formSubtitle, { color: theme.textMuted }]}>{t.formSubtitle}</Text>
            </View>
          </View>

          {/* Booking for Self vs Booking for Someone Else Toggle */}
          <View style={[styles.bookingToggleContainer, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
            <TouchableOpacity
              style={[
                styles.toggleSegment,
                !bookingForSomeoneElse && { backgroundColor: theme.primary, borderColor: theme.primary },
              ]}
              onPress={() => {
                interactionUtils.playClick();
                setBookingForSomeoneElse(false);
              }}
            >
              <Ionicons
                name="person-outline"
                size={14}
                color={!bookingForSomeoneElse ? '#ffffff' : theme.textSecondary}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.toggleSegmentText,
                  !bookingForSomeoneElse ? { color: '#ffffff', fontWeight: '800' } : { color: theme.textSecondary },
                ]}
              >
                {t.bookingForSelf}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.toggleSegment,
                bookingForSomeoneElse && { backgroundColor: theme.goldDark, borderColor: theme.goldDark },
              ]}
              onPress={() => {
                interactionUtils.playClick();
                setBookingForSomeoneElse(true);
              }}
            >
              <Ionicons
                name="people-outline"
                size={14}
                color={bookingForSomeoneElse ? '#ffffff' : theme.textSecondary}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.toggleSegmentText,
                  bookingForSomeoneElse ? { color: '#ffffff', fontWeight: '800' } : { color: theme.textSecondary },
                ]}
              >
                {t.bookingForSomeoneElse}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Patient Form Fields */}
          <View style={styles.formFieldsSection}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{t.patientNameLabel}</Text>
            <TextInput
              style={[styles.inputField, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
              placeholder={t.patientNamePlaceholder}
              placeholderTextColor={theme.textMuted}
              value={topPatientName}
              onChangeText={setTopPatientName}
            />

            <View style={styles.fieldRow}>
              <View style={{ flex: 1.2 }}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{t.patientPhoneLabel}</Text>
                <TextInput
                  style={[styles.inputField, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                  placeholder={t.patientPhonePlaceholder}
                  placeholderTextColor={theme.textMuted}
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={topPatientPhone}
                  onChangeText={setTopPatientPhone}
                />
              </View>

              <View style={{ flex: 0.8 }}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{t.ageLabel}</Text>
                <TextInput
                  style={[styles.inputField, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                  placeholder={t.agePlaceholder}
                  placeholderTextColor={theme.textMuted}
                  keyboardType="numeric"
                  maxLength={3}
                  value={topAge}
                  onChangeText={setTopAge}
                />
              </View>
            </View>

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{t.patientAddressLabel}</Text>
            <TextInput
              style={[styles.inputField, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
              placeholder={t.patientAddressPlaceholder}
              placeholderTextColor={theme.textMuted}
              value={topPatientAddress}
              onChangeText={setTopPatientAddress}
            />

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{t.problemLabel}</Text>
            <TextInput
              style={[styles.inputFieldMultiline, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
              placeholder={t.problemPlaceholder}
              placeholderTextColor={theme.textMuted}
              multiline
              numberOfLines={3}
              value={topProblem}
              onChangeText={setTopProblem}
            />

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{t.patientEmailLabel}</Text>
            <TextInput
              style={[styles.inputField, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
              placeholder={t.patientEmailPlaceholder}
              placeholderTextColor={theme.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={topPatientEmail}
              onChangeText={setTopPatientEmail}
            />

            {/* Expanded Booker / Referrer Section if Booking for Someone Else */}
            {bookingForSomeoneElse && (
              <View style={[styles.bookerCard, { backgroundColor: theme.surfaceElevated, borderColor: theme.goldBorder }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={[styles.bookerSectionHeading, { color: theme.goldDark }]}>{t.bookerSectionTitle}</Text>
                  {isAuthenticated && user && (
                    <View style={[styles.autofillBadge, { backgroundColor: theme.goldSoft }]}>
                      <Ionicons name="lock-closed" size={10} color={theme.goldDark} style={{ marginRight: 3 }} />
                      <Text style={[styles.autofillBadgeText, { color: theme.goldDark }]}>{t.bookerAutofilledNotice}</Text>
                    </View>
                  )}
                </View>

                {!isAuthenticated && (
                  <Text style={{ fontSize: 11, color: theme.textMuted, marginBottom: 8, fontStyle: 'italic' }}>
                    An account will be created for you with a temporary password to track your referral & 5% commission.
                  </Text>
                )}

                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{t.bookerNameLabel}</Text>
                <TextInput
                  style={[
                    styles.inputField,
                    { backgroundColor: theme.cardBg, borderColor: theme.border, color: theme.textPrimary },
                    isAuthenticated && { opacity: 0.85 },
                  ]}
                  placeholder={t.bookerNamePlaceholder}
                  placeholderTextColor={theme.textMuted}
                  editable={!isAuthenticated}
                  value={topBookerName}
                  onChangeText={setTopBookerName}
                />

                <View style={styles.fieldRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{t.bookerPhoneLabel}</Text>
                    <TextInput
                      style={[
                        styles.inputField,
                        { backgroundColor: theme.cardBg, borderColor: theme.border, color: theme.textPrimary },
                        isAuthenticated && { opacity: 0.85 },
                      ]}
                      placeholder={t.bookerPhonePlaceholder}
                      placeholderTextColor={theme.textMuted}
                      keyboardType="phone-pad"
                      maxLength={10}
                      editable={!isAuthenticated}
                      value={topBookerPhone}
                      onChangeText={setTopBookerPhone}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{t.bookerEmailLabel}</Text>
                    <TextInput
                      style={[
                        styles.inputField,
                        { backgroundColor: theme.cardBg, borderColor: theme.border, color: theme.textPrimary },
                        isAuthenticated && { opacity: 0.85 },
                      ]}
                      placeholder={t.bookerEmailPlaceholder}
                      placeholderTextColor={theme.textMuted}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      editable={!isAuthenticated}
                      value={topBookerEmail}
                      onChangeText={setTopBookerEmail}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* Main Submit Referral Button */}
            <TouchableOpacity
              style={[styles.submitReferralBtn, { backgroundColor: theme.goldDark }]}
              onPress={handleOpenUrgencyPrompt}
              disabled={isSubmittingTopForm}
            >
              {isSubmittingTopForm ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="paper-plane" size={18} color="#ffffff" style={{ marginRight: 8 }} />
                  <Text style={styles.submitReferralBtnText}>{t.bookButton}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Doctor Directory Heading & Search */}
        <View style={[styles.directoryHeader, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Text style={[styles.directoryTitle, { color: theme.textPrimary }]}>OPD Specialists & Consultants</Text>
          <Text style={[styles.directorySubtitle, { color: theme.textMuted }]}>
            Browse our hospital doctors or schedule with a specific clinician
          </Text>

          {/* Search bar */}
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

        {/* Any Available Doctor Card */}
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
                Assigned to first available clinician on duty
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
            onPress={() => openDoctorModal(ANY_DOCTOR)}
          >
            <Ionicons name="flash-outline" size={16} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.bookBtnText}>Select Any Doctor (Fast Triage)</Text>
          </TouchableOpacity>
        </View>

        {/* Doctor Cards */}
        {filteredDoctors.map((item) => {
          const docDisplayName = item.name || `Dr. ${item.firstName || ''} ${item.lastName || ''}`;
          const fee = item.visitingFee || item.consultationFee || 500;

          return (
            <View key={item._id} style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
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
                      <Ionicons name="medkit-outline" size={11} color={theme.primary} />
                      <Text style={[styles.tagBadgeText, { color: theme.primary }]}>
                        {item.doctorDepartment || 'General'}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.specialty, { color: theme.textSecondary }]}>
                    {item.specialization || 'Clinical Specialist'}
                  </Text>

                  {item.qualifications && (
                    <Text style={[styles.qualifications, { color: theme.textMuted }]}>{item.qualifications}</Text>
                  )}

                  <View style={styles.metaRow}>
                    <Ionicons name="cash-outline" size={14} color={theme.goldDark} />
                    <Text style={[styles.feeText, { color: theme.goldDark }]}>Fee: ₹{fee}</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.bookBtn, { backgroundColor: theme.primary }]}
                onPress={() => openDoctorModal(item)}
              >
                <Ionicons name="calendar-outline" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.bookBtnText}>Book Appointment</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>

      {/* 🚨 CONSULTATION URGENCY MODAL (Prompt for Emergency / General / Routine + Woooosh Sound) */}
      <Modal visible={showUrgencyModal} transparent animationType="fade">
        <View style={styles.urgencyOverlay}>
          <View style={[styles.urgencyCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <View style={styles.urgencyHeader}>
              <Text style={[styles.urgencyTitle, { color: theme.textPrimary }]}>{t.urgencyModalTitle}</Text>
              <Text style={[styles.urgencySubtitle, { color: theme.textMuted }]}>{t.urgencyModalSubtitle}</Text>
            </View>

            {/* Urgency Option 1: Emergency */}
            <TouchableOpacity
              style={[styles.urgencyOption, { borderColor: '#ef4444', backgroundColor: '#fef2f2' }]}
              onPress={() => handleSelectUrgencyAndSubmit('emergency')}
            >
              <View style={styles.urgencyIconCircleRed}>
                <Ionicons name="warning" size={24} color="#dc2626" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.urgencyOptTitle, { color: '#b91c1c' }]}>{t.emergencyTitle}</Text>
                <Text style={[styles.urgencyOptDesc, { color: '#7f1d1d' }]}>{t.emergencyDesc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#b91c1c" />
            </TouchableOpacity>

            {/* Urgency Option 2: General */}
            <TouchableOpacity
              style={[styles.urgencyOption, { borderColor: theme.primary, backgroundColor: theme.primarySoft }]}
              onPress={() => handleSelectUrgencyAndSubmit('general')}
            >
              <View style={[styles.urgencyIconCircle, { backgroundColor: theme.cardBg, borderColor: theme.primary }]}>
                <Ionicons name="fitness" size={24} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.urgencyOptTitle, { color: theme.primary }]}>{t.generalTitle}</Text>
                <Text style={[styles.urgencyOptDesc, { color: theme.textSecondary }]}>{t.generalDesc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.primary} />
            </TouchableOpacity>

            {/* Urgency Option 3: Routine */}
            <TouchableOpacity
              style={[styles.urgencyOption, { borderColor: '#10b981', backgroundColor: '#ecfdf5' }]}
              onPress={() => handleSelectUrgencyAndSubmit('routine')}
            >
              <View style={styles.urgencyIconCircleGreen}>
                <Ionicons name="calendar" size={24} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.urgencyOptTitle, { color: '#047857' }]}>{t.routineTitle}</Text>
                <Text style={[styles.urgencyOptDesc, { color: '#065f46' }]}>{t.routineDesc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#047857" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.urgencyCancelBtn, { borderColor: theme.border }]}
              onPress={() => setShowUrgencyModal(false)}
            >
              <Text style={[styles.urgencyCancelText, { color: theme.textSecondary }]}>{t.cancel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Individual Doctor Booking Modal */}
      <Modal visible={isBookingOpen} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                  {selectedDoctor?._id ? `Book with ${selectedDoctor?.name || 'Doctor'}` : 'Book General Referral'}
                </Text>
                <Text style={[styles.modalSubtitle, { color: theme.goldDark }]}>
                  Consultation Fee: ₹{selectedDoctor?.visitingFee || 500}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsBookingOpen(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Applicant / Referrer Type</Text>
              <View style={styles.applicantGrid}>
                {APPLICANT_TYPES.map((appType) => {
                  const isSelected = modalApplicantBy === appType;
                  return (
                    <TouchableOpacity
                      key={appType}
                      style={[
                        styles.applicantChip,
                        {
                          backgroundColor: isSelected ? theme.primary : theme.surfaceElevated,
                          borderColor: isSelected ? theme.primary : theme.border,
                        },
                      ]}
                      onPress={() => {
                        interactionUtils.playClick();
                        setModalApplicantBy(appType);
                      }}
                    >
                      <Text
                        style={[
                          styles.applicantChipText,
                          { color: isSelected ? '#ffffff' : theme.textSecondary },
                          isSelected && { fontWeight: '800' },
                        ]}
                      >
                        {appType}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {modalApplicantBy !== 'Self (Patient)' && (
                <View style={[styles.applicantNameBox, { backgroundColor: theme.surfaceElevated, borderColor: theme.goldBorder }]}>
                  <Text style={[styles.fieldLabel, { color: theme.goldDark }]}>
                    Applicant's Full Name * (Who is submitting this referral)
                  </Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.cardBg, borderColor: theme.border, color: theme.textPrimary }]}
                    placeholder="e.g. Rahul Sharma"
                    placeholderTextColor={theme.textMuted}
                    value={modalApplicantName}
                    onChangeText={setModalApplicantName}
                  />
                </View>
              )}

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Patient Full Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                placeholder="Patient Full Name"
                placeholderTextColor={theme.textMuted}
                value={modalPatientName}
                onChangeText={setModalPatientName}
              />

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Patient Mobile * (10 Digits)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                    placeholder="10-digit Phone"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={modalPatientPhone}
                    onChangeText={setModalPatientPhone}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Age</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                    placeholder="e.g. 32"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="numeric"
                    maxLength={3}
                    value={modalAge}
                    onChangeText={setModalAge}
                  />
                </View>
              </View>

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Patient Address</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                placeholder="City, District, State"
                placeholderTextColor={theme.textMuted}
                value={modalPatientAddress}
                onChangeText={setModalPatientAddress}
              />

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Reason / Symptoms / Problem *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary, height: 75 }]}
                placeholder="Describe complaints..."
                placeholderTextColor={theme.textMuted}
                multiline
                value={modalSymptoms}
                onChangeText={setModalSymptoms}
              />

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Appointment Date</Text>
              <TouchableOpacity
                style={[styles.dateSelector, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={18} color={theme.primary} style={{ marginRight: 8 }} />
                <Text style={[styles.dateText, { color: theme.textPrimary }]}>{modalAppointmentDate}</Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={new Date(modalAppointmentDate)}
                  mode="date"
                  display="default"
                  minimumDate={new Date()}
                  onChange={(event, selected) => {
                    setShowDatePicker(false);
                    if (selected) {
                      setModalAppointmentDate(selected.toISOString().split('T')[0]);
                    }
                  }}
                />
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, borderWidth: 1 }]}
                  onPress={() => setIsBookingOpen(false)}
                >
                  <Text style={[styles.modalBtnCancel, { color: theme.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: theme.primary }]}
                  onPress={handleModalBookingSubmit}
                  disabled={isSubmittingModal}
                >
                  {isSubmittingModal ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.modalBtnConfirm}>Submit Referral</Text>
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
    paddingTop: Platform.OS === 'android' ? 44 : 48, // 2-3 rem top safe margin
  },
  scrollContent: {
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  loginBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  langSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  langPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  langPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  hospitalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  hospitalBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  // Top Referral Card Styles
  topReferralCard: {
    margin: 14,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  formHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  formIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  formSubtitle: {
    fontSize: 11.5,
    marginTop: 2,
  },
  bookingToggleContainer: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
    gap: 4,
  },
  toggleSegment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  toggleSegmentText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  formFieldsSection: {
    gap: 2,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
    marginTop: 6,
  },
  inputField: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
  },
  inputFieldMultiline: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    minHeight: 65,
    textAlignVertical: 'top',
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 10,
  },
  bookerCard: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  bookerSectionHeading: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  autofillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  autofillBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  submitReferralBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  submitReferralBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  // Doctor Directory Section
  directoryHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  directoryTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  directorySubtitle: {
    fontSize: 11,
    marginTop: 2,
    marginBottom: 8,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
  },
  anyDoctorCard: {
    marginHorizontal: 14,
    marginBottom: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  card: {
    marginHorizontal: 14,
    marginBottom: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 14,
    fontWeight: '800',
  },
  priorityChip: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
  },
  priorityChipText: {
    fontSize: 9,
    fontWeight: '800',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    gap: 3,
  },
  tagBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  specialty: {
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: 3,
  },
  deptText: {
    fontSize: 10.5,
    marginTop: 2,
  },
  qualifications: {
    fontSize: 10,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  feeText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  bookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    marginTop: 10,
  },
  bookBtnText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '800',
  },
  // Urgency Modal Styles
  urgencyOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  urgencyCard: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  urgencyHeader: {
    marginBottom: 16,
    alignItems: 'center',
  },
  urgencyTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  urgencySubtitle: {
    fontSize: 12,
    marginTop: 3,
    textAlign: 'center',
  },
  urgencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 10,
    gap: 12,
  },
  urgencyIconCircleRed: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  urgencyIconCircleGreen: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#d1fae5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  urgencyIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  urgencyOptTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  urgencyOptDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  urgencyCancelBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  urgencyCancelText: {
    fontSize: 13,
    fontWeight: '700',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '90%',
    padding: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  modalScroll: {
    paddingBottom: 20,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
    marginTop: 6,
  },
  applicantGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  applicantChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  applicantChipText: {
    fontSize: 11,
  },
  applicantNameBox: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    paddingBottom: 16,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalBtnCancel: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalBtnConfirm: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
});
