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
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import api from '../api/client';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { SystemLog } from '../types';
import { interactionUtils } from '../utils/interactionUtils';

export const SystemLogsScreen: React.FC = () => {
  const { colors: theme } = useTheme();
  const { user } = useAuth();

  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [stats, setStats] = useState<{
    totalLogs: number;
    errorCount: number;
    warnCount: number;
    shouldPromptDownload: boolean;
    daysSinceLastDownload: number;
  }>({
    totalLogs: 0,
    errorCount: 0,
    warnCount: 0,
    shouldPromptDownload: false,
    daysSinceLastDownload: 0,
  });

  const [levelFilter, setLevelFilter] = useState<'ALL' | 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/api/v1/logs/stats');
      setStats({
        totalLogs: data.totalLogs || 0,
        errorCount: data.errorCount || 0,
        warnCount: data.warnCount || 0,
        shouldPromptDownload: !!data.shouldPromptDownload,
        daysSinceLastDownload: data.daysSinceLastDownload || 0,
      });
    } catch (e) {
      console.warn('Failed to load log stats', e);
    }
  };

  const fetchLogs = useCallback(async (search = searchQuery, level = levelFilter) => {
    setIsLoading(true);
    try {
      const params: Record<string, any> = { limit: 100 };
      if (level !== 'ALL') {
        params.level = level;
      }
      if (search.trim()) {
        params.q = search.trim();
      }

      const { data } = await api.get('/api/v1/logs', { params });
      setLogs(data.logs || []);
    } catch (e: any) {
      Alert.alert('Notice', e.response?.data?.message || 'Failed to load system logs');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [searchQuery, levelFilter]);

  useEffect(() => {
    fetchStats();
    fetchLogs();
  }, [fetchLogs]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchStats();
    fetchLogs();
  }, [fetchLogs]);

  // Export CSV of logs
  const handleExportCSV = async () => {
    interactionUtils.playClick();
    if (logs.length === 0) {
      Alert.alert('Notice', 'No logs available to export');
      return;
    }

    try {
      const headers = 'Timestamp,Level,Category,Action,User,Role,Message,IP\n';
      const rows = logs.map((l) => {
        const time = new Date(l.createdAt).toISOString();
        const msg = (l.message || '').replace(/"/g, '""');
        return `"${time}","${l.level}","${l.category}","${l.action}","${l.userName || ''}","${l.userRole || ''}","${msg}","${l.ipAddress || ''}"`;
      }).join('\n');

      const csvContent = headers + rows;
      const fileUri = `${FileSystem.documentDirectory || FileSystem.cacheDirectory}system-logs-${new Date().toISOString().slice(0, 10)}.csv`;

      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export System Audit Logs',
          UTI: 'public.comma-separated-values-text',
        });
        // Mark as downloaded
        try {
          await api.post('/api/v1/logs/downloaded');
          fetchStats();
        } catch {}
      } else {
        Alert.alert('Success', `Log file saved to ${fileUri}`);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to export logs');
    }
  };

  // Clear / Purge Logs (Admin only)
  const handleClearLogs = () => {
    Alert.alert(
      'Purge System Logs',
      'Are you sure you want to purge system logs? This action is recorded.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Purge',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete('/api/v1/logs/purge', { data: { olderThanDays: 30 } });
              interactionUtils.playClick();
              Alert.alert('Success', 'Older logs purged successfully');
              fetchLogs();
              fetchStats();
            } catch (e: any) {
              Alert.alert('Error', e.response?.data?.message || 'Failed to purge logs');
            }
          },
        },
      ]
    );
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR':
        return { bg: '#fee2e2', text: '#dc2626', border: '#fecaca' };
      case 'WARN':
        return { bg: '#fef3c7', text: '#d97706', border: '#fde68a' };
      case 'SUCCESS':
        return { bg: '#dcfce7', text: '#16a34a', border: '#bbf7d0' };
      default:
        return { bg: '#e0f2fe', text: '#0284c7', border: '#bae6fd' };
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* 7-Day Download Alert Banner */}
      {stats.shouldPromptDownload && (
        <View style={styles.alertBanner}>
          <Ionicons name="warning-outline" size={20} color="#b45309" />
          <View style={{ flex: 1, marginHorizontal: 8 }}>
            <Text style={styles.alertTitle}>Audit Log Maintenance Required</Text>
            <Text style={styles.alertSub}>
              Logs haven't been backed up in {stats.daysSinceLastDownload} days. Please export a copy.
            </Text>
          </View>
          <TouchableOpacity style={styles.alertBtn} onPress={handleExportCSV}>
            <Text style={styles.alertBtnText}>Export</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Metric Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={[styles.statBox, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Ionicons name="layers-outline" size={16} color={theme.primary} />
          <Text style={[styles.statLabel, { color: theme.textMuted }]}>Total Logs</Text>
          <Text style={[styles.statVal, { color: theme.primary }]}>{stats.totalLogs.toLocaleString()}</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Ionicons name="alert-circle-outline" size={16} color="#dc2626" />
          <Text style={[styles.statLabel, { color: theme.textMuted }]}>Errors</Text>
          <Text style={[styles.statVal, { color: '#dc2626' }]}>{stats.errorCount.toLocaleString()}</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Ionicons name="warning-outline" size={16} color="#d97706" />
          <Text style={[styles.statLabel, { color: theme.textMuted }]}>Warnings</Text>
          <Text style={[styles.statVal, { color: '#d97706' }]}>{stats.warnCount.toLocaleString()}</Text>
        </View>
      </View>

      {/* Action Header: Export CSV & Purge */}
      <View style={styles.actionHeader}>
        <Text style={[styles.headingText, { color: theme.textPrimary }]}>Audit Events</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={[styles.topActionBtn, styles.exportBtn]} onPress={handleExportCSV}>
            <Ionicons name="download-outline" size={14} color="#059669" />
            <Text style={[styles.topActionBtnText, { color: '#059669' }]}>Export</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.topActionBtn, styles.purgeBtn]} onPress={handleClearLogs}>
            <Ionicons name="trash-bin-outline" size={14} color="#dc2626" />
            <Text style={[styles.topActionBtnText, { color: '#dc2626' }]}>Purge</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Input */}
      <View style={[styles.searchBox, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <Ionicons name="search-outline" size={16} color={theme.textMuted} style={{ marginRight: 6 }} />
        <TextInput
          style={[styles.searchInput, { color: theme.textPrimary }]}
          placeholder="Search by action, user, or keyword..."
          placeholderTextColor={theme.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={() => fetchLogs(searchQuery)}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setSearchQuery('');
              fetchLogs('');
            }}
            style={{ padding: 4 }}
          >
            <Ionicons name="close-circle" size={16} color={theme.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Level Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.levelScroll}>
        {(['ALL', 'INFO', 'WARN', 'ERROR', 'SUCCESS'] as const).map((lvl) => {
          const isActive = levelFilter === lvl;
          return (
            <TouchableOpacity
              key={lvl}
              style={[
                styles.levelChip,
                { backgroundColor: theme.cardBg, borderColor: theme.border },
                isActive && { backgroundColor: theme.primary, borderColor: theme.primary },
              ]}
              onPress={() => {
                interactionUtils.playClick();
                setLevelFilter(lvl);
                fetchLogs(searchQuery, lvl);
              }}
            >
              <Text
                style={[
                  styles.levelChipText,
                  { color: theme.textMuted },
                  isActive && { color: '#fff', fontWeight: '800' },
                ]}
              >
                {lvl}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Log Feed */}
      {isLoading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ paddingBottom: 24 }}
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
              <Ionicons name="file-tray-outline" size={44} color={theme.textMuted} style={{ marginBottom: 8 }} />
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>No audit log events found</Text>
            </View>
          }
          renderItem={({ item }) => {
            const colors = getLevelColor(item.level);
            const isExpanded = expandedLogId === item._id;
            const timeStr = new Date(item.createdAt).toLocaleString('en-GB', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });

            return (
              <TouchableOpacity
                activeOpacity={0.9}
                style={[styles.logCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
                onPress={() => setExpandedLogId(isExpanded ? null : item._id)}
              >
                {/* Header Row */}
                <View style={styles.logCardHeader}>
                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                    <View style={[styles.levelBadge, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                      <Text style={[styles.levelText, { color: colors.text }]}>{item.level}</Text>
                    </View>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryText}>{item.category || 'System'}</Text>
                    </View>
                  </View>
                  <Text style={[styles.timestamp, { color: theme.textMuted }]}>{timeStr}</Text>
                </View>

                {/* Message */}
                <Text style={[styles.logMessage, { color: theme.textPrimary }]}>{item.message}</Text>

                {/* User & Action Meta */}
                <View style={styles.logMetaRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="person-outline" size={11} color={theme.textMuted} />
                    <Text style={[styles.metaText, { color: theme.textMuted }]}>
                      {item.userName || 'System'} ({item.userRole || 'Auto'})
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="flash-outline" size={11} color={theme.textMuted} />
                    <Text style={[styles.metaText, { color: theme.textMuted }]}>{item.action}</Text>
                  </View>
                </View>

                {/* Expanded Details / Metadata */}
                {isExpanded && item.metadata && Object.keys(item.metadata).length > 0 && (
                  <View style={styles.expandedBox}>
                    <Text style={styles.expandedHeading}>Metadata Details:</Text>
                    <Text style={styles.expandedJson}>{JSON.stringify(item.metadata, null, 2)}</Text>
                  </View>
                )}
              </TouchableOpacity>
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
    padding: 14,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  alertTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400e',
  },
  alertSub: {
    fontSize: 10.5,
    color: '#b45309',
    marginTop: 2,
  },
  alertBtn: {
    backgroundColor: '#d97706',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  alertBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
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
  actionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headingText: {
    fontSize: 14.5,
    fontWeight: '800',
  },
  topActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  topActionBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  exportBtn: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  purgeBtn: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    height: 36,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    paddingVertical: 0,
  },
  levelScroll: {
    flexGrow: 0,
    marginBottom: 12,
  },
  levelChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 6,
  },
  levelChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  logCard: {
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    marginBottom: 8,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  logCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  levelBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  levelText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  categoryBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#475569',
  },
  timestamp: {
    fontSize: 10,
    fontWeight: '500',
  },
  logMessage: {
    fontSize: 12.5,
    fontWeight: '600',
    marginBottom: 6,
    lineHeight: 17,
  },
  logMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 10.5,
    fontWeight: '500',
  },
  expandedBox: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 6,
  },
  expandedHeading: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 4,
  },
  expandedJson: {
    fontSize: 10,
    color: '#334155',
    fontFamily: 'monospace',
  },
  empty: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
