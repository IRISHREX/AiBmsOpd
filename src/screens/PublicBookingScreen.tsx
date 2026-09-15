import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
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
import { interactionUtils } from '../utils/interactionUtils';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { resetToMain } from '../navigation/AppNavigator';
import { REFERRAL_TRANSLATIONS, ReferralLanguage } from '../utils/referralTranslations';

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
  name: 'Any Available Specialist / Fast Triage',
  email: 'opd@hospital.local',
  role: 'doctor',
  doctorDepartment: 'General Medicine & Triage',
  specialization: 'General OPD / All On-Duty Physicians',
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

  // Search & Category Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('All');

  // Multilingual Support
  const [lang, setLang] = useState<ReferralLanguage>('en');
  const t = REFERRAL_TRANSLATIONS[lang];

  // Booking Modal State (Opens when clicking "Book Appointment" on any doctor card)
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Booking Type: Self vs Someone Else (Referral)
  const [isBookingForSomeoneElse, setIsBookingForSomeoneElse] = useState(false);

  // Referrer / Booker details (For "Someone Else")
  const [bookerName, setBookerName] = useState('');
  const [bookerPhone, setBookerPhone] = useState('');
  const [bookerEmail, setBookerEmail] = useState('');

  // Patient details
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [patientAddress, setPatientAddress] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState<'male' | 'female' | 'other'>('male');
  const [symptoms, setSymptoms] = useState('');

  // Schedule & Urgency
  const [appointmentDate, setAppointmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [appointmentSlot, setAppointmentSlot] = useState(TIME_SLOTS[0]);
  const [urgency, setUrgency] = useState<'routine' | 'general' | 'urgent' | 'emergency'>('general');

  // Pre-fill logged in user info for booker
  useEffect(() => {
    if (isAuthenticated && user) {
      setBookerName(user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim());
      setBookerPhone(user.phone || '');
      setBookerEmail(user.email || '');
    }
  }, [isAuthenticated, user]);

  // Hardware Back Button handling
  useEffect(() => {
    const onBackPress = () => {
      if (isBookingOpen) {
        setIsBookingOpen(false);
        return true;
      }
      if (navigation.canGoBack()) {
        navigation.goBack();
        return true;
      }
      return false;
    };

    const backSubscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backSubscription.remove();
  }, [isBookingOpen, navigation]);

  // Load doctors from backend
  const loadDoctors = useCallback(async () => {
    try {
      setLoadError(null);
      const res: any = await doctorsApi.getAll();
      const list = Array.isArray(res) ? res : res?.doctors || [];
      setDoctors(list);
    } catch (e: any) {
      console.warn('Failed to fetch doctors list:', e);
      setLoadError('Unable to connect to OPD server. Please check your internet.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDoctors();
  }, [loadDoctors]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadDoctors();
  }, [loadDoctors]);

  // Unique departments for category pills
  const departments = useMemo(() => {
    const set = new Set<string>();
    doctors.forEach((d) => {
      const dept = d.doctorDepartment || (d as any).department;
      if (dept && dept.trim()) set.add(dept.trim());
    });
    return ['All', ...Array.from(set)];
  }, [doctors]);

  // Filtered Doctors list
  const filteredDoctors = useMemo(() => {
    return doctors.filter((d) => {
      const docName = d.name || `Dr. ${d.firstName || ''} ${d.lastName || ''}`;
      const dept = d.doctorDepartment || (d as any).department || '';
      const spec = d.specialization || '';
      const qual = d.qualifications || '';

      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        docName.toLowerCase().includes(query) ||
        dept.toLowerCase().includes(query) ||
        spec.toLowerCase().includes(query) ||
        qual.toLowerCase().includes(query);

      const matchesDept =
        selectedDepartment === 'All' || dept.toLowerCase() === selectedDepartment.toLowerCase();

      return matchesSearch && matchesDept;
    });
  }, [doctors, searchQuery, selectedDepartment]);

  // Open booking modal for a specific doctor
  const openDoctorModal = (doctor: Doctor) => {
    interactionUtils.playClick();
    setSelectedDoctor(doctor);
    setIsBookingOpen(true);
  };

  // Submit appointment & referral booking
  const handleBookingSubmit = async () => {
    const cleanPatientName = patientName.trim();
    const cleanPatientPhone = patientPhone.trim().replace(/[^0-9]/g, '');
    const cleanAddress = patientAddress.trim();
    const cleanSymptoms = symptoms.trim();

    // Validation: Patient Name
    if (!cleanPatientName) {
      Alert.alert('Required Field', t.validationNameRequired);
      return;
    }

    // Validation: Patient Phone (10 digits)
    if (!/^[0-9]{10}$/.test(cleanPatientPhone)) {
      Alert.alert('Invalid Phone', t.validationPhoneInvalid);
      return;
    }

    // Validation: Age (0 - 150)
    if (patientAge) {
      const numAge = Number(patientAge);
      if (isNaN(numAge) || numAge < 0 || numAge > 150) {
        Alert.alert('Invalid Age', t.validationAgeInvalid);
        return;
      }
    }

    // Validation: Address
    if (!cleanAddress) {
      Alert.alert('Required Field', t.validationAddressRequired);
      return;
    }

    // Validation: Problem / Symptoms
    if (!cleanSymptoms) {
      Alert.alert('Required Field', t.validationProblemRequired);
      return;
    }

    // Validation: Booker details if booking for someone else
    let cleanBookerPhone = '';
    if (isBookingForSomeoneElse) {
      if (!bookerName.trim()) {
        Alert.alert('Referrer Name Required', t.validationBookerNameRequired);
        return;
      }
      cleanBookerPhone = bookerPhone.trim().replace(/[^0-9]/g, '');
      if (!cleanBookerPhone) {
        Alert.alert('Referrer Phone Required', t.validationBookerPhoneInvalid);
        return;
      }
      if (!/^[0-9]{10}$/.test(cleanBookerPhone)) {
        Alert.alert('Invalid Phone', t.validationBookerPhoneInvalid);
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const isAny = !selectedDoctor?._id;
      const doctorDisplayName = isAny
        ? 'Any Available Specialist / Fast Triage'
        : (selectedDoctor?.name || `Dr. ${selectedDoctor?.firstName || ''} ${selectedDoctor?.lastName || ''}`.trim());

      const payload = {
        patientName: cleanPatientName,
        patientPhone: cleanPatientPhone,
        patientEmail: patientEmail.trim() || undefined,
        patientAddress: cleanAddress,
        age: patientAge ? Number(patientAge) : undefined,
        gender: patientGender,
        targetDoctorId: selectedDoctor?._id ? selectedDoctor._id : undefined,
        targetDoctorName: doctorDisplayName,
        department: selectedDoctor?.doctorDepartment || (selectedDoctor as any)?.department || 'General OPD',
        appointmentDate,
        appointmentSlot,
        applicantBy: isBookingForSomeoneElse ? 'Referrer' : 'Self',
        applicantName: isBookingForSomeoneElse ? bookerName.trim() : cleanPatientName,
        applicantPhone: isBookingForSomeoneElse ? cleanBookerPhone : cleanPatientPhone,
        applicantEmail: isBookingForSomeoneElse ? bookerEmail.trim() : (patientEmail.trim() || undefined),
        urgency: urgency === 'urgent' ? 'emergency' : urgency,
        symptoms: cleanSymptoms,
        clinicalNotes: cleanSymptoms,
        commissionPercent: 5,
      };

      // Play "woooosh" sound on referral submission
      interactionUtils.playWoosh();

      const res = await referralsApi.bookPatient(payload);
      interactionUtils.playSuccess();

      // If a guest referral account token was generated, log them in automatically
      if (res.token && res.user && !isAuthenticated) {
        await loginWithToken(res.token, res.user);
      }

      setIsBookingOpen(false);

      // Reset form fields
      setPatientName('');
      setPatientPhone('');
      setPatientEmail('');
      setPatientAddress('');
      setPatientAge('');
      setSymptoms('');

      let msg = `Your appointment referral with ${doctorDisplayName} has been confirmed!\n\nPriority: ${urgency.toUpperCase()}`;
      if (res.tempPassword) {
        msg += `\n\n🔑 ${t.tempPassNotice}: ${res.tempPassword}\n(Use this to log in to your Referrals portal anytime).`;
      }

      Alert.alert(
        t.successTitle,
        msg,
        [
          {
            text: 'View Referrals Portal',
            onPress: () => {
              if (isAuthenticated || res.token) {
                navigation.navigate('Main', { screen: 'Referrals' });
              } else {
                navigation.navigate('Referrals');
              }
            },
          },
          {
            text: 'Done',
            style: 'cancel',
          },
        ]
      );
    } catch (e: any) {
      Alert.alert('Booking Error', e?.response?.data?.message || e?.message || 'Failed to submit appointment booking.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* 🌟 TOP NAVIGATION BAR */}
      <View style={[styles.topBar, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        {/* Top Left: Staff / Member Login Option */}
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
          accessibilityLabel="Login"
        >
          <Ionicons
            name={isAuthenticated ? 'home' : 'log-in-outline'}
            size={16}
            color="#ffffff"
            style={{ marginRight: 6 }}
          />
          <Text style={styles.loginBtnText}>{isAuthenticated ? 'Dashboard' : 'Staff Login'}</Text>
        </TouchableOpacity>

        {/* Center: Language Selector Pills */}
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

        {/* Top Right: Hospital Badge */}
        <View style={[styles.hospitalBadge, { backgroundColor: theme.goldSoft, borderColor: theme.goldBorder }]}>
          <Ionicons name="shield-checkmark" size={13} color={theme.goldDark} />
          <Text style={[styles.hospitalBadgeText, { color: theme.goldDark }]}>BMS OPD</Text>
        </View>
      </View>

      {/* 🌟 SCROLLABLE MAIN BODY: DIRECT DOCTOR CARDS LIST */}
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
        {/* Welcome Header */}
        <View style={styles.welcomeBanner}>
          <Text style={[styles.pageHeading, { color: theme.textPrimary }]}>
            Find a Doctor & Book Appointment
          </Text>
          <Text style={[styles.pageSubheading, { color: theme.textMuted }]}>
            Choose a specialist doctor below or select Fast Triage for immediate OPD assignment.
          </Text>
        </View>

        {/* Search Input Bar */}
        <View style={[styles.searchContainer, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Ionicons name="search-outline" size={18} color={theme.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: theme.textPrimary }]}
            placeholder="Search doctors, specialization, department..."
            placeholderTextColor={theme.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={theme.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Department / Category Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.deptFilterRow}
        >
          {departments.map((dept) => {
            const isSelected = selectedDepartment === dept;
            return (
              <TouchableOpacity
                key={dept}
                style={[
                  styles.deptPill,
                  isSelected
                    ? { backgroundColor: theme.primary, borderColor: theme.gold }
                    : { backgroundColor: theme.cardBg, borderColor: theme.border },
                ]}
                onPress={() => {
                  interactionUtils.playClick();
                  setSelectedDepartment(dept);
                }}
              >
                <Text
                  style={[
                    styles.deptPillText,
                    isSelected ? { color: '#ffffff', fontWeight: '800' } : { color: theme.textSecondary },
                  ]}
                >
                  {dept}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ⚡ CARD 1: Fast Triage / Any Available Doctor */}
        <View style={[styles.anyDoctorCard, { backgroundColor: theme.surfaceElevated, borderColor: theme.gold }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.avatarCircle, { backgroundColor: theme.goldSoft, borderColor: theme.gold }]}>
              <Ionicons name="flash" size={24} color={theme.goldDark} />
            </View>
            <View style={styles.doctorInfo}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.doctorName, { color: theme.textPrimary }]}>Any Available Doctor</Text>
                <View style={[styles.fastBadge, { backgroundColor: theme.goldSoft, borderColor: theme.goldBorder }]}>
                  <Text style={[styles.fastBadgeText, { color: theme.goldDark }]}>⚡ Fastest</Text>
                </View>
              </View>
              <Text style={[styles.specialty, { color: theme.primary }]}>
                General OPD & Urgent Clinical Triage
              </Text>
              <Text style={[styles.deptText, { color: theme.textSecondary }]}>
                Assigned automatically to the first available physician on duty.
              </Text>
              <View style={styles.feeBadgeRow}>
                <Ionicons name="cash-outline" size={14} color={theme.goldDark} />
                <Text style={[styles.feeText, { color: theme.goldDark }]}>Standard Fee: ₹500</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.bookBtn, { backgroundColor: theme.goldDark }]}
            onPress={() => openDoctorModal(ANY_DOCTOR)}
          >
            <Ionicons name="calendar" size={16} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.bookBtnText}>Book Fast Triage Appointment</Text>
          </TouchableOpacity>
        </View>

        {/* Loading Spinner */}
        {isLoading && (
          <View style={styles.stateCenter}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.stateText, { color: theme.textMuted }]}>Loading OPD doctors...</Text>
          </View>
        )}

        {/* Load Error */}
        {loadError && !isLoading && (
          <View style={[styles.errorBox, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <Ionicons name="alert-circle-outline" size={28} color="#ef4444" />
            <Text style={[styles.errorText, { color: theme.textPrimary }]}>{loadError}</Text>
            <TouchableOpacity style={[styles.retryBtn, { backgroundColor: theme.primary }]} onPress={loadDoctors}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Empty Search State */}
        {!isLoading && filteredDoctors.length === 0 && !loadError && (
          <View style={styles.stateCenter}>
            <Ionicons name="person-outline" size={40} color={theme.textMuted} />
            <Text style={[styles.stateText, { color: theme.textMuted }]}>No doctors found matching your search.</Text>
          </View>
        )}

        {/* 🩺 ALL DOCTOR CARDS */}
        {!isLoading &&
          filteredDoctors.map((doc) => {
            const docDisplayName = doc.name || `Dr. ${doc.firstName || ''} ${doc.lastName || ''}`.trim();
            const fee = doc.visitingFee || doc.consultationFee || 500;
            const dept = doc.doctorDepartment || (doc as any).department || 'Specialist';
            const initial = docDisplayName.replace(/^Dr\.\s*/i, '').charAt(0).toUpperCase() || 'D';

            return (
              <View key={doc._id} style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                <View style={styles.cardHeader}>
                  {/* Doctor Avatar */}
                  <View style={[styles.avatarCircle, { backgroundColor: theme.primaryDark, borderColor: theme.gold }]}>
                    <Text style={[styles.avatarText, { color: theme.goldBright }]}>{initial}</Text>
                  </View>

                  {/* Doctor Info */}
                  <View style={styles.doctorInfo}>
                    <Text style={[styles.doctorName, { color: theme.textPrimary }]}>{docDisplayName}</Text>
                    
                    <View style={styles.badgeRow}>
                      <View style={[styles.tagBadge, { backgroundColor: theme.primarySoft, borderColor: theme.primary }]}>
                        <Ionicons name="medkit-outline" size={11} color={theme.primary} />
                        <Text style={[styles.tagBadgeText, { color: theme.primary }]}>{dept}</Text>
                      </View>
                      <View style={[styles.ratingBadge, { backgroundColor: '#fef3c7', borderColor: '#fcd34d' }]}>
                        <Ionicons name="star" size={11} color="#d97706" />
                        <Text style={styles.ratingText}>4.8</Text>
                      </View>
                    </View>

                    {doc.specialization ? (
                      <Text style={[styles.specialty, { color: theme.textSecondary }]}>{doc.specialization}</Text>
                    ) : null}

                    {doc.qualifications ? (
                      <Text style={[styles.qualifications, { color: theme.textMuted }]}>{doc.qualifications}</Text>
                    ) : null}

                    <View style={styles.feeBadgeRow}>
                      <Ionicons name="cash-outline" size={13} color={theme.goldDark} />
                      <Text style={[styles.feeText, { color: theme.goldDark }]}>Fee: ₹{fee}</Text>
                    </View>
                  </View>
                </View>

                {/* Prominent "Book Appointment" Button on Every Card */}
                <TouchableOpacity
                  style={[styles.bookBtn, { backgroundColor: theme.primary }]}
                  onPress={() => openDoctorModal(doc)}
                >
                  <Ionicons name="calendar-outline" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.bookBtnText}>Book Appointment</Text>
                </TouchableOpacity>
              </View>
            );
          })}
      </ScrollView>

      {/* 🌟 DEDICATED APPOINTMENT BOOKING MODAL */}
      <Modal visible={isBookingOpen} animationType="slide" transparent onRequestClose={() => setIsBookingOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                  {selectedDoctor?._id
                    ? `Book with ${selectedDoctor?.name || 'Doctor'}`
                    : 'Fast Triage Booking'}
                </Text>
                <Text style={[styles.modalSubtitle, { color: theme.goldDark }]}>
                  {selectedDoctor?.doctorDepartment || 'General OPD'} • Consultation Fee: ₹{selectedDoctor?.visitingFee || 500}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsBookingOpen(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* 👥 STEP 1: BOOK FOR SELF OR SOMEONE ELSE */}
              <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>
                1. Who is this appointment for?
              </Text>

              <View style={[styles.bookingToggleContainer, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
                {/* Book for Self */}
                <TouchableOpacity
                  style={[
                    styles.toggleSegment,
                    !isBookingForSomeoneElse && { backgroundColor: theme.primary },
                  ]}
                  onPress={() => {
                    interactionUtils.playClick();
                    setIsBookingForSomeoneElse(false);
                  }}
                >
                  <Ionicons
                    name="person"
                    size={15}
                    color={!isBookingForSomeoneElse ? '#ffffff' : theme.textSecondary}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.toggleSegmentText,
                      { color: !isBookingForSomeoneElse ? '#ffffff' : theme.textSecondary },
                      !isBookingForSomeoneElse && { fontWeight: '800' },
                    ]}
                  >
                    {t.bookingForSelf}
                  </Text>
                </TouchableOpacity>

                {/* Book for Someone Else */}
                <TouchableOpacity
                  style={[
                    styles.toggleSegment,
                    isBookingForSomeoneElse && { backgroundColor: theme.goldDark },
                  ]}
                  onPress={() => {
                    interactionUtils.playClick();
                    setIsBookingForSomeoneElse(true);
                  }}
                >
                  <Ionicons
                    name="people"
                    size={15}
                    color={isBookingForSomeoneElse ? '#ffffff' : theme.textSecondary}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.toggleSegmentText,
                      { color: isBookingForSomeoneElse ? '#ffffff' : theme.textSecondary },
                      isBookingForSomeoneElse && { fontWeight: '800' },
                    ]}
                  >
                    {t.bookingForSomeoneElse}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* 👥 STEP 2 (CONDITIONAL): REFERRER DETAILS IF SOMEONE ELSE */}
              {isBookingForSomeoneElse && (
                <View style={[styles.bookerCard, { backgroundColor: theme.surfaceElevated, borderColor: theme.goldBorder }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={[styles.bookerSectionHeading, { color: theme.goldDark }]}>
                      {t.bookerSectionTitle}
                    </Text>
                    {isAuthenticated ? (
                      <View style={[styles.autofillBadge, { backgroundColor: '#dcfce7' }]}>
                        <Ionicons name="checkmark-circle" size={12} color="#16a34a" style={{ marginRight: 3 }} />
                        <Text style={[styles.autofillBadgeText, { color: '#16a34a' }]}>Verified Referrer</Text>
                      </View>
                    ) : (
                      <View style={[styles.autofillBadge, { backgroundColor: theme.goldSoft }]}>
                        <Text style={[styles.autofillBadgeText, { color: theme.goldDark }]}>Earn 5% Commission</Text>
                      </View>
                    )}
                  </View>

                  {!isAuthenticated ? (
                    <Text style={[styles.bookerHint, { color: theme.textMuted }]}>
                      Enter your details below. A referrer account will be automatically created so you can track this patient and earn commission.
                    </Text>
                  ) : null}

                  {/* Referrer Name */}
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
                    value={bookerName}
                    onChangeText={setBookerName}
                  />

                  {/* Referrer Phone & Email */}
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
                        value={bookerPhone}
                        onChangeText={setBookerPhone}
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
                        value={bookerEmail}
                        onChangeText={setBookerEmail}
                      />
                    </View>
                  </View>
                </View>
              )}

              {/* 📋 STEP 3: PATIENT INFORMATION */}
              <Text style={[styles.sectionHeading, { color: theme.textPrimary, marginTop: 14 }]}>
                2. {t.patientSectionTitle}
              </Text>

              {/* Patient Full Name */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{t.patientNameLabel}</Text>
              <TextInput
                style={[styles.inputField, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                placeholder={t.patientNamePlaceholder}
                placeholderTextColor={theme.textMuted}
                value={patientName}
                onChangeText={setPatientName}
              />

              {/* Patient Phone & Age */}
              <View style={styles.fieldRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{t.patientPhoneLabel}</Text>
                  <TextInput
                    style={[styles.inputField, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                    placeholder={t.patientPhonePlaceholder}
                    placeholderTextColor={theme.textMuted}
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={patientPhone}
                    onChangeText={setPatientPhone}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{t.ageLabel}</Text>
                  <TextInput
                    style={[styles.inputField, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                    placeholder={t.agePlaceholder}
                    placeholderTextColor={theme.textMuted}
                    keyboardType="numeric"
                    maxLength={3}
                    value={patientAge}
                    onChangeText={setPatientAge}
                  />
                </View>
              </View>

              {/* Gender Pills */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{t.genderLabel} *</Text>
              <View style={styles.genderRow}>
                {(['male', 'female', 'other'] as const).map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[
                      styles.genderPill,
                      patientGender === g
                        ? { backgroundColor: theme.primary, borderColor: theme.gold }
                        : { backgroundColor: theme.surfaceElevated, borderColor: theme.border },
                    ]}
                    onPress={() => {
                      interactionUtils.playClick();
                      setPatientGender(g);
                    }}
                  >
                    <Text
                      style={[
                        styles.genderPillText,
                        patientGender === g ? { color: '#ffffff', fontWeight: '800' } : { color: theme.textSecondary },
                      ]}
                    >
                      {g === 'male' ? t.genderMale : g === 'female' ? t.genderFemale : t.genderOther}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Patient Address */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{t.patientAddressLabel}</Text>
              <TextInput
                style={[styles.inputField, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                placeholder={t.patientAddressPlaceholder}
                placeholderTextColor={theme.textMuted}
                value={patientAddress}
                onChangeText={setPatientAddress}
              />

              {/* Medical Problem / Symptoms */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{t.problemLabel}</Text>
              <TextInput
                style={[
                  styles.inputFieldMultiline,
                  { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary },
                ]}
                placeholder={t.problemPlaceholder}
                placeholderTextColor={theme.textMuted}
                multiline
                numberOfLines={3}
                value={symptoms}
                onChangeText={setSymptoms}
              />

              {/* 📅 STEP 4: DATE & TIME SLOT */}
              <Text style={[styles.sectionHeading, { color: theme.textPrimary, marginTop: 14 }]}>
                3. Preferred Date & Time
              </Text>

              {/* Appointment Date Picker Trigger */}
              <TouchableOpacity
                style={[styles.dateSelector, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={18} color={theme.primary} style={{ marginRight: 8 }} />
                <Text style={[styles.dateText, { color: theme.textPrimary }]}>Date: {appointmentDate}</Text>
                <Ionicons name="chevron-down" size={16} color={theme.textMuted} style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={new Date(appointmentDate)}
                  mode="date"
                  display="default"
                  minimumDate={new Date()}
                  onChange={(_, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) {
                      setAppointmentDate(selectedDate.toISOString().split('T')[0]);
                    }
                  }}
                />
              )}

              {/* Time Slots */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.slotsRow}>
                {TIME_SLOTS.map((slot) => {
                  const isSelected = appointmentSlot === slot;
                  return (
                    <TouchableOpacity
                      key={slot}
                      style={[
                        styles.slotChip,
                        isSelected
                          ? { backgroundColor: theme.primary, borderColor: theme.gold }
                          : { backgroundColor: theme.surfaceElevated, borderColor: theme.border },
                      ]}
                      onPress={() => {
                        interactionUtils.playClick();
                        setAppointmentSlot(slot);
                      }}
                    >
                      <Text
                        style={[
                          styles.slotChipText,
                          isSelected ? { color: '#ffffff', fontWeight: '800' } : { color: theme.textSecondary },
                        ]}
                      >
                        {slot}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* 🚨 STEP 5: CONSULTATION URGENCY */}
              <Text style={[styles.sectionHeading, { color: theme.textPrimary, marginTop: 14 }]}>
                4. {t.urgencyModalTitle}
              </Text>

              <View style={styles.urgencyRow}>
                {/* Emergency */}
                <TouchableOpacity
                  style={[
                    styles.urgencyPill,
                    urgency === 'emergency'
                      ? { backgroundColor: '#fee2e2', borderColor: '#ef4444' }
                      : { backgroundColor: theme.surfaceElevated, borderColor: theme.border },
                  ]}
                  onPress={() => {
                    interactionUtils.playClick();
                    setUrgency('emergency');
                  }}
                >
                  <Text style={[styles.urgencyPillText, { color: urgency === 'emergency' ? '#b91c1c' : theme.textSecondary }]}>
                    🚨 Emergency
                  </Text>
                </TouchableOpacity>

                {/* General */}
                <TouchableOpacity
                  style={[
                    styles.urgencyPill,
                    urgency === 'general'
                      ? { backgroundColor: theme.primarySoft, borderColor: theme.primary }
                      : { backgroundColor: theme.surfaceElevated, borderColor: theme.border },
                  ]}
                  onPress={() => {
                    interactionUtils.playClick();
                    setUrgency('general');
                  }}
                >
                  <Text style={[styles.urgencyPillText, { color: urgency === 'general' ? theme.primary : theme.textSecondary }]}>
                    🩺 General
                  </Text>
                </TouchableOpacity>

                {/* Routine */}
                <TouchableOpacity
                  style={[
                    styles.urgencyPill,
                    urgency === 'routine'
                      ? { backgroundColor: '#ecfdf5', borderColor: '#10b981' }
                      : { backgroundColor: theme.surfaceElevated, borderColor: theme.border },
                  ]}
                  onPress={() => {
                    interactionUtils.playClick();
                    setUrgency('routine');
                  }}
                >
                  <Text style={[styles.urgencyPillText, { color: urgency === 'routine' ? '#047857' : theme.textSecondary }]}>
                    📅 Routine
                  </Text>
                </TouchableOpacity>
              </View>

              {/* 🚀 SUBMIT BUTTON */}
              <TouchableOpacity
                style={[styles.confirmSubmitBtn, { backgroundColor: theme.goldDark }]}
                onPress={handleBookingSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="paper-plane" size={18} color="#ffffff" style={{ marginRight: 8 }} />
                    <Text style={styles.confirmSubmitBtnText}>{t.bookButton}</Text>
                  </>
                )}
              </TouchableOpacity>
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
  // Top Navigation Bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 10,
    paddingTop: Platform.OS === 'android' ? 44 : 48,
    borderBottomWidth: 1,
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
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
    paddingVertical: 5,
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
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  hospitalBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  scrollContent: {
    paddingBottom: 30,
  },
  welcomeBanner: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  pageHeading: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  pageSubheading: {
    fontSize: 12,
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 14,
    marginVertical: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  deptFilterRow: {
    paddingHorizontal: 14,
    gap: 8,
    paddingBottom: 8,
  },
  deptPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  deptPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Any Doctor Card
  anyDoctorCard: {
    marginHorizontal: 14,
    marginVertical: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  fastBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
  },
  fastBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  // Individual Doctor Card
  card: {
    marginHorizontal: 14,
    marginBottom: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
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
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  tagBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    gap: 3,
  },
  ratingText: {
    color: '#92400e',
    fontSize: 10.5,
    fontWeight: '800',
  },
  specialty: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 3,
  },
  deptText: {
    fontSize: 11,
    marginTop: 2,
  },
  qualifications: {
    fontSize: 10.5,
    marginTop: 2,
  },
  feeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  feeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  bookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  bookBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  stateCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  stateText: {
    fontSize: 13,
    marginTop: 10,
    textAlign: 'center',
  },
  errorBox: {
    margin: 16,
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 13,
    marginVertical: 10,
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '92%',
    padding: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
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
    paddingVertical: 10,
  },
  sectionHeading: {
    fontSize: 13.5,
    fontWeight: '800',
    marginBottom: 8,
  },
  bookingToggleContainer: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    gap: 6,
  },
  toggleSegment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 9,
  },
  toggleSegmentText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  bookerCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  bookerSectionHeading: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  autofillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  autofillBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  bookerHint: {
    fontSize: 11,
    marginBottom: 8,
    lineHeight: 15,
  },
  inputLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    marginBottom: 4,
    marginTop: 6,
  },
  inputField: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
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
  genderRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  genderPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  genderPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '700',
  },
  slotsRow: {
    gap: 8,
    paddingBottom: 6,
  },
  slotChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  slotChipText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  urgencyRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  urgencyPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  urgencyPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  confirmSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  confirmSubmitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
