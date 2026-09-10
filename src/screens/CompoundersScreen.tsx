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
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../api/client';
import { interactionUtils } from '../utils/interactionUtils';
import { useTheme } from '../context/ThemeContext';
import { colors } from '../theme/colors';

interface Compounder {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender: string;
  dob?: string;
  nic?: string;
  assignedDoctors?: { _id: string; firstName: string; lastName: string }[];
}

export const CompoundersScreen: React.FC = () => {
  const { colors: theme } = useTheme();
  const [compounders, setCompounders] = useState<Compounder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCompounder, setSelectedCompounder] = useState<Compounder | null>(null);

  // Form Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('Male');
  const [dob, setDob] = useState('');
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [nic, setNic] = useState('');

  const fetchCompounders = useCallback(async () => {
    try {
      const { data } = await api.get('/api/v1/user/compounders');
      setCompounders(data.compounders || []);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to load compounders');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCompounders();
  }, [fetchCompounders]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchCompounders();
  }, [fetchCompounders]);

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !phone.trim()) {
      Alert.alert('Validation Error', 'First name, last name, email, and phone are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        gender,
        dob,
        nic,
      };

      if (selectedCompounder) {
        await api.put(`/api/v1/user/user/${selectedCompounder._id}`, payload);
        interactionUtils.playSuccess();
        Alert.alert('Success', 'Staff details updated');
      } else {
        await api.post(`/api/v1/user/compounder/addnew`, payload);
        interactionUtils.playSuccess();
        Alert.alert('Success', 'Compounder created successfully');
      }
      setIsModalOpen(false);
      fetchCompounders();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Confirm Delete', 'Are you sure you want to delete this staff member?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/v1/user/user/${id}`);
            interactionUtils.playClick();
            setCompounders(prev => prev.filter(c => c._id !== id));
            Alert.alert('Deleted', 'Compounder removed successfully');
          } catch (e: any) {
            Alert.alert('Error', 'Failed to delete compounder');
          }
        },
      },
    ]);
  };

  const openModal = (compounder?: Compounder) => {
    interactionUtils.playClick();
    if (compounder) {
      setSelectedCompounder(compounder);
      setFirstName(compounder.firstName || '');
      setLastName(compounder.lastName || '');
      setEmail(compounder.email || '');
      setPhone(compounder.phone || '');
      setGender(compounder.gender || 'Male');
      setDob(compounder.dob ? compounder.dob.substring(0, 10) : '');
      setNic(compounder.nic || '');
    } else {
      setSelectedCompounder(null);
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setGender('Male');
      setDob('');
      setNic('');
    }
    setIsModalOpen(true);
  };

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return compounders;
    return compounders.filter((c) => {
      return (
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.includes(q)
      );
    });
  }, [compounders, searchQuery]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Top Search & Add */}
      <View style={styles.headerRow}>
        <View style={[styles.searchWrapper, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Ionicons name="search-outline" size={18} color={theme.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: theme.textPrimary }]}
            placeholder="Search staff by name, phone..."
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
          onPress={() => openModal()}
        >
          <Ionicons name="person-add-outline" size={18} color="#ffffff" style={{ marginRight: 4 }} />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoRow}>
        <Text style={[styles.infoText, { color: theme.textMuted }]}>
          Total Registered Staff: {compounders.length}
        </Text>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
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
              <Ionicons name="people-outline" size={48} color={theme.textMuted} style={{ marginBottom: 8 }} />
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>No compounders registered</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.avatarCircle, { backgroundColor: theme.primaryDark, borderColor: theme.gold }]}>
                  <Text style={[styles.avatarText, { color: theme.goldBright }]}>
                    {item.firstName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={[styles.name, { color: theme.textPrimary }]}>
                    {item.firstName} {item.lastName}
                  </Text>
                  <View style={styles.metaRow}>
                    <Ionicons name="mail-outline" size={13} color={theme.textMuted} />
                    <Text style={[styles.metaText, { color: theme.textSecondary }]}>{item.email}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Ionicons name="call-outline" size={13} color={theme.textMuted} />
                    <Text style={[styles.metaText, { color: theme.textSecondary }]}>{item.phone}</Text>
                  </View>
                  {item.assignedDoctors && item.assignedDoctors.length > 0 && (
                    <View style={styles.metaRow}>
                      <Ionicons name="medical-outline" size={13} color={theme.goldDark} />
                      <Text style={[styles.metaText, { color: theme.goldDark, fontWeight: '700' }]}>
                        Assigned: {item.assignedDoctors.map(d => `${d.firstName} ${d.lastName}`).join(', ')}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={[styles.cardActions, { borderTopColor: theme.borderLight }]}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}
                  onPress={() => openModal(item)}
                >
                  <Ionicons name="create-outline" size={14} color={theme.textPrimary} />
                  <Text style={[styles.actionBtnText, { color: theme.textPrimary }]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: theme.dangerSoft, borderColor: theme.dangerBorder }]}
                  onPress={() => handleDelete(item._id)}
                >
                  <Ionicons name="trash-outline" size={14} color={theme.danger} />
                  <Text style={[styles.actionBtnText, { color: theme.danger }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Form Modal */}
      <Modal visible={isModalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.cardBg }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                  {selectedCompounder ? 'Edit Staff Profile' : 'Add New Compounder'}
                </Text>
                <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                  <Ionicons name="close-circle-outline" size={24} color={theme.textMuted} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>First Name *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                    placeholder="First Name"
                    placeholderTextColor={theme.textMuted}
                    value={firstName}
                    onChangeText={setFirstName}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Last Name *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                    placeholder="Last Name"
                    placeholderTextColor={theme.textMuted}
                    value={lastName}
                    onChangeText={setLastName}
                  />
                </View>
              </View>

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Email Address *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                placeholder="email@example.com"
                placeholderTextColor={theme.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Phone Number *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                placeholder="10-digit Mobile"
                placeholderTextColor={theme.textMuted}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Gender</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                    placeholder="Male / Female"
                    placeholderTextColor={theme.textMuted}
                    value={gender}
                    onChangeText={setGender}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>ID / NIC</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                    placeholder="National ID"
                    placeholderTextColor={theme.textMuted}
                    value={nic}
                    onChangeText={setNic}
                  />
                </View>
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, borderWidth: 1 }]}
                  onPress={() => setIsModalOpen(false)}
                >
                  <Text style={[styles.btnCancelText, { color: theme.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: theme.primary }]}
                  onPress={handleSave}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.btnConfirmText}>
                      {selectedCompounder ? 'Save Changes' : 'Create Staff Member'}
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
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
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
  infoRow: {
    marginBottom: 10,
    marginLeft: 4,
  },
  infoText: {
    fontSize: 12,
    fontWeight: '600',
  },
  list: {
    paddingBottom: 24,
  },
  card: {
    borderRadius: 14,
    padding: 14,
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
  cardInfo: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  metaText: {
    fontSize: 12,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 12,
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
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
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
