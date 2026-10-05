import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { DarkTheme, NavigationContainer, type Theme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { NavigationBar } from 'expo-navigation-bar';
import { LedgerProvider, useLedger } from './state';
import { colors } from './theme';
import { ErrorState, Screen } from './components';
import type { RootStackParamList, TabParamList } from './navtypes';
import Home from './screens/Home';
import Accounts from './screens/Accounts';
import Transactions from './screens/Transactions';
import More from './screens/More';
import AccountDetail from './screens/AccountDetail';
import TransactionDetail from './screens/TransactionDetail';
import AddTransaction from './screens/AddTransaction';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme: Theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.background, card: colors.backgroundElevated, text: colors.textPrimary, border: colors.border },
};

function Gate({ children }: { children: React.ReactNode }): React.JSX.Element {
  const ledger = useLedger();
  if (ledger.status === 'loading') {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.highlight} />
        </View>
      </Screen>
    );
  }
  if (ledger.status === 'fatal' || ledger.status === 'corrupt') {
    return (
      <Screen>
        <ErrorState message={ledger.message} />
      </Screen>
    );
  }
  return <>{children}</>;
}

function Tabs(): React.JSX.Element {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.backgroundElevated, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.highlight,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarIcon: ({ color, size }) => {
          const name =
            route.name === 'Home'
              ? 'home'
              : route.name === 'Accounts'
                ? 'account-balance-wallet'
                : route.name === 'Transactions'
                  ? 'receipt-long'
                  : 'more-horiz';
          return <MaterialIcons name={name} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home">
        {() => (
          <Gate>
            <Home />
          </Gate>
        )}
      </Tab.Screen>
      <Tab.Screen name="Accounts">
        {() => (
          <Gate>
            <Accounts />
          </Gate>
        )}
      </Tab.Screen>
      <Tab.Screen name="Transactions">
        {() => (
          <Gate>
            <Transactions />
          </Gate>
        )}
      </Tab.Screen>
      <Tab.Screen name="More">
        {() => (
          <Gate>
            <More />
          </Gate>
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function App(): React.JSX.Element {
  return (
    <LedgerProvider>
      <StatusBar style="light" />
      <NavigationBar style="dark" />
      <NavigationContainer theme={navTheme}>
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: colors.backgroundElevated },
            headerTintColor: colors.textPrimary,
            headerTitleStyle: { color: colors.textPrimary },
          }}
        >
          <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
          <Stack.Screen name="AccountDetail" component={AccountDetail} options={{ title: 'Account' }} />
          <Stack.Screen name="TransactionDetail" component={TransactionDetail} options={{ title: 'Details' }} />
          <Stack.Screen name="AddTransaction" component={AddTransaction} options={{ title: 'Add transaction', presentation: 'modal' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </LedgerProvider>
  );
}
