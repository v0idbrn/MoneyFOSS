import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { accountBalances } from '../../../src/domain/balances.ts';
import { useLedger } from '../state';
import { Amount, Body, EmptyState, Fab, H1, Meta, Screen, Section, TxRow } from '../components';
import { sortNewestFirst } from '../lib/filters';
import type { RootStackParamList } from '../navtypes';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function Home(): React.JSX.Element {
  const ledger = useLedger();
  const navigation = useNavigation<Nav>();
  const accounts = useMemo(() => new Map(ledger.accounts.map((a) => [a.id, a])), [ledger.accounts]);
  const categories = useMemo(() => new Map(ledger.categories.map((c) => [c.id, c])), [ledger.categories]);
  const balances = useMemo(() => accountBalances(ledger.transactions), [ledger.transactions]);

  const snapshot = useMemo(() => {
    const totals = new Map<string, { total: bigint; count: number }>();
    for (const account of ledger.accounts) {
      if (account.type !== 'ASSET' && account.type !== 'LIABILITY') {
        continue;
      }
      const perCurrency = balances.get(account.id);
      if (perCurrency === undefined) {
        continue;
      }
      for (const [currency, amount] of perCurrency) {
        const entry = totals.get(currency) ?? { total: 0n, count: 0 };
        totals.set(currency, { total: entry.total + amount, count: entry.count + 1 });
      }
    }
    return [...totals.entries()].sort(([a], [b]) => (a < b ? -1 : 1));
  }, [ledger.accounts, balances]);

  const recent = useMemo(() => sortNewestFirst(ledger.transactions).slice(0, 5), [ledger.transactions]);

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <H1>Home</H1>
        {ledger.accounts.length === 0 ? (
          <EmptyState
            icon="account-balance-wallet"
            title="No accounts yet"
            body="Create your first account to start tracking money. Accounts can be cash, a bank, or a credit card."
            actionLabel="Go to Accounts"
            onAction={() => navigation.navigate('Tabs', { screen: 'Accounts' })}
          />
        ) : (
          <>
            <Section>Snapshot</Section>
            {snapshot.length === 0 ? (
              <Meta>No movements yet. Balances are zero across all accounts.</Meta>
            ) : (
              snapshot.map(([currency, entry]) => (
                <View key={currency}>
                  <Amount amount={entry.total} currency={currency} big />
                  <Meta>
                    {entry.count} {entry.count === 1 ? 'account holds' : 'accounts hold'} {currency}
                  </Meta>
                </View>
              ))
            )}
          </>
        )}
        {ledger.transactions.length === 0 ? (
          <EmptyState
            icon="receipt-long"
            title="No transactions yet"
            body="Record your first expense with the + button. It takes less than 30 seconds."
          />
        ) : (
          <>
            <Section>Recent</Section>
            {recent.map((tx) => (
              <TxRow
                key={tx.id}
                tx={tx}
                accounts={accounts}
                categories={categories}
                onPress={() => navigation.navigate('TransactionDetail', { txId: tx.id })}
              />
            ))}
          </>
        )}
        {ledger.accounts.length > 0 && ledger.transactions.length === 0 ? (
          <Body>Use the + button to record an expense, income, transfer or conversion.</Body>
        ) : null}
      </Screen>
      <Fab onPress={() => navigation.navigate('AddTransaction', {})} label="Add transaction" />
    </View>
  );
}
