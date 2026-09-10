import React, { useState, useEffect, useCallback } from 'react';
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
import api from '../api/client';
import { interactionUtils } from '../utils/interactionUtils';
import { useTheme } from '../context/ThemeContext';
import { colors } from '../theme/colors';

interface Referral {
  _id: string;
  patientName: string;
  diagnosis: string;
  clinicalNotes: string;
  urgency: string;
  status: string;
  createdAt: string;
}

export const ReferralsScreen: React.FC = () => {
  const { colors: theme } = useTheme();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Compose Fields
  const [patientName, setPatientName] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [urgency, setUrgency] = useState<'routine' | 'urgent' | 'emergency'>('routine');

  const fetchReferrals = useCallback(async () => {
    try {
      const { data } = await api.get('/api/v1/referral/getall');
      setReferrals(data.referrals || []);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to load referrals');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchReferrals();
  }, [fetchReferrals]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchReferrals();
  }, [fetchReferrals]);

  const handleCreate = async () => {
    if (!patientName.trim() || !diagnosis.trim() || !clinicalNotes.trim()) {
      Alert.alert('Validation Error', 'Patient Name, Diagnosis, and Notes are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post('/api/v1/referral/create', {
        patientName: patientName.trim(),
        diagnosis: diagnosis.trim(),
        clinicalNotes: clinicalNotes.trim(),
        urgency,
        patientId: '646f6e746b6e6f7779657430',
      });
      interactionUtils.playSuccess();
      Alert.alert('Success', 'Patient referral created successfully');
      setIsModalOpen(false);
      
      setPatientName('');
      setDiagnosis('');
      setClinicalNotes('');
      setUrgency('routine');
      
      fetchReferrals();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to create referral');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Confirm Delete', 'Delete this referral?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/v1/referral/delete/${id}`);
            interactionUtils.playClick();
            setReferrals(prev => prev.filter(r => r._id !== id));
          } catch (e: any) {
            Alert.alert('Error', 'Failed to delete referral');
          }
        },
      },
    ]);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Clinical Referrals</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            External & Specialist Transfer Cases
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: theme.primary }]}
          onPress={() => setIsModalOpen(true)}
        >
          <Ionicons name="git-compare-outline" size={16} color="#ffffff" style={{ marginRight: 4 }} />
          <Text style={styles.addBtnText}>New Referral</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={referrals}
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
              <Ionicons name="git-compare-outline" size={48} color={theme.textMuted} style={{ marginBottom: 8 }} />
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>No referral cases logged</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isEmergency = item.urgency === 'emergency';
            const isUrgent = item.urgency === 'urgent';

            return (
              <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                <View style={styles.cardHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="person-outline" size={16} color={theme.gold} />
                    <Text style={[styles.name, { color: theme.textPrimary }]}>{item.patientName}</Text>
                  </View>
                  <View
                    style={[
                      styles.urgencyBadge,
                      isEmergency && { backgroundColor: theme.dangerSoft, borderColor: theme.dangerBorder },
                      isUrgent && { backgroundColor: theme.warningSoft, borderColor: theme.warningBorder },
                      !isEmergency && !isUrgent && { backgroundColor: theme.infoSoft, borderColor: theme.infoBorder },
                    ]}
                  >
                    <Text
                      style={[
                        styles.urgencyText,
                        isEmergency && { color: theme.danger },
                        isUrgent && { color: theme.warning },
                        !isEmergency && !isUrgent && { color: theme.info },
                      ]}
                    >
                      {item.urgency ? item.urgency.toUpperCase() : 'ROUTINE'}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.diagnosis, { color: theme.textSecondary }]}>
                  <Text style={{ fontWeight: '700', color: theme.textPrimary }}>Diagnosis: </Text>
                  {item.diagnosis}
                </Text>

                <Text style={[styles.notes, { color: theme.textMuted }]}>
                  <Text style={{ fontWeight: '600', color: theme.textSecondary }}>Notes: </Text>
                  {item.clinicalNotes}
                </Text>

                <View style={[styles.cardFooter, { borderTopColor: theme.borderLight }]}>
                  <Text style={[styles.date, { color: theme.textMuted }]}>
                    Referred: {formatDate(item.createdAt)}
                  </Text>
                  <TouchableOpacity
                    style={[styles.deleteBtn, { backgroundColor: theme.dangerSoft, borderColor: theme.dangerBorder }]}
                    onPress={() => handleDelete(item._id)}
                  >
                    <Ionicons name="trash-outline" size={13} color={theme.danger} />
                    <Text style={[styles.deleteBtnText, { color: theme.danger }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
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
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Create Specialist Referral</Text>
                <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                  <Ionicons name="close-circle-outline" size={24} color={theme.textMuted} />
                </TouchableOpacity>
              </View>
              
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Patient Full Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                placeholder="Patient Name"
                placeholderTextColor={theme.textMuted}
                value={patientName}
                onChangeText={setPatientName}
              />

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Provisional Diagnosis *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                placeholder="e.g. Uncontrolled Hypertension / Suspected Appendicitis"
                placeholderTextColor={theme.textMuted}
                value={diagnosis}
                onChangeText={setDiagnosis}
              />

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Urgency Level</Text>
              <View style={styles.urgencySelector}>
                {(['routine', 'urgent', 'emergency'] as const).map((lvl) => {
                  const isSelected = urgency === lvl;
                  return (
                    <TouchableOpacity
                      key={lvl}
                      style={[
                        styles.urgencyOption,
                        { backgroundColor: theme.surfaceElevated, borderColor: theme.border },
                        isSelected && {
                          backgroundColor:
                            lvl === 'emergency'
                              ? theme.dangerSoft
                              : lvl === 'urgent'
                              ? theme.warningSoft
                              : theme.primarySoft,
                          borderColor:
                            lvl === 'emergency'
                              ? theme.danger
                              : lvl === 'urgent'
                              ? theme.warning
                              : theme.primary,
                        },
                      ]}
                      onPress={() => setUrgency(lvl)}
                    >
                      <Text
                        style={[
                          styles.urgencyOptionText,
                          { color: theme.textSecondary },
                          isSelected && {
                            color:
                              lvl === 'emergency'
                                ? theme.danger
                                : lvl === 'urgent'
                                ? theme.warning
                                : theme.primary,
                            fontWeight: '800',
                          },
                        ]}
                      >
                        {lvl.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Clinical Notes & Justification *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary, height: 90, textAlignVertical: 'top' }]}
                placeholder="Reason for referral, vitals summary, investigation results..."
                placeholderTextColor={theme.textMuted}
                multiline
                value={clinicalNotes}
                onChangeText={setClinicalNotes}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, borderWidth: 1 }]}
                  onPress={() => setIsModalOpen(false)}
                >
                  <Text style={[styles.btnCancelText, { color: theme.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: theme.primary }]}
                  onPress={handleCreate}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.btnConfirmText}>Submit Referral</Text>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  name: {
    fontSize: 15,
    fontWeight: '800',
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  urgencyText: {
    fontSize: 10,
    fontWeight: '800',
  },
  diagnosis: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  notes: {
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 8,
  },
  date: {
    fontSize: 11,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  deleteBtnText: {
    fontSize: 11,
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
  urgencySelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  urgencyOption: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  urgencyOptionText: {
    fontSize: 11,
    fontWeight: '700',
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
