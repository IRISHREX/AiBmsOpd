import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import api from '../api/client';

interface Report {
  _id: string;
  appointmentId: string;
  appointmentDate: string;
  amount: number;
  paid: number;
  due: number;
  status: string;
  createdAt: string;
}

export const ReportsScreen: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get('/api/v1/reports'); // Typical reports endpoint
      setReports(data.reports || data.data || []);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to load reports');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Financial Reports</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No reports found</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.date}>{new Date(item.appointmentDate || item.createdAt).toLocaleDateString()}</Text>
                <Text style={[
                  styles.status,
                  item.status === 'Paid' && { color: '#059669', backgroundColor: '#d1fae5' },
                  item.status === 'Due' && { color: '#ef4444', backgroundColor: '#fee2e2' },
                  item.status === 'Partial' && { color: '#d97706', backgroundColor: '#fef3c7' }
                ]}>
                  {item.status || 'Due'}
                </Text>
              </View>
              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={styles.label}>Total Amount</Text>
                  <Text style={styles.value}>₹{item.amount}</Text>
                </View>
                <View style={styles.col}>
                  <Text style={styles.label}>Paid</Text>
                  <Text style={[styles.value, { color: '#059669' }]}>₹{item.paid}</Text>
                </View>
                <View style={styles.col}>
                  <Text style={styles.label}>Due</Text>
                  <Text style={[styles.value, { color: '#ef4444' }]}>₹{item.due}</Text>
                </View>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#0f172a' },
  list: { paddingBottom: 20 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#94a3b8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: '#f1f5f9' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  date: { fontSize: 16, fontWeight: '600', color: '#334155' },
  status: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, fontSize: 12, fontWeight: '700', overflow: 'hidden' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  col: { alignItems: 'center' },
  label: { fontSize: 12, color: '#64748b', marginBottom: 4 },
  value: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#94a3b8', fontSize: 16 },
});
