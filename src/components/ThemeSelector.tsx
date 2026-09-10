import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { ThemeMode } from '../theme/themes';
import * as Haptics from 'expo-haptics';

interface ThemeOption {
  mode: ThemeMode;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  desc: string;
}

const THEME_OPTIONS: ThemeOption[] = [
  { mode: 'light', label: 'Light', icon: 'sunny-outline', desc: 'Crisp medical clean' },
  { mode: 'dark', label: 'Dark', icon: 'moon-outline', desc: 'Modern dark charcoal' },
  { mode: 'pro-dark', label: 'Pro Dark', icon: 'sparkles', desc: 'Obsidian & Gold' },
  { mode: 'pro-light', label: 'Pro Light', icon: 'sunny', desc: 'Ivory & Polished Gold' },
];

export const ThemeSelector: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { theme, colors, setTheme } = useTheme();

  const handleSelect = (mode: ThemeMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTheme(mode);
  };

  if (compact) {
    return (
      <View style={[styles.compactRow, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
        {THEME_OPTIONS.map((opt) => {
          const isActive = theme === opt.mode;
          return (
            <TouchableOpacity
              key={opt.mode}
              style={[
                styles.compactTab,
                isActive && {
                  backgroundColor: colors.primaryDark,
                  borderColor: colors.gold,
                  borderWidth: 1,
                },
              ]}
              onPress={() => handleSelect(opt.mode)}
            >
              <Ionicons
                name={opt.icon}
                size={14}
                color={isActive ? colors.goldBright : colors.textSecondary}
              />
              <Text
                style={[
                  styles.compactText,
                  { color: isActive ? colors.textWhite : colors.textSecondary },
                  isActive && { fontWeight: '700' },
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  return (
    <View style={styles.grid}>
      {THEME_OPTIONS.map((opt) => {
        const isActive = theme === opt.mode;
        return (
          <TouchableOpacity
            key={opt.mode}
            style={[
              styles.card,
              {
                backgroundColor: colors.cardBg,
                borderColor: isActive ? colors.gold : colors.border,
                borderWidth: isActive ? 2 : 1,
              },
              isActive && {
                shadowColor: colors.gold,
                shadowOpacity: 0.2,
                shadowRadius: 6,
                elevation: 3,
              },
            ]}
            onPress={() => handleSelect(opt.mode)}
          >
            <View
              style={[
                styles.iconBox,
                {
                  backgroundColor: isActive ? colors.goldSoft : colors.surfaceElevated,
                  borderColor: isActive ? colors.goldBorder : colors.borderLight,
                },
              ]}
            >
              <Ionicons
                name={opt.icon}
                size={20}
                color={isActive ? colors.goldDark : colors.textSecondary}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text
                  style={[
                    styles.label,
                    { color: colors.textPrimary },
                    isActive && { color: colors.textGold, fontWeight: '800' },
                  ]}
                >
                  {opt.label}
                </Text>
                {isActive && (
                  <Ionicons
                    name="checkmark-circle"
                    size={14}
                    color={colors.gold}
                    style={{ marginLeft: 6 }}
                  />
                )}
              </View>
              <Text style={[styles.desc, { color: colors.textMuted }]}>{opt.desc}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  compactRow: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    gap: 4,
  },
  compactTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  compactText: {
    fontSize: 11,
    fontWeight: '600',
  },
  grid: {
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
  },
  desc: {
    fontSize: 11,
    marginTop: 2,
  },
});
