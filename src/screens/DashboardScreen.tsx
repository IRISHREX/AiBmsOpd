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
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { appointmentsApi } from '../api/appointments';
import { invoicesApi } from '../api/invoices';
import { Appointment } from '../types';
import { BarChart } from 'react-native-chart-kit';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';

const screenWidth = Dimensions.get('window').width;

export const DashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadDashboardData = async () => {
    try {
      const [apptsData] = await Promise.allSettled([
        appointmentsApi.getAll(),
        invoicesApi.getStats(),
      ]);

      if (apptsData.status === 'fulfilled') {
        setAppointments(Array.isArray(apptsData.value) ? apptsData.value : []);
      }
    } catch (e: any) {
      Alert.alert('Notice', e?.response?.data?.message || e?.message || 'Dashboard load error:');
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

  // Financial and patient metrics
  const todayStr = new Date().toISOString().slice(0, 10);
  const monthStr = todayStr.slice(0, 7);

  const extractDate = (a: Appointment) =>
    a.appointmentDate || (a.createdAt && new Date(a.createdAt).toISOString().slice(0, 10));

  const patientsViewedToday = appointments.filter(
    (a) => extractDate(a) === todayStr && a.hasVisited
  ).length;

  const paidToday = appointments
    .filter((a) => extractDate(a) === todayStr && a.paymentStatus?.toLowerCase() === 'paid')
    .reduce((sum, a) => sum + (Number(a.price) || 0), 0);

  const patientsThisMonth = appointments.filter((a) =>
    extractDate(a)?.startsWith(monthStr)
  ).length;

  const paidThisMonth = appointments
    .filter(
      (a) =>
        extractDate(a)?.startsWith(monthStr) &&
        a.paymentStatus?.toLowerCase() === 'paid'
    )
    .reduce((sum, a) => sum + (Number(a.price) || 0), 0);

  const chartData = {
    labels: ['Pending', 'Completed', 'Cancelled'],
    datasets: [
      {
        data: [pendingAppts, completedAppts, cancelledAppts],
      },
    ],
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          colors={[colors.primary, colors.gold]}
        />
      }
    >
      {/* Luxury Bluish & Goldish Header Banner */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.name || 'Dr. Practitioner'}</Text>
          <Text style={styles.hospitalSub}>BMS OPD Management Portal</Text>
        </View>
        <View style={styles.roleBadge}>
          <Ionicons name="shield-checkmark" size={13} color={colors.goldBright} style={{ marginRight: 4 }} />
          <Text style={styles.roleBadgeText}>
            {(user?.role || 'doctor').toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Metrics Row */}
      <Text style={styles.sectionTitle}>Overview & Key Metrics</Text>
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { borderLeftColor: colors.primary }]}>
          <View style={styles.statIconBoxBlue}>
            <Ionicons name="eye-outline" size={16} color={colors.primary} />
          </View>
          <Text style={styles.statLabel}>Patients Viewed</Text>
          <Text style={styles.statNumber}>{patientsViewedToday}</Text>
          <Text style={styles.statSubText}>Total Consults: {totalAppts}</Text>
        </View>

        <View style={[styles.statCard, { borderLeftColor: colors.gold }]}>
          <View style={styles.statIconBoxGold}>
            <Ionicons name="cash-outline" size={16} color={colors.gold} />
          </View>
          <Text style={styles.statLabel}>Paid Today</Text>
          <Text style={[styles.statNumber, { color: colors.goldDark }]}>₹{paidToday}</Text>
          <Text style={styles.statSubText}>Today's Cashflow</Text>
        </View>

        <View style={[styles.statCard, { borderLeftColor: colors.primaryLight }]}>
          <View style={styles.statIconBoxBlue}>
            <Ionicons name="calendar-outline" size={16} color={colors.primaryLight} />
          </View>
          <Text style={styles.statLabel}>This Month</Text>
          <Text style={styles.statNumber}>{patientsThisMonth}</Text>
          <Text style={styles.statSubText}>Scheduled Patients</Text>
        </View>

        <View style={[styles.statCard, { borderLeftColor: colors.goldDark }]}>
          <View style={styles.statIconBoxGold}>
            <Ionicons name="wallet-outline" size={16} color={colors.goldDark} />
          </View>
          <Text style={styles.statLabel}>Monthly Rev</Text>
          <Text style={[styles.statNumber, { color: colors.goldDark }]}>₹{paidThisMonth}</Text>
          <Text style={styles.statSubText}>Collected MTD</Text>
        </View>
      </View>

      {/* Quick Action Buttons (Icons instead of emojis) */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate('Appointments')}
        >
          <View style={styles.actionIconContainerBlue}>
            <Ionicons name="calendar" size={22} color={colors.primary} />
          </View>
          <Text style={styles.actionLabel}>Appointments</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate('Prescriptions')}
        >
          <View style={styles.actionIconContainerGold}>
            <Ionicons name="medkit" size={22} color={colors.gold} />
          </View>
          <Text style={styles.actionLabel}>Rx Store</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate('Doctors')}
        >
          <View style={styles.actionIconContainerBlue}>
            <Ionicons name="fitness" size={22} color={colors.primaryLight} />
          </View>
          <Text style={styles.actionLabel}>Doctors</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate('Invoices')}
        >
          <View style={styles.actionIconContainerGold}>
            <Ionicons name="receipt" size={22} color={colors.goldDark} />
          </View>
          <Text style={styles.actionLabel}>Billing</Text>
        </TouchableOpacity>
      </View>

      {/* Charts Module */}
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Ionicons name="pie-chart-outline" size={18} color={colors.gold} style={{ marginRight: 6 }} />
          <Text style={styles.chartTitle}>Appointments Status</Text>
        </View>
        <BarChart
          data={chartData}
          width={screenWidth - 56}
          height={210}
          yAxisLabel=""
          yAxisSuffix=""
          chartConfig={{
            backgroundColor: colors.cardBg,
            backgroundGradientFrom: colors.cardBg,
            backgroundGradientTo: colors.cardBg,
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(30, 64, 175, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(71, 85, 105, ${opacity})`,
            style: {
              borderRadius: 16,
            },
          }}
          style={{
            marginVertical: 4,
            borderRadius: 16,
          }}
        />
      </View>

      {/* Recent Appointments */}
      <View style={styles.listHeader}>
        <Text style={styles.sectionTitle}>Recent Patients</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Appointments')}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 20 }} />
      ) : appointments.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="calendar-outline" size={32} color={colors.goldMuted} />
          <Text style={styles.emptyText}>No appointments scheduled yet</Text>
        </View>
      ) : (
        appointments.slice(0, 5).map((appt) => (
          <View key={appt._id} style={styles.appointmentCard}>
            <View style={styles.appointmentMain}>
              <Text style={styles.patientName}>{appt.name || appt.patientName || 'Patient'}</Text>
              <View style={styles.patientDetailsRow}>
                <Ionicons name="call-outline" size={13} color={colors.textSecondary} style={{ marginRight: 4 }} />
                <Text style={styles.patientDetails}>
                  {appt.phone || appt.patientPhone || 'No Phone'}
                </Text>
                <Text style={styles.patientDetails}> • </Text>
                <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} style={{ marginRight: 4 }} />
                <Text style={styles.patientDetails}>
                  {appt.appointmentDate || (appt.appointment_date ? appt.appointment_date.split('T')[0] : 'Today')}
                </Text>
              </View>
              {appt.slotTime && (
                <View style={styles.slotRow}>
                  <Ionicons name="time-outline" size={12} color={colors.primary} style={{ marginRight: 4 }} />
                  <Text style={styles.slotTimeText}>Slot: {appt.slotTime}</Text>
                </View>
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
    backgroundColor: colors.background,
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
    backgroundColor: colors.primaryDark,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gold,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  greeting: {
    fontSize: 13,
    color: colors.goldMuted,
    marginBottom: 2,
    fontWeight: '600',
  },
  userName: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.textWhite,
  },
  hospitalSub: {
    fontSize: 11,
    color: '#93c5fd',
    marginTop: 2,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(217, 119, 6, 0.2)',
    borderColor: colors.goldLight,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  roleBadgeText: {
    color: colors.goldBright,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primaryDark,
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 22,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.cardBg,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statIconBoxBlue: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statIconBoxGold: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  statSubText: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 4,
  },
  chartCard: {
    backgroundColor: colors.cardBg,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 22,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    alignItems: 'center',
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 22,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: colors.cardBg,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIconContainerBlue: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
  },
  actionIconContainerGold: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.goldMuted,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllText: {
    color: colors.goldDark,
    fontSize: 13,
    fontWeight: '700',
  },
  appointmentCard: {
    flexDirection: 'row',
    backgroundColor: colors.cardBg,
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  appointmentMain: {
    flex: 1,
  },
  patientName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  patientDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  patientDetails: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  slotTimeText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  statusPending: {
    backgroundColor: colors.goldSoft,
    borderColor: colors.goldBorder,
    borderWidth: 1,
  },
  statusCompleted: {
    backgroundColor: colors.successSoft,
    borderColor: colors.successBorder,
    borderWidth: 1,
  },
  statusCancelled: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.dangerBorder,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  emptyCard: {
    padding: 30,
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 8,
  },
});
