import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/client';
import { useTheme } from '../context/ThemeContext';
import { colors } from '../theme/colors';

interface Report {
  _id: string;
  appointmentId?: string;
  appointmentDate?: string;
  amount: number;
  paid: number;
  due: number;
  status: string;
  createdAt: string;
}

export const ReportsScreen: React.FC = () => {
  const { colors: theme } = useTheme();
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchReports = useCallback(async () => {
    try {
      const { data } = await api.get('/api/v1/reports');
      setReports(data.reports || data.data || []);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to load reports');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchReports();
  }, [fetchReports]);

  // Aggregate stats
  const totals = useMemo(() => {
    return reports.reduce(
      (acc, r) => ({
        total: acc.total + (Number(r.amount) || 0),
        paid: acc.paid + (Number(r.paid) || 0),
        due: acc.due + (Number(r.due) || 0),
      }),
      { total: 0, paid: 0, due: 0 }
    );
  }, [reports]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Recent';
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return 'Recent';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header Stat Summary Cards */}
      <View style={styles.statsContainer}>
        <View style={[styles.statBox, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Ionicons name="wallet-outline" size={18} color={theme.primary} />
          <Text style={[styles.statLabel, { color: theme.textMuted }]}>Total Billed</Text>
          <Text style={[styles.statVal, { color: theme.primary }]}>₹{totals.total.toLocaleString()}</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Ionicons name="checkmark-circle-outline" size={18} color={theme.success} />
          <Text style={[styles.statLabel, { color: theme.textMuted }]}>Received</Text>
          <Text style={[styles.statVal, { color: theme.success }]}>₹{totals.paid.toLocaleString()}</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Ionicons name="alert-circle-outline" size={18} color={theme.danger} />
          <Text style={[styles.statLabel, { color: theme.textMuted }]}>Outstanding</Text>
          <Text style={[styles.statVal, { color: theme.danger }]}>₹{totals.due.toLocaleString()}</Text>
        </View>
      </View>

      <View style={styles.titleRow}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Transaction Logs</Text>
        <TouchableOpacity
          style={[styles.refreshBtn, { backgroundColor: theme.primarySoft, borderColor: theme.primaryMuted }]}
          onPress={onRefresh}
        >
          <Ionicons name="sync-outline" size={14} color={theme.primary} />
          <Text style={[styles.refreshBtnText, { color: theme.primary }]}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={48} color={theme.textMuted} style={{ marginBottom: 8 }} />
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>No financial reports found</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isPaid = item.status === 'Paid' || item.due <= 0;
            const isDue = item.status === 'Due' || item.paid <= 0;

            return (
              <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                <View style={styles.cardHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="calendar-outline" size={14} color={theme.textMuted} />
                    <Text style={[styles.date, { color: theme.textPrimary }]}>
                      {formatDate(item.appointmentDate || item.createdAt)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      isPaid && { backgroundColor: theme.successSoft, borderColor: theme.successBorder },
                      isDue && { backgroundColor: theme.dangerSoft, borderColor: theme.dangerBorder },
                      !isPaid && !isDue && { backgroundColor: theme.warningSoft, borderColor: theme.warningBorder },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        isPaid && { color: theme.success },
                        isDue && { color: theme.danger },
                        !isPaid && !isDue && { color: theme.warning },
                      ]}
                    >
                      {item.status || (isPaid ? 'Paid' : 'Due')}
                    </Text>
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={styles.col}>
                    <Text style={[styles.label, { color: theme.textMuted }]}>Total Amount</Text>
                    <Text style={[styles.value, { color: theme.textPrimary }]}>₹{item.amount}</Text>
                  </View>
                  <View style={styles.col}>
                    <Text style={[styles.label, { color: theme.textMuted }]}>Paid</Text>
                    <Text style={[styles.value, { color: theme.success }]}>₹{item.paid}</Text>
                  </View>
                  <View style={styles.col}>
                    <Text style={[styles.label, { color: theme.textMuted }]}>Due</Text>
                    <Text style={[styles.value, { color: theme.danger }]}>₹{item.due}</Text>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  statVal: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  refreshBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  list: {
    paddingBottom: 24,
  },
  card: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.1)',
  },
  date: {
    fontSize: 13,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  col: {
    alignItems: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  value: {
    fontSize: 15,
    fontWeight: '800',
  },
  empty: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
