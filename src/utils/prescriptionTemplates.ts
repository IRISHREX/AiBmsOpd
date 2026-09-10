import AsyncStorage from '@react-native-async-storage/async-storage';
import { MedicineAdviceItem } from '../types';

export interface PrescriptionTemplate {
  id: string;
  name: string;
  category: string;
  vitals?: Record<string, string>;
  clinicalFindings?: Record<string, string>;
  medicines: MedicineAdviceItem[];
  advice?: string;
  diet?: string;
  followUpDays?: number;
  isCustom?: boolean;
}

const TEMPLATES_STORAGE_KEY = '@bms_opd_custom_templates';

export const BUILT_IN_TEMPLATES: PrescriptionTemplate[] = [
  {
    id: 'tmpl-fever',
    name: 'Viral Fever & RTI',
    category: 'General Medicine',
    vitals: { Temp: '100.4', BP: '120/80', PR: '84', SPO2: '98' },
    clinicalFindings: { others: 'Throat congestion, mild rhinorrhea, no chest rales' },
    medicines: [
      { name: 'Paracetamol 650mg', type: 'Tablet', dose: '1 Tab', frequency: '1-1-1 (After Food)', duration: '3 Days', notes: 'SOS if temp > 100°F' },
      { name: 'Cetirizine 10mg', type: 'Tablet', dose: '1 Tab', frequency: '0-0-1 (Night)', duration: '5 Days', notes: 'For runny nose and sneezing' },
      { name: 'Azithromycin 500mg', type: 'Tablet', dose: '1 Tab', frequency: '1-0-0 (Morning)', duration: '3 Days', notes: 'Complete full 3 days course' },
      { name: 'Pantoprazole 40mg', type: 'Tablet', dose: '1 Tab', frequency: '1-0-0 (Empty Stomach)', duration: '5 Days', notes: 'Before breakfast' },
    ],
    advice: 'Steam inhalation twice daily, drink plenty of warm fluids, rest.',
    diet: 'Warm home-cooked food, avoid cold beverages.',
    followUpDays: 4,
  },
  {
    id: 'tmpl-htn',
    name: 'Hypertension Follow-up',
    category: 'Cardiology',
    vitals: { BP: '140/90', PR: '76', Temp: '98.4' },
    clinicalFindings: { cvs: 'S1, S2 heard normal, no murmur', chest: 'Clear bilaterally' },
    medicines: [
      { name: 'Telmisartan 40mg', type: 'Tablet', dose: '1 Tab', frequency: '1-0-0 (Morning)', duration: '30 Days', notes: 'Daily morning at fixed time' },
      { name: 'Amlodipine 5mg', type: 'Tablet', dose: '1 Tab', frequency: '0-0-1 (Night)', duration: '30 Days', notes: 'Monitor ankle swelling' },
    ],
    advice: 'Daily morning and evening blood pressure log. 30 mins brisk walking.',
    diet: 'Low sodium (salt < 5g/day), DASH diet, avoid fried & processed items.',
    followUpDays: 30,
  },
  {
    id: 'tmpl-dm',
    name: 'Type 2 Diabetes Routine',
    category: 'Endocrinology',
    vitals: { BP: '130/80', PR: '78', Temp: '98.2' },
    clinicalFindings: { others: 'Foot exam normal, peripheral pulses palpable' },
    medicines: [
      { name: 'Metformin 500mg (SR)', type: 'Tablet', dose: '1 Tab', frequency: '1-0-1 (With Food)', duration: '30 Days', notes: 'After main meals' },
      { name: 'Glimepiride 1mg', type: 'Tablet', dose: '1 Tab', frequency: '1-0-0 (Before Breakfast)', duration: '30 Days', notes: 'Watch for hypoglycemia symptoms' },
    ],
    advice: 'Keep candy handy for sudden sweating/tremor. Check Fasting & PP glucose weekly.',
    diet: 'High fiber, complex carbs, zero sugar/sweets, small frequent meals.',
    followUpDays: 30,
  },
  {
    id: 'tmpl-gastritis',
    name: 'Acute Gastritis / Acid Reflux',
    category: 'Gastroenterology',
    vitals: { BP: '120/80', PR: '74' },
    clinicalFindings: { per_abdomen: 'Mild epigastric tenderness' },
    medicines: [
      { name: 'Pantoprazole 40mg + Domperidone 30mg', type: 'Capsule', dose: '1 Cap', frequency: '1-0-0 (Empty Stomach)', duration: '14 Days', notes: '30 mins before breakfast' },
      { name: 'Sucralfate Suspension 1000mg/5ml', type: 'Syrup', dose: '10 ml', frequency: '1-0-1 (Before Food)', duration: '10 Days', notes: 'Shake well before use' },
    ],
    advice: 'Do not lie down immediately after eating. Elevate head of bed by 15 degrees.',
    diet: 'Avoid spicy, oily, caffeinated, and carbonated foods/drinks.',
    followUpDays: 14,
  },
  {
    id: 'tmpl-general',
    name: 'General Health & Fatigue',
    category: 'General Medicine',
    vitals: { BP: '118/78', PR: '72', Temp: '98.4' },
    clinicalFindings: { polar: 'Mild pallor', others: 'Generalized weakness' },
    medicines: [
      { name: 'Multivitamin with Zinc & B-Complex', type: 'Tablet', dose: '1 Tab', frequency: '0-1-0 (After Lunch)', duration: '30 Days', notes: 'Nutritional supplement' },
      { name: 'Calcium 500mg + Vitamin D3 250IU', type: 'Tablet', dose: '1 Tab', frequency: '0-0-1 (After Dinner)', duration: '30 Days', notes: 'Take with glass of water' },
    ],
    advice: 'Adequate hydration (2.5L water/day), 7-8 hours restful sleep.',
    diet: 'Fresh fruits, green leafy vegetables, eggs/protein-rich diet.',
    followUpDays: 30,
  },
];

export const prescriptionTemplateService = {
  getAllTemplates: async (): Promise<PrescriptionTemplate[]> => {
    try {
      const stored = await AsyncStorage.getItem(TEMPLATES_STORAGE_KEY);
      const custom: PrescriptionTemplate[] = stored ? JSON.parse(stored) : [];
      return [...BUILT_IN_TEMPLATES, ...custom];
    } catch (e) {
      console.warn('Failed to load custom templates:', e);
      return BUILT_IN_TEMPLATES;
    }
  },

  saveCustomTemplate: async (template: Omit<PrescriptionTemplate, 'id' | 'isCustom'>): Promise<PrescriptionTemplate> => {
    const newTemplate: PrescriptionTemplate = {
      ...template,
      id: `custom-${Date.now()}`,
      isCustom: true,
    };
    try {
      const stored = await AsyncStorage.getItem(TEMPLATES_STORAGE_KEY);
      const current: PrescriptionTemplate[] = stored ? JSON.parse(stored) : [];
      const updated = [newTemplate, ...current];
      await AsyncStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(updated));
      return newTemplate;
    } catch (e) {
      console.warn('Failed to save custom template:', e);
      throw e;
    }
  },

  deleteCustomTemplate: async (id: string): Promise<void> => {
    try {
      const stored = await AsyncStorage.getItem(TEMPLATES_STORAGE_KEY);
      const current: PrescriptionTemplate[] = stored ? JSON.parse(stored) : [];
      const updated = current.filter(t => t.id !== id);
      await AsyncStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to delete custom template:', e);
      throw e;
    }
  },
};
