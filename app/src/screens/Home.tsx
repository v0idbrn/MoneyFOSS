import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useLedger } from '../state';
import { useStrings } from '../lang';
import { Amount, Body, Btn, EmptyState, Fab, H1, Meta, Screen, Section, TxRow } from '../components';
import { snapshotEntries } from '../lib/snapshot';
import { sortNewestFirst } from '../lib/filters';
import type { RootStackParamList } from '../navtypes';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function Home(): React.JSX.Element {
  const ledger = useLedger();
  const navigation = useNavigation<Nav>();
  const { t } = useStrings();
  const accounts = useMemo(() => new Map(ledger.accounts.map((a) => [a.id, a])), [ledger.accounts]);
  const categories = useMemo(() => new Map(ledger.categories.map((c) => [c.id, c])), [ledger.categories]);
  const words = { minus: t.a11yMinus, plus: t.a11yPlus, zero: t.a11yZero };

  const snapshot = useMemo(() => snapshotEntries(ledger.accounts, ledger.transactions), [ledger.accounts, ledger.transactions]);
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
            {ledger.transactions.length === 0 ? (
              <>
                <EmptyState icon="receipt-long" title={t.homeNoTx} body={t.homeNoTxBody} />
                <Body>{t.homeAddHint}</Body>
              </>
            ) : (
              <>
                <Section>{t.homeRecent}</Section>
                {recent.map((tx) => (
                  <TxRow
                    key={tx.id}
                    tx={tx}
                    accounts={accounts}
                    categories={categories}
                    t={t}
                    onPress={() => navigation.navigate('TransactionDetail', { txId: tx.id })}
                  />
                ))}
                {ledger.transactions.length > recent.length ? (
                  <Btn
                    title={t.showAll(ledger.transactions.length)}
                    onPress={() => navigation.navigate('Tabs', { screen: 'Transactions' })}
                    kind="secondary"
                    icon="expand-more"
                  />
                ) : null}
              </>
            )}
          </>
        )}
      </Screen>
      <Fab onPress={() => navigation.navigate('AddTransaction', {})} label={t.homeFab} />
    </View>
  );
}
