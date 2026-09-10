import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

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

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: '#ffffff' },
        headerTitleStyle: { fontWeight: '700', color: '#0f172a' },
        headerShadowVisible: false,
        tabBarActiveTintColor: '#0284c7',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e2e8f0',
          paddingBottom: 4,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarIcon: ({ focused }) => {
          let icon = '📋';
          if (route.name === 'Dashboard') icon = '🏠';
          if (route.name === 'Appointments') icon = '📅';
          if (route.name === 'Doctors') icon = '🩺';
          if (route.name === 'Prescriptions') icon = '💊';
          if (route.name === 'Invoices') icon = '💳';
          if (route.name === 'Menu') icon = '☰';
          return <Text style={{ fontSize: 18 }}>{icon}</Text>;
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
        options={{ title: 'Billing' }}
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

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0284c7" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="MedicineStore" component={MedicineStoreScreen} options={{ headerShown: true, title: 'Medicine Store' }} />
            <Stack.Screen name="Compounders" component={CompoundersScreen} options={{ headerShown: true, title: 'Compounders & Staff' }} />
            <Stack.Screen name="Reports" component={ReportsScreen} options={{ headerShown: true, title: 'Patient Reports' }} />
            <Stack.Screen name="Messages" component={MessagesScreen} options={{ headerShown: true, title: 'Messages' }} />
            <Stack.Screen name="Referrals" component={ReferralsScreen} options={{ headerShown: true, title: 'Referrals' }} />
            <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: true, title: 'Profile' }} />
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
