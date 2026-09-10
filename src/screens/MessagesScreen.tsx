import React, { useState, useEffect } from 'react';
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
import api from '../api/client';
import { interactionUtils } from '../utils/interactionUtils';

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
  // In a real app we'd have a dropdown for doctors/recipients. For now, simple text or leave out recipient.

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get('/api/v1/message/getall');
      setMessages(data.messages || []);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to load messages');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setIsRefreshing(true);
    fetchMessages();
  }, []);

  const handleSend = async () => {
    if (!firstName || !email || !content) {
      Alert.alert('Validation Error', 'First name, email, and message are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post('/api/v1/message/send', {
        firstName,
        lastName,
        email,
        phone,
        message: content,
      });
      interactionUtils.playSuccess();
      Alert.alert('Success', 'Message sent successfully');
      setIsComposeOpen(false);
      
      // Reset form
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
            await api.post('/api/v1/message/bulk-delete', { ids: [id] }); // FE used bulk-delete
            interactionUtils.playSuccess();
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
      await api.post('/api/v1/message/bulk-update', { ids: [id], read: !isCurrentlyRead });
      setMessages(prev => prev.map(m => m._id === id ? { ...m, isRead: !isCurrentlyRead } : m));
    } catch (e: any) {
      Alert.alert('Error', 'Failed to update status');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Messages</Text>
        <TouchableOpacity style={styles.composeBtn} onPress={() => setIsComposeOpen(true)}>
          <Text style={styles.composeBtnText}>+ Compose</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No messages found</Text>
            </View>
          }
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <View style={[styles.card, !item.isRead && styles.unreadCard]}>
              <View style={styles.cardHeader}>
                <Text style={styles.name}>{item.firstName} {item.lastName}</Text>
                <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()}</Text>
              </View>
              <Text style={styles.contactInfo}>{item.email} • {item.phone}</Text>
              <Text style={styles.messageText}>{item.message}</Text>
              
              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => toggleReadStatus(item._id, item.isRead)}>
                  <Text style={styles.actionBtnText}>{item.isRead ? 'Mark Unread' : 'Mark Read'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#fef2f2' }]} onPress={() => handleDelete(item._id)}>
                  <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Compose Modal */}
      <Modal visible={isComposeOpen} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Compose Message</Text>
              
              <TextInput style={styles.input} placeholder="First Name *" placeholderTextColor="#94a3b8" value={firstName} onChangeText={setFirstName} />
              <TextInput style={styles.input} placeholder="Last Name" placeholderTextColor="#94a3b8" value={lastName} onChangeText={setLastName} />
              <TextInput style={styles.input} placeholder="Email *" placeholderTextColor="#94a3b8" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
              <TextInput style={styles.input} placeholder="Phone" placeholderTextColor="#94a3b8" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
              <TextInput style={[styles.input, { height: 100, textAlignVertical: 'top' }]} placeholder="Type your message here... *" placeholderTextColor="#94a3b8" multiline value={content} onChangeText={setContent} />

              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={() => setIsComposeOpen(false)}>
                  <Text style={styles.btnCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, styles.btnConfirm]} onPress={handleSend} disabled={isSubmitting}>
                  {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnConfirmText}>Send</Text>}
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
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#0f172a' },
  composeBtn: { backgroundColor: '#0284c7', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  composeBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  list: { paddingBottom: 20 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#94a3b8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: '#f1f5f9' },
  unreadCard: { borderColor: '#0ea5e9', backgroundColor: '#f0f9ff' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  name: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  date: { fontSize: 12, color: '#64748b' },
  contactInfo: { fontSize: 13, color: '#64748b', marginBottom: 8 },
  messageText: { fontSize: 15, color: '#334155', lineHeight: 22, marginBottom: 16 },
  cardActions: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, backgroundColor: '#f1f5f9', borderRadius: 8 },
  actionBtnText: { color: '#334155', fontWeight: '600', fontSize: 14 },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#94a3b8', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a', marginBottom: 20, textAlign: 'center' },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, fontSize: 16, color: '#0f172a', marginBottom: 12 },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 10, paddingBottom: 20 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnCancel: { backgroundColor: '#f1f5f9' },
  btnCancelText: { color: '#475569', fontSize: 16, fontWeight: '600' },
  btnConfirm: { backgroundColor: '#0284c7' },
  btnConfirmText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
