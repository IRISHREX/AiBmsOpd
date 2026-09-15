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
import { ReferralLanguage } from '../utils/referralTranslations';

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
  name: 'Any Available Doctor / Fast Triage',
  email: 'opd@hospital.local',
  role: 'doctor',
  doctorDepartment: 'General OPD & Triage',
  specialization: 'General OPD / On-Duty Clinician',
  visitingFee: 500,
  qualifications: 'MBBS / General Physician',
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

  // Booking Modal State
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Booking Mode: Self vs Someone Else (Referral)
  const [isBookingForSomeoneElse, setIsBookingForSomeoneElse] = useState(false);

  // Booker / Referrer details (For "Someone Else")
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
  const [urgency, setUrgency] = useState<'routine' | 'general' | 'emergency'>('general');

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
        interactionUtils.playDelete();
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
      setLoadError('Unable to connect to OPD server.');
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

  const closeDoctorModal = () => {
    interactionUtils.playDelete();
    setIsBookingOpen(false);
  };

  // Submit appointment & referral booking
  const handleBookingSubmit = async () => {
    const cleanPatientName = patientName.trim();
    const cleanPatientPhone = patientPhone.trim().replace(/[^0-9]/g, '');
    const cleanAddress = patientAddress.trim();
    const cleanSymptoms = symptoms.trim();

    if (!cleanPatientName) {
      Alert.alert('Required', 'Please enter patient name');
      return;
    }

    if (!/^[0-9]{10}$/.test(cleanPatientPhone)) {
      Alert.alert('Invalid Phone', 'Please enter 10-digit mobile number');
      return;
    }

    if (patientAge) {
      const numAge = Number(patientAge);
      if (isNaN(numAge) || numAge < 0 || numAge > 150) {
        Alert.alert('Invalid Age', 'Please enter a valid age (0–150)');
        return;
      }
    }

    if (!cleanAddress) {
      Alert.alert('Required', 'Please enter patient address/city');
      return;
    }

    if (!cleanSymptoms) {
      Alert.alert('Required', 'Please enter medical symptoms or problem');
      return;
    }

    let cleanBookerPhone = '';
    if (isBookingForSomeoneElse) {
      if (!bookerName.trim()) {
        Alert.alert('Required', 'Please enter your name as referrer');
        return;
      }
      cleanBookerPhone = bookerPhone.trim().replace(/[^0-9]/g, '');
      if (!/^[0-9]{10}$/.test(cleanBookerPhone)) {
        Alert.alert('Invalid Phone', 'Please enter 10-digit referrer phone number');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const isAny = !selectedDoctor?._id;
      const doctorDisplayName = isAny
        ? 'Any Available Doctor / Fast Triage'
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
        urgency,
        symptoms: cleanSymptoms,
        clinicalNotes: cleanSymptoms,
        commissionPercent: 5,
      };

      interactionUtils.playWoosh();

      const res = await referralsApi.bookPatient(payload);
      interactionUtils.playSuccess();

      if (res.token && res.user && !isAuthenticated) {
        await loginWithToken(res.token, res.user);
      }

      setIsBookingOpen(false);

      setPatientName('');
      setPatientPhone('');
      setPatientEmail('');
      setPatientAddress('');
      setPatientAge('');
      setSymptoms('');

      let msg = `Appointment confirmed with ${doctorDisplayName}.\nPriority: ${urgency.toUpperCase()}`;
      if (res.tempPassword) {
        msg += `\n\n🔑 Referrer Pass: ${res.tempPassword}`;
      }

      Alert.alert(
        'Booking Confirmed',
        msg,
        [
          {
            text: 'View Portal',
            onPress: () => {
              if (isAuthenticated || res.token) {
                navigation.navigate('Main', { screen: 'Referrals' });
              } else {
                navigation.navigate('Referrals');
              }
            },
          },
          { text: 'Done', style: 'cancel' },
        ]
      );
    } catch (e: any) {
      Alert.alert('Booking Error', e?.response?.data?.message || e?.message || 'Failed to submit appointment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* 🌟 SLEEK COMPACT TOP BAR */}
      <View style={[styles.topBar, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        {/* Left: Staff Login */}
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
          <Ionicons
            name={isAuthenticated ? 'home' : 'log-in-outline'}
            size={14}
            color="#ffffff"
            style={{ marginRight: 4 }}
          />
          <Text style={styles.loginBtnText}>{isAuthenticated ? 'Dashboard' : 'Staff Login'}</Text>
        </TouchableOpacity>

        {/* Center: Language Pills */}
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

        {/* Right: Hospital Badge */}
        <View style={[styles.hospitalBadge, { backgroundColor: theme.goldSoft, borderColor: theme.goldBorder }]}>
          <Ionicons name="shield-checkmark" size={11} color={theme.goldDark} />
          <Text style={[styles.hospitalBadgeText, { color: theme.goldDark }]}>BMS OPD</Text>
        </View>
      </View>

      {/* 🌟 SCROLLABLE MAIN BODY: COMPACT DOCTOR DIRECTORY */}
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
        {/* Compact Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Ionicons name="search-outline" size={16} color={theme.textMuted} style={{ marginRight: 6 }} />
          <TextInput
            style={[styles.searchInput, { color: theme.textPrimary }]}
            placeholder="Search doctor or specialty..."
            placeholderTextColor={theme.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => { interactionUtils.playDelete(); setSearchQuery(''); }}>
              <Ionicons name="close-circle" size={15} color={theme.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Compact Department Category Pills */}
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
            <View style={[styles.avatarCircleSmall, { backgroundColor: theme.goldSoft, borderColor: theme.gold }]}>
              <Ionicons name="flash" size={18} color={theme.goldDark} />
            </View>
            <View style={styles.doctorInfo}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.doctorName, { color: theme.textPrimary }]}>Any Available Doctor</Text>
                <View style={[styles.fastBadge, { backgroundColor: theme.goldSoft, borderColor: theme.goldBorder }]}>
                  <Text style={[styles.fastBadgeText, { color: theme.goldDark }]}>⚡ Fast</Text>
                </View>
              </View>
              <Text style={[styles.specialty, { color: theme.primary }]}>
                General OPD & Immediate Triage
              </Text>
              <View style={styles.feeBadgeRow}>
                <Ionicons name="cash-outline" size={12} color={theme.goldDark} />
                <Text style={[styles.feeText, { color: theme.goldDark }]}>₹500</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.bookBtnSmall, { backgroundColor: theme.goldDark }]}
            onPress={() => openDoctorModal(ANY_DOCTOR)}
          >
            <Ionicons name="calendar" size={13} color="#ffffff" style={{ marginRight: 4 }} />
            <Text style={styles.bookBtnText}>Fast Book</Text>
          </TouchableOpacity>
        </View>

        {/* Loading Spinner */}
        {isLoading && (
          <View style={styles.stateCenter}>
            <ActivityIndicator size="small" color={theme.primary} />
            <Text style={[styles.stateText, { color: theme.textMuted }]}>Loading doctors...</Text>
          </View>
        )}

        {/* Load Error */}
        {loadError && !isLoading && (
          <View style={[styles.errorBox, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <Ionicons name="alert-circle-outline" size={22} color="#ef4444" />
            <Text style={[styles.errorText, { color: theme.textPrimary }]}>{loadError}</Text>
            <TouchableOpacity style={[styles.retryBtn, { backgroundColor: theme.primary }]} onPress={loadDoctors}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Empty Search State */}
        {!isLoading && filteredDoctors.length === 0 && !loadError && (
          <View style={styles.stateCenter}>
            <Ionicons name="person-outline" size={32} color={theme.textMuted} />
            <Text style={[styles.stateText, { color: theme.textMuted }]}>No doctors found.</Text>
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
                  <View style={[styles.avatarCircleSmall, { backgroundColor: theme.primaryDark, borderColor: theme.gold }]}>
                    <Text style={[styles.avatarTextSmall, { color: theme.goldBright }]}>{initial}</Text>
                  </View>

                  {/* Doctor Info */}
                  <View style={styles.doctorInfo}>
                    <Text style={[styles.doctorName, { color: theme.textPrimary }]}>{docDisplayName}</Text>
                    
                    <View style={styles.badgeRow}>
                      <View style={[styles.tagBadge, { backgroundColor: theme.primarySoft, borderColor: theme.primary }]}>
                        <Ionicons name="medkit-outline" size={10} color={theme.primary} />
                        <Text style={[styles.tagBadgeText, { color: theme.primary }]}>{dept}</Text>
                      </View>
                      <View style={[styles.ratingBadge, { backgroundColor: '#fef3c7', borderColor: '#fcd34d' }]}>
                        <Ionicons name="star" size={10} color="#d97706" />
                        <Text style={styles.ratingText}>4.8</Text>
                      </View>
                    </View>

                    {doc.specialization ? (
                      <Text style={[styles.specialty, { color: theme.textSecondary }]} numberOfLines={1}>
                        {doc.specialization}
                      </Text>
                    ) : null}

                    <View style={styles.feeBadgeRow}>
                      <Ionicons name="cash-outline" size={12} color={theme.goldDark} />
                      <Text style={[styles.feeText, { color: theme.goldDark }]}>₹{fee}</Text>
                    </View>
                  </View>
                </View>

                {/* Compact "Book Appointment" Button */}
                <TouchableOpacity
                  style={[styles.bookBtnSmall, { backgroundColor: theme.primary }]}
                  onPress={() => openDoctorModal(doc)}
                >
                  <Ionicons name="calendar-outline" size={13} color="#ffffff" style={{ marginRight: 5 }} />
                  <Text style={styles.bookBtnText}>Book Appointment</Text>
                </TouchableOpacity>
              </View>
            );
          })}
      </ScrollView>

      {/* 🌟 STREAMLINED, ICON-DRIVEN BOOKING MODAL (LESS WORDS, MORE ICONS) */}
      <Modal visible={isBookingOpen} animationType="slide" transparent onRequestClose={closeDoctorModal}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                  {selectedDoctor?._id ? (selectedDoctor?.name || 'Doctor Booking') : 'Fast Triage Booking'}
                </Text>
                <Text style={[styles.modalSubtitle, { color: theme.goldDark }]}>
                  Fee: ₹{selectedDoctor?.visitingFee || 500}
                </Text>
              </View>
              <TouchableOpacity onPress={closeDoctorModal} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* 👥 TOGGLE: 👤 Self vs 👥 Someone Else */}
              <View style={[styles.bookingToggleContainer, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
                {/* Self */}
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
                    size={14}
                    color={!isBookingForSomeoneElse ? '#ffffff' : theme.textSecondary}
                    style={{ marginRight: 5 }}
                  />
                  <Text
                    style={[
                      styles.toggleSegmentText,
                      { color: !isBookingForSomeoneElse ? '#ffffff' : theme.textSecondary },
                      !isBookingForSomeoneElse && { fontWeight: '800' },
                    ]}
                  >
                    Self
                  </Text>
                </TouchableOpacity>

                {/* Someone Else */}
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
                    size={14}
                    color={isBookingForSomeoneElse ? '#ffffff' : theme.textSecondary}
                    style={{ marginRight: 5 }}
                  />
                  <Text
                    style={[
                      styles.toggleSegmentText,
                      { color: isBookingForSomeoneElse ? '#ffffff' : theme.textSecondary },
                      isBookingForSomeoneElse && { fontWeight: '800' },
                    ]}
                  >
                    Someone Else
                  </Text>
                </TouchableOpacity>
              </View>

              {/* 👥 REFERRER BOX IF "SOMEONE ELSE" */}
              {isBookingForSomeoneElse && (
                <View style={[styles.bookerCard, { backgroundColor: theme.surfaceElevated, borderColor: theme.goldBorder }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={[styles.bookerSectionHeading, { color: theme.goldDark }]}>
                      Referrer Details
                    </Text>
                    {isAuthenticated ? (
                      <View style={[styles.autofillBadge, { backgroundColor: '#dcfce7' }]}>
                        <Ionicons name="checkmark-circle" size={11} color="#16a34a" style={{ marginRight: 2 }} />
                        <Text style={[styles.autofillBadgeText, { color: '#16a34a' }]}>Verified</Text>
                      </View>
                    ) : (
                      <View style={[styles.autofillBadge, { backgroundColor: theme.goldSoft }]}>
                        <Text style={[styles.autofillBadgeText, { color: theme.goldDark }]}>5% Commission</Text>
                      </View>
                    )}
                  </View>

                  <TextInput
                    style={[
                      styles.inputField,
                      { backgroundColor: theme.cardBg, borderColor: theme.border, color: theme.textPrimary },
                      isAuthenticated && { opacity: 0.85 },
                    ]}
                    placeholder="Your Full Name"
                    placeholderTextColor={theme.textMuted}
                    editable={!isAuthenticated}
                    value={bookerName}
                    onChangeText={setBookerName}
                  />

                  <View style={styles.fieldRow}>
                    <TextInput
                      style={[
                        styles.inputField,
                        { flex: 1, backgroundColor: theme.cardBg, borderColor: theme.border, color: theme.textPrimary },
                        isAuthenticated && { opacity: 0.85 },
                      ]}
                      placeholder="Your 10-Digit Mobile"
                      placeholderTextColor={theme.textMuted}
                      keyboardType="phone-pad"
                      maxLength={10}
                      editable={!isAuthenticated}
                      value={bookerPhone}
                      onChangeText={setBookerPhone}
                    />

                    <TextInput
                      style={[
                        styles.inputField,
                        { flex: 1, backgroundColor: theme.cardBg, borderColor: theme.border, color: theme.textPrimary },
                        isAuthenticated && { opacity: 0.85 },
                      ]}
                      placeholder="Email (Optional)"
                      placeholderTextColor={theme.textMuted}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      editable={!isAuthenticated}
                      value={bookerEmail}
                      onChangeText={setBookerEmail}
                    />
                  </View>
                </View>
              )}

              {/* 📋 PATIENT FIELDS */}
              <TextInput
                style={[styles.inputField, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                placeholder="Patient Full Name *"
                placeholderTextColor={theme.textMuted}
                value={patientName}
                onChangeText={setPatientName}
              />

              <View style={styles.fieldRow}>
                <TextInput
                  style={[styles.inputField, { flex: 1.5, backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                  placeholder="Patient 10-Digit Mobile *"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={patientPhone}
                  onChangeText={setPatientPhone}
                />

                <TextInput
                  style={[styles.inputField, { flex: 1, backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                  placeholder="Age *"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="numeric"
                  maxLength={3}
                  value={patientAge}
                  onChangeText={setPatientAge}
                />
              </View>

              {/* Gender Pills */}
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
                      {g === 'male' ? 'Male' : g === 'female' ? 'Female' : 'Other'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Address */}
              <TextInput
                style={[styles.inputField, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                placeholder="Village / Town / City *"
                placeholderTextColor={theme.textMuted}
                value={patientAddress}
                onChangeText={setPatientAddress}
              />

              {/* Symptoms */}
              <TextInput
                style={[
                  styles.inputFieldMultiline,
                  { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary },
                ]}
                placeholder="Medical Symptoms / Reason for Consultation *"
                placeholderTextColor={theme.textMuted}
                multiline
                numberOfLines={2}
                value={symptoms}
                onChangeText={setSymptoms}
              />

              {/* Date & Slot */}
              <View style={styles.fieldRow}>
                <TouchableOpacity
                  style={[styles.dateSelector, { flex: 1, backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={14} color={theme.primary} style={{ marginRight: 6 }} />
                  <Text style={[styles.dateText, { color: theme.textPrimary }]}>{appointmentDate}</Text>
                </TouchableOpacity>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.slotsRow}>
                  {TIME_SLOTS.slice(0, 4).map((slot) => {
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
              </View>

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

              {/* Urgency Pills (Single Row) */}
              <View style={styles.urgencyRow}>
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

              {/* Action Buttons: Cancel & Confirm */}
              <View style={styles.modalActionRow}>
                <TouchableOpacity
                  style={[styles.cancelModalBtn, { borderColor: theme.border }]}
                  onPress={closeDoctorModal}
                >
                  <Text style={[styles.cancelModalBtnText, { color: theme.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.confirmSubmitBtn, { flex: 2, backgroundColor: theme.goldDark }]}
                  onPress={handleBookingSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons name="paper-plane" size={15} color="#ffffff" style={{ marginRight: 6 }} />
                      <Text style={styles.confirmSubmitBtnText}>Confirm Booking</Text>
                    </>
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 8,
    paddingTop: Platform.OS === 'android' ? 38 : 44,
    borderBottomWidth: 1,
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  loginBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  langSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  langPill: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  langPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  hospitalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    gap: 3,
  },
  hospitalBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
    marginVertical: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    height: 38,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
  },
  deptFilterRow: {
    paddingHorizontal: 10,
    gap: 6,
    paddingBottom: 6,
  },
  deptPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
  },
  deptPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  anyDoctorCard: {
    marginHorizontal: 10,
    marginVertical: 6,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  fastBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
  },
  fastBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  card: {
    marginHorizontal: 10,
    marginBottom: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    gap: 10,
  },
  avatarCircleSmall: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTextSmall: {
    fontSize: 16,
    fontWeight: '800',
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    gap: 3,
  },
  tagBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    gap: 2,
  },
  ratingText: {
    color: '#92400e',
    fontSize: 9.5,
    fontWeight: '800',
  },
  specialty: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  feeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 3,
  },
  feeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  bookBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 8,
    marginTop: 8,
  },
  bookBtnText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '800',
  },
  stateCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  stateText: {
    fontSize: 12,
    marginTop: 8,
  },
  errorBox: {
    margin: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 11.5,
    marginVertical: 6,
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '90%',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 14.5,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
  },
  closeBtn: {
    padding: 4,
  },
  modalScroll: {
    paddingVertical: 8,
  },
  bookingToggleContainer: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
    gap: 4,
  },
  toggleSegment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 6,
  },
  toggleSegmentText: {
    fontSize: 11,
    fontWeight: '600',
  },
  bookerCard: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
  },
  bookerSectionHeading: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  autofillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  autofillBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  inputField: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    marginBottom: 6,
  },
  inputFieldMultiline: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    minHeight: 52,
    textAlignVertical: 'top',
    marginBottom: 6,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  genderRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  genderPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  genderPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
  },
  dateText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  slotsRow: {
    gap: 5,
    paddingBottom: 6,
  },
  slotChip: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  slotChipText: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  urgencyRow: {
    flexDirection: 'row',
    gap: 6,
    marginVertical: 6,
  },
  urgencyPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  urgencyPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    marginBottom: 16,
  },
  cancelModalBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  cancelModalBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  confirmSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  confirmSubmitBtnText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '800',
  },
});
