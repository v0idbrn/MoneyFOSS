import type { NavigatorScreenParams } from '@react-navigation/native';

export type EntryKind = 'expense' | 'income' | 'transfer' | 'card-payment' | 'convert' | 'card-purchase';

export type TabParamList = {
  Home: undefined;
  Accounts: undefined;
  Transactions: undefined;
  More: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList>;
  AccountDetail: { accountId: string };
  TransactionDetail: { txId: string };
  AddTransaction: { kind?: EntryKind; accountId?: string } | undefined;
  Categories: undefined;
};
