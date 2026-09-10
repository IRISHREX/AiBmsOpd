import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../context/ThemeContext';
import { Appointment, MedicineAdviceItem } from '../types';
import {
  prescriptionSettingsService,
  PrescriptionSettings,
} from '../utils/prescriptionSettings';
import { generatePrescriptionHtml } from '../utils/prescriptionHtml';
import { PrescriptionSettingsModal } from './PrescriptionSettingsModal';
import * as Haptics from 'expo-haptics';

interface Props {
  visible: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  doctorName?: string;
  doctorSpecialization?: string;
  vitals: Record<string, string>;
  clinicalFindings: Record<string, any>;
  medicines: MedicineAdviceItem[];
  advice?: string;
  diet?: string;
  followUp?: string;
}

export const PrescriptionPreviewModal: React.FC<Props> = ({
  visible,
  onClose,
  appointment,
  doctorName = 'Dr. Attending Physician',
  doctorSpecialization = 'Consultant Physician',
  vitals,
  clinicalFindings,
  medicines,
  advice,
  diet,
  followUp,
}) => {
  const { colors } = useTheme();
  const [settings, setSettings] = useState<PrescriptionSettings | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    if (visible) {
      prescriptionSettingsService.getSettings().then(setSettings);
    }
  }, [visible, isSettingsOpen]);

  if (!appointment) return null;

  const currentSettings = settings || {
    clinicName: 'BMS MULTISPECIALITY OPD',
    printWithHeader: true,
    printWithFooter: true,
  };

  const getHtml = () => {
    return generatePrescriptionHtml({
      appointment,
      doctorName,
      doctorSpecialization,
      vitals,
      clinicalFindings,
      medicines,
      advice,
      diet,
      followUp,
      settings: currentSettings,
    });
  };

  const handlePrint = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsGeneratingPdf(true);
    try {
      const html = getHtml();
      await Print.printAsync({ html });
    } catch (e: any) {
      Alert.alert('Print Notice', e?.message || 'Could not launch print dialog');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadPdf = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsGeneratingPdf(true);
    try {
      const html = getHtml();
      const { uri } = await Print.printToFileAsync({ html });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          UTI: '.pdf',
          mimeType: 'application/pdf',
          dialogTitle: `Prescription - ${appointment.name || 'Patient'}`,
        });
      } else {
        Alert.alert('PDF Saved', `Prescription generated at: ${uri}`);
      }
    } catch (e: any) {
      Alert.alert('Export Notice', e?.message || 'Could not export prescription PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const patientName = appointment.name || appointment.patientName || 'Patient';
  const age = appointment.age || appointment.patientAge || '-';
  const gender = appointment.gender || appointment.patientGender || '-';
  const phone = appointment.phone || appointment.patientPhone || '-';
  const dateStr = appointment.appointmentDate || (appointment.appointment_date ? appointment.appointment_date.split('T')[0] : 'Today');

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={[styles.containerCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            {/* Top Bar */}
            <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="document-text" size={20} color={colors.primary} />
                <Text style={[styles.title, { color: colors.textPrimary }]}>Prescription Preview</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <TouchableOpacity
                  style={[styles.brandingBtn, { backgroundColor: colors.goldSoft, borderColor: colors.goldBorder }]}
                  onPress={() => setIsSettingsOpen(true)}
                >
                  <Ionicons name="settings-outline" size={14} color={colors.goldDark} />
                  <Text style={[styles.brandingBtnText, { color: colors.goldDark }]}>Branding</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onClose} style={styles.closeIconBtn}>
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Scrollable Prescription View modeled after MyDocument */}
            <ScrollView contentContainerStyle={styles.scrollContent}>
              {/* Header Letterhead Preview */}
              {currentSettings.printWithHeader && (
                <View style={[styles.headerSection, { borderBottomColor: colors.primary }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.clinicTitle, { color: colors.primary }]}>
                      {currentSettings.clinicName || 'BMS MEDICAL OPD CLINIC'}
                    </Text>
                    <Text style={[styles.clinicSub, { color: colors.textSecondary }]}>
                      {currentSettings.clinicSubtitle || 'Advanced Medical Care & Diagnostics'}
                    </Text>
                    {currentSettings.clinicContact && (
                      <Text style={[styles.clinicContact, { color: colors.textMuted }]}>
                        {currentSettings.clinicContact}
                      </Text>
                    )}
                  </View>
                  <View style={styles.doctorBlock}>
                    <Text style={[styles.drName, { color: colors.textPrimary }]}>{doctorName}</Text>
                    <Text style={[styles.drQual, { color: colors.goldDark }]}>
                      {doctorSpecialization || currentSettings.doctorDegree || 'Physician'}
                    </Text>
                    {currentSettings.doctorRegNo && (
                      <Text style={[styles.drReg, { color: colors.textMuted }]}>{currentSettings.doctorRegNo}</Text>
                    )}
                  </View>
                </View>
              )}

              {/* Patient Strip */}
              <View style={[styles.patientStrip, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight }]}>
                <View style={styles.pItem}>
                  <Text style={[styles.pLabel, { color: colors.textMuted }]}>PATIENT:</Text>
                  <Text style={[styles.pVal, { color: colors.textPrimary }]}>{patientName}</Text>
                </View>
                <View style={styles.pItem}>
                  <Text style={[styles.pLabel, { color: colors.textMuted }]}>AGE / GENDER:</Text>
                  <Text style={[styles.pVal, { color: colors.textPrimary }]}>{age} Y / {gender}</Text>
                </View>
                <View style={styles.pItem}>
                  <Text style={[styles.pLabel, { color: colors.textMuted }]}>DATE:</Text>
                  <Text style={[styles.pVal, { color: colors.textPrimary }]}>{dateStr}</Text>
                </View>
                <View style={styles.pItem}>
                  <Text style={[styles.pLabel, { color: colors.textMuted }]}>PHONE:</Text>
                  <Text style={[styles.pVal, { color: colors.textPrimary }]}>{phone}</Text>
                </View>
              </View>

              {/* Vitals Summary */}
              {Object.values(vitals).some((v) => !!v) && (
                <View style={[styles.vitalsBox, { backgroundColor: colors.goldSoft, borderColor: colors.goldBorder }]}>
                  <Text style={[styles.vitalsTitle, { color: colors.goldDark }]}>RECORDED VITALS</Text>
                  <View style={styles.vitalsRow}>
                    {Object.entries(vitals).map(([k, v]) =>
                      v ? (
                        <View key={k} style={styles.vitalPill}>
                          <Text style={[styles.vitalKey, { color: colors.textSecondary }]}>{k}:</Text>
                          <Text style={[styles.vitalVal, { color: colors.textPrimary }]}>{v}</Text>
                        </View>
                      ) : null
                    )}
                  </View>
                </View>
              )}

              {/* Clinical findings */}
              {Object.values(clinicalFindings).some((v) => !!v) && (
                <View style={[styles.clinicalBox, { backgroundColor: colors.primarySoft, borderColor: colors.primaryMuted }]}>
                  <Text style={[styles.clinicalTitle, { color: colors.primary }]}>CLINICAL FINDINGS & DIAGNOSIS</Text>
                  <Text style={[styles.clinicalText, { color: colors.textPrimary }]}>
                    {Object.entries(clinicalFindings)
                      .filter(([_, val]) => !!val)
                      .map(([k, val]) => `${k}: ${typeof val === 'object' ? JSON.stringify(val) : val}`)
                      .join(' • ')}
                  </Text>
                </View>
              )}

              {/* Rx Medicine Advice Table */}
              <View style={styles.rxSection}>
                <View style={styles.rxTitleRow}>
                  <Text style={[styles.rxSymbol, { color: colors.primary }]}>℞</Text>
                  <Text style={[styles.rxTitle, { color: colors.textPrimary }]}>Prescribed Medicines</Text>
                </View>

                {medicines.length === 0 ? (
                  <Text style={[styles.noMeds, { color: colors.textMuted }]}>No medicines added to this prescription.</Text>
                ) : (
                  medicines.map((item, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.medRow,
                        { borderBottomColor: colors.borderLight },
                        idx % 2 === 1 && { backgroundColor: colors.surfaceElevated },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.medName, { color: colors.textPrimary }]}>
                          {idx + 1}. {item.name}
                        </Text>
                        <Text style={[styles.medMeta, { color: colors.textSecondary }]}>
                          Dose: {item.dose || '1 Tab'} • Duration: {item.duration || '5 Days'}
                        </Text>
                        {item.notes ? (
                          <Text style={[styles.medNotes, { color: colors.goldDark }]}>{item.notes}</Text>
                        ) : null}
                      </View>
                      <View style={[styles.freqBadge, { backgroundColor: colors.primarySoft, borderColor: colors.primaryMuted }]}>
                        <Text style={[styles.freqText, { color: colors.primary }]}>{item.frequency || '1-0-1'}</Text>
                      </View>
                    </View>
                  ))
                )}
              </View>

              {/* Advice */}
              {(advice || diet) && (
                <View style={[styles.adviceBox, { borderColor: colors.borderLight }]}>
                  {advice ? (
                    <View style={{ marginBottom: 4 }}>
                      <Text style={[styles.adviceLabel, { color: colors.goldDark }]}>Advice:</Text>
                      <Text style={[styles.adviceText, { color: colors.textPrimary }]}>{advice}</Text>
                    </View>
                  ) : null}
                  {diet ? (
                    <View>
                      <Text style={[styles.adviceLabel, { color: colors.goldDark }]}>Dietary Guidance:</Text>
                      <Text style={[styles.adviceText, { color: colors.textPrimary }]}>{diet}</Text>
                    </View>
                  ) : null}
                </View>
              )}

              {/* Follow-up & Seal/Signature */}
              <View style={[styles.bottomSection, { borderTopColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.followUpLabel, { color: colors.textMuted }]}>NEXT APPOINTMENT</Text>
                  <Text style={[styles.followUpVal, { color: colors.goldDark }]}>
                    {followUp || 'As advised or SOS in case of pain/fever'}
                  </Text>
                </View>
                <View style={styles.signatureArea}>
                  <View style={[styles.signPlaceholder, { borderColor: colors.textMuted }]}>
                    <Text style={[styles.signTitle, { color: colors.textPrimary }]}>{doctorName}</Text>
                    <Text style={[styles.signSub, { color: colors.textMuted }]}>Authorized Medical Officer</Text>
                  </View>
                </View>
              </View>

              {/* Disclaimer */}
              {currentSettings.printWithFooter && currentSettings.footerText && (
                <Text style={[styles.disclaimerText, { color: colors.textMuted }]}>
                  {currentSettings.footerText}
                </Text>
              )}
            </ScrollView>

            {/* Actions Bar */}
            <View style={[styles.actionsBar, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.primarySoft, borderColor: colors.primaryMuted }]}
                onPress={handlePrint}
                disabled={isGeneratingPdf}
              >
                <Ionicons name="print-outline" size={18} color={colors.primary} />
                <Text style={[styles.actionBtnText, { color: colors.primary }]}>Print Prescription</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtnPrimary, { backgroundColor: colors.gold }]}
                onPress={handleDownloadPdf}
                disabled={isGeneratingPdf}
              >
                {isGeneratingPdf ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="download-outline" size={18} color="#ffffff" />
                    <Text style={styles.actionBtnTextWhite}>Download PDF / Share</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <PrescriptionSettingsModal
        visible={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  containerCard: {
    width: '100%',
    maxHeight: '94%',
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  brandingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  brandingBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  closeIconBtn: {
    padding: 4,
  },
  scrollContent: {
    padding: 16,
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 2,
    marginBottom: 12,
  },
  clinicTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  clinicSub: {
    fontSize: 11,
    marginTop: 2,
  },
  clinicContact: {
    fontSize: 10,
    marginTop: 2,
  },
  doctorBlock: {
    alignItems: 'flex-end',
  },
  drName: {
    fontSize: 14,
    fontWeight: '800',
  },
  drQual: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  drReg: {
    fontSize: 10,
  },
  patientStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 12,
    marginBottom: 12,
  },
  pItem: {
    minWidth: '45%',
  },
  pLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  pVal: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 1,
  },
  vitalsBox: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  vitalsTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  vitalsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  vitalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  vitalKey: {
    fontSize: 11,
    fontWeight: '600',
  },
  vitalVal: {
    fontSize: 11,
    fontWeight: '700',
  },
  clinicalBox: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  clinicalTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  clinicalText: {
    fontSize: 12,
    lineHeight: 16,
  },
  rxSection: {
    marginVertical: 8,
  },
  rxTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  rxSymbol: {
    fontSize: 22,
    fontWeight: '900',
  },
  rxTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  noMeds: {
    fontSize: 12,
    fontStyle: 'italic',
    paddingVertical: 12,
  },
  medRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
  },
  medName: {
    fontSize: 13,
    fontWeight: '700',
  },
  medMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  medNotes: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  freqBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  freqText: {
    fontSize: 11,
    fontWeight: '800',
  },
  adviceBox: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginVertical: 10,
  },
  adviceLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  adviceText: {
    fontSize: 12,
    marginTop: 1,
  },
  bottomSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: 16,
    marginTop: 10,
    borderTopWidth: 1,
  },
  followUpLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  followUpVal: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  signatureArea: {
    alignItems: 'center',
  },
  signPlaceholder: {
    borderTopWidth: 1,
    paddingTop: 4,
    alignItems: 'center',
    minWidth: 130,
  },
  signTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  signSub: {
    fontSize: 9,
  },
  disclaimerText: {
    fontSize: 9,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 12,
  },
  actionsBar: {
    flexDirection: 'row',
    padding: 12,
    gap: 10,
    borderTopWidth: 1,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  actionBtnPrimary: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  actionBtnTextWhite: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
});
