import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ThemeSelector } from '../components/ThemeSelector';
import { PrescriptionSettingsModal } from '../components/PrescriptionSettingsModal';

export const MenuScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { colors } = useTheme();
  const [isBrandingOpen, setIsBrandingOpen] = useState(false);

  const menuItems = [
    { title: 'Doctor Booking (Referral)', icon: 'calendar-number-outline', color: colors.gold, bg: colors.goldSoft, route: 'PublicBooking' },
    { title: 'Medicine Store', icon: 'medkit-outline', color: colors.gold, bg: colors.goldSoft, route: 'MedicineStore' },
    { title: 'Compounders & Staff', icon: 'people-outline', color: colors.primary, bg: colors.primarySoft, route: 'Compounders' },
    { title: 'Patient Reports', icon: 'document-text-outline', color: colors.primarySky, bg: colors.infoSoft, route: 'Reports' },
    { title: 'Messages', icon: 'chatbubbles-outline', color: colors.goldDark, bg: colors.goldSoft, route: 'Messages' },
    { title: 'Referrals', icon: 'git-compare-outline', color: colors.primaryLight, bg: colors.primarySoft, route: 'Referrals' },
    { title: 'Profile & Settings', icon: 'settings-outline', color: colors.textSecondary, bg: colors.surfaceElevated, route: 'Profile' },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* Bluish & Goldish Profile Header */}
      <View style={[styles.profileHeader, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primaryDark, borderColor: colors.gold }]}>
          <Text style={[styles.avatarText, { color: colors.goldBright }]}>{user?.name?.charAt(0) || 'D'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.userName, { color: colors.textPrimary }]}>{user?.name || 'Practitioner'}</Text>
          <View style={styles.roleContainer}>
            <Ionicons name="shield-checkmark" size={11} color={colors.goldDark} style={{ marginRight: 3 }} />
            <Text style={[styles.userRole, { color: colors.goldDark }]}>{(user?.role || 'Staff').toUpperCase()}</Text>
          </View>
        </View>
      </View>

      {/* Theme Switcher Quick Card */}
      <View style={[styles.themeCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="color-palette-outline" size={16} color={colors.gold} />
            <Text style={[styles.cardHeading, { color: colors.textPrimary }]}>Visual Theme</Text>
          </View>
          <TouchableOpacity
            style={[styles.brandingBtn, { backgroundColor: colors.primarySoft, borderColor: colors.primaryMuted }]}
            onPress={() => setIsBrandingOpen(true)}
          >
            <Ionicons name="document-attach-outline" size={13} color={colors.primary} />
            <Text style={[styles.brandingBtnText, { color: colors.primary }]}>Rx Branding</Text>
          </TouchableOpacity>
        </View>
        <ThemeSelector compact />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Modules & Services</Text>
      <View style={styles.grid}>
        {menuItems.map((item, idx) => (
          <TouchableOpacity
            key={idx}
            style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
            onPress={() => navigation.navigate(item.route)}
          >
            <View style={[styles.iconContainer, { backgroundColor: item.bg }]}>
              <Ionicons name={item.icon as any} size={24} color={item.color} />
            </View>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{item.title}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.logoutBtn, { backgroundColor: colors.dangerSoft, borderColor: colors.dangerBorder }]}
        onPress={logout}
      >
        <Ionicons name="log-out-outline" size={18} color={colors.danger} style={{ marginRight: 6 }} />
        <Text style={[styles.logoutBtnText, { color: colors.danger }]}>Log Out</Text>
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
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 2,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  userRole: {
    fontSize: 11,
    fontWeight: '700',
  },
  themeCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 18,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeading: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  brandingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  brandingBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 12,
    marginLeft: 4,
    letterSpacing: 0.2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  card: {
    width: '48%',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  logoutBtn: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
