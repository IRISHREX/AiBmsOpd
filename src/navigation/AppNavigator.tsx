import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

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

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: colors.headerBg },
        headerTitleStyle: { fontWeight: '800', color: colors.headerText, fontSize: 17 },
        headerTintColor: colors.headerTint,
        headerShadowVisible: false,
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
          else if (route.name === 'Doctors') iconName = focused ? 'fitness' : 'fitness-outline';
          else if (route.name === 'Prescriptions') iconName = focused ? 'medkit' : 'medkit-outline';
          else if (route.name === 'Invoices') iconName = focused ? 'receipt' : 'receipt-outline';
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
        name="Doctors"
        component={DoctorsScreen}
        options={{ title: 'Doctors' }}
      />
      <Tab.Screen
        name="Prescriptions"
        component={PrescriptionsScreen}
        options={{ title: 'Rx Store' }}
      />
      <Tab.Screen
        name="Invoices"
        component={InvoicesScreen}
        options={{ title: 'Billing & Invoices' }}
      />
      <Tab.Screen
        name="Menu"
        component={MenuScreen}
        options={{ title: 'Menu' }}
      />
    </Tab.Navigator>
  );
};

export const AppNavigator: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { colors } = useTheme();

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          headerStyle: { backgroundColor: colors.headerBg },
          headerTintColor: colors.headerTint,
          headerTitleStyle: { fontWeight: '800', color: colors.headerText },
          headerBackTitleVisible: false,
        }}
      >
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="PublicBooking" component={PublicBookingScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Login" component={LoginScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="MedicineStore" component={MedicineStoreScreen} options={{ headerShown: true, title: 'Medicine Store' }} />
            <Stack.Screen name="Compounders" component={CompoundersScreen} options={{ headerShown: true, title: 'Compounders & Staff' }} />
            <Stack.Screen name="Reports" component={ReportsScreen} options={{ headerShown: true, title: 'Patient Reports' }} />
            <Stack.Screen name="Messages" component={MessagesScreen} options={{ headerShown: true, title: 'Messages' }} />
            <Stack.Screen name="Referrals" component={ReferralsScreen} options={{ headerShown: true, title: 'Referrals' }} />
            <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: true, title: 'Profile' }} />
            <Stack.Screen name="PublicBooking" component={PublicBookingScreen} options={{ headerShown: false }} />
          </>
        )}
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
