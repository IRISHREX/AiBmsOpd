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
} from 'react-native';
import { appointmentsApi } from '../api/appointments';
import { doctorsApi } from '../api/doctors';
import { Appointment, Doctor } from '../types';

export const AppointmentsScreen: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // New Appointment Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('');
  const [newPatientAge, setNewPatientAge] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [newApptDate, setNewApptDate] = useState(new Date().toISOString().split('T')[0]);
  const [newSlotTime, setNewSlotTime] = useState('10:00 AM');
  const [newSymptoms, setNewSymptoms] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reschedule Modal State
  const [rescheduleModalAppt, setRescheduleModalAppt] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleSlot, setRescheduleSlot] = useState('');

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
    } catch (e) {
      console.warn('Failed to load appointments:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (!text.trim()) {
      fetchData();
      return;
    }
    try {
      const results = await appointmentsApi.search(text.trim());
      setAppointments(Array.isArray(results) ? results : []);
    } catch (e) {
      console.warn('Search failed:', e);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await appointmentsApi.updateStatus(id, newStatus);
      setAppointments((prev) =>
        prev.map((a) => (a._id === id ? { ...a, status: newStatus as any } : a))
      );
      Alert.alert('Status Updated', `Appointment marked as ${newStatus}`);
    } catch (e) {
      Alert.alert('Error', 'Could not update status');
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
          } catch (e) {
            Alert.alert('Error', 'Failed to delete appointment');
          }
        },
      },
    ]);
  };

  const handleCreateAppointment = async () => {
    if (!newPatientName.trim() || !newPatientPhone.trim() || !selectedDoctorId) {
      Alert.alert('Validation', 'Please fill in patient name, phone, and select a doctor.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await appointmentsApi.create({
        patientName: newPatientName.trim(),
        patientPhone: newPatientPhone.trim(),
        patientAge: newPatientAge ? parseInt(newPatientAge, 10) : undefined,
        doctorId: selectedDoctorId,
        appointmentDate: newApptDate,
        slotTime: newSlotTime,
        symptoms: newSymptoms ? newSymptoms.split(',').map((s) => s.trim()) : [],
      });

      setAppointments((prev) => [created, ...prev]);
      setIsCreateModalOpen(false);
      setNewPatientName('');
      setNewPatientPhone('');
      setNewPatientAge('');
      setNewSymptoms('');
      Alert.alert('Success', 'Appointment booked successfully!');
    } catch (e: any) {
      Alert.alert('Booking Error', e.response?.data?.message || 'Failed to create appointment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmReschedule = async () => {
    if (!rescheduleModalAppt) return;
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
      Alert.alert('Success', 'Appointment rescheduled successfully');
    } catch (e) {
      Alert.alert('Error', 'Failed to reschedule appointment');
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
          placeholder="🔍 Search patient, phone, token..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={handleSearch}
        />
        <TouchableOpacity
          style={styles.bookBtn}
          onPress={() => setIsCreateModalOpen(true)}
        >
          <Text style={styles.bookBtnText}>+ Book</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        {['All', 'Pending', 'Completed', 'Rescheduled', 'Cancelled'].map((status) => (
          <TouchableOpacity
            key={status}
            style={[styles.filterChip, statusFilter === status && styles.filterChipActive]}
            onPress={() => setStatusFilter(status)}
          >
            <Text
              style={[
                styles.filterChipText,
                statusFilter === status && styles.filterChipTextActive,
              ]}
            >
              {status}
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
          onRefresh={() => {
            setIsRefreshing(true);
            fetchData();
          }}
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
                  <Text style={styles.patientName}>{item.patientName}</Text>
                  <Text style={styles.contactInfo}>
                    📞 {item.patientPhone || 'N/A'}{' '}
                    {item.patientAge ? `• ${item.patientAge} yrs` : ''}
                  </Text>
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
                  <Text style={styles.statusBadgeText}>{item.status}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.detailLabel}>Doctor:</Text>
                <Text style={styles.detailValue}>
                  {item.doctorName || 'Assigned Physician'}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.detailLabel}>Schedule:</Text>
                <Text style={styles.detailValue}>
                  📅 {item.appointmentDate} {item.slotTime ? `at ${item.slotTime}` : ''}
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
              <View style={styles.cardActions}>
                {item.status !== 'Completed' && (
                  <TouchableOpacity
                    style={[styles.cardBtn, styles.btnSuccess]}
                    onPress={() => handleStatusChange(item._id, 'Completed')}
                  >
                    <Text style={styles.btnTextSuccess}>✓ Complete</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.cardBtn, styles.btnSecondary]}
                  onPress={() => {
                    setRescheduleModalAppt(item);
                    setRescheduleDate(item.appointmentDate);
                    setRescheduleSlot(item.slotTime || '11:00 AM');
                  }}
                >
                  <Text style={styles.btnTextSecondary}>Reschedule</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.cardBtn, styles.btnDanger]}
                  onPress={() => handleDelete(item._id)}
                >
                  <Text style={styles.btnTextDanger}>Delete</Text>
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
            <Text style={styles.modalTitle}>Book New Appointment</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Patient Full Name"
              placeholderTextColor="#94a3b8"
              value={newPatientName}
              onChangeText={setNewPatientName}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Phone Number"
              placeholderTextColor="#94a3b8"
              keyboardType="phone-pad"
              value={newPatientPhone}
              onChangeText={setNewPatientPhone}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Age (e.g., 34)"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              value={newPatientAge}
              onChangeText={setNewPatientAge}
            />

            <Text style={styles.modalLabel}>Select Doctor</Text>
            <View style={styles.doctorPickerContainer}>
              {doctors.slice(0, 4).map((doc) => (
                <TouchableOpacity
                  key={doc._id}
                  style={[
                    styles.doctorChip,
                    selectedDoctorId === doc._id && styles.doctorChipActive,
                  ]}
                  onPress={() => setSelectedDoctorId(doc._id)}
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
              ))}
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="Date (YYYY-MM-DD)"
              placeholderTextColor="#94a3b8"
              value={newApptDate}
              onChangeText={setNewApptDate}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Time Slot (e.g. 10:30 AM)"
              placeholderTextColor="#94a3b8"
              value={newSlotTime}
              onChangeText={setNewSlotTime}
            />

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
                onPress={() => setIsCreateModalOpen(false)}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
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
          </View>
        </View>
      </Modal>

      {/* Reschedule Modal */}
      <Modal visible={!!rescheduleModalAppt} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reschedule Appointment</Text>
            <Text style={styles.modalSubtitle}>
              Patient: {rescheduleModalAppt?.patientName}
            </Text>

            <Text style={styles.modalLabel}>New Date</Text>
            <TextInput
              style={styles.modalInput}
              value={rescheduleDate}
              onChangeText={setRescheduleDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#94a3b8"
            />

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
    backgroundColor: '#0284c7',
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookBtnText: {
    color: '#ffffff',
    fontWeight: '600',
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
    backgroundColor: '#0284c7',
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
});
