import React, { useState, useEffect } from 'react';
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
  RefreshControl,
  BackHandler,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

import { appointmentsApi } from '../api/appointments';
import { doctorsApi } from '../api/doctors';
import { Appointment, Doctor } from '../types';
import { interactionUtils } from '../utils/interactionUtils';
import { ageToDob } from '../utils/ageUtils';
import { makeNIC } from '../utils/nicMaker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { DropdownPicker } from '../components/DropdownPicker';
import { GENDERS, DEPARTMENTS } from '../utils/constants';

/** Format an ISO date string or plain date string to DD/MM/YYYY */
const formatDate = (dateStr?: string): string => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
};

/** Derive doctor display name from appointment fields */
const getDoctorName = (item: Appointment, doctors: Doctor[]): string => {
  if (item.doctorName) return item.doctorName;
  if (item.doctor?.firstName || item.doctor?.lastName)
    return `${item.doctor.firstName || ''} ${item.doctor.lastName || ''}`.trim();
  const matched = doctors.find(d => d._id === item.doctorId);
  if (matched) return matched.name || `${matched.firstName || ''} ${matched.lastName || ''}`.trim();
  return 'Assigned Physician';
};

export const AppointmentsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Derive unique past patient list for autocomplete
  const previousPatients = React.useMemo(() => {
    const map = new Map<string, {
      name: string;
      phone: string;
      age: string;
      gender: 'Male' | 'Female' | 'Other' | 'Others';
      address: string;
      department?: string;
    }>();

    appointments.forEach((appt) => {
      const pName = (appt.name || appt.patientName || '').trim();
      if (pName && !map.has(pName.toLowerCase())) {
        map.set(pName.toLowerCase(), {
          name: pName,
          phone: appt.phone || appt.patientPhone || '',
          age: appt.age?.toString() || appt.patientAge?.toString() || '',
          gender: (appt.gender || appt.patientGender || 'Male') as any,
          address: appt.address || appt.patientAddress || '',
          department: appt.department,
        });
      }
    });

    return Array.from(map.values());
  }, [appointments]);

  // New Appointment Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');

  // Autocomplete suggestions for returning patients
  const patientSuggestions = React.useMemo(() => {
    const query = newPatientName.trim().toLowerCase();
    if (!query || query.length < 1) return [];
    return previousPatients
      .filter((p) => p.name.toLowerCase().includes(query) && p.name.toLowerCase() !== query)
      .slice(0, 4);
  }, [previousPatients, newPatientName]);
  const [newPatientPhone, setNewPatientPhone] = useState('');
  const [newPatientAge, setNewPatientAge] = useState('');
  const [newPatientGender, setNewPatientGender] = useState('Male');
  const [newDepartment, setNewDepartment] = useState('Pediatrics');
  const [newAddress, setNewAddress] = useState('');
  const [newProfession, setNewProfession] = useState('');
  const [newHasVisited, setNewHasVisited] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [newApptDate, setNewApptDate] = useState(new Date().toISOString().split('T')[0]);
  const [newSlotTime, setNewSlotTime] = useState('10:00 AM');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [newPrice, setNewPrice] = useState('');
  const [newSymptoms, setNewSymptoms] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);

  // Reschedule Modal State
  const [rescheduleModalAppt, setRescheduleModalAppt] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleSlot, setRescheduleSlot] = useState('');
  const [showRescheduleDatePicker, setShowRescheduleDatePicker] = useState(false);

  // Edit Appointment Modal State
  const [editModalAppt, setEditModalAppt] = useState<Appointment | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAge, setEditAge] = useState('');
  const [editGender, setEditGender] = useState('Male');
  const [editAddress, setEditAddress] = useState('');
  const [editDoctorId, setEditDoctorId] = useState('');
  const [editDepartment, setEditDepartment] = useState('General Medicine');
  const [editDate, setEditDate] = useState('');
  const [editSlot, setEditSlot] = useState('10:00 AM');
  const [editPrice, setEditPrice] = useState('500');
  const [editPaymentStatus, setEditPaymentStatus] = useState('Due');
  const [editStatus, setEditStatus] = useState('Pending');
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [isUpdatingAppt, setIsUpdatingAppt] = useState(false);

  const openEditModal = (item: Appointment) => {
    interactionUtils.playClick();
    setEditModalAppt(item);
    setEditName(item.name || item.patientName || '');
    setEditPhone(item.phone || item.patientPhone || '');
    setEditAge(item.age?.toString() || item.patientAge?.toString() || '');
    setEditGender((item.gender || item.patientGender || 'Male') as any);
    setEditAddress(item.address || item.patientAddress || '');
    setEditDoctorId(item.doctorId || (doctors[0]?._id ?? ''));
    setEditDepartment(item.department || 'General Medicine');
    const dStr = item.appointmentDate || (item.appointment_date ? item.appointment_date.split('T')[0] : new Date().toISOString().split('T')[0]);
    setEditDate(dStr);
    setEditSlot(item.slotTime || '10:00 AM');
    const matched = doctors.find((d) => d._id === item.doctorId);
    const fee = (item.price && Number(item.price) > 0) ? item.price : (matched?.visitingFee || matched?.consultationFee || 500);
    setEditPrice(fee.toString());
    setEditPaymentStatus(item.paymentStatus || 'Due');
    setEditStatus(item.status || 'Pending');
  };

  const handleSaveEditAppointment = async () => {
    if (!editModalAppt) return;
    const cleanPhone = editPhone.trim().replace(/[^0-9]/g, '');
    if (!editName.trim()) {
      Alert.alert('Validation Error', 'Patient name is required.');
      return;
    }
    if (!/^[0-9]{10}$/.test(cleanPhone)) {
      Alert.alert('Validation Error', 'Phone number must be exactly 10 digits.');
      return;
    }
    if (editAge) {
      const a = Number(editAge);
      if (isNaN(a) || a < 0 || a > 150) {
        Alert.alert('Validation Error', 'Age must be between 0 and 150 years.');
        return;
      }
    }
    if (editDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const chosen = new Date(editDate);
      chosen.setHours(0, 0, 0, 0);
      if (chosen < today) {
        Alert.alert('Validation Error', 'Appointment date cannot be in the past.');
        return;
      }
    }

    try {
      setIsUpdatingAppt(true);
      const payload: any = {
        name: editName.trim(),
        patientName: editName.trim(),
        phone: editPhone.trim(),
        patientPhone: editPhone.trim(),
        age: editAge ? Number(editAge) : undefined,
        patientAge: editAge ? Number(editAge) : undefined,
        gender: editGender,
        patientGender: editGender,
        address: editAddress.trim(),
        patientAddress: editAddress.trim(),
        doctorId: editDoctorId,
        department: editDepartment,
        appointment_date: new Date(editDate).toISOString(),
        appointmentDate: editDate,
        slotTime: editSlot,
        price: editPrice ? Number(editPrice) : 500,
        paymentStatus: editPaymentStatus,
        status: editStatus,
      };

      const res = await appointmentsApi.update(editModalAppt._id, payload);
      interactionUtils.playSuccess();

      const updatedItem: Appointment = res.appointment || {
        ...editModalAppt,
        ...payload,
      };

      setAppointments((prev) =>
        prev.map((a) => (a._id === editModalAppt._id ? { ...a, ...updatedItem } : a))
      );

      setEditModalAppt(null);
      Alert.alert('Success', 'Appointment updated successfully!');
    } catch (e: any) {
      Alert.alert('Update Failed', e.response?.data?.message || e.message || 'Could not update appointment');
    } finally {
      setIsUpdatingAppt(false);
    }
  };

  const handleBookNewForPatient = (item: Appointment) => {
    interactionUtils.playClick();
    setNewPatientName(item.name || item.patientName || '');
    setNewPatientPhone(item.phone || item.patientPhone || '');
    setNewPatientAge(item.age?.toString() || item.patientAge?.toString() || '');
    setNewPatientGender((item.gender || item.patientGender || 'Male') as any);
    setNewAddress(item.address || item.patientAddress || '');
    setNewDepartment(item.department || 'Pediatrics');
    if (item.doctorId) setSelectedDoctorId(item.doctorId);
    setNewHasVisited(true);
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 7);
    setNewApptDate(nextDate.toISOString().split('T')[0]);
    setStep(2); // Seamlessly jump to Step 2 for quick booking without re-entering demographics
    setIsCreateModalOpen(true);
  };

  const fetchData = async () => {
    try {
      const [appts, docs] = await Promise.all([
        appointmentsApi.getAll(),
        doctorsApi.getAll(),
      ]);
      setAppointments(Array.isArray(appts) ? appts : []);
      setDoctors(Array.isArray(docs) ? docs : []);
      if (Array.isArray(docs) && docs.length > 0) {
        setSelectedDoctorId(docs[0]._id);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || e?.message || 'Failed to load appointments:');
      console.warn('Failed to load appointments:', e);
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

  // Hardware Back Button handler for Android to dismiss active modals
  useEffect(() => {
    const onBackPress = () => {
      if (isCreateModalOpen) {
        setIsCreateModalOpen(false);
        setStep(1);
        return true;
      }
      if (editModalAppt) {
        setEditModalAppt(null);
        return true;
      }
      if (rescheduleModalAppt) {
        setRescheduleModalAppt(null);
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [isCreateModalOpen, editModalAppt, rescheduleModalAppt]);

  // Keep selected doctor matching the chosen department
  useEffect(() => {
    if (newDepartment && doctors.length > 0) {
      const filtered = doctors.filter((doc) => {
        const dept = (doc.doctorDepartment || doc.department || (doc as any).specialization || '').toLowerCase();
        return dept.includes(newDepartment.toLowerCase()) || newDepartment.toLowerCase().includes(dept);
      });
      if (filtered.length > 0) {
        if (!filtered.some((d) => d._id === selectedDoctorId)) {
          setSelectedDoctorId(filtered[0]._id);
          setNewPrice(filtered[0].visitingFee ? filtered[0].visitingFee.toString() : '500');
        }
      }
    }
  }, [newDepartment, doctors]);

  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (!text.trim()) {
      fetchData();
      return;
    }
    try {
      const results = await appointmentsApi.search(text.trim());
      setAppointments(Array.isArray(results) ? results : []);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || e?.message || 'Search failed:');
      console.warn('Search failed:', e);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await appointmentsApi.updateStatus(id, newStatus);
      if (newStatus === 'Completed') {
        interactionUtils.playSuccess();
        interactionUtils.triggerNotification('Appointment Completed', `Marked appointment as completed successfully!`);
      } else {
        interactionUtils.playClick();
      }
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setAppointments((prev) =>
        prev.map((a) => (a._id === id ? { ...a, status: newStatus as any } : a))
      );
      Alert.alert('Status Updated', `Appointment marked as ${newStatus}`);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || e?.message || 'Could not update status');
    }
  };

  const handlePaymentStatusChange = async (id: string, newPaymentStatus: string) => {
    const currentAppt = appointments.find((a) => a._id === id);
    if (
      currentAppt?.status === 'Completed' &&
      (currentAppt.paymentStatus === 'Paid' || currentAppt.paymentStatus === 'Accepted') &&
      newPaymentStatus === 'Due'
    ) {
      Alert.alert('Payment Settled', 'A completed appointment that is already Paid cannot be marked as Due.');
      return;
    }

    const validStatus = newPaymentStatus as Appointment['paymentStatus'];
    try {
      await appointmentsApi.update(id, { paymentStatus: validStatus });
      interactionUtils.playClick();
      setAppointments((prev) =>
        prev.map((a) => (a._id === id ? { ...a, paymentStatus: validStatus } : a))
      );
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || e?.message || 'Could not update payment status');
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Confirm Delete', 'Are you sure you want to delete this appointment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await appointmentsApi.delete(id);
            setAppointments((prev) => prev.filter((a) => a._id !== id));
          } catch (e: any) {
            Alert.alert('Error', e?.response?.data?.message || e?.message || 'Failed to delete appointment');
          }
        },
      },
    ]);
  };

  const handleCreateAppointment = async () => {
    const cleanPhone = newPatientPhone.trim().replace(/[^0-9]/g, '');
    if (!newPatientName.trim()) {
      Alert.alert('Validation Error', 'Please enter patient name.');
      return;
    }
    if (!/^[0-9]{10}$/.test(cleanPhone)) {
      Alert.alert('Validation Error', 'Patient phone number must be exactly 10 digits.');
      return;
    }
    if (newPatientAge) {
      const a = Number(newPatientAge);
      if (isNaN(a) || a < 0 || a > 150) {
        Alert.alert('Validation Error', 'Age must be between 0 and 150 years.');
        return;
      }
    }
    if (newApptDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const chosen = new Date(newApptDate);
      chosen.setHours(0, 0, 0, 0);
      if (chosen < today) {
        Alert.alert('Validation Error', 'Appointment date cannot be in the past.');
        return;
      }
    }
    if (!selectedDoctorId) {
      Alert.alert('Validation Error', 'Please select a doctor.');
      return;
    }

    setIsSubmitting(true);
    try {
      const calculatedNic = makeNIC(cleanPhone, newPatientAge);
      const calculatedDob = ageToDob(newPatientAge);

      const created = await appointmentsApi.create({
        patientName: newPatientName.trim(),
        name: newPatientName.trim(),
        patientPhone: cleanPhone,
        phone: cleanPhone,
        patientAge: newPatientAge ? parseInt(newPatientAge, 10) : undefined,
        age: newPatientAge ? parseInt(newPatientAge, 10) : undefined,
        nic: calculatedNic,
        dob: calculatedDob,
        patientGender: newPatientGender,
        gender: newPatientGender,
        department: newDepartment,
        patientAddress: newAddress.trim(),
        address: newAddress.trim(),
        profession: newProfession.trim(),
        hasVisited: newHasVisited,
        doctorId: selectedDoctorId,
        price: newPrice ? parseFloat(newPrice) : undefined,
        appointmentDate: newApptDate,
        appointment_date: new Date(newApptDate).toISOString(),
        slotTime: newSlotTime,
        symptoms: newSymptoms ? newSymptoms.split(',').map((s) => s.trim()) : [],
      });

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setAppointments((prev) => [created, ...prev]);
      setIsCreateModalOpen(false);
      setStep(1);
      setNewPatientName('');
      setNewPatientPhone('');
      setNewPatientAge('');
      setNewPatientGender('Male');
      setNewAddress('');
      setNewProfession('');
      setNewPrice('');
      setNewSymptoms('');
      
      interactionUtils.playSuccess();
      interactionUtils.triggerNotification('Appointment Booked', `Successfully booked ${newPatientName} with Dr. ${doctors.find(d => d._id === selectedDoctorId)?.name}`);
      Alert.alert('Success', 'Appointment booked successfully!');
    } catch (e: any) {
      Alert.alert('Booking Error', e.response?.data?.message || 'Failed to create appointment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmReschedule = async () => {
    if (!rescheduleModalAppt) return;
    if (rescheduleDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const chosen = new Date(rescheduleDate);
      chosen.setHours(0, 0, 0, 0);
      if (chosen < today) {
        Alert.alert('Validation Error', 'Appointments cannot be rescheduled to a past date.');
        return;
      }
    }
    try {
      await appointmentsApi.reschedule(rescheduleModalAppt._id, {
        appointmentDate: rescheduleDate,
        slotTime: rescheduleSlot,
      });
      setAppointments((prev) =>
        prev.map((a) =>
          a._id === rescheduleModalAppt._id
            ? { ...a, appointmentDate: rescheduleDate, slotTime: rescheduleSlot, status: 'Rescheduled' }
            : a
        )
      );
      setRescheduleModalAppt(null);
      interactionUtils.playSuccess();
      interactionUtils.triggerNotification('Appointment Rescheduled', 'The appointment was rescheduled successfully.');
      Alert.alert('Success', 'Appointment rescheduled successfully');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || e?.message || 'Failed to reschedule appointment');
    }
  };

  const filteredAppointments = appointments.filter((a) => {
    if (statusFilter !== 'All' && a.status !== statusFilter) return false;
    return true;
  });

  return (
    <View style={styles.container}>
      {/* Search & Top Action Bar */}
      <View style={styles.topBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search patient, phone, token..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={handleSearch}
        />
        <TouchableOpacity
          style={styles.bookBtn}
          onPress={() => setIsCreateModalOpen(true)}
        >
          <Ionicons name="add" size={16} color="#ffffff" style={{ marginRight: 4 }} />
          <Text style={styles.bookBtnText}>Book</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Chips with Icons */}
      <View style={styles.filterRow}>
        {[
          { label: 'All', icon: 'list' },
          { label: 'Pending', icon: 'hourglass-outline' },
          { label: 'Completed', icon: 'checkmark-circle-outline' },
          { label: 'Rescheduled', icon: 'time-outline' },
          { label: 'Cancelled', icon: 'close-circle-outline' },
        ].map((item) => (
          <TouchableOpacity
            key={item.label}
            style={[styles.filterChip, statusFilter === item.label && styles.filterChipActive]}
            onPress={() => setStatusFilter(item.label)}
          >
            <Ionicons
              name={item.icon as any}
              size={12}
              color={statusFilter === item.label ? '#ffffff' : '#64748b'}
              style={{ marginRight: 4 }}
            />
            <Text
              style={[
                styles.filterChipText,
                statusFilter === item.label && styles.filterChipTextActive,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Appointments List */}
      {isLoading ? (
        <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredAppointments}
          keyExtractor={(item) => item._id}
          refreshing={isRefreshing}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
          initialNumToRender={10}
          maxToRenderPerBatch={5}
          windowSize={11}
          removeClippedSubviews={true}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No appointments found</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.patientName}>{item.name || item.patientName}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="call-outline" size={12} color="#64748b" style={{ marginRight: 3 }} />
                      <Text style={styles.contactInfo}>{item.phone || item.patientPhone || 'N/A'}</Text>
                    </View>
                    {(item.age || item.patientAge) ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="person-outline" size={11} color="#64748b" style={{ marginRight: 2 }} />
                        <Text style={styles.contactInfo}>{item.age || item.patientAge}y</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    item.status === 'Completed'
                      ? styles.statusCompleted
                      : item.status === 'Cancelled'
                      ? styles.statusCancelled
                      : styles.statusPending,
                  ]}
                >
                  <Ionicons
                    name={
                      item.status === 'Completed'
                        ? 'checkmark-circle'
                        : item.status === 'Cancelled'
                        ? 'close-circle'
                        : 'hourglass-outline'
                    }
                    size={11}
                    color={
                      item.status === 'Completed'
                        ? '#059669'
                        : item.status === 'Cancelled'
                        ? '#dc2626'
                        : '#d97706'
                    }
                    style={{ marginRight: 3 }}
                  />
                  <Text style={styles.statusBadgeText}>{item.status}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="person-circle-outline" size={14} color="#64748b" style={{ marginRight: 4, marginTop: 1 }} />
                <Text style={styles.detailLabel}>Doctor:</Text>
                <Text style={styles.detailValue}>
                  {getDoctorName(item, doctors)}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={14} color="#64748b" style={{ marginRight: 4, marginTop: 1 }} />
                <Text style={styles.detailLabel}>Schedule:</Text>
                <Text style={styles.detailValue}>
                  {formatDate(item.appointmentDate || item.appointment_date)}
                  {item.slotTime ? ` at ${item.slotTime}` : ''}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="cash-outline" size={14} color={colors.gold} style={{ marginRight: 4, marginTop: 1 }} />
                <Text style={styles.detailLabel}>Fee / Price:</Text>
                <Text style={[styles.detailValue, { color: colors.goldDark, fontWeight: '700' }]}>
                  ₹{(item.price && Number(item.price) > 0) ? Number(item.price) : (doctors.find((d) => d._id === item.doctorId)?.visitingFee || 500)}
                </Text>
              </View>

              {item.symptoms && item.symptoms.length > 0 && (
                <View style={styles.symptomsContainer}>
                  {item.symptoms.map((s, idx) => (
                    <View key={idx} style={styles.symptomTag}>
                      <Text style={styles.symptomText}>{s}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Action Buttons */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 }}>
                <View style={{ flex: 1 }}>
                  {item.status === 'Completed' && (item.paymentStatus === 'Paid' || item.paymentStatus === 'Accepted') ? (
                    <View style={styles.paidBadgeBox}>
                      <Ionicons name="checkmark-done-circle" size={16} color="#059669" />
                      <Text style={styles.paidBadgeText}>Paid & Settled</Text>
                    </View>
                  ) : (
                    <DropdownPicker 
                      label="Payment" 
                      value={item.paymentStatus || 'Due'} 
                      options={[{label:'Paid', value:'Paid'}, {label:'Due', value:'Due'}]} 
                      onSelect={(v) => handlePaymentStatusChange(item._id, v)} 
                    />
                  )}
                </View>
                <TouchableOpacity 
                  style={[
                    styles.rxIconBtn,
                    item.prescriptionId
                      ? (item.prescriptionComplete ? styles.rxBtnComplete : styles.rxBtnSaved)
                      : styles.rxBtnNew,
                  ]}
                  onPress={() => {
                    navigation.navigate('Prescriptions', { appointmentId: item._id });
                  }}
                >
                  <Ionicons
                    name="medical-outline"
                    size={20}
                    color={item.prescriptionId ? (item.prescriptionComplete ? '#059669' : '#b45309') : '#dc2626'}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.cardActions}>
                {/* Always provide Edit option */}
                <TouchableOpacity
                  style={[styles.cardBtn, styles.btnEdit]}
                  onPress={() => openEditModal(item)}
                >
                  <Ionicons name="create-outline" size={14} color="#0284c7" />
                  <Text style={styles.btnTextEdit}> Edit</Text>
                </TouchableOpacity>

                {item.status !== 'Completed' ? (
                  <>
                    <TouchableOpacity
                      style={[styles.cardBtn, styles.btnSuccess]}
                      onPress={() => handleStatusChange(item._id, 'Completed')}
                    >
                      <Ionicons name="checkmark-done" size={14} color="#059669" />
                      <Text style={styles.btnTextSuccess}> Done</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.cardBtn, styles.btnSecondary]}
                      onPress={() => {
                        setRescheduleModalAppt(item);
                        setRescheduleDate(item.appointmentDate || item.appointment_date?.split('T')[0] || '');
                        setRescheduleSlot(item.slotTime || '11:00 AM');
                      }}
                    >
                      <Ionicons name="calendar-outline" size={14} color="#475569" />
                      <Text style={styles.btnTextSecondary}> Reschedule</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    style={[styles.cardBtn, styles.btnNewAppt]}
                    onPress={() => handleBookNewForPatient(item)}
                  >
                    <Ionicons name="repeat" size={14} color="#b45309" />
                    <Text style={styles.btnTextNewAppt}> Repeat Appt</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.cardBtn, styles.btnDanger, { flex: 0, paddingHorizontal: 12 }]}
                  onPress={() => handleDelete(item._id)}
                >
                  <Ionicons name="trash-outline" size={14} color="#dc2626" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Book Appointment Modal */}
      <Modal visible={isCreateModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Book New Appointment (Step {step}/2)</Text>

            {step === 1 ? (
              <>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Patient Full Name"
                  placeholderTextColor="#94a3b8"
                  value={newPatientName}
                  onChangeText={setNewPatientName}
                />

                {patientSuggestions.length > 0 && (
                  <View style={styles.suggestionsBox}>
                    <Text style={styles.suggestionsHeading}>
                      Returning Patient Found (Tap to Auto-fill):
                    </Text>
                    {patientSuggestions.map((pat, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={styles.suggestionItem}
                        onPress={() => {
                          interactionUtils.playClick();
                          setNewPatientName(pat.name);
                          if (pat.phone) setNewPatientPhone(pat.phone);
                          if (pat.age) setNewPatientAge(pat.age);
                          if (pat.gender) setNewPatientGender(pat.gender);
                          if (pat.address) setNewAddress(pat.address);
                          if (pat.department) setNewDepartment(pat.department);
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons name="person-circle" size={15} color={colors.primary} />
                            <Text style={styles.suggestionName}>{pat.name}</Text>
                            <Text style={styles.suggestionTag}>
                              {pat.gender?.slice(0, 1)} / {pat.age ? `${pat.age}y` : '-'}
                            </Text>
                          </View>
                          <Text style={styles.suggestionMeta}>
                            {pat.phone ? `📞 ${pat.phone}` : ''} {pat.address ? `• 📍 ${pat.address}` : ''}
                          </Text>
                        </View>
                        <Ionicons name="arrow-down-circle" size={20} color={colors.gold} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <TextInput
                  style={styles.modalInput}
                  placeholder="Phone Number"
                  placeholderTextColor="#94a3b8"
                  keyboardType="phone-pad"
                  value={newPatientPhone}
                  onChangeText={setNewPatientPhone}
                />

                <View style={{ flexDirection: 'row', gap: 10, zIndex: 10 }}>
                  <TextInput
                    style={[styles.modalInput, { flex: 1 }]}
                    placeholder="Age"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    value={newPatientAge}
                    onChangeText={setNewPatientAge}
                  />
                  <View style={{ flex: 1 }}>
                    <DropdownPicker 
                      label="" 
                      placeholder="Gender" 
                      value={newPatientGender} 
                      options={GENDERS} 
                      onSelect={setNewPatientGender} 
                    />
                  </View>
                </View>

                <View style={{ zIndex: 9 }}>
                  <DropdownPicker 
                    label="" 
                    placeholder="Department" 
                    value={newDepartment} 
                    options={DEPARTMENTS} 
                    onSelect={setNewDepartment} 
                  />
                </View>

                <TextInput
                  style={styles.modalInput}
                  placeholder="Address"
                  placeholderTextColor="#94a3b8"
                  value={newAddress}
                  onChangeText={setNewAddress}
                />

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.modalBtnCancel]}
                    onPress={() => { setIsCreateModalOpen(false); setStep(1); }}
                  >
                    <Text style={styles.modalBtnCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.modalBtnConfirm]}
                    onPress={() => {
                      const cleanP = newPatientPhone.trim().replace(/[^0-9]/g, '');
                      if (!newPatientName.trim()) {
                        Alert.alert('Validation Error', 'Please enter patient name.');
                        return;
                      }
                      if (!/^[0-9]{10}$/.test(cleanP)) {
                        Alert.alert('Validation Error', 'Phone number must be exactly 10 digits.');
                        return;
                      }
                      if (newPatientAge) {
                        const a = Number(newPatientAge);
                        if (isNaN(a) || a < 0 || a > 150) {
                          Alert.alert('Validation Error', 'Age must be between 0 and 150 years.');
                          return;
                        }
                      }
                      setStep(2);
                    }}
                  >
                    <Text style={styles.modalBtnConfirmText}>Next</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.modalLabel}>Select Doctor ({newDepartment})</Text>
                <View style={styles.doctorPickerContainer}>
                  {(() => {
                    const filtered = doctors.filter((doc) => {
                      if (!newDepartment) return true;
                      const dept = (doc.doctorDepartment || doc.department || (doc as any).specialization || '').toLowerCase();
                      return dept.includes(newDepartment.toLowerCase()) || newDepartment.toLowerCase().includes(dept);
                    });
                    const listToRender = filtered.length > 0 ? filtered : doctors;
                    return listToRender.map((doc) => (
                      <TouchableOpacity
                        key={doc._id}
                        style={[
                          styles.doctorChip,
                          selectedDoctorId === doc._id && styles.doctorChipActive,
                        ]}
                        onPress={() => {
                          setSelectedDoctorId(doc._id);
                          setNewPrice(doc.visitingFee ? doc.visitingFee.toString() : '500');
                        }}
                      >
                        <Text
                          style={[
                            styles.doctorChipText,
                            selectedDoctorId === doc._id && styles.doctorChipTextActive,
                          ]}
                        >
                          {doc.name}
                        </Text>
                      </TouchableOpacity>
                    ));
                  })()}
                </View>

            <TextInput
              style={styles.modalInput}
              placeholder="Consultation Fee (₹)"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              value={newPrice}
              onChangeText={setNewPrice}
            />

            {/* Quick Date Chips */}
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, marginBottom: 4 }}>Quick Date Selection</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {[
                { label: 'Today', days: 0 },
                { label: 'Tomorrow', days: 1 },
                { label: '+7 Days', days: 7 },
                { label: '+14 Days', days: 14 },
                { label: '+1 Mo', days: 30 },
              ].map((p) => (
                <TouchableOpacity
                  key={p.label}
                  style={{
                    backgroundColor: colors.primarySoft,
                    borderColor: colors.primaryMuted,
                    borderWidth: 1,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 8,
                  }}
                  onPress={() => {
                    interactionUtils.playClick();
                    const d = new Date();
                    d.setDate(d.getDate() + p.days);
                    setNewApptDate(d.toISOString().split('T')[0]);
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
              <TouchableOpacity
                style={[styles.modalInput, { flex: 1, justifyContent: 'center' }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={{ color: newApptDate ? '#0f172a' : '#94a3b8' }}>
                  {newApptDate || 'Select Date'}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={new Date(newApptDate || Date.now())}
                  mode="date"
                  display="default"
                  onChange={(event, date) => {
                    setShowDatePicker(Platform.OS === 'ios');
                    if (date) setNewApptDate(date.toISOString().split('T')[0]);
                  }}
                />
              )}

              <TouchableOpacity
                style={[styles.modalInput, { flex: 1, justifyContent: 'center' }]}
                onPress={() => setShowTimePicker(true)}
              >
                <Text style={{ color: newSlotTime ? '#0f172a' : '#94a3b8' }}>
                  {newSlotTime || 'Select Time'}
                </Text>
              </TouchableOpacity>
              {showTimePicker && (
                <DateTimePicker
                  value={new Date()}
                  mode="time"
                  display="default"
                  onChange={(event, date) => {
                    setShowTimePicker(Platform.OS === 'ios');
                    if (date) {
                      const hours = date.getHours();
                      const minutes = date.getMinutes();
                      const ampm = hours >= 12 ? 'PM' : 'AM';
                      const formattedHours = hours % 12 || 12;
                      const formattedMins = minutes < 10 ? `0${minutes}` : minutes;
                      setNewSlotTime(`${formattedHours}:${formattedMins} ${ampm}`);
                    }
                  }}
                />
              )}
            </View>

            {/* Quick Slot Chips */}
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, marginBottom: 4 }}>Quick Slot Time</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {['09:30 AM', '11:00 AM', '02:30 PM', '05:30 PM', '07:00 PM'].map((s) => (
                <TouchableOpacity
                  key={s}
                  style={{
                    backgroundColor: newSlotTime === s ? colors.goldSoft : '#f1f5f9',
                    borderColor: newSlotTime === s ? colors.goldBorder : '#cbd5e1',
                    borderWidth: 1,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 8,
                  }}
                  onPress={() => {
                    interactionUtils.playClick();
                    setNewSlotTime(s);
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: newSlotTime === s ? colors.goldDark : '#475569' }}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="Symptoms (comma separated)"
              placeholderTextColor="#94a3b8"
              value={newSymptoms}
              onChangeText={setNewSymptoms}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setStep(1)}
              >
                <Text style={styles.modalBtnCancelText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnConfirm]}
                onPress={handleCreateAppointment}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.modalBtnConfirmText}>Book Now</Text>
                )}
              </TouchableOpacity>
            </View>
            </>
            )}
          </View>
        </View>
      </Modal>

      {/* Reschedule Modal */}
      <Modal visible={!!rescheduleModalAppt} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reschedule Appointment</Text>
            <Text style={styles.modalSubtitle}>
              Patient: {rescheduleModalAppt?.name || rescheduleModalAppt?.patientName}
            </Text>

            <Text style={styles.modalLabel}>New Date</Text>
            <TouchableOpacity
              style={[styles.modalInput, { justifyContent: 'center' }]}
              onPress={() => setShowRescheduleDatePicker(true)}
            >
              <Text style={{ color: rescheduleDate ? '#0f172a' : '#94a3b8' }}>
                {rescheduleDate || 'Select Date'}
              </Text>
            </TouchableOpacity>
            {showRescheduleDatePicker && (
              <DateTimePicker
                value={new Date(rescheduleDate || Date.now())}
                mode="date"
                display="default"
                onChange={(event, date) => {
                  setShowRescheduleDatePicker(Platform.OS === 'ios');
                  if (date) setRescheduleDate(date.toISOString().split('T')[0]);
                }}
              />
            )}

            <Text style={styles.modalLabel}>New Slot Time</Text>
            <TextInput
              style={styles.modalInput}
              value={rescheduleSlot}
              onChangeText={setRescheduleSlot}
              placeholder="10:00 AM"
              placeholderTextColor="#94a3b8"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setRescheduleModalAppt(null)}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnConfirm]}
                onPress={handleConfirmReschedule}
              >
                <Text style={styles.modalBtnConfirmText}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Appointment Modal */}
      <Modal visible={!!editModalAppt} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '92%' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={styles.modalTitle}>Edit Appointment</Text>
              <TouchableOpacity onPress={() => setEditModalAppt(null)}>
                <Ionicons name="close-circle-outline" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={[{ key: 'form' }]}
              keyExtractor={(i) => i.key}
              showsVerticalScrollIndicator={false}
              renderItem={() => (
                <View>
                  <Text style={styles.modalLabel}>Patient Name *</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="Patient Name"
                    placeholderTextColor="#94a3b8"
                  />

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalLabel}>Phone *</Text>
                      <TextInput
                        style={styles.modalInput}
                        value={editPhone}
                        onChangeText={setEditPhone}
                        placeholder="Phone Number"
                        placeholderTextColor="#94a3b8"
                        keyboardType="phone-pad"
                      />
                    </View>
                    <View style={{ width: 80 }}>
                      <Text style={styles.modalLabel}>Age</Text>
                      <TextInput
                        style={styles.modalInput}
                        value={editAge}
                        onChangeText={setEditAge}
                        placeholder="Age"
                        placeholderTextColor="#94a3b8"
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <Text style={styles.modalLabel}>Gender</Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
                    {['Male', 'Female', 'Others'].map((g) => (
                      <TouchableOpacity
                        key={g}
                        style={[
                          styles.doctorChip,
                          editGender === g && { backgroundColor: colors.goldSoft, borderColor: colors.gold },
                        ]}
                        onPress={() => setEditGender(g)}
                      >
                        <Text style={[styles.doctorChipText, editGender === g && { color: colors.goldDark, fontWeight: '700' }]}>
                          {g}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.modalLabel}>Residential Address</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editAddress}
                    onChangeText={setEditAddress}
                    placeholder="Address"
                    placeholderTextColor="#94a3b8"
                  />

                  <Text style={styles.modalLabel}>Assigned Doctor</Text>
                  <View style={styles.doctorPickerContainer}>
                    {doctors.map((doc) => {
                      const isSelected = editDoctorId === doc._id;
                      return (
                        <TouchableOpacity
                          key={doc._id}
                          style={[styles.doctorChip, isSelected && styles.doctorChipActive]}
                          onPress={() => {
                            setEditDoctorId(doc._id);
                            const fee = doc.visitingFee || doc.consultationFee;
                            if (fee !== undefined) {
                              setEditPrice(fee.toString());
                            }
                            const dept = doc.doctorDepartment || doc.department;
                            if (dept) {
                              setEditDepartment(dept);
                            }
                          }}
                        >
                          <Text style={[styles.doctorChipText, isSelected && styles.doctorChipTextActive]}>
                            {doc.name || `Dr. ${doc.firstName || ''} ${doc.lastName || ''}`}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalLabel}>Date</Text>
                      <TouchableOpacity
                        style={[styles.modalInput, { justifyContent: 'center' }]}
                        onPress={() => setShowEditDatePicker(true)}
                      >
                        <Text style={{ color: editDate ? '#0f172a' : '#94a3b8' }}>
                          {editDate || 'Select Date'}
                        </Text>
                      </TouchableOpacity>
                      {showEditDatePicker && (
                        <DateTimePicker
                          value={new Date(editDate || Date.now())}
                          mode="date"
                          display="default"
                          onChange={(event, date) => {
                            setShowEditDatePicker(Platform.OS === 'ios');
                            if (date) setEditDate(date.toISOString().split('T')[0]);
                          }}
                        />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalLabel}>Slot Time</Text>
                      <TextInput
                        style={styles.modalInput}
                        value={editSlot}
                        onChangeText={setEditSlot}
                        placeholder="10:00 AM"
                        placeholderTextColor="#94a3b8"
                      />
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalLabel}>Consultation Fee (₹)</Text>
                      <TextInput
                        style={styles.modalInput}
                        value={editPrice}
                        onChangeText={setEditPrice}
                        placeholder="500"
                        placeholderTextColor="#94a3b8"
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalLabel}>Payment Status</Text>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {['Due', 'Paid'].map((p) => (
                          <TouchableOpacity
                            key={p}
                            style={[
                              styles.doctorChip,
                              { flex: 1, alignItems: 'center' },
                              editPaymentStatus === p && { backgroundColor: p === 'Paid' ? '#ecfdf5' : '#fef2f2', borderColor: p === 'Paid' ? '#059669' : '#dc2626' },
                            ]}
                            onPress={() => setEditPaymentStatus(p)}
                          >
                            <Text style={{ fontSize: 12, fontWeight: '700', color: editPaymentStatus === p ? (p === 'Paid' ? '#059669' : '#dc2626') : '#64748b' }}>
                              {p}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>

                  <Text style={styles.modalLabel}>Appointment Status</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                    {['Pending', 'Accepted', 'Completed', 'Cancelled', 'Rescheduled'].map((st) => (
                      <TouchableOpacity
                        key={st}
                        style={[
                          styles.doctorChip,
                          editStatus === st && { backgroundColor: colors.primarySoft, borderColor: colors.primary },
                        ]}
                        onPress={() => setEditStatus(st)}
                      >
                        <Text style={[styles.doctorChipText, editStatus === st && { color: colors.primary, fontWeight: '800' }]}>
                          {st}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      style={[styles.modalBtn, styles.modalBtnCancel]}
                      onPress={() => setEditModalAppt(null)}
                    >
                      <Text style={styles.modalBtnCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalBtn, styles.modalBtnConfirm]}
                      onPress={handleSaveEditAppointment}
                      disabled={isUpdatingAppt}
                    >
                      {isUpdatingAppt ? (
                        <ActivityIndicator color="#ffffff" size="small" />
                      ) : (
                        <Text style={styles.modalBtnConfirmText}>Save Changes</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  topBar: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0f172a',
  },
  bookBtn: {
    backgroundColor: colors.gold,
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  bookBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginBottom: 8,
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  listContainer: {
    padding: 12,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  contactInfo: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusPending: {
    backgroundColor: '#fef3c7',
  },
  statusCompleted: {
    backgroundColor: '#d1fae5',
  },
  statusCancelled: {
    backgroundColor: '#fee2e2',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1e293b',
  },
  infoRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
    width: 70,
  },
  detailValue: {
    fontSize: 13,
    color: '#1e293b',
    fontWeight: '500',
  },
  symptomsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  symptomTag: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  symptomText: {
    fontSize: 11,
    color: '#475569',
  },
  cardActions: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 8,
    justifyContent: 'flex-end',
  },
  cardBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rxIconBtn: {
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rxBtnNew: {
    backgroundColor: '#fee2e2',
  },
  rxBtnSaved: {
    backgroundColor: '#fef08a',
  },
  rxBtnComplete: {
    backgroundColor: '#d1fae5',
  },
  btnSuccess: {
    backgroundColor: '#ecfdf5',
  },
  btnTextSuccess: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '600',
  },
  btnSecondary: {
    backgroundColor: '#f1f5f9',
  },
  btnTextSecondary: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
  },
  btnDanger: {
    backgroundColor: '#fef2f2',
  },
  btnTextDanger: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '600',
  },
  btnEdit: {
    backgroundColor: '#e0f2fe',
  },
  btnTextEdit: {
    color: '#0284c7',
    fontSize: 12,
    fontWeight: '700',
  },
  btnNewAppt: {
    backgroundColor: '#fef3c7',
  },
  btnTextNewAppt: {
    color: '#b45309',
    fontSize: 12,
    fontWeight: '700',
  },
  paidBadgeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  paidBadgeText: {
    color: '#059669',
    fontSize: 12.5,
    fontWeight: '800',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 30,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 12,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginTop: 8,
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 8,
  },
  doctorPickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  doctorChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  doctorChipActive: {
    backgroundColor: '#e0f2fe',
    borderColor: '#0284c7',
  },
  doctorChipText: {
    fontSize: 12,
    color: '#475569',
  },
  doctorChipTextActive: {
    color: '#0284c7',
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
  },
  modalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalBtnCancel: {
    backgroundColor: '#f1f5f9',
  },
  modalBtnCancelText: {
    color: '#475569',
    fontWeight: '600',
    fontSize: 13,
  },
  modalBtnConfirm: {
    backgroundColor: '#0284c7',
  },
  modalBtnConfirmText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },
  suggestionsBox: {
    backgroundColor: '#fffbeb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f59e0b',
    padding: 8,
    marginBottom: 8,
    gap: 6,
  },
  suggestionsHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400e',
    marginBottom: 2,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#fef3c7',
  },
  suggestionName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  suggestionTag: {
    fontSize: 10,
    fontWeight: '700',
    backgroundColor: '#e0f2fe',
    color: '#0284c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  suggestionMeta: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
});
