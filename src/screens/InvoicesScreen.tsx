import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  LayoutAnimation,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { invoicesApi } from '../api/invoices';
import { Invoice } from '../types';
import { colors } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { interactionUtils } from '../utils/interactionUtils';

export const InvoicesScreen: React.FC = () => {
  const { colors } = useTheme();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'All' | 'Pending' | 'Paid'>('All');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [settlingId, setSettlingId] = useState<string | null>(null);

  const fetchInvoices = async () => {
    try {
      const invList = await invoicesApi.getAll();
      if (Array.isArray(invList)) {
        setInvoices(invList);
      } else {
        setInvoices([]);
      }
    } catch (e: any) {
      Alert.alert('Notice', e?.response?.data?.message || e?.message || 'Failed to load invoices');
      console.warn('Failed to load invoices:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      fetchInvoices();
      return;
    }
    try {
      const results = await invoicesApi.search(query.trim());
      setInvoices(Array.isArray(results) ? results : []);
    } catch (e) {
      console.warn('Search failed', e);
    }
  };

  // Helper getters for robust invoice parsing
  const getPatientName = (item: Invoice): string => {
    if (item.appointment?.name) return item.appointment.name;
    if (item.appointment?.patientName) return item.appointment.patientName;
    if (item.patient?.name) return item.patient.name;
    if (item.patient?.firstName) {
      return `${item.patient.firstName} ${item.patient.lastName || ''}`.trim();
    }
    return 'Walk-in Patient';
  };

  const getDoctorName = (item: Invoice): string => {
    if (item.doctor?.name) return item.doctor.name;
    if (item.doctor?.firstName) {
      return `Dr. ${item.doctor.firstName} ${item.doctor.lastName || ''}`.trim();
    }
    if (item.appointment?.doctor?.firstName) {
      return `Dr. ${item.appointment.doctor.firstName} ${item.appointment.doctor.lastName || ''}`.trim();
    }
    return 'Dr. OPD Consultant';
  };

  const getInvoiceTotal = (item: Invoice): number => {
    if (typeof item.total === 'number' && !isNaN(item.total) && item.total > 0) {
      return item.total;
    }
    if (typeof item.payableAmount === 'number' && !isNaN(item.payableAmount) && item.payableAmount > 0) {
      return item.payableAmount;
    }
    if (typeof item.totalAmount === 'number' && !isNaN(item.totalAmount) && item.totalAmount > 0) {
      return item.totalAmount;
    }
    if (typeof item.subtotal === 'number' && !isNaN(item.subtotal) && item.subtotal > 0) {
      return item.subtotal;
    }
    if (Array.isArray(item.items) && item.items.length > 0) {
      return item.items.reduce((s, it) => s + (Number(it.total) || (Number(it.quantity || 1) * Number(it.unitPrice || 0))), 0);
    }
    if (item.appointment?.price) {
      return Number(item.appointment.price) || 0;
    }
    return 0;
  };

  const getPaidAmount = (item: Invoice): number => {
    if (Array.isArray(item.payments) && item.payments.length > 0) {
      return item.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    }
    if (item.status === 'Paid') {
      return getInvoiceTotal(item);
    }
    return Number(item.paidAmount) || 0;
  };

  const isInvoicePaid = (item: Invoice): boolean => {
    if (item.status === 'Paid') return true;
    const total = getInvoiceTotal(item);
    const paid = getPaidAmount(item);
    return total > 0 && paid >= total;
  };

  // Financial calculations
  const stats = useMemo(() => {
    const totalInvoices = invoices.length;
    let totalRevenue = 0;
    let totalCollected = 0;
    let pendingCount = 0;

    invoices.forEach((inv) => {
      const tot = getInvoiceTotal(inv);
      const paid = getPaidAmount(inv);
      totalRevenue += tot;
      totalCollected += paid;
      if (!isInvoicePaid(inv)) {
        pendingCount++;
      }
    });

    return {
      totalInvoices,
      totalRevenue,
      totalCollected,
      pendingCount,
      pendingAmount: Math.max(0, totalRevenue - totalCollected),
    };
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    let list = invoices;
    if (selectedFilter === 'Paid') {
      list = list.filter((i) => isInvoicePaid(i));
    } else if (selectedFilter === 'Pending') {
      list = list.filter((i) => !isInvoicePaid(i));
    }
    return list;
  }, [invoices, selectedFilter]);

  const handleSettle = async (invoiceId: string) => {
    Alert.alert(
      'Settle Invoice',
      'Confirm recording complete payment for this invoice?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark as Paid',
          onPress: async () => {
            setSettlingId(invoiceId);
            try {
              await invoicesApi.settle(invoiceId);
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              interactionUtils.playSuccess();
              interactionUtils.triggerNotification('Payment Received', 'Invoice has been marked as fully paid.');
              
              setInvoices((prev) =>
                prev.map((inv) => {
                  if (inv._id === invoiceId) {
                    const total = getInvoiceTotal(inv);
                    return {
                      ...inv,
                      status: 'Paid',
                      paidAmount: total,
                      payments: [{ amount: total, method: 'Cash', date: new Date().toISOString() }],
                    };
                  }
                  return inv;
                })
              );
              Alert.alert('Success', 'Invoice settled successfully!');
            } catch (e: any) {
              Alert.alert('Error', e?.response?.data?.message || e?.message || 'Failed to settle invoice');
            } finally {
              setSettlingId(null);
            }
          },
        },
      ]
    );
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Invoice', 'Are you sure you want to remove this billing record?', [
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
      {/* Luxury Bluish & Goldish Stats Header */}
      <View style={styles.statsCard}>
        <View style={styles.statsHeaderRow}>
          <View style={styles.statsTitleBadge}>
            <Ionicons name="receipt-outline" size={16} color={colors.goldBright} />
            <Text style={styles.statsTitleText}>Billing & Revenue</Text>
          </View>
          <View style={styles.statsLiveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Live Ledger</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
              <Ionicons name="receipt-outline" size={12} color={colors.primaryLight} style={{ marginRight: 3 }} />
              <Text style={styles.statLabel}>Invoices</Text>
            </View>
            <Text style={styles.statValueBlue}>{stats.totalInvoices}</Text>
          </View>
          <View style={styles.statBox}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
              <Ionicons name="checkmark-circle-outline" size={12} color={colors.goldBright} style={{ marginRight: 3 }} />
              <Text style={styles.statLabel}>Collected</Text>
            </View>
            <Text style={styles.statValueGold}>₹{stats.totalCollected}</Text>
          </View>
          <View style={styles.statBox}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
              <Ionicons name="alert-circle-outline" size={12} color="#f59e0b" style={{ marginRight: 3 }} />
              <Text style={styles.statLabel}>Due</Text>
            </View>
            <Text style={styles.statValueAmber}>₹{stats.pendingAmount}</Text>
          </View>
          <View style={styles.statBox}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
              <Ionicons name="time-outline" size={12} color="#f87171" style={{ marginRight: 3 }} />
              <Text style={styles.statLabel}>Unsettled</Text>
            </View>
            <Text style={styles.statValueUnsettled}>{stats.pendingCount}</Text>
          </View>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(['All', 'Pending', 'Paid'] as const).map((filter) => {
          const isActive = selectedFilter === filter;
          const iconName =
            filter === 'All'
              ? 'list'
              : filter === 'Pending'
              ? 'time-outline'
              : 'checkmark-circle';
          return (
            <TouchableOpacity
              key={filter}
              style={[styles.filterTab, isActive && styles.filterTabActive, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}
              onPress={() => {
                interactionUtils.playClick();
                setSelectedFilter(filter);
              }}
            >
              <Ionicons
                name={iconName}
                size={13}
                color={isActive ? colors.textWhite : colors.textSecondary}
              />
              <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                {filter} {filter === 'Pending' ? `(${stats.pendingCount})` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Search Bar with Ionicon */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search invoice number, patient, or doctor..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Invoice List */}
      {isLoading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredInvoices}
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
              <Ionicons name="document-text-outline" size={48} color={colors.goldMuted} />
              <Text style={styles.emptyTitle}>No Billing Records Found</Text>
              <Text style={styles.emptySub}>
                {searchQuery ? 'No invoices matched your query' : 'New invoices will automatically appear here.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isPaid = isInvoicePaid(item);
            const total = getInvoiceTotal(item);
            const paid = getPaidAmount(item);
            const patientName = getPatientName(item);
            const doctorName = getDoctorName(item);
            const invNumber = item.invoiceNumber || `INV-${item._id.slice(-6).toUpperCase()}`;
            const dateStr = item.issuedAt
              ? new Date(item.issuedAt).toLocaleDateString()
              : item.createdAt
              ? new Date(item.createdAt).toLocaleDateString()
              : 'Today';

            return (
              <View style={[styles.card, !isPaid && styles.cardPending]}>
                {/* Top Row: Invoice # Badge & Status Badge */}
                <View style={styles.cardHeader}>
                  <View style={styles.invNumberBadge}>
                    <Ionicons name="receipt-outline" size={13} color={colors.primary} style={{ marginRight: 4 }} />
                    <Text style={styles.invNumberText}>{invNumber}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      isPaid ? styles.statusBadgePaid : styles.statusBadgePending,
                    ]}
                  >
                    <Ionicons
                      name={isPaid ? 'checkmark-circle' : 'time'}
                      size={12}
                      color={isPaid ? colors.success : colors.goldDark}
                      style={{ marginRight: 3 }}
                    />
                    <Text style={[styles.statusText, isPaid ? styles.statusTextPaid : styles.statusTextPending]}>
                      {isPaid ? 'PAID' : 'PENDING'}
                    </Text>
                  </View>
                </View>

                {/* Patient & Doctor Info */}
                <View style={styles.cardBody}>
                  <View style={styles.patientRow}>
                    <Ionicons name="person" size={15} color={colors.primary} style={{ marginRight: 6, marginTop: 2 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.patientName}>{patientName}</Text>
                      <Text style={styles.doctorName}>
                        <Ionicons name="medkit-outline" size={12} color={colors.textSecondary} /> {doctorName}
                      </Text>
                    </View>
                    <Text style={styles.dateText}>{dateStr}</Text>
                  </View>

                  {/* Item Description Tags */}
                  {Array.isArray(item.items) && item.items.length > 0 && (
                    <View style={styles.itemsRow}>
                      {item.items.slice(0, 3).map((it, idx) => (
                        <View key={idx} style={styles.itemTag}>
                          <Text style={styles.itemTagText}>
                            {it.description || 'Service'} (₹{it.total ?? it.unitPrice})
                          </Text>
                        </View>
                      ))}
                      {item.items.length > 3 && (
                        <View style={styles.itemTag}>
                          <Text style={styles.itemTagText}>+{item.items.length - 3} more</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>

                {/* Financial Summary Row */}
                <View style={styles.amountContainer}>
                  <View style={styles.amountCol}>
                    <Text style={styles.amountLabel}>Total Bill</Text>
                    <Text style={styles.totalValue}>₹{total}</Text>
                  </View>
                  <View style={styles.amountDivider} />
                  <View style={styles.amountCol}>
                    <Text style={styles.amountLabel}>Paid</Text>
                    <Text style={[styles.paidValue, isPaid && { color: colors.success }]}>₹{paid}</Text>
                  </View>
                  <View style={styles.amountDivider} />
                  <View style={styles.amountCol}>
                    <Text style={styles.amountLabel}>Balance</Text>
                    <Text style={[styles.balanceValue, isPaid ? { color: colors.textMuted } : { color: colors.goldDark }]}>
                      ₹{Math.max(0, total - paid)}
                    </Text>
                  </View>
                </View>

                {/* Card Action Buttons */}
                <View style={styles.cardActions}>
                  {!isPaid && (
                    <TouchableOpacity
                      style={styles.btnSettle}
                      onPress={() => handleSettle(item._id)}
                      disabled={settlingId === item._id}
                    >
                      {settlingId === item._id ? (
                        <ActivityIndicator size="small" color={colors.textWhite} />
                      ) : (
                        <>
                          <Ionicons name="cash-outline" size={15} color={colors.textWhite} style={{ marginRight: 4 }} />
                          <Text style={styles.btnSettleText}>Pay (₹{Math.max(0, total - paid)})</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.btnDelete}
                    onPress={() => handleDelete(item._id)}
                  >
                    <Ionicons name="trash-outline" size={14} color={colors.danger} />
                    <Text style={styles.btnDeleteText}>Del</Text>
                  </TouchableOpacity>
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
    backgroundColor: colors.background,
  },
  statsCard: {
    backgroundColor: colors.primaryDark,
    margin: 12,
    marginBottom: 8,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gold,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  statsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  statsTitleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statsTitleText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textWhite,
    letterSpacing: 0.3,
  },
  statsLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(217, 119, 6, 0.25)',
    borderColor: colors.goldLight,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.goldBright,
    marginRight: 5,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.goldBright,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.goldMuted,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  statValueBlue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textWhite,
  },
  statValueGold: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.goldBright,
  },
  statValueAmber: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fb923c',
  },
  statValueUnsettled: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f87171',
  },
  filterRow: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginBottom: 8,
    backgroundColor: colors.primarySoft,
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 8,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterTabTextActive: {
    color: colors.textWhite,
    fontWeight: '700',
  },
  searchContainer: {
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
    padding: 0,
  },
  list: {
    paddingHorizontal: 12,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardPending: {
    borderColor: colors.goldMuted,
    backgroundColor: '#fffdfa',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  invNumberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
  },
  invNumberText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusBadgePaid: {
    backgroundColor: colors.successSoft,
    borderColor: colors.successBorder,
  },
  statusBadgePending: {
    backgroundColor: colors.goldSoft,
    borderColor: colors.goldBorder,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusTextPaid: {
    color: colors.success,
  },
  statusTextPending: {
    color: colors.goldDark,
  },
  cardBody: {
    marginBottom: 10,
  },
  patientRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  patientName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  doctorName: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  dateText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
  itemsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  itemTag: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  itemTagText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
    marginBottom: 10,
  },
  amountCol: {
    flex: 1,
    alignItems: 'center',
  },
  amountDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.primaryMuted,
  },
  amountLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
  paidValue: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  balanceValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    alignItems: 'center',
  },
  btnSettle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gold,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    shadowColor: colors.gold,
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  btnSettleText: {
    color: colors.textWhite,
    fontSize: 12,
    fontWeight: '700',
  },
  btnDelete: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.dangerSoft,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  btnDeleteText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '600',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
});
