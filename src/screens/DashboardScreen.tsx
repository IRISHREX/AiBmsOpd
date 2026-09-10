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
  Dimensions,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { appointmentsApi } from '../api/appointments';
import { invoicesApi } from '../api/invoices';
import { Appointment } from '../types';
import { BarChart, PieChart } from 'react-native-chart-kit';
import * as Haptics from 'expo-haptics';

const screenWidth = Dimensions.get('window').width;

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
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const onRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsRefreshing(true);
    loadDashboardData();
  };

  const totalAppts = appointments.length;
  const pendingAppts = appointments.filter((a) => a.status === 'Pending').length;
  const completedAppts = appointments.filter((a) => a.status === 'Completed').length;
  const cancelledAppts = appointments.filter((a) => a.status === 'Cancelled').length;

  // New Metrics Calculation
  const todayStr = new Date().toISOString().slice(0, 10);
  const monthStr = todayStr.slice(0, 7);

  const extractDate = (a: Appointment) => a.appointmentDate || (a.createdAt && new Date(a.createdAt).toISOString().slice(0, 10));

  const patientsViewedToday = appointments.filter(a => extractDate(a) === todayStr && a.hasVisited).length;
  const paidToday = appointments.filter(a => extractDate(a) === todayStr && a.paymentStatus?.toLowerCase() === 'paid')
    .reduce((sum, a) => sum + (Number(a.price) || 0), 0);

  const patientsThisMonth = appointments.filter(a => extractDate(a)?.startsWith(monthStr)).length;
  const paidThisMonth = appointments.filter(a => extractDate(a)?.startsWith(monthStr) && a.paymentStatus?.toLowerCase() === 'paid')
    .reduce((sum, a) => sum + (Number(a.price) || 0), 0);

  const chartData = {
    labels: ['Pending', 'Completed', 'Cancelled'],
    datasets: [
      {
        data: [pendingAppts, completedAppts, cancelledAppts],
      },
    ],
  };

  const pieData = [
    {
      name: 'Pending',
      population: pendingAppts,
      color: '#f59e0b',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12,
    },
    {
      name: 'Completed',
      population: completedAppts,
      color: '#10b981',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12,
    },
    {
      name: 'Cancelled',
      population: cancelledAppts,
      color: '#ef4444',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12,
    },
  ];

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
          <Text style={styles.statLabel}>Patients Viewed</Text>
          <Text style={styles.statNumber}>{patientsViewedToday}</Text>
          <Text style={{fontSize: 10, color: '#64748b', marginTop: 4}}>Total Consults: {totalAppts}</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: '#10b981' }]}>
          <Text style={styles.statLabel}>Paid Today</Text>
          <Text style={styles.statNumber}>₹{paidToday}</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: '#f59e0b' }]}>
          <Text style={styles.statLabel}>This Month</Text>
          <Text style={styles.statNumber}>{patientsThisMonth}</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: '#8b5cf6' }]}>
          <Text style={styles.statLabel}>Monthly Rev</Text>
          <Text style={styles.statNumber}>₹{paidThisMonth}</Text>
        </View>
      </View>

      {/* Charts Module */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Appointments Breakdown</Text>
        <BarChart
          data={chartData}
          width={screenWidth - 60}
          height={220}
          yAxisLabel=""
          yAxisSuffix=""
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(2, 132, 199, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
            style: {
              borderRadius: 16,
            },
          }}
          style={{
            marginVertical: 8,
            borderRadius: 16,
          }}
        />
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
          <Text style={styles.actionLabel}>Rx Store</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate('Doctors')}
        >
          <Text style={styles.actionIcon}>🩺</Text>
          <Text style={styles.actionLabel}>Doctors</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate('Invoices')}
        >
          <Text style={styles.actionIcon}>💳</Text>
          <Text style={styles.actionLabel}>Billing</Text>
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
              <Text style={styles.patientName}>{appt.name || appt.patientName}</Text>
              <Text style={styles.patientDetails}>
                📞 {appt.phone || appt.patientPhone || 'No Phone'} • {appt.appointmentDate}
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
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  greeting: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 2,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  roleBadge: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  roleBadgeText: {
    color: '#0284c7',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
  },
  chartCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#ffffff',
    marginHorizontal: 4,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllText: {
    color: '#0284c7',
    fontSize: 14,
    fontWeight: '600',
  },
  appointmentCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  appointmentMain: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  patientDetails: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 4,
  },
  slotTimeText: {
    fontSize: 12,
    color: '#0284c7',
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10,
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
    fontWeight: '700',
    color: '#475569',
  },
  emptyCard: {
    padding: 30,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14,
  },
});
