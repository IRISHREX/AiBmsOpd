import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { interactionUtils } from '../utils/interactionUtils';
import { resetToMain } from '../navigation/AppNavigator';

export const LoginScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { login, backendUrl, setCustomBackendUrl, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'Doctor' | 'Admin' | 'Compounder'>('Doctor');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Editable backend URL state for testing
  const [showConfig, setShowConfig] = useState(false);
  const [apiUrlInput, setApiUrlInput] = useState(backendUrl);

  // Immediate redirect when authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      resetToMain();
    }
  }, [isAuthenticated]);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email and password');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await login(email.trim(), password, role);
      interactionUtils.playSuccess();
      resetToMain();
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Failed to connect to server. Check your backend URL.';

      // If role mismatch error ("User Not Found With This Role!"), automatically try alternative staff roles
      if (typeof msg === 'string' && (msg.toLowerCase().includes('role') || msg.toLowerCase().includes('not found with this role'))) {
        const altRoles: ('Doctor' | 'Admin' | 'Compounder')[] = (['Doctor', 'Admin', 'Compounder'] as const).filter((r) => r !== role);
        let recovered = false;
        for (const alt of altRoles) {
          try {
            await login(email.trim(), password, alt);
            setRole(alt);
            recovered = true;
            interactionUtils.playSuccess();
            resetToMain();
            break;
          } catch (altErr) {
            // continue checking
          }
        }
        if (recovered) {
          setIsSubmitting(false);
          return;
        }
      }

      console.log('Login error:', err);
      setErrorMessage(msg);
      Alert.alert('Login Error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveBackendUrl = async () => {
    if (!apiUrlInput.trim()) return;
    try {
      await setCustomBackendUrl(apiUrlInput.trim());
      setShowConfig(false);
      Alert.alert('Success', 'Backend API URL updated successfully');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || e?.message || 'Failed to save backend URL');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {navigation?.canGoBack && navigation.canGoBack() && (
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginBottom: 12, paddingVertical: 6 }}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={20} color={colors.primary} />
            <Text style={{ marginLeft: 6, color: colors.primary, fontWeight: '700', fontSize: 14 }}>Back</Text>
          </TouchableOpacity>
        )}
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>OPD</Text>
          </View>
          <Text style={styles.title}>BMS - OPD Portal</Text>
          <Text style={styles.subtitle}>Hospital Outpatient Management System</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign In</Text>

          {/* Role selector pills with icons */}
          <View style={styles.roleContainer}>
            {([
              { role: 'Doctor', icon: 'medical' },
              { role: 'Admin', icon: 'shield-checkmark' },
              { role: 'Compounder', icon: 'people' },
            ] as const).map((item) => (
              <TouchableOpacity
                key={item.role}
                style={[styles.roleTab, role === item.role && styles.roleTabActive]}
                onPress={() => setRole(item.role)}
              >
                <Ionicons
                  name={item.icon as any}
                  size={14}
                  color={role === item.role ? '#ffffff' : colors.primary}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[styles.roleTabText, role === item.role && styles.roleTabTextActive]}
                >
                  {item.role}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {errorMessage && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color="#dc2626" style={{ marginRight: 6 }} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={18} color="#94a3b8" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.textInputFlex}
                placeholder="doctor@example.com"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={18} color="#94a3b8" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.textInputFlex}
                placeholder="••••••••"
                placeholderTextColor="#94a3b8"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, isSubmitting && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="log-in-outline" size={18} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.buttonText}>Sign In</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Public Patient Booking / Referral Link */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR PATIENT SERVICE</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.publicBookingBtn}
            onPress={() => {
              interactionUtils.playClick();
              if (navigation?.navigate) {
                navigation.navigate('PublicBooking');
              }
            }}
          >
            <View style={styles.publicBookingIconWrap}>
              <Ionicons name="calendar-outline" size={20} color={colors.goldBright} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.publicBookingTitle}>Book Doctor Appointment</Text>
              <Text style={styles.publicBookingSubtitle}>Patient Inbound Referral • No Login Required</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.gold} />
          </TouchableOpacity>

          {/* Backend URL configuration drawer / toggle */}
          <TouchableOpacity
            style={styles.configToggle}
            onPress={() => {
              interactionUtils.playClick();
              setShowConfig(!showConfig);
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Ionicons name="server-outline" size={13} color={colors.primary} />
              <Text style={styles.configToggleText}>
                API Endpoint: {backendUrl}
              </Text>
            </View>
          </TouchableOpacity>

          {showConfig && (
            <View style={styles.configBox}>
              <Text style={styles.configLabel}>Deployed Backend URL</Text>
              <TextInput
                style={styles.configInput}
                value={apiUrlInput}
                onChangeText={setApiUrlInput}
                placeholder="https://your-deployed-opd-api.com"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.saveUrlButton}
                onPress={handleSaveBackendUrl}
              >
                <Text style={styles.saveUrlButtonText}>Save API Endpoint</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 24,
    justifyContent: 'center',
    minHeight: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: colors.gold,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  logoText: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.goldBright,
    letterSpacing: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  roleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  roleTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  roleTabActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  roleTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
  },
  roleTabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 13,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#475569',
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 2,
  },
  textInputFlex: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 15,
    color: '#0f172a',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0f172a',
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.8,
  },
  publicBookingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1.5,
    borderColor: colors.gold,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  publicBookingIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.gold,
  },
  publicBookingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 2,
  },
  publicBookingSubtitle: {
    fontSize: 11,
    color: colors.goldBright,
    fontWeight: '500',
  },
  configToggle: {
    marginTop: 20,
    paddingVertical: 8,
    alignItems: 'center',
  },
  configToggleText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  configBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  configLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  configInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0f172a',
    marginBottom: 8,
  },
  saveUrlButton: {
    backgroundColor: '#334155',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  saveUrlButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
});
