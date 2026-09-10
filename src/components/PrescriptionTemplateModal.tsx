import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import {
  prescriptionTemplateService,
  PrescriptionTemplate,
} from '../utils/prescriptionTemplates';
import { MedicineAdviceItem } from '../types';
import * as Haptics from 'expo-haptics';

interface Props {
  visible: boolean;
  onClose: () => void;
  onApplyTemplate: (template: PrescriptionTemplate) => void;
  currentVitals?: Record<string, string>;
  currentClinical?: Record<string, string>;
  currentMedicines?: MedicineAdviceItem[];
}

export const PrescriptionTemplateModal: React.FC<Props> = ({
  visible,
  onClose,
  onApplyTemplate,
  currentVitals = {},
  currentClinical = {},
  currentMedicines = [],
}) => {
  const { colors } = useTheme();
  const [templates, setTemplates] = useState<PrescriptionTemplate[]>([]);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateCategory, setTemplateCategory] = useState('General');

  const loadTemplates = async () => {
    const list = await prescriptionTemplateService.getAllTemplates();
    setTemplates(list);
  };

  useEffect(() => {
    if (visible) {
      loadTemplates();
      setIsCreatingNew(false);
      setTemplateName('');
    }
  }, [visible]);

  const handleSaveCurrent = async () => {
    if (!templateName.trim()) {
      Alert.alert('Validation', 'Please enter a name for the template.');
      return;
    }
    if (currentMedicines.length === 0) {
      Alert.alert('Validation', 'Add at least one medicine before saving as template.');
      return;
    }

    try {
      await prescriptionTemplateService.saveCustomTemplate({
        name: templateName.trim(),
        category: templateCategory.trim() || 'Custom',
        vitals: currentVitals,
        clinicalFindings: currentClinical,
        medicines: currentMedicines,
        followUpDays: 7,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', `Template "${templateName}" saved!`);
      setIsCreatingNew(false);
      setTemplateName('');
      loadTemplates();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not save template');
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Delete Template', `Remove template "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await prescriptionTemplateService.deleteCustomTemplate(id);
            loadTemplates();
          } catch (e: any) {
            Alert.alert('Error', e?.message || 'Could not delete template');
          }
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          {/* Header */}
          <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="copy-outline" size={20} color={colors.gold} />
              <Text style={[styles.title, { color: colors.textPrimary }]}>Prescription Templates</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Toggle Create Form */}
          <View style={styles.content}>
            {!isCreatingNew ? (
              <TouchableOpacity
                style={[styles.saveCurrentBtn, { backgroundColor: colors.primarySoft, borderColor: colors.primaryMuted }]}
                onPress={() => setIsCreatingNew(true)}
              >
                <Ionicons name="add-circle" size={18} color={colors.primary} />
                <Text style={[styles.saveCurrentText, { color: colors.primary }]}>
                  Save Current Prescription as Template ({currentMedicines.length} meds)
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.createForm, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight }]}>
                <Text style={[styles.formTitle, { color: colors.textPrimary }]}>Create New Clinical Preset</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.cardBg, borderColor: colors.border, color: colors.textPrimary }]}
                  placeholder="Template Name (e.g. Asthma Routine, Skin Rash)"
                  placeholderTextColor={colors.textMuted}
                  value={templateName}
                  onChangeText={setTemplateName}
                />
                <TextInput
                  style={[styles.input, { backgroundColor: colors.cardBg, borderColor: colors.border, color: colors.textPrimary }]}
                  placeholder="Category (e.g. Pulmonology, Dermatology)"
                  placeholderTextColor={colors.textMuted}
                  value={templateCategory}
                  onChangeText={setTemplateCategory}
                />
                <View style={styles.formBtnRow}>
                  <TouchableOpacity style={styles.cancelFormBtn} onPress={() => setIsCreatingNew(false)}>
                    <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.submitFormBtn, { backgroundColor: colors.gold }]} onPress={handleSaveCurrent}>
                    <Text style={{ color: '#ffffff', fontWeight: '700' }}>Save Template</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Template List */}
            <FlatList
              data={templates}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingVertical: 8, gap: 8 }}
              renderItem={({ item }) => (
                <View style={[styles.templateCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight }]}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.tmplName, { color: colors.textPrimary }]}>{item.name}</Text>
                      {item.isCustom && (
                        <View style={[styles.customBadge, { backgroundColor: colors.goldSoft, borderColor: colors.goldBorder }]}>
                          <Text style={[styles.customBadgeText, { color: colors.goldDark }]}>Custom</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.tmplCat, { color: colors.textSecondary }]}>
                      {item.category} • {item.medicines?.length || 0} Medicines
                    </Text>
                    {item.medicines && item.medicines.length > 0 && (
                      <Text style={[styles.medPreview, { color: colors.textMuted }]} numberOfLines={1}>
                        {item.medicines.map((m) => m.name).join(', ')}
                      </Text>
                    )}
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {item.isCustom && (
                      <TouchableOpacity onPress={() => handleDelete(item.id, item.name)} style={styles.deleteBtn}>
                        <Ionicons name="trash-outline" size={16} color="#dc2626" />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[styles.applyBtn, { backgroundColor: colors.primary }]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        onApplyTemplate(item);
                        onClose();
                      }}
                    >
                      <Text style={styles.applyBtnText}>Apply</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxHeight: '85%',
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
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },
  content: {
    padding: 16,
    flex: 1,
  },
  saveCurrentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
    marginBottom: 12,
  },
  saveCurrentText: {
    fontSize: 13,
    fontWeight: '700',
  },
  createForm: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
    gap: 8,
  },
  formTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  formBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  cancelFormBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  submitFormBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  tmplName: {
    fontSize: 14,
    fontWeight: '700',
  },
  tmplCat: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  medPreview: {
    fontSize: 11,
    marginTop: 2,
  },
  customBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  customBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  deleteBtn: {
    padding: 6,
  },
  applyBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  applyBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});
