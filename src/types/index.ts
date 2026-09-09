export type UserRole = 'admin' | 'doctor' | 'compounder' | 'patient';

export interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  avatar?: string;
  doctorInfo?: Doctor;
  createdAt?: string;
}

export interface Doctor {
  _id: string;
  name: string;
  email: string;
  phone: string;
  specialization: string;
  department?: string;
  qualification?: string;
  experience?: string;
  visitingFee?: number;
  consultationFee?: number;
  availableDays?: string[];
  slotsPerDay?: number;
  headerImage?: string;
  signImage?: string;
}

export interface Appointment {
  _id: string;
  appointmentId?: string;
  patientName: string;
  patientPhone: string;
  patientAge?: number;
  patientGender?: 'Male' | 'Female' | 'Other';
  patientAddress?: string;
  doctorId: string;
  doctorName?: string;
  appointmentDate: string;
  slotTime?: string;
  status: 'Pending' | 'Completed' | 'Cancelled' | 'Rescheduled';
  symptoms?: string[];
  notes?: string;
  tokenNumber?: number;
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
  appointmentId: string;
  patientId?: string;
  patientName: string;
  doctorId?: string;
  doctorName?: string;
  totalAmount: number;
  discountAmount?: number;
  payableAmount: number;
  paidAmount: number;
  status: 'Unpaid' | 'Paid' | 'Partially Paid';
  paymentMethod?: 'Cash' | 'Card' | 'UPI' | 'Bank Transfer';
  createdAt: string;
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
