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
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { authApi } from '../api/auth';
import { apiClient } from '../api/client';
import { ThemeSelector } from '../components/ThemeSelector';
import { PrescriptionSettingsModal } from '../components/PrescriptionSettingsModal';

export const ProfileScreen: React.FC = () => {
  const { user, logout, backendUrl, setCustomBackendUrl } = useAuth();
  const { colors } = useTheme();

  // Endpoint configuration
  const [customUrl, setCustomUrl] = useState(backendUrl);
  const [isTestingUrl, setIsTestingUrl] = useState(false);

  // Change password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);

  // Branding Modal
  const [isBrandingOpen, setIsBrandingOpen] = useState(false);

  const handleTestAndSaveUrl = async () => {
    if (!customUrl.trim()) return;
    setIsTestingUrl(true);
    const cleanUrl = customUrl.trim().replace(/\/+$/, '');

    try {
      await apiClient.get(`${cleanUrl}/api/v1/user/dashboard/me`, { timeout: 5000 });
      await setCustomBackendUrl(cleanUrl);
      Alert.alert('Connection Successful', `Connected and saved: ${cleanUrl}`);
    } catch (e: any) {
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
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* User Info Card */}
      <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primaryDark, borderColor: colors.gold }]}>
          <Text style={[styles.avatarText, { color: colors.goldBright }]}>
            {user?.name ? user.name.charAt(0).toUpperCase() : 'D'}
          </Text>
        </View>
        <Text style={[styles.userName, { color: colors.textPrimary }]}>{user?.name || 'Healthcare Practitioner'}</Text>
        <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{user?.email || 'user@example.com'}</Text>
        <View style={[styles.roleBadge, { backgroundColor: colors.goldSoft, borderColor: colors.goldBorder }]}>
          <Ionicons name="shield-checkmark" size={12} color={colors.goldDark} style={{ marginRight: 4 }} />
          <Text style={[styles.roleBadgeText, { color: colors.goldDark }]}>
            {(user?.role || 'doctor').toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Theme Customizer Card */}
      <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <Ionicons name="color-palette-outline" size={18} color={colors.gold} />
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>App Theme & Appearance</Text>
        </View>
        <Text style={[styles.sectionDesc, { color: colors.textMuted }]}>
          Select your visual theme. Choose between clean Light, sleek Dark, or luxury Pro Gold modes.
        </Text>
        <ThemeSelector />
      </View>

      {/* Prescription Branding & Letterhead Card */}
      <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <Ionicons name="document-attach-outline" size={18} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Prescription Branding & Letterhead</Text>
        </View>
        <Text style={[styles.sectionDesc, { color: colors.textMuted }]}>
          Upload clinic letterhead banner, signature image, and configure official footer disclaimer notes.
        </Text>
        <TouchableOpacity
          style={[styles.brandingActionBtn, { backgroundColor: colors.primarySoft, borderColor: colors.primaryMuted }]}
          onPress={() => setIsBrandingOpen(true)}
        >
          <Ionicons name="create-outline" size={16} color={colors.primary} />
          <Text style={[styles.brandingActionBtnText, { color: colors.primary }]}>
            Configure Header, Footer & Signature
          </Text>
        </TouchableOpacity>
      </View>

      {/* Deployed Backend URL Config Section */}
      <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <Ionicons name="globe-outline" size={18} color={colors.goldDark} />
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Backend API Endpoint</Text>
        </View>
        <Text style={[styles.sectionDesc, { color: colors.textMuted }]}>
          Set your deployed backend URL. Requests route to this server.
        </Text>

        <TextInput
          style={[styles.input, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.textPrimary }]}
          value={customUrl}
          onChangeText={setCustomUrl}
          placeholder="https://your-deployed-backend-api.com"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary }, isTestingUrl && styles.btnDisabled]}
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
      <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} />
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Change Password</Text>
        </View>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.textPrimary }]}
          placeholder="Current Password"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          value={currentPassword}
          onChangeText={setCurrentPassword}
        />
        <TextInput
          style={[styles.input, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.textPrimary }]}
          placeholder="New Password"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
        />
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.gold }]}
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
        <Ionicons name="log-out-outline" size={18} color="#dc2626" style={{ marginRight: 6 }} />
        <Text style={styles.logoutBtnText}>Sign Out of OPD Portal</Text>
      </TouchableOpacity>

      <PrescriptionSettingsModal
        visible={isBrandingOpen}
        onClose={() => setIsBrandingOpen(false)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  card: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 10,
    borderWidth: 2,
  },
  avatarText: {
    fontSize: 26,
    fontWeight: '800',
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  userEmail: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 2,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  sectionDesc: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: 12,
    lineHeight: 16,
  },
  brandingActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  brandingActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    marginBottom: 10,
  },
  saveBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 2,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  actionBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fee2e2',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    marginTop: 6,
  },
  logoutBtnText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '700',
  },
});
