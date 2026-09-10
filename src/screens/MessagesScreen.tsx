import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/client';
import { interactionUtils } from '../utils/interactionUtils';
import { useTheme } from '../context/ThemeContext';
import { colors } from '../theme/colors';

interface Message {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export const MessagesScreen: React.FC = () => {
  const { colors: theme } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Compose Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [content, setContent] = useState('');

  const fetchMessages = useCallback(async () => {
    try {
      const { data } = await api.get('/api/v1/message/getall');
      setMessages(data.messages || []);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to load messages');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchMessages();
  }, [fetchMessages]);

  const handleSend = async () => {
    if (!firstName.trim() || !email.trim() || !content.trim()) {
      Alert.alert('Validation Error', 'First name, email, and message are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post('/api/v1/message/send', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        message: content.trim(),
      });
      interactionUtils.playSuccess();
      Alert.alert('Success', 'Message sent successfully');
      setIsComposeOpen(false);
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setContent('');
      fetchMessages();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to send message');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Confirm Delete', 'Delete this message?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.post('/api/v1/message/bulk-delete', { ids: [id] });
            interactionUtils.playClick();
            setMessages(prev => prev.filter(m => m._id !== id));
          } catch (e: any) {
            Alert.alert('Error', 'Failed to delete message');
          }
        },
      },
    ]);
  };

  const toggleReadStatus = async (id: string, isCurrentlyRead: boolean) => {
    try {
      interactionUtils.playClick();
      await api.post('/api/v1/message/bulk-update', { ids: [id], read: !isCurrentlyRead });
      setMessages(prev => prev.map(m => m._id === id ? { ...m, isRead: !isCurrentlyRead } : m));
    } catch (e: any) {
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Communication Inbox</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            {messages.filter(m => !m.isRead).length} unread inquiries
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.composeBtn, { backgroundColor: theme.primary }]}
          onPress={() => setIsComposeOpen(true)}
        >
          <Ionicons name="create-outline" size={16} color="#ffffff" style={{ marginRight: 4 }} />
          <Text style={styles.composeBtnText}>Compose</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={messages}
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
              <Ionicons name="chatbubbles-outline" size={48} color={theme.textMuted} style={{ marginBottom: 8 }} />
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>No messages in your inbox</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View
              style={[
                styles.card,
                { backgroundColor: theme.cardBg, borderColor: item.isRead ? theme.border : theme.primary },
                !item.isRead && { borderWidth: 1.5 },
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                  {!item.isRead && (
                    <View style={[styles.unreadDot, { backgroundColor: theme.gold }]} />
                  )}
                  <Text style={[styles.name, { color: theme.textPrimary }]}>
                    {item.firstName} {item.lastName}
                  </Text>
                </View>
                <Text style={[styles.date, { color: theme.textMuted }]}>
                  {formatDate(item.createdAt)}
                </Text>
              </View>

              <View style={styles.contactRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="mail-outline" size={12} color={theme.textMuted} />
                  <Text style={[styles.contactInfo, { color: theme.textSecondary }]}>{item.email}</Text>
                </View>
                {item.phone ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="call-outline" size={12} color={theme.textMuted} />
                    <Text style={[styles.contactInfo, { color: theme.textSecondary }]}>{item.phone}</Text>
                  </View>
                ) : null}
              </View>

              <Text style={[styles.messageText, { color: theme.textPrimary }]}>{item.message}</Text>
              
              <View style={[styles.cardActions, { borderTopColor: theme.borderLight }]}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}
                  onPress={() => toggleReadStatus(item._id, item.isRead)}
                >
                  <Ionicons
                    name={item.isRead ? "mail-unread-outline" : "mail-open-outline"}
                    size={14}
                    color={theme.textSecondary}
                  />
                  <Text style={[styles.actionBtnText, { color: theme.textSecondary }]}>
                    {item.isRead ? 'Mark Unread' : 'Mark as Read'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: theme.dangerSoft, borderColor: theme.dangerBorder }]}
                  onPress={() => handleDelete(item._id)}
                >
                  <Ionicons name="trash-outline" size={14} color={theme.danger} />
                  <Text style={[styles.actionBtnText, { color: theme.danger }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Compose Modal */}
      <Modal visible={isComposeOpen} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.cardBg }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Compose New Message</Text>
                <TouchableOpacity onPress={() => setIsComposeOpen(false)}>
                  <Ionicons name="close-circle-outline" size={24} color={theme.textMuted} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>First Name *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                    placeholder="First Name"
                    placeholderTextColor={theme.textMuted}
                    value={firstName}
                    onChangeText={setFirstName}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Last Name</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                    placeholder="Last Name"
                    placeholderTextColor={theme.textMuted}
                    value={lastName}
                    onChangeText={setLastName}
                  />
                </View>
              </View>

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Recipient Email *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                placeholder="recipient@example.com"
                placeholderTextColor={theme.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Contact Phone</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                placeholder="Phone Number"
                placeholderTextColor={theme.textMuted}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Message Content *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary, height: 100, textAlignVertical: 'top' }]}
                placeholder="Type your message here..."
                placeholderTextColor={theme.textMuted}
                multiline
                value={content}
                onChangeText={setContent}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, borderWidth: 1 }]}
                  onPress={() => setIsComposeOpen(false)}
                >
                  <Text style={[styles.btnCancelText, { color: theme.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: theme.primary }]}
                  onPress={handleSend}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.btnConfirmText}>Send Message</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  composeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  composeBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  list: {
    paddingBottom: 24,
  },
  card: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
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
    marginBottom: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: '800',
  },
  date: {
    fontSize: 11,
  },
  contactRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  contactInfo: {
    fontSize: 12,
  },
  messageText: {
    fontSize: 13.5,
    lineHeight: 19,
    marginBottom: 12,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
    borderTopWidth: 1,
    paddingTop: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionBtnText: {
    fontWeight: '700',
    fontSize: 12,
  },
  empty: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
    marginLeft: 2,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    paddingBottom: 20,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnCancelText: {
    fontSize: 14,
    fontWeight: '700',
  },
  btnConfirmText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
