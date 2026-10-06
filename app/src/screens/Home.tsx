import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { accountBalances, currencyTotals } from '../../../src/domain/balances.ts';
import { useLedger } from '../state';
import { useStrings } from '../lang';
import { Amount, Body, EmptyState, Fab, H1, Meta, Screen, Section, TxRow } from '../components';
import { sortNewestFirst } from '../lib/filters';
import type { RootStackParamList } from '../navtypes';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function Home(): React.JSX.Element {
  const ledger = useLedger();
  const navigation = useNavigation<Nav>();
  const { t } = useStrings();
  const accounts = useMemo(() => new Map(ledger.accounts.map((a) => [a.id, a])), [ledger.accounts]);
  const categories = useMemo(() => new Map(ledger.categories.map((c) => [c.id, c])), [ledger.categories]);
  const balances = useMemo(() => accountBalances(ledger.transactions), [ledger.transactions]);
  const words = { minus: t.a11yMinus, plus: t.a11yPlus, zero: t.a11yZero };

  const snapshot = useMemo(() => {
    const ids = ledger.accounts.filter((a) => a.type === 'ASSET' || a.type === 'LIABILITY').map((a) => a.id);
    const totals = currencyTotals(balances, ids);
    const counts = new Map<string, number>();
    for (const id of ids) {
      const perCurrency = balances.get(id);
      if (perCurrency === undefined) {
        continue;
      }
      for (const currency of perCurrency.keys()) {
        counts.set(currency, (counts.get(currency) ?? 0) + 1);
      }
    }
    return [...totals.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([currency, total]) => ({ currency, total, count: counts.get(currency) ?? 0 }));
  }, [ledger.accounts, balances]);

  const recent = useMemo(() => sortNewestFirst(ledger.transactions).slice(0, 5), [ledger.transactions]);

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <H1>{t.homeTitle}</H1>
        {ledger.accounts.length === 0 ? (
          <EmptyState
            icon="account-balance-wallet"
            title={t.homeNoAccounts}
            body={t.homeNoAccountsBody}
            actionLabel={t.homeGoAccounts}
            onAction={() => navigation.navigate('Tabs', { screen: 'Accounts' })}
          />
        ) : (
          <>
            <Section>{t.homeSnapshot}</Section>
            {snapshot.length === 0 ? (
              <Meta>{t.homeEmpty}</Meta>
            ) : (
              snapshot.map((entry) => (
                <View key={entry.currency}>
                  <Amount amount={entry.total} currency={entry.currency} big words={words} />
                  <Meta>
                    {t.accountsHold(entry.count)} {entry.currency}
                  </Meta>
                </View>
              ))
            )}
          </>
        )}
        {ledger.transactions.length === 0 ? (
          <EmptyState icon="receipt-long" title={t.homeNoTx} body={t.homeNoTxBody} />
        ) : (
          <>
            <Section>{t.homeRecent}</Section>
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
        {ledger.accounts.length > 0 && ledger.transactions.length === 0 ? <Body>{t.homeAddHint}</Body> : null}
      </Screen>
      <Fab onPress={() => navigation.navigate('AddTransaction', {})} label={t.homeFab} />
    </View>
  );
}
