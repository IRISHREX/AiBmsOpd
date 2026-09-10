import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PrescriptionSettings {
  headerImageUrl?: string;
  clinicName?: string;
  clinicSubtitle?: string;
  clinicAddress?: string;
  clinicContact?: string;
  signImageUrl?: string;
  doctorDegree?: string;
  doctorRegNo?: string;
  footerText?: string;
  printWithHeader: boolean;
  printWithFooter: boolean;
}

const SETTINGS_KEY = '@bms_opd_rx_settings';

export const DEFAULT_RX_SETTINGS: PrescriptionSettings = {
  clinicName: 'BMS MULTISPECIALITY OPD CLINIC',
  clinicSubtitle: 'Advanced Outpatient Medical & Surgical Care',
  clinicAddress: 'Medical Center Complex, Health Avenue',
  clinicContact: '+91 98765 43210 / 033 2456 7890',
  doctorDegree: 'MBBS, MD (General Medicine)',
  doctorRegNo: 'Reg: WBMC/67890/2018',
  footerText: 'Emergency: 102 / 108 • Valid for 7 days from issue date • Please bring this prescription on next visit.',
  printWithHeader: true,
  printWithFooter: true,
};

export const prescriptionSettingsService = {
  getSettings: async (): Promise<PrescriptionSettings> => {
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_KEY);
      if (stored) {
        return { ...DEFAULT_RX_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('Failed to load rx settings:', e);
    }
    return DEFAULT_RX_SETTINGS;
  },

  saveSettings: async (settings: Partial<PrescriptionSettings>): Promise<PrescriptionSettings> => {
    try {
      const current = await prescriptionSettingsService.getSettings();
      const updated = { ...current, ...settings };
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.warn('Failed to save rx settings:', e);
      throw e;
    }
  },
};
