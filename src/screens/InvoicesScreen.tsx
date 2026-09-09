import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { invoicesApi } from '../api/invoices';
import { Invoice } from '../types';
import { interactionUtils } from '../utils/interactionUtils';
import { LayoutAnimation } from 'react-native';

export const InvoicesScreen: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchInvoices = async () => {
    try {
      const [invList, statsRes] = await Promise.allSettled([
        invoicesApi.getAll(),
        invoicesApi.getStats(),
      ]);

      if (invList.status === 'fulfilled') {
        setInvoices(Array.isArray(invList.value) ? invList.value : []);
      }
      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || e?.message || 'Failed to load invoices:');
      console.warn('Failed to load invoices:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleSettle = async (invoiceId: string) => {
    Alert.alert('Settle Invoice', 'Mark this invoice as fully paid?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark as Paid',
        onPress: async () => {
          try {
            await invoicesApi.settle(invoiceId, { paymentMethod: 'Cash' });
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            interactionUtils.playSuccess();
            interactionUtils.triggerNotification('Payment Received', 'Invoice has been marked as paid.');
            setInvoices((prev) =>
              prev.map((inv) =>
                inv._id === invoiceId
                  ? { ...inv, status: 'Paid', paidAmount: inv.payableAmount }
                  : inv
              )
            );
            Alert.alert('Success', 'Invoice settled successfully!');
          } catch (e: any) {
            Alert.alert('Error', e?.response?.data?.message || e?.message || 'Failed to settle invoice');
          }
        },
      },
    ]);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Invoice', 'Are you sure you want to remove this invoice?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await invoicesApi.delete(id);
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            interactionUtils.playClick();
            setInvoices((prev) => prev.filter((i) => i._id !== id));
          } catch (e: any) {
            Alert.alert('Error', e?.response?.data?.message || e?.message || 'Failed to delete invoice');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Stats Header */}
      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>Billing & Revenue</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Total Invoices</Text>
            <Text style={styles.statValue}>{invoices.length}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Total Paid</Text>
            <Text style={[styles.statValue, { color: '#059669' }]}>
              ₹{stats?.totalPaid || invoices.filter((i) => i.status === 'Paid').reduce((acc, curr) => acc + (curr.paidAmount || curr.payableAmount || 0), 0)}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Pending</Text>
            <Text style={[styles.statValue, { color: '#d97706' }]}>
              {invoices.filter((i) => i.status !== 'Paid').length}
            </Text>
          </View>
        </View>
      </View>

      {/* Invoice List */}
      {isLoading ? (
        <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={invoices}
          keyExtractor={(item) => item._id}
          refreshing={isRefreshing}
          onRefresh={() => {
            setIsRefreshing(true);
            fetchInvoices();
          }}
          contentContainerStyle={styles.list}
          initialNumToRender={10}
          maxToRenderPerBatch={5}
          windowSize={11}
          removeClippedSubviews={true}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No invoices generated yet</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.patientName}>{item.patientName}</Text>
                  <Text style={styles.dateText}>
                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    item.status === 'Paid' ? styles.statusPaid : styles.statusUnpaid,
                  ]}
                >
                  <Text style={styles.statusText}>{item.status}</Text>
                </View>
              </View>

              <View style={styles.amountRow}>
                <Text style={styles.amountLabel}>Payable Amount:</Text>
                <Text style={styles.amountValue}>
                  ₹{item.payableAmount ?? item.totalAmount ?? 0}
                </Text>
              </View>

              <View style={styles.cardActions}>
                {item.status !== 'Paid' && (
                  <TouchableOpacity
                    style={[styles.btn, styles.btnSettle]}
                    onPress={() => handleSettle(item._id)}
                  >
                    <Text style={styles.btnSettleText}>💵 Settle Payment</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.btn, styles.btnDelete]}
                  onPress={() => handleDelete(item._id)}
                >
                  <Text style={styles.btnDeleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  statsCard: {
    backgroundColor: '#ffffff',
    margin: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2,
  },
  list: {
    paddingHorizontal: 12,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  dateText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPaid: {
    backgroundColor: '#d1fae5',
  },
  statusUnpaid: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1e293b',
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 6,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  amountLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  amountValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0284c7',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 6,
  },
  btn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  btnSettle: {
    backgroundColor: '#ecfdf5',
  },
  btnSettleText: {
    color: '#059669',
    fontWeight: '600',
    fontSize: 12,
  },
  btnDelete: {
    backgroundColor: '#fef2f2',
  },
  btnDeleteText: {
    color: '#dc2626',
    fontWeight: '600',
    fontSize: 12,
  },
  empty: {
    alignItems: 'center',
    padding: 30,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14,
  },
});
