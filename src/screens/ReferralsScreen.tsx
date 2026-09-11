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
  BackHandler,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/client';
import { interactionUtils } from '../utils/interactionUtils';
import { useTheme } from '../context/ThemeContext';
import { colors } from '../theme/colors';

interface Referral {
  _id: string;
  referralType?: 'patient_request' | 'doctor_referral';
  patientName: string;
  patientPhone?: string;
  patientEmail?: string;
  patientAddress?: string;
  age?: number;
  gender?: string;
  applicantBy?: string;
  applicantName?: string;
  applicantPhone?: string;
  targetDoctorId?: any;
  targetDoctorName?: string;
  targetDoctorSpecialty?: string;
  department?: string;
  appointmentDate?: string;
  appointmentSlot?: string;
  convertedToAppointment?: boolean;
  appointmentId?: any;
  diagnosis?: string;
  clinicalNotes?: string;
  urgency?: string;
  status: string;
  commissionPercent?: number;
  commissionAmount?: number;
  commissionStatus?: string;
  expenseId?: any;
  createdAt: string;
}

export const ReferralsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors: theme } = useTheme();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'inbound' | 'outbound'>('inbound');
  const [convertingId, setConvertingId] = useState<string | null>(null);

  // Outbound Referral Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [urgency, setUrgency] = useState<'routine' | 'urgent' | 'emergency'>('routine');

  const fetchReferrals = useCallback(async () => {
    try {
      const { data } = await api.get('/api/v1/referral/all?limit=100');
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

  useEffect(() => {
    const onBackPress = () => {
      if (isModalOpen) {
        setIsModalOpen(false);
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [isModalOpen]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchReferrals();
  }, [fetchReferrals]);

  // Convert Inbound Referral to Official Appointment
  const handleConvertToAppointment = async (referral: Referral) => {
    try {
      interactionUtils.playClick();
      setConvertingId(referral._id);

      const response = await api.post(`/api/v1/referral/${referral._id}/convert-to-appointment`);
      interactionUtils.playSuccess();

      // Update local referral in state
      setReferrals((prev) =>
        prev.map((r) => {
          if (r._id === referral._id) {
            return {
              ...r,
              convertedToAppointment: true,
              status: 'scheduled',
              appointmentId: response.data.appointment?._id,
            };
          }
          return r;
        })
      );

      Alert.alert(
        'Appointment Created!',
        `Patient ${referral.patientName} has been successfully added to Appointments list under Dr. ${referral.targetDoctorName || 'Assigned Doctor'}.`,
        [
          { text: 'View Appointments', onPress: () => navigation.navigate('Appointments') },
          { text: 'OK', style: 'cancel' },
        ]
      );
    } catch (e: any) {
      Alert.alert('Conversion Failed', e.response?.data?.message || 'Failed to convert referral to appointment');
    } finally {
      setConvertingId(null);
    }
  };

  // Create Outbound Referral
  const handleCreateOutbound = async () => {
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
    Alert.alert('Confirm Delete', 'Delete this referral record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/v1/referral/delete/${id}`);
            interactionUtils.playClick();
            setReferrals((prev) => prev.filter((r) => r._id !== id));
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

  // Filter into Inbound patient requests vs Outbound hospital referrals
  const inboundList = useMemo(() => {
    return referrals.filter(
      (r) => r.referralType === 'patient_request' || r.targetDoctorName || r.applicantBy
    );
  }, [referrals]);

  const outboundList = useMemo(() => {
    return referrals.filter(
      (r) => r.referralType === 'doctor_referral' || (!r.targetDoctorName && !r.applicantBy)
    );
  }, [referrals]);

  const activeList = activeTab === 'inbound' ? inboundList : outboundList;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Top Header Row */}
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Referrals Hub</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            {inboundList.filter(r => !r.convertedToAppointment).length} pending appointments • {outboundList.length} hospital transfers
          </Text>
        </View>

        {activeTab === 'inbound' ? (
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: theme.goldDark }]}
            onPress={() => navigation.navigate('PublicBooking')}
          >
            <Ionicons name="add-circle" size={17} color="#ffffff" style={{ marginRight: 5 }} />
            <Text style={styles.addBtnText}>+ Refer Patient</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: theme.primary }]}
            onPress={() => setIsModalOpen(true)}
          >
            <Ionicons name="git-compare-outline" size={16} color="#ffffff" style={{ marginRight: 4 }} />
            <Text style={styles.addBtnText}>New Transfer</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Two Segmented Tabs */}
      <View style={[styles.tabBar, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === 'inbound' && [styles.tabItemActive, { backgroundColor: theme.cardBg }],
          ]}
          onPress={() => {
            interactionUtils.playClick();
            setActiveTab('inbound');
          }}
        >
          <Ionicons
            name="arrow-down-circle-outline"
            size={16}
            color={activeTab === 'inbound' ? theme.primary : theme.textMuted}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'inbound' ? theme.primary : theme.textSecondary },
              activeTab === 'inbound' && { fontWeight: '800' },
            ]}
          >
            Patient Inbound ({inboundList.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === 'outbound' && [styles.tabItemActive, { backgroundColor: theme.cardBg }],
          ]}
          onPress={() => {
            interactionUtils.playClick();
            setActiveTab('outbound');
          }}
        >
          <Ionicons
            name="arrow-up-circle-outline"
            size={16}
            color={activeTab === 'outbound' ? theme.gold : theme.textMuted}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'outbound' ? theme.goldDark : theme.textSecondary },
              activeTab === 'outbound' && { fontWeight: '800' },
            ]}
          >
            Hospital Transfers ({outboundList.length})
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={activeList}
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
              <Ionicons
                name={activeTab === 'inbound' ? 'people-outline' : 'git-compare-outline'}
                size={48}
                color={theme.textMuted}
                style={{ marginBottom: 8 }}
              />
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                {activeTab === 'inbound'
                  ? 'No patient appointment requests yet'
                  : 'No hospital transfer referrals logged'}
              </Text>
              {activeTab === 'inbound' && (
                <TouchableOpacity
                  style={[styles.referEmptyBtn, { backgroundColor: theme.goldDark }]}
                  onPress={() => navigation.navigate('PublicBooking')}
                >
                  <Ionicons name="add-circle" size={18} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 13 }}>Refer a Patient Now</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          renderItem={({ item }) => {
            const isConverted = Boolean(item.convertedToAppointment);
            const isConverting = convertingId === item._id;

            if (activeTab === 'inbound') {
              // INBOUND APPOINTMENT REFERRAL CARD
              return (
                <View
                  style={[
                    styles.card,
                    { backgroundColor: theme.cardBg, borderColor: theme.border },
                    isConverted && { borderColor: theme.successBorder },
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="person-outline" size={16} color={theme.primary} />
                        <Text style={[styles.name, { color: theme.textPrimary }]}>{item.patientName}</Text>
                      </View>
                      <View style={styles.metaRow}>
                        <Ionicons name="call-outline" size={12} color={theme.textMuted} />
                        <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                          {item.patientPhone || item.applicantPhone || 'No phone'}
                        </Text>
                        {item.age ? (
                          <>
                            <Text style={[styles.metaText, { color: theme.textMuted }]}>•</Text>
                            <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                              {item.age} yrs ({item.gender || 'M'})
                            </Text>
                          </>
                        ) : null}
                      </View>
                    </View>

                    {/* Urgency and Applicant Badge */}
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                      {item.urgency === 'emergency' && (
                        <View style={[styles.applicantBadge, { backgroundColor: '#fee2e2', borderColor: '#fca5a5' }]}>
                          <Ionicons name="alert-circle" size={12} color="#dc2626" />
                          <Text style={[styles.applicantBadgeText, { color: "#dc2626", fontWeight: '800' }]}>
                            EMERGENCY
                          </Text>
                        </View>
                      )}
                      {item.urgency === 'urgent' && (
                        <View style={[styles.applicantBadge, { backgroundColor: '#fef3c7', borderColor: '#fde68a' }]}>
                          <Ionicons name="warning-outline" size={12} color="#d97706" />
                          <Text style={[styles.applicantBadgeText, { color: "#d97706", fontWeight: '800' }]}>
                            Urgent
                          </Text>
                        </View>
                      )}
                      <View style={[styles.applicantBadge, { backgroundColor: theme.goldSoft, borderColor: theme.goldBorder }]}>
                        <Ionicons name="shield-checkmark-outline" size={11} color={theme.goldDark} />
                        <Text style={[styles.applicantBadgeText, { color: theme.goldDark }]}>
                          {item.applicantBy || 'Self'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Applicant Details if not self */}
                  {item.applicantBy && item.applicantBy !== 'Self' && item.applicantBy !== 'Self (Patient)' ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, paddingHorizontal: 4, gap: 4 }}>
                      <Ionicons name="person-outline" size={12} color={theme.goldDark} />
                      <Text style={{ fontSize: 11.5, color: theme.goldDark, fontWeight: '700' }}>
                        Applicant: {item.applicantName || item.applicantBy}
                      </Text>
                      {item.applicantPhone ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 6, gap: 2 }}>
                          <Ionicons name="call-outline" size={11} color={theme.goldDark} />
                          <Text style={{ fontSize: 11, color: theme.goldDark }}>{item.applicantPhone}</Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}

                  {/* Target Doctor Info */}
                  <View style={[styles.doctorTargetBox, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
                    <Ionicons name="medkit-outline" size={14} color={theme.primary} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.doctorTargetName, { color: theme.textPrimary }]}>
                        Requested Doctor: <Text style={{ fontWeight: '800', color: theme.primary }}>{item.targetDoctorName || 'Any Physician'}</Text>
                      </Text>
                      <Text style={[styles.doctorTargetSub, { color: theme.textMuted }]}>
                        Dept: {item.department || 'General'} • Slot: {item.appointmentSlot || '10:00 AM'} ({formatDate(item.appointmentDate)})
                      </Text>
                    </View>
                  </View>

                  {/* Symptoms / Reason */}
                  <Text style={[styles.symptomsText, { color: theme.textSecondary }]}>
                    <Text style={{ fontWeight: '700', color: theme.textPrimary }}>Symptoms: </Text>
                    {item.clinicalNotes || item.diagnosis || 'Consultation requested'}
                  </Text>

                  {/* Referral Commission & Live Status Strip */}
                  <View style={[styles.commissionStrip, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Ionicons name="cash-outline" size={14} color={theme.goldDark} />
                      <Text style={{ fontSize: 12, fontWeight: '800', color: theme.goldDark }}>
                        Commission: ₹{item.commissionAmount || 0} ({item.commissionPercent || 5}%)
                      </Text>
                      <Text style={{ fontSize: 10.5, color: theme.textMuted, textTransform: 'capitalize' }}>
                        • {item.commissionStatus || 'pending'}
                      </Text>
                    </View>

                    {/* Status Pill */}
                    <View
                      style={[
                        styles.statusPill,
                        item.status === 'completed'
                          ? { backgroundColor: '#d1fae5', borderColor: '#6ee7b7' }
                          : item.status === 'accepted' || item.status === 'scheduled'
                          ? { backgroundColor: theme.primarySoft, borderColor: theme.primaryMuted }
                          : { backgroundColor: '#fef3c7', borderColor: '#fde68a' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          item.status === 'completed'
                            ? { color: '#047857' }
                            : item.status === 'accepted' || item.status === 'scheduled'
                            ? { color: theme.primary }
                            : { color: '#b45309' },
                        ]}
                      >
                        {(item.status || 'submitted').toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {/* Card Action Row: Add as Appointment */}
                  <View style={[styles.cardFooter, { borderTopColor: theme.borderLight }]}>
                    <Text style={[styles.date, { color: theme.textMuted }]}>
                      Received: {formatDate(item.createdAt)}
                    </Text>

                    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                      <TouchableOpacity
                        style={[styles.deleteBtn, { backgroundColor: theme.dangerSoft, borderColor: theme.dangerBorder }]}
                        onPress={() => handleDelete(item._id)}
                      >
                        <Ionicons name="trash-outline" size={13} color={theme.danger} />
                      </TouchableOpacity>

                      {isConverted ? (
                        <View style={[styles.convertedBadge, { backgroundColor: theme.successSoft, borderColor: theme.successBorder }]}>
                          <Ionicons name="checkmark-circle" size={14} color={theme.success} />
                          <Text style={[styles.convertedBadgeText, { color: theme.success }]}>Added</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={[styles.addAsApptBtn, { backgroundColor: theme.primary }]}
                          onPress={() => handleConvertToAppointment(item)}
                          disabled={isConverting}
                        >
                          {isConverting ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <>
                              <Ionicons name="calendar" size={13} color="#ffffff" style={{ marginRight: 4 }} />
                              <Text style={styles.addAsApptBtnText}>+ Add Appt</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              );
            }

            // OUTBOUND HOSPITAL TRANSFER REFERRAL CARD
            const isEmergency = item.urgency === 'emergency';
            const isUrgent = item.urgency === 'urgent';

            return (
              <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                <View style={styles.cardHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="business-outline" size={16} color={theme.gold} />
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
                  <Text style={{ fontWeight: '600', color: theme.textSecondary }}>Clinical Notes: </Text>
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

      {/* New Outbound Transfer Modal */}
      <Modal visible={isModalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.cardBg }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Doctor Outbound Referral</Text>
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
                placeholder="e.g. Uncontrolled Hypertension / Specialist Required"
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
                placeholder="Transfer reasoning, hospital requirements, vitals..."
                placeholderTextColor={theme.textMuted}
                multiline
                value={clinicalNotes}
                onChangeText={setClinicalNotes}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, borderWidth: 1 }]}
                  onPress={() => setIsModalOpen(false)}
                >
                  <Text style={[styles.modalBtnCancel, { color: theme.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: theme.primary }]}
                  onPress={handleCreateOutbound}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.modalBtnConfirm}>Submit Transfer</Text>
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
    paddingTop: Platform.OS === 'android' ? 44 : 48,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    marginBottom: 14,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 9,
  },
  tabItemActive: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  name: {
    fontSize: 15,
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  metaText: {
    fontSize: 12,
  },
  applicantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  applicantBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  doctorTargetBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 9,
    borderRadius: 9,
    borderWidth: 1,
    marginBottom: 8,
  },
  doctorTargetName: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  doctorTargetSub: {
    fontSize: 11,
    marginTop: 1,
  },
  symptomsText: {
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 8,
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
    marginBottom: 8,
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
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  deleteBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  addAsApptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addAsApptBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  convertedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
    borderWidth: 1,
  },
  convertedBadgeText: {
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
  commissionStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 9,
    borderWidth: 1,
    marginTop: 8,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  referEmptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 12,
  },
});
