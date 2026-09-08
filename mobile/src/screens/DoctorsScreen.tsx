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
import { doctorsApi } from '../api/doctors';
import { Doctor, CapacitySlot } from '../types';

export const DoctorsScreen: React.FC = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Capacity Checker state
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [capacityDate, setCapacityDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [capacityData, setCapacityData] = useState<CapacitySlot | null>(null);
  const [isLoadingCapacity, setIsLoadingCapacity] = useState(false);

  // Add doctor modal
  const [isAddDoctorOpen, setIsAddDoctorOpen] = useState(false);
  const [docName, setDocName] = useState('');
  const [docEmail, setDocEmail] = useState('');
  const [docPhone, setDocPhone] = useState('');
  const [docSpecialty, setDocSpecialty] = useState('');
  const [docFee, setDocFee] = useState('500');

  const fetchDoctors = async () => {
    try {
      const data = await doctorsApi.getAll();
      const list = Array.isArray(data) ? data : [];
      setDoctors(list);
      if (list.length > 0 && !selectedDocId) {
        setSelectedDocId(list[0]._id);
      }
    } catch (e) {
      console.warn('Failed to load doctors:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  const handleCheckCapacity = async (doctorId: string, date: string) => {
    setSelectedDocId(doctorId);
    setIsLoadingCapacity(true);
    try {
      const res = await doctorsApi.getCapacity({ doctorId, date });
      setCapacityData(res);
    } catch (e) {
      setCapacityData(null);
    } finally {
      setIsLoadingCapacity(false);
    }
  };

  const handleAddDoctor = async () => {
    if (!docName.trim() || !docSpecialty.trim()) {
      Alert.alert('Validation', 'Name and specialty are required.');
      return;
    }

    try {
      await doctorsApi.addNew({
        name: docName.trim(),
        email: docEmail.trim(),
        phone: docPhone.trim(),
        specialization: docSpecialty.trim(),
        visitingFee: parseFloat(docFee) || 500,
      });
      setIsAddDoctorOpen(false);
      setDocName('');
      setDocEmail('');
      setDocPhone('');
      setDocSpecialty('');
      fetchDoctors();
      Alert.alert('Success', 'Doctor profile created successfully!');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to add doctor');
    }
  };

  const filteredDoctors = doctors.filter((doc) => {
    const q = searchQuery.toLowerCase();
    return (
      doc.name?.toLowerCase().includes(q) ||
      doc.specialization?.toLowerCase().includes(q)
    );
  });

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Search doctor or specialty..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setIsAddDoctorOpen(true)}
        >
          <Text style={styles.addBtnText}>+ Doctor</Text>
        </TouchableOpacity>
      </View>

      {/* Capacity & Slot Checker Bar */}
      <View style={styles.capacitySection}>
        <Text style={styles.capacityTitle}>⚡ Quick Capacity Checker</Text>
        <View style={styles.capacityInputs}>
          <TextInput
            style={styles.dateInput}
            value={capacityDate}
            onChangeText={setCapacityDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#94a3b8"
          />
          <TouchableOpacity
            style={styles.checkBtn}
            onPress={() => selectedDocId && handleCheckCapacity(selectedDocId, capacityDate)}
          >
            <Text style={styles.checkBtnText}>Check Slots</Text>
          </TouchableOpacity>
        </View>

        {isLoadingCapacity ? (
          <ActivityIndicator size="small" color="#0284c7" style={{ marginTop: 8 }} />
        ) : capacityData ? (
          <View style={styles.capacityResults}>
            <Text style={styles.capacityResultText}>
              Capacity: {capacityData.totalCapacity || '20'} | Booked:{' '}
              {capacityData.bookedSlots || 0} | Available:{' '}
              <Text style={{ fontWeight: '700', color: '#059669' }}>
                {capacityData.availableSlots ?? 20} slots
              </Text>
            </Text>
          </View>
        ) : null}
      </View>

      {/* Doctors List */}
      {isLoading ? (
        <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredDoctors}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No doctors registered</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.doctorCard,
                selectedDocId === item._id && styles.doctorCardSelected,
              ]}
              onPress={() => handleCheckCapacity(item._id, capacityDate)}
            >
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>
                  {item.name ? item.name.charAt(0).toUpperCase() : 'D'}
                </Text>
              </View>
              <View style={styles.doctorInfo}>
                <Text style={styles.doctorName}>{item.name}</Text>
                <Text style={styles.specialty}>{item.specialization}</Text>
                <Text style={styles.metaText}>
                  📞 {item.phone || 'N/A'} • Fee: ₹{item.visitingFee || 500}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Add Doctor Modal */}
      <Modal visible={isAddDoctorOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Doctor</Text>

            <TextInput
              style={styles.input}
              placeholder="Dr. Full Name"
              placeholderTextColor="#94a3b8"
              value={docName}
              onChangeText={setDocName}
            />
            <TextInput
              style={styles.input}
              placeholder="Specialization (e.g., Cardiologist)"
              placeholderTextColor="#94a3b8"
              value={docSpecialty}
              onChangeText={setDocSpecialty}
            />
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
              value={docEmail}
              onChangeText={setDocEmail}
            />
            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              placeholderTextColor="#94a3b8"
              keyboardType="phone-pad"
              value={docPhone}
              onChangeText={setDocPhone}
            />
            <TextInput
              style={styles.input}
              placeholder="Consultation Fee (₹)"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              value={docFee}
              onChangeText={setDocFee}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.btn, styles.btnCancel]}
                onPress={() => setIsAddDoctorOpen(false)}
              >
                <Text style={styles.btnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnConfirm]}
                onPress={handleAddDoctor}
              >
                <Text style={styles.btnConfirmText}>Save Doctor</Text>
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
  headerRow: {
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
  addBtn: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center',
  },
  addBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  capacitySection: {
    backgroundColor: '#ffffff',
    marginHorizontal: 12,
    marginBottom: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  capacityTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  capacityInputs: {
    flexDirection: 'row',
    gap: 8,
  },
  dateInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
  },
  checkBtn: {
    backgroundColor: '#0369a1',
    paddingHorizontal: 14,
    borderRadius: 8,
    justifyContent: 'center',
  },
  checkBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  capacityResults: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f0fdf4',
    borderRadius: 6,
  },
  capacityResultText: {
    fontSize: 12,
    color: '#166534',
  },
  list: {
    padding: 12,
    paddingBottom: 30,
  },
  doctorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  doctorCardSelected: {
    borderColor: '#0284c7',
    backgroundColor: '#f0f9ff',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0284c7',
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  specialty: {
    fontSize: 13,
    color: '#0284c7',
    fontWeight: '500',
    marginTop: 1,
  },
  metaText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 3,
  },
  empty: {
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
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 14,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 10,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10,
  },
  btn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnCancel: {
    backgroundColor: '#f1f5f9',
  },
  btnCancelText: {
    color: '#475569',
    fontWeight: '600',
  },
  btnConfirm: {
    backgroundColor: '#0284c7',
  },
  btnConfirmText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
