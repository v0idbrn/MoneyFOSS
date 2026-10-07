import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { DarkTheme, NavigationContainer, type Theme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { NavigationBar } from 'expo-navigation-bar';
import { LedgerProvider, useLedger } from './state';
import { LangProvider, useStrings } from './lang';
import { colors } from './theme';
import { ErrorState, Screen, ToastProvider } from './components';
import type { RootStackParamList, TabParamList } from './navtypes';
import Home from './screens/Home';
import Accounts from './screens/Accounts';
import Transactions from './screens/Transactions';
import More from './screens/More';
import AccountDetail from './screens/AccountDetail';
import TransactionDetail from './screens/TransactionDetail';
import AddTransaction from './screens/AddTransaction';
import Categories from './screens/Categories';
import ImportCsv from './screens/ImportCsv';
import Budgets from './screens/Budgets';
import Reports from './screens/Reports';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme: Theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.background, card: colors.backgroundElevated, text: colors.textPrimary, border: colors.border },
};

function Gate({ children }: { children: React.ReactNode }): React.JSX.Element {
  const ledger = useLedger();
  const { t } = useStrings();
  if (ledger.status === 'loading') {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.highlight} accessibilityLabel={t.loading} />
        </View>
      </Screen>
    );
  }
  if (ledger.status === 'fatal' || ledger.status === 'corrupt') {
    return (
      <Screen>
        <ErrorState message={ledger.message} onRetry={ledger.retry} />
      </Screen>
    );
  }
  return <>{children}</>;
}

function Tabs(): React.JSX.Element {
  const { t } = useStrings();
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
      <Tab.Screen name="Home" options={{ tabBarLabel: t.tabsHome }}>
        {() => (
          <Gate>
            <Home />
          </Gate>
        )}
      </Tab.Screen>
      <Tab.Screen name="Accounts" options={{ tabBarLabel: t.tabsAccounts }}>
        {() => (
          <Gate>
            <Accounts />
          </Gate>
        )}
      </Tab.Screen>
      <Tab.Screen name="Transactions" options={{ tabBarLabel: t.tabsTransactions }}>
        {() => (
          <Gate>
            <Transactions />
          </Gate>
        )}
      </Tab.Screen>
      <Tab.Screen name="More" options={{ tabBarLabel: t.tabsMore }}>
        {() => (
          <Gate>
            <More />
          </Gate>
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

function RootNavigator(): React.JSX.Element {
  const { t } = useStrings();
  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.backgroundElevated },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { color: colors.textPrimary },
        }}
      >
        <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
        <Stack.Screen name="AccountDetail" component={AccountDetail} options={{ title: t.accTitle }} />
        <Stack.Screen name="TransactionDetail" component={TransactionDetail} options={{ title: t.detailTitle }} />
        <Stack.Screen name="AddTransaction" component={AddTransaction} options={{ title: t.entryTitle, presentation: 'modal' }} />
        <Stack.Screen name="Categories" component={Categories} options={{ title: t.catsTitle }} />
        <Stack.Screen name="ImportCsv" component={ImportCsv} options={{ title: t.importTitle, presentation: 'modal' }} />
        <Stack.Screen name="Budgets" component={Budgets} options={{ title: t.budgetsTitle }} />
        <Stack.Screen name="Reports" component={Reports} options={{ title: t.reportsTitle }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App(): React.JSX.Element {
  return (
    <LedgerProvider>
      <LangProvider>
        <ToastProvider>
          <StatusBar style="light" />
          <NavigationBar style="dark" />
          <RootNavigator />
        </ToastProvider>
      </LangProvider>
    </LedgerProvider>
  );
}
