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
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import api from '../api/client';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Report } from '../types';
import { interactionUtils } from '../utils/interactionUtils';

export const ReportsScreen: React.FC = () => {
  const { colors: theme } = useTheme();
  const { user } = useAuth();

  // Main View Mode: 'persisted' (Default) vs 'summary'
  const [viewMode, setViewMode] = useState<'persisted' | 'summary'>('persisted');

  // Persisted Sub-Tabs: 'all' vs 'refunded'
  const [persistedSubTab, setPersistedSubTab] = useState<'all' | 'refunded'>('all');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [summaryPaymentFilter, setSummaryPaymentFilter] = useState<'all' | 'paid' | 'due'>('all');

  const [reports, setReports] = useState<Report[]>([]);
  const [summaryGroups, setSummaryGroups] = useState<any[]>([]);
  const [summaryTotals, setSummaryTotals] = useState({ revenue: 0, due: 0 });

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const isAdmin = (user?.role || '').toLowerCase() === 'admin';

  // Fetch Persisted Reports
  const fetchPersistedReports = useCallback(async (search = searchQuery, subTab = persistedSubTab) => {
    setIsLoading(true);
    try {
      const params: Record<string, any> = { limit: 50 };
      if (subTab === 'refunded') {
        params.status = 'Refund';
      }
      if (search.trim()) {
        params.q = search.trim();
      }

      const { data } = await api.get('/api/v1/reports', { params });
      setReports(data.entries || data.reports || []);
      setTotalCount(data.total || 0);
    } catch (e: any) {
      Alert.alert('Notice', e.response?.data?.message || 'Failed to load reports');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [searchQuery, persistedSubTab]);

  // Fetch Summary Groups & Totals
  const fetchSummaryReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get('/api/v1/reports/summary?groupBy=day');
      setSummaryGroups(data.byPeriod || []);
      setSummaryTotals(data.totals || { revenue: 0, due: 0 });
    } catch (e: any) {
      console.warn('Failed to load summary reports', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (viewMode === 'persisted') {
      fetchPersistedReports();
    } else {
      fetchSummaryReports();
    }
  }, [viewMode, persistedSubTab, fetchPersistedReports, fetchSummaryReports]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    if (viewMode === 'persisted') {
      fetchPersistedReports();
    } else {
      fetchSummaryReports();
    }
  }, [viewMode, fetchPersistedReports, fetchSummaryReports]);

  // Aggregate stats for persisted
  const totals = useMemo(() => {
    return reports.reduce(
      (acc, r) => ({
        total: acc.total + (Number(r.amount) || 0),
        paid: acc.paid + (Number(r.paid || r.revenue) || 0),
        due: acc.due + (Number(r.due) || 0),
      }),
      { total: 0, paid: 0, due: 0 }
    );
  }, [reports]);

  // Filtered Summary Groups
  const filteredSummaryGroups = useMemo(() => {
    if (summaryPaymentFilter === 'paid') {
      return summaryGroups.filter((g) => Number(g.revenue || 0) > 0);
    }
    if (summaryPaymentFilter === 'due') {
      return summaryGroups.filter((g) => Number(g.due || 0) > 0);
    }
    return summaryGroups;
  }, [summaryGroups, summaryPaymentFilter]);

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

  // Helper getters for robust patient and doctor names
  const getPatientName = (item: Report): string => {
    if (item.patientId?.name) return item.patientId.name;
    if (item.patientId?.firstName) {
      return `${item.patientId.firstName} ${item.patientId.lastName || ''}`.trim();
    }
    if (item.appointmentId?.name) return item.appointmentId.name;
    return 'Walk-in Patient';
  };

  const getDoctorName = (item: Report): string => {
    if (item.doctorId?.name) return item.doctorId.name;
    if (item.doctorId?.firstName) {
      return `Dr. ${item.doctorId.firstName} ${item.doctorId.lastName || ''}`.trim();
    }
    if (item.appointmentId?.doctor?.firstName) {
      return `Dr. ${item.appointmentId.doctor.firstName} ${item.appointmentId.doctor.lastName || ''}`.trim();
    }
    return 'General Physician';
  };

  const getPatientId = (item: Report): string => {
    if (item.patientId?.nic) return item.patientId.nic;
    if (item.patientId?._id) return `P-${String(item.patientId._id).slice(-5).toUpperCase()}`;
    if (item.appointmentId?.nic) return item.appointmentId.nic;
    return '-';
  };

  const getAppointmentId = (item: Report): string => {
    const id = item.appointmentId?._id || item.appointmentId;
    if (id) return `APT-${String(id).slice(-6).toUpperCase()}`;
    return '-';
  };

  // Print / Share Receipt
  const handlePrintReceipt = async (item: Report) => {
    interactionUtils.playClick();
    const patientName = getPatientName(item);
    const doctorName = getDoctorName(item);
    const receiptNo = `REC-${String(item.appointmentId?._id || item._id).slice(-6).toUpperCase()}`;
    const dateStr = item.appointmentDate ? formatDate(item.appointmentDate) : formatDate(item.createdAt);

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Payment Receipt - ${receiptNo}</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 25px; color: #1e293b; background: #fff; line-height: 1.4; }
            .receipt-box { border: 2px solid #e2e8f0; border-radius: 12px; padding: 24px; max-width: 480px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px dashed #cbd5e1; padding-bottom: 14px; margin-bottom: 18px; }
            .title { font-size: 18px; font-weight: 800; color: #096dd9; margin: 0; }
            .sub { font-size: 12px; color: #64748b; margin-top: 3px; font-weight: 600; }
            .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
            .label { color: #64748b; font-weight: 500; }
            .val { font-weight: 700; color: #0f172a; }
            .amount-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin: 18px 0; text-align: center; }
            .amount-title { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; }
            .amount-val { font-size: 24px; font-weight: 800; color: #059669; margin-top: 3px; }
            .footer { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 18px; border-top: 1px solid #f1f5f9; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="receipt-box">
            <div class="header">
              <h1 class="title">NOVEL HEALTHCARE CLINIC & HOSPITAL</h1>
              <div class="sub">Official Consultation & Billing Receipt</div>
            </div>
            <div class="info-row"><span class="label">Receipt No:</span><span class="val">${receiptNo}</span></div>
            <div class="info-row"><span class="label">Date:</span><span class="val">${dateStr}</span></div>
            <div class="info-row"><span class="label">Patient Name:</span><span class="val">${patientName}</span></div>
            <div class="info-row"><span class="label">Consulting Doctor:</span><span class="val">${doctorName}</span></div>
            <div class="info-row"><span class="label">Payment Status:</span><span class="val" style="color: ${item.status === 'Refund' ? '#be123c' : (item.status === 'Paid' ? '#059669' : '#dc2626')}">${item.status === 'Refund' ? 'Refunded' : (item.status || 'Due')}</span></div>
            
            <div class="amount-box">
              <div class="amount-title">Total Transaction Amount</div>
              <div class="amount-val">₹${(Number(item.amount) || 0).toLocaleString()}</div>
              <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Paid: ₹${(Number(item.paid || item.revenue) || 0).toLocaleString()} • Due: ₹${(Number(item.due) || 0).toLocaleString()}</div>
            </div>
            <div class="footer">Thank you for visiting Novel Healthcare. Computer-generated receipt.</div>
          </div>
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        await Print.printAsync({ uri });
      }
    } catch (err: any) {
      Alert.alert('Notice', err.message || 'Failed to print/share receipt');
    }
  };

  // Delete Report (Admin only)
  const handleDeleteReport = (id: string) => {
    Alert.alert('Delete Report', 'Are you sure you want to delete this report entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/v1/reports/${id}`);
            interactionUtils.playClick();
            setReports((prev) => prev.filter((r) => r._id !== id));
            Alert.alert('Success', 'Report entry deleted');
          } catch (e: any) {
            Alert.alert('Error', e.response?.data?.message || 'Failed to delete report');
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Top View Mode Switcher: Persisted (Default) vs Financial Summary */}
      <View style={[styles.segmentedControl, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.segmentBtn, viewMode === 'persisted' && { backgroundColor: theme.primary }]}
          onPress={() => {
            interactionUtils.playClick();
            setViewMode('persisted');
          }}
        >
          <Ionicons
            name="document-text-outline"
            size={14}
            color={viewMode === 'persisted' ? '#fff' : theme.textMuted}
          />
          <Text style={[styles.segmentText, viewMode === 'persisted' && { color: '#fff', fontWeight: '800' }]}>
            Persisted Records
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentBtn, viewMode === 'summary' && { backgroundColor: theme.primary }]}
          onPress={() => {
            interactionUtils.playClick();
            setViewMode('summary');
          }}
        >
          <Ionicons
            name="bar-chart-outline"
            size={14}
            color={viewMode === 'summary' ? '#fff' : theme.textMuted}
          />
          <Text style={[styles.segmentText, viewMode === 'summary' && { color: '#fff', fontWeight: '800' }]}>
            Financial Summary
          </Text>
        </TouchableOpacity>
      </View>

      {/* Header Stat Summary Cards */}
      <View style={styles.statsContainer}>
        <View style={[styles.statBox, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Ionicons name="wallet-outline" size={16} color={theme.primary} />
          <Text style={[styles.statLabel, { color: theme.textMuted }]}>
            {viewMode === 'persisted' ? 'Total Billed' : 'Total Revenue'}
          </Text>
          <Text style={[styles.statVal, { color: theme.primary }]}>
            ₹{(viewMode === 'persisted' ? totals.total : (summaryTotals.revenue + summaryTotals.due)).toLocaleString()}
          </Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Ionicons name="checkmark-circle-outline" size={16} color={theme.success} />
          <Text style={[styles.statLabel, { color: theme.textMuted }]}>Collected</Text>
          <Text style={[styles.statVal, { color: theme.success }]}>
            ₹{(viewMode === 'persisted' ? totals.paid : summaryTotals.revenue).toLocaleString()}
          </Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Ionicons name="alert-circle-outline" size={16} color={theme.danger} />
          <Text style={[styles.statLabel, { color: theme.textMuted }]}>Outstanding</Text>
          <Text style={[styles.statVal, { color: theme.danger }]}>
            ₹{(viewMode === 'persisted' ? totals.due : summaryTotals.due).toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Persisted View */}
      {viewMode === 'persisted' && (
        <>
          {/* Sub-Tabs: All Transactions vs Refunded Appointments */}
          <View style={styles.subTabBar}>
            <TouchableOpacity
              style={[
                styles.subTabBtn,
                persistedSubTab === 'all' && [styles.subTabBtnActive, { borderColor: theme.primary, backgroundColor: theme.primarySoft }],
              ]}
              onPress={() => {
                interactionUtils.playClick();
                setPersistedSubTab('all');
              }}
            >
              <Text
                style={[
                  styles.subTabText,
                  { color: theme.textMuted },
                  persistedSubTab === 'all' && { color: theme.primary, fontWeight: '800' },
                ]}
              >
                All Transactions {persistedSubTab === 'all' ? `(${totalCount})` : ''}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.subTabBtn,
                persistedSubTab === 'refunded' && [styles.subTabBtnActive, { borderColor: '#e11d48', backgroundColor: '#ffe4e6' }],
              ]}
              onPress={() => {
                interactionUtils.playClick();
                setPersistedSubTab('refunded');
              }}
            >
              <Text
                style={[
                  styles.subTabText,
                  { color: theme.textMuted },
                  persistedSubTab === 'refunded' && { color: '#be123c', fontWeight: '800' },
                ]}
              >
                💸 Refunded Appointments {persistedSubTab === 'refunded' ? `(${totalCount})` : ''}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Search Box */}
          <View style={[styles.searchBox, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <Ionicons name="search-outline" size={16} color={theme.textMuted} style={{ marginRight: 6 }} />
            <TextInput
              style={[styles.searchInput, { color: theme.textPrimary }]}
              placeholder="Search by name, ID, Apt ID, invoice #..."
              placeholderTextColor={theme.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={() => fetchPersistedReports(searchQuery)}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  fetchPersistedReports('');
                }}
                style={{ padding: 4 }}
              >
                <Ionicons name="close-circle" size={16} color={theme.textMuted} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.searchActionBtn, { backgroundColor: theme.primary }]}
              onPress={() => fetchPersistedReports(searchQuery)}
            >
              <Ionicons name="arrow-forward" size={14} color="#fff" />
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
                  <Ionicons name="receipt-outline" size={44} color={theme.textMuted} style={{ marginBottom: 8 }} />
                  <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                    {persistedSubTab === 'refunded' ? 'No refunded appointments found' : 'No transactions matching your criteria'}
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const isPaid = item.status === 'Paid';
                const isRefund = item.status === 'Refund' || item.appointmentId?.paymentStatus === 'Refund';
                const isDue = item.status === 'Due';

                const patName = getPatientName(item);
                const docName = getDoctorName(item);
                const patId = getPatientId(item);
                const apptId = getAppointmentId(item);

                return (
                  <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                    {/* Top ID Tags & Status */}
                    <View style={styles.cardHeader}>
                      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                        <View style={[styles.idBadge, { backgroundColor: theme.primarySoft }]}>
                          <Text style={[styles.idBadgeText, { color: theme.primary }]}>{patId}</Text>
                        </View>
                        <View style={[styles.idBadge, { backgroundColor: '#f1f5f9' }]}>
                          <Text style={[styles.idBadgeText, { color: '#475569' }]}>{apptId}</Text>
                        </View>
                      </View>

                      <View
                        style={[
                          styles.statusBadge,
                          isRefund && { backgroundColor: '#ffe4e6', borderColor: '#fecdd3' },
                          isPaid && { backgroundColor: theme.successSoft, borderColor: theme.successBorder },
                          isDue && { backgroundColor: theme.dangerSoft, borderColor: theme.dangerBorder },
                          !isRefund && !isPaid && !isDue && { backgroundColor: theme.warningSoft, borderColor: theme.warningBorder },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            isRefund && { color: '#be123c' },
                            isPaid && { color: theme.success },
                            isDue && { color: theme.danger },
                            !isRefund && !isPaid && !isDue && { color: theme.warning },
                          ]}
                        >
                          {isRefund ? 'Refunded' : (item.status || 'Due')}
                        </Text>
                      </View>
                    </View>

                    {/* Patient & Doctor Details */}
                    <View style={styles.detailsBlock}>
                      <Text style={[styles.patientName, { color: theme.textPrimary }]}>{patName}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <Ionicons name="medical-outline" size={12} color={theme.textMuted} />
                        <Text style={[styles.doctorName, { color: theme.textMuted }]}>{docName}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <Ionicons name="calendar-outline" size={12} color={theme.textMuted} />
                        <Text style={[styles.dateText, { color: theme.textMuted }]}>
                          {formatDate(item.appointmentDate || item.createdAt)}
                        </Text>
                      </View>
                    </View>

                    {/* Financial Amounts Row */}
                    <View style={[styles.amountsRow, { backgroundColor: '#f8fafc', borderColor: '#f1f5f9' }]}>
                      <View style={styles.col}>
                        <Text style={[styles.label, { color: theme.textMuted }]}>Total</Text>
                        <Text style={[styles.valText, { color: theme.textPrimary }]}>₹{item.amount}</Text>
                      </View>
                      <View style={styles.col}>
                        <Text style={[styles.label, { color: theme.textMuted }]}>Paid</Text>
                        <Text style={[styles.valText, { color: theme.success }]}>₹{item.paid || item.revenue || 0}</Text>
                      </View>
                      <View style={styles.col}>
                        <Text style={[styles.label, { color: theme.textMuted }]}>Due</Text>
                        <Text style={[styles.valText, { color: theme.danger }]}>₹{item.due || 0}</Text>
                      </View>
                    </View>

                    {/* Action Buttons: Print Receipt & Admin Delete */}
                    <View style={styles.cardActionsRow}>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.receiptBtn]}
                        onPress={() => handlePrintReceipt(item)}
                      >
                        <Ionicons name="receipt-outline" size={14} color="#059669" />
                        <Text style={[styles.actionBtnText, { color: '#059669' }]}>Receipt</Text>
                      </TouchableOpacity>

                      {isAdmin && (
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.deleteBtn]}
                          onPress={() => handleDeleteReport(item._id)}
                        >
                          <Ionicons name="trash-outline" size={14} color="#dc2626" />
                          <Text style={[styles.actionBtnText, { color: '#dc2626' }]}>Delete</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              }}
            />
          )}
        </>
      )}

      {/* Financial Summary View */}
      {viewMode === 'summary' && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 30 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
        >
          {/* Payment Type Filter Switcher */}
          <View style={[styles.filterSelector, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            {(['all', 'paid', 'due'] as const).map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterOptionBtn,
                  summaryPaymentFilter === filter && { backgroundColor: theme.primary },
                ]}
                onPress={() => {
                  interactionUtils.playClick();
                  setSummaryPaymentFilter(filter);
                }}
              >
                <Text
                  style={[
                    styles.filterOptionText,
                    { color: theme.textMuted },
                    summaryPaymentFilter === filter && { color: '#fff', fontWeight: '800' },
                  ]}
                >
                  {filter === 'all' ? 'All (Paid & Due)' : filter === 'paid' ? 'Paid Only' : 'Due Only'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Visual Breakdown Bar Cards with Explicit Numbers */}
          <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>Period Breakdown</Text>
          {filteredSummaryGroups.map((g, idx) => {
            const revenue = Number(g.revenue || 0);
            const due = Number(g.due || 0);
            const total = revenue + due;
            const maxVal = Math.max(revenue, due, 100);
            const revPct = maxVal > 0 ? (revenue / maxVal) * 100 : 0;
            const duePct = maxVal > 0 ? (due / maxVal) * 100 : 0;

            return (
              <View key={idx} style={[styles.summaryCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                <View style={styles.summaryCardHeader}>
                  <Text style={[styles.summaryPeriod, { color: theme.textPrimary }]}>{g.period}</Text>
                  <Text style={[styles.summaryCount, { color: theme.textMuted }]}>
                    {g.count || g.invoices || g.appointments || 0} transactions
                  </Text>
                </View>

                {/* Paid Bar with Explicit Numbers */}
                <View style={{ marginTop: 8 }}>
                  <View style={styles.barLabelRow}>
                    <Text style={[styles.barTitle, { color: theme.success }]}>Paid</Text>
                    <Text style={[styles.barVal, { color: theme.success }]}>₹{revenue.toLocaleString()}</Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${Math.min(100, Math.max(5, revPct))}%`, backgroundColor: '#10b981' }]} />
                  </View>
                </View>

                {/* Due Bar with Explicit Numbers */}
                <View style={{ marginTop: 8 }}>
                  <View style={styles.barLabelRow}>
                    <Text style={[styles.barTitle, { color: theme.danger }]}>Due</Text>
                    <Text style={[styles.barVal, { color: theme.danger }]}>₹{due.toLocaleString()}</Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${Math.min(100, Math.max(5, duePct))}%`, backgroundColor: '#f87171' }]} />
                  </View>
                </View>

                <View style={[styles.summaryFooter, { borderTopColor: '#f1f5f9' }]}>
                  <Text style={[styles.summaryTotalLabel, { color: theme.textMuted }]}>Total Billed:</Text>
                  <Text style={[styles.summaryTotalVal, { color: theme.textPrimary }]}>₹{total.toLocaleString()}</Text>
                </View>
              </View>
            );
          })}

          {filteredSummaryGroups.length === 0 && (
            <View style={styles.empty}>
              <Ionicons name="pie-chart-outline" size={44} color={theme.textMuted} style={{ marginBottom: 8 }} />
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>No summary records found</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 14,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    marginBottom: 12,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 9,
    gap: 6,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  statLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    marginTop: 3,
    textTransform: 'uppercase',
  },
  statVal: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  subTabBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  subTabBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  subTabBtnActive: {
    borderWidth: 1.5,
  },
  subTabText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    height: 38,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    paddingVertical: 0,
  },
  searchActionBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  list: {
    paddingBottom: 20,
  },
  card: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  idBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  idBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  detailsBlock: {
    marginBottom: 8,
  },
  patientName: {
    fontSize: 14,
    fontWeight: '800',
  },
  doctorName: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 11,
    fontWeight: '500',
  },
  amountsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  col: {
    alignItems: 'center',
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 1,
  },
  valText: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  receiptBtn: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  deleteBtn: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  filterSelector: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    padding: 3,
    marginBottom: 12,
    gap: 4,
  },
  filterOptionBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 7,
    alignItems: 'center',
  },
  filterOptionText: {
    fontSize: 11,
    fontWeight: '600',
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },
  summaryCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  summaryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryPeriod: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  summaryCount: {
    fontSize: 11,
    fontWeight: '600',
  },
  barLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 2,
  },
  barTitle: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  barVal: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  barTrack: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  summaryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    marginTop: 10,
    paddingTop: 6,
  },
  summaryTotalLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  summaryTotalVal: {
    fontSize: 13,
    fontWeight: '800',
  },
  empty: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
