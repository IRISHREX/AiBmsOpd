import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { NavigationContainer, createNavigationContainerRef, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { interactionUtils } from '../utils/interactionUtils';

import { useAuth } from '../context/AuthContext';
import { LoginScreen } from '../screens/LoginScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { AppointmentsScreen } from '../screens/AppointmentsScreen';
import { DoctorsScreen } from '../screens/DoctorsScreen';
import { PrescriptionsScreen } from '../screens/PrescriptionsScreen';
import { InvoicesScreen } from '../screens/InvoicesScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { MenuScreen } from '../screens/MenuScreen';
import { MedicineStoreScreen } from '../screens/MedicineStoreScreen';
import { CompoundersScreen } from '../screens/CompoundersScreen';
import { ReportsScreen } from '../screens/ReportsScreen';
import { MessagesScreen } from '../screens/MessagesScreen';
import { ReferralsScreen } from '../screens/ReferralsScreen';
import { PublicBookingScreen } from '../screens/PublicBookingScreen';

import { colors as staticColors } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: colors.headerBg },
        headerTitleStyle: { fontWeight: '800', color: colors.headerText, fontSize: 17 },
        headerTintColor: colors.headerTint,
        headerShadowVisible: false,
        headerRight: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginRight: 16 }}>
            <TouchableOpacity
              onPress={() => {
                interactionUtils.playNotificationSound();
                navigation.navigate('Messages');
              }}
              style={{ padding: 4, position: 'relative' }}
              accessibilityLabel="Notifications"
            >
              <Ionicons name="notifications-outline" size={22} color={colors.headerTint} />
              <View
                style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: '#ef4444',
                }}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('Profile')}
              style={{ padding: 4 }}
              accessibilityLabel="User Profile"
            >
              <Ionicons name="person-circle-outline" size={26} color={colors.headerTint} />
            </TouchableOpacity>
          </View>
        ),
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarStyle: {
          backgroundColor: colors.tabBarBg,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1,
          paddingBottom: 6,
          paddingTop: 6,
          height: 62,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
        tabBarIcon: ({ focused, color }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'grid-outline';
          if (route.name === 'Dashboard') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Appointments') iconName = focused ? 'calendar' : 'calendar-outline';
          else if (route.name === 'Referrals') iconName = focused ? 'git-network' : 'git-network-outline';
          else if (route.name === 'Prescriptions') iconName = focused ? 'medkit' : 'medkit-outline';
          else if (route.name === 'Menu') iconName = focused ? 'menu' : 'menu-outline';
          return <Ionicons name={iconName} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'BMS-OPD' }}
      />
      <Tab.Screen
        name="Appointments"
        component={AppointmentsScreen}
        options={{ title: 'Appointments' }}
      />
      <Tab.Screen
        name="Referrals"
        component={ReferralsScreen}
        options={{ title: 'Referrals' }}
      />
      <Tab.Screen
        name="Prescriptions"
        component={PrescriptionsScreen}
        options={{ title: 'Rx Store' }}
      />
      <Tab.Screen
        name="Menu"
        component={MenuScreen}
        options={{ title: 'Menu' }}
      />
    </Tab.Navigator>
  );
};

export const navigationRef = createNavigationContainerRef<any>();

export function resetToMain() {
  if (navigationRef.isReady()) {
    try {
      navigationRef.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
    } catch (e) {
      console.warn('resetToMain notice:', e);
    }
  }
}

export function resetToPublic() {
  if (navigationRef.isReady()) {
    try {
      navigationRef.reset({
        index: 0,
        routes: [{ name: 'PublicBooking' }],
      });
    } catch (e) {
      console.warn('resetToPublic notice:', e);
    }
  }
}

export const AppNavigator: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { colors } = useTheme();

  React.useEffect(() => {
    if (navigationRef.isReady()) {
      try {
        if (isAuthenticated) {
          navigationRef.reset({
            index: 0,
            routes: [{ name: 'Main' }],
          });
        } else {
          navigationRef.reset({
            index: 0,
            routes: [{ name: 'PublicBooking' }],
          });
        }
      } catch (e) {
        console.warn('Navigation state sync notice:', e);
      }
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName={isAuthenticated ? 'Main' : 'PublicBooking'}
        screenOptions={{
          headerShown: false,
          headerStyle: { backgroundColor: colors.headerBg },
          headerTintColor: colors.headerTint,
          headerTitleStyle: { fontWeight: '800', color: colors.headerText },
          headerBackTitleVisible: false,
        }}
      >
        <Stack.Screen name="PublicBooking" component={PublicBookingScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="Doctors" component={DoctorsScreen} options={{ headerShown: true, title: 'Doctors' }} />
        <Stack.Screen name="Invoices" component={InvoicesScreen} options={{ headerShown: true, title: 'Billing & Invoices' }} />
        <Stack.Screen name="MedicineStore" component={MedicineStoreScreen} options={{ headerShown: true, title: 'Medicine Store' }} />
        <Stack.Screen name="Compounders" component={CompoundersScreen} options={{ headerShown: true, title: 'Compounders & Staff' }} />
        <Stack.Screen name="Reports" component={ReportsScreen} options={{ headerShown: true, title: 'Patient Reports' }} />
        <Stack.Screen name="Messages" component={MessagesScreen} options={{ headerShown: true, title: 'Notifications & Messages' }} />
        <Stack.Screen name="Referrals" component={ReferralsScreen} options={{ headerShown: true, title: 'Referrals' }} />
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: true, title: 'Profile' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
