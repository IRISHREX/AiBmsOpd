export type UserRole = 'admin' | 'doctor' | 'compounder' | 'patient';

export interface User {
  _id: string;
  firstName?: string;
  lastName?: string;
  name: string;
  email: string;
  phone?: string;
  nic?: string;
  dob?: string;
  age?: number;
  gender?: string;
  role: UserRole;
  qualifications?: string;
  doctorDepartment?: string;
  consultationFee?: number;
  docAvatar?: { url: string; public_id: string } | string;
  signImage?: { url: string; public_id: string } | string;
  headerImage?: { url: string; public_id: string } | string;
  doctorInfo?: Doctor;
  compounders?: string[] | User[];
  assignedDoctors?: string[] | User[];
  createdAt?: string;
}

export interface Doctor extends User {
  specialization: string;
  department?: string;
  qualification?: string;
  experience?: string;
  visitingFee?: number;
  availableDays?: string[];
  slotsPerDay?: number;
}

export interface ClinicalFindingsData {
  patientCondition?: {
    c1?: string;
    c2?: string;
    c3?: string;
    c4?: string;
  };
  polar?: string;
  icterus?: string;
  edema?: string;
  cyanosis?: string;
  clubbing?: string;
  lymph_nodes?: string;
  chest?: string;
  cvs?: string;
  per_abdomen?: {
    pt?: string;
    pv?: string;
  };
  others?: string;
}

export interface DiagnosysData {
  BP?: string;
  PR?: string;
  SPO2?: string;
  Temp?: string;
  Height?: string;
  Weight?: string;
  BMI?: string;
  Others?: string;
}

export interface MedicineAdviceItem {
  name?: string;
  type?: string;
  dose?: string;
  frequency?: string;
  route?: string;
  duration?: string;
  notes?: string;
}

export interface AdviceData {
  testAdvice?: string[];
  medication?: string;
  diet?: string;
}

export interface AppointmentResultItem {
  initialComplain?: string;
  presentingComplaints?: string;
  medicalHistory?: string;
  clinical_findings?: ClinicalFindingsData;
  diagnosys_heading?: string;
  diagnosys?: DiagnosysData;
  Gravida?: string;
  Parity?: string;
  LMP?: string;
  EDD?: string;
  POG?: string;
  LCB?: string;
  MOD?: string;
  medicineAdvice?: MedicineAdviceItem[];
  advice?: AdviceData;
  additionalAdvice?: string;
  followUp?: string;
}

export interface Appointment {
  _id: string;
  appointmentId?: string;
  patientName?: string;
  name?: string;
  email?: string;
  patientPhone?: string;
  phone?: string;
  patientAge?: number;
  age?: number;
  nic?: string;
  dob?: string;
  gender?: string;
  patientGender?: 'Male' | 'Female' | 'Other' | 'Others';
  patientAddress?: string;
  address?: string;
  profession?: string;
  department?: string;
  doctorId: string;
  doctorName?: string;
  doctor?: { firstName: string; lastName: string };
  appointmentDate?: string;
  appointment_date?: string;
  followup_date?: string;
  slotTime?: string;
  status: 'Pending' | 'Completed' | 'Cancelled' | 'Rescheduled' | 'Accepted' | 'Rejected';
  paymentStatus?: 'Pending' | 'Accepted' | 'Due' | 'Paid';
  price?: number;
  hasVisited?: boolean;
  symptoms?: string[];
  notes?: string;
  tokenNumber?: number;
  clinicalFindings?: string;
  provisionalDiagnosis?: {
    type?: string;
    value?: string;
  };
  result?: AppointmentResultItem[];
  prescriptionId?: string;
  prescriptionComplete?: boolean;
  createdAt?: string;
}

export interface Medicine {
  _id: string;
  name: string;
  genericName?: string;
  composition?: string;
  dosageForm?: 'Tablet' | 'Capsule' | 'Syrup' | 'Injection' | 'Ointment' | 'Drops';
  strength?: string;
  manufacturer?: string;
  stock?: number;
  unitPrice?: number;
}

export interface PrescriptionItem {
  medicineId?: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface Invoice {
  _id: string;
  invoiceNumber?: string;
  appointment?: any;
  patient?: any;
  doctor?: any;
  items?: { description: string; quantity: number; unitPrice: number; total: number }[];
  subtotal?: number;
  tax?: number;
  discount?: number;
  total?: number;
  totalAmount?: number;
  payableAmount?: number;
  paidAmount?: number;
  payments?: { amount: number; method: string; date?: string; paidAt?: string; reference?: string; transactionId?: string }[];
  status: 'Unpaid' | 'Paid' | 'Partial' | 'Cancelled' | 'Pending' | 'Partially Paid';
  issuedAt?: string;
  dueDate?: string;
  createdAt?: string;
}

export interface Report {
  _id: string;
  title: string;
  category: string;
  patientId?: string;
  appointmentId?: string;
  date: string;
  summary?: string;
  totalRevenue?: number;
  totalAppointments?: number;
}

export interface Message {
  _id: string;
  recipientPhone: string;
  recipientName?: string;
  message: string;
  status?: 'Sent' | 'Failed' | 'Delivered';
  doctorId?: string;
  createdAt: string;
}

export interface Referral {
  _id: string;
  patientName: string;
  patientPhone: string;
  referringDoctorId?: string;
  referringDoctorName?: string;
  targetHospitalId?: string;
  targetHospitalName: string;
  department: string;
  reason: string;
  urgency: 'Low' | 'Medium' | 'High' | 'Emergency';
  status: 'Pending' | 'Accepted' | 'Completed';
  createdAt: string;
}

export interface Hospital {
  _id: string;
  name: string;
  address: string;
  contactNumber: string;
  emergencyNumber?: string;
  specialties: string[];
}

export interface CapacitySlot {
  doctorId: string;
  date: string;
  totalCapacity: number;
  bookedSlots: number;
  availableSlots: number;
}
