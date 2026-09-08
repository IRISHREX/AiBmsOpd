import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { appointmentsApi } from '../api/appointments';
import { invoicesApi } from '../api/invoices';
import { Appointment } from '../types';

export const DashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [invoiceStats, setInvoiceStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadDashboardData = async () => {
    try {
      const [apptsData, statsData] = await Promise.allSettled([
        appointmentsApi.getAll(),
        invoicesApi.getStats(),
      ]);

      if (apptsData.status === 'fulfilled') {
        setAppointments(Array.isArray(apptsData.value) ? apptsData.value : []);
      }
      if (statsData.status === 'fulfilled') {
        setInvoiceStats(statsData.value);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || e?.message || 'Dashboard load error:');
      console.warn('Dashboard load error:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadDashboardData();
  };

  const totalAppts = appointments.length;
  const pendingAppts = appointments.filter((a) => a.status === 'Pending').length;
  const completedAppts = appointments.filter((a) => a.status === 'Completed').length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={['#0284c7']} />
      }
    >
      {/* Top Banner */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.name || 'Dr. Practitioner'}</Text>
        </View>
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>
            {(user?.role || 'doctor').toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Metrics Row */}
      <Text style={styles.sectionTitle}>Today's Overview</Text>
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { borderLeftColor: '#0284c7' }]}>
          <Text style={styles.statLabel}>Total Appointments</Text>
          <Text style={styles.statNumber}>{totalAppts}</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: '#f59e0b' }]}>
          <Text style={styles.statLabel}>Pending Consults</Text>
          <Text style={styles.statNumber}>{pendingAppts}</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: '#10b981' }]}>
          <Text style={styles.statLabel}>Completed</Text>
          <Text style={styles.statNumber}>{completedAppts}</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: '#8b5cf6' }]}>
          <Text style={styles.statLabel}>Settled Invoices</Text>
          <Text style={styles.statNumber}>
            {invoiceStats?.paidCount || invoiceStats?.settled || '0'}
          </Text>
        </View>
      </View>

      {/* Quick Action Buttons */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate('Appointments')}
        >
          <Text style={styles.actionIcon}>📅</Text>
          <Text style={styles.actionLabel}>Appointments</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate('Prescriptions')}
        >
          <Text style={styles.actionIcon}>💊</Text>
          <Text style={styles.actionLabel}>Prescriptions</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate('Doctors')}
        >
          <Text style={styles.actionIcon}>🩺</Text>
          <Text style={styles.actionLabel}>Doctors & Slots</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate('Invoices')}
        >
          <Text style={styles.actionIcon}>💳</Text>
          <Text style={styles.actionLabel}>Invoices</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Appointments */}
      <View style={styles.listHeader}>
        <Text style={styles.sectionTitle}>Recent Patients</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Appointments')}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator size="small" color="#0284c7" style={{ marginVertical: 20 }} />
      ) : appointments.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No appointments scheduled yet</Text>
        </View>
      ) : (
        appointments.slice(0, 5).map((appt) => (
          <View key={appt._id} style={styles.appointmentCard}>
            <View style={styles.appointmentMain}>
              <Text style={styles.patientName}>{appt.patientName}</Text>
              <Text style={styles.patientDetails}>
                📞 {appt.patientPhone || 'No Phone'} • {appt.appointmentDate}
              </Text>
              {appt.slotTime && (
                <Text style={styles.slotTimeText}>🕒 Slot: {appt.slotTime}</Text>
              )}
            </View>
            <View
              style={[
                styles.statusBadge,
                appt.status === 'Completed'
                  ? styles.statusCompleted
                  : appt.status === 'Cancelled'
                  ? styles.statusCancelled
                  : styles.statusPending,
              ]}
            >
              <Text style={styles.statusText}>{appt.status}</Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 14,
    color: '#64748b',
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
  },
  roleBadge: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleBadgeText: {
    color: '#0369a1',
    fontWeight: '700',
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'center',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 13,
    color: '#0284c7',
    fontWeight: '600',
  },
  appointmentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  appointmentMain: {
    flex: 1,
  },
  patientName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  patientDetails: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  slotTimeText: {
    fontSize: 12,
    color: '#0284c7',
    marginTop: 2,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusPending: {
    backgroundColor: '#fef3c7',
  },
  statusCompleted: {
    backgroundColor: '#d1fae5',
  },
  statusCancelled: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1e293b',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14,
  },
});
