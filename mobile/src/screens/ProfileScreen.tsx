import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth';
import { apiClient } from '../api/client';

export const ProfileScreen: React.FC = () => {
  const { user, logout, backendUrl, setCustomBackendUrl } = useAuth();

  // Endpoint configuration
  const [customUrl, setCustomUrl] = useState(backendUrl);
  const [isTestingUrl, setIsTestingUrl] = useState(false);

  // Change password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);

  const handleTestAndSaveUrl = async () => {
    if (!customUrl.trim()) return;
    setIsTestingUrl(true);
    const cleanUrl = customUrl.trim().replace(/\/+$/, '');

    try {
      // Test the endpoint with a simple ping or GET request
      await apiClient.get(`${cleanUrl}/api/v1/user/dashboard/me`, { timeout: 5000 });
      await setCustomBackendUrl(cleanUrl);
      Alert.alert('Connection Successful', `Connected and saved: ${cleanUrl}`);
    } catch (e: any) {
      // Even if me requires auth, if server responded it is online
      if (e.response) {
        await setCustomBackendUrl(cleanUrl);
        Alert.alert('Saved', `Server responded (${e.response.status}). URL saved.`);
      } else {
        Alert.alert(
          'Warning',
          `Could not reach ${cleanUrl}. Saved anyway so you can test when your deployment finishes.`
        );
        await setCustomBackendUrl(cleanUrl);
      }
    } finally {
      setIsTestingUrl(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      Alert.alert('Validation', 'Please provide current and new password');
      return;
    }
    setIsChangingPass(true);
    try {
      await authApi.changeOwnPassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      Alert.alert('Success', 'Password changed successfully');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to update password');
    } finally {
      setIsChangingPass(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: logout,
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* User Info Card */}
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </Text>
        </View>
        <Text style={styles.userName}>{user?.name || 'Healthcare Practitioner'}</Text>
        <Text style={styles.userEmail}>{user?.email || 'user@example.com'}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>
            Role: {(user?.role || 'doctor').toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Deployed Backend URL Config Section */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>🌐 Backend API Endpoint</Text>
        <Text style={styles.sectionDesc}>
          Set your deployed backend URL here. All mobile app API requests will automatically route to this endpoint.
        </Text>

        <TextInput
          style={styles.input}
          value={customUrl}
          onChangeText={setCustomUrl}
          placeholder="https://your-deployed-backend-api.com"
          placeholderTextColor="#94a3b8"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TouchableOpacity
          style={[styles.saveBtn, isTestingUrl && styles.btnDisabled]}
          onPress={handleTestAndSaveUrl}
          disabled={isTestingUrl}
        >
          {isTestingUrl ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.saveBtnText}>Connect & Save Endpoint</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Password Management */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>🔒 Change Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Current Password"
          placeholderTextColor="#94a3b8"
          secureTextEntry
          value={currentPassword}
          onChangeText={setCurrentPassword}
        />
        <TextInput
          style={styles.input}
          placeholder="New Password"
          placeholderTextColor="#94a3b8"
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
        />
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={handleChangePassword}
          disabled={isChangingPass}
        >
          {isChangingPass ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.actionBtnText}>Update Password</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutBtnText}>Sign Out of OPD Portal</Text>
      </TouchableOpacity>
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
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0284c7',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 10,
  },
  avatarText: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: '700',
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
  },
  userEmail: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 2,
  },
  roleBadge: {
    alignSelf: 'center',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  roleBadgeText: {
    color: '#0369a1',
    fontWeight: '600',
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 12,
    lineHeight: 16,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 10,
  },
  saveBtn: {
    backgroundColor: '#0284c7',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  actionBtn: {
    backgroundColor: '#334155',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },
  logoutBtn: {
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  logoutBtnText: {
    color: '#dc2626',
    fontWeight: '700',
    fontSize: 14,
  },
});
