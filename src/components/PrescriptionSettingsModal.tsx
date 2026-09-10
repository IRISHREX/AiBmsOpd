import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Image,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../context/ThemeContext';
import {
  prescriptionSettingsService,
  PrescriptionSettings,
} from '../utils/prescriptionSettings';
import * as Haptics from 'expo-haptics';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const PrescriptionSettingsModal: React.FC<Props> = ({ visible, onClose }) => {
  const { colors } = useTheme();
  const [settings, setSettings] = useState<PrescriptionSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      prescriptionSettingsService.getSettings().then(setSettings);
    }
  }, [visible]);

  const handlePickImage = async (field: 'headerImageUrl' | 'signImageUrl') => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant photos permission to upload prescription branding images.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSettings((prev) => (prev ? { ...prev, [field]: result.assets[0].uri } : null));
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to select image');
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);
    try {
      await prescriptionSettingsService.saveSettings(settings);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Prescription header, footer, and signature saved!');
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (!settings) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          {/* Header */}
          <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="document-attach-outline" size={20} color={colors.gold} />
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Prescription Branding</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Print Toggles */}
            <View style={[styles.sectionBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight }]}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Print & Export Toggles</Text>
              <View style={styles.toggleRow}>
                <Text style={[styles.toggleLabel, { color: colors.textSecondary }]}>Include Header on Prescriptions</Text>
                <Switch
                  value={settings.printWithHeader}
                  onValueChange={(val) => setSettings({ ...settings, printWithHeader: val })}
                  trackColor={{ false: '#cbd5e1', true: colors.gold }}
                  thumbColor={colors.surface}
                />
              </View>
              <View style={styles.toggleRow}>
                <Text style={[styles.toggleLabel, { color: colors.textSecondary }]}>Include Footer & Disclaimer</Text>
                <Switch
                  value={settings.printWithFooter}
                  onValueChange={(val) => setSettings({ ...settings, printWithFooter: val })}
                  trackColor={{ false: '#cbd5e1', true: colors.gold }}
                  thumbColor={colors.surface}
                />
              </View>
            </View>

            {/* Header Letterhead Image */}
            <View style={styles.inputGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Header Banner / Letterhead Image</Text>
              {settings.headerImageUrl ? (
                <View style={styles.previewContainer}>
                  <Image source={{ uri: settings.headerImageUrl }} style={styles.headerPreview} resizeMode="contain" />
                  <TouchableOpacity
                    style={styles.removeImgBtn}
                    onPress={() => setSettings({ ...settings, headerImageUrl: '' })}
                  >
                    <Ionicons name="trash-outline" size={14} color="#dc2626" />
                    <Text style={styles.removeImgText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.uploadBox, { borderColor: colors.goldMuted, backgroundColor: colors.surfaceElevated }]}
                  onPress={() => handlePickImage('headerImageUrl')}
                >
                  <Ionicons name="image-outline" size={24} color={colors.goldDark} />
                  <Text style={[styles.uploadText, { color: colors.textPrimary }]}>Pick Letterhead Image from Device</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Clinic Text Fallback */}
            <View style={styles.inputGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Clinic / Hospital Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.textPrimary }]}
                value={settings.clinicName}
                onChangeText={(t) => setSettings({ ...settings, clinicName: t })}
                placeholder="e.g. BMS OPD HEALTH CLINIC"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Clinic Subtitle & Tagline</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.textPrimary }]}
                value={settings.clinicSubtitle}
                onChangeText={(t) => setSettings({ ...settings, clinicSubtitle: t })}
                placeholder="e.g. Center for General & Specialized OPD"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Clinic Address & Contact Phone</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.textPrimary }]}
                value={settings.clinicContact}
                onChangeText={(t) => setSettings({ ...settings, clinicContact: t })}
                placeholder="Phone: +91 98765 43210"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* Doctor Signature Section */}
            <View style={styles.inputGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Doctor Signature Image</Text>
              {settings.signImageUrl ? (
                <View style={styles.previewContainer}>
                  <Image source={{ uri: settings.signImageUrl }} style={styles.signPreview} resizeMode="contain" />
                  <TouchableOpacity
                    style={styles.removeImgBtn}
                    onPress={() => setSettings({ ...settings, signImageUrl: '' })}
                  >
                    <Ionicons name="trash-outline" size={14} color="#dc2626" />
                    <Text style={styles.removeImgText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.uploadBox, { borderColor: colors.goldMuted, backgroundColor: colors.surfaceElevated }]}
                  onPress={() => handlePickImage('signImageUrl')}
                >
                  <Ionicons name="pencil-outline" size={24} color={colors.goldDark} />
                  <Text style={[styles.uploadText, { color: colors.textPrimary }]}>Pick Signature Image from Device</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Doctor Registration Number</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.textPrimary }]}
                value={settings.doctorRegNo}
                onChangeText={(t) => setSettings({ ...settings, doctorRegNo: t })}
                placeholder="e.g. Reg: WBMC/12345/2020"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* Footer Text */}
            <View style={styles.inputGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Footer Note & Emergency Disclaimer</Text>
              <TextInput
                style={[styles.input, styles.multilineInput, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.textPrimary }]}
                value={settings.footerText}
                onChangeText={(t) => setSettings({ ...settings, footerText: t })}
                multiline
                numberOfLines={3}
                placeholder="Disclaimers, emergency hotline numbers..."
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={[styles.footerRow, { borderTopColor: colors.border }]}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.gold }]} onPress={handleSave} disabled={isSaving}>
              {isSaving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="checkmark-done" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.saveBtnText}>Save Branding</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxHeight: '90%',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  sectionBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  inputGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  multilineInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  uploadBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  uploadText: {
    fontSize: 12,
    fontWeight: '600',
  },
  previewContainer: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  headerPreview: {
    width: '100%',
    height: 70,
  },
  signPreview: {
    width: 140,
    height: 50,
  },
  removeImgBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  removeImgText: {
    fontSize: 11,
    color: '#dc2626',
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    padding: 14,
    borderTopWidth: 1,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
