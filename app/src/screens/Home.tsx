import React, { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useLedger } from '../state';
import { useStrings } from '../lang';
import { accountBalances } from '../../../src/domain/balances.ts';
import { formatDisplayAmount } from '../lib/format';
import { Amount, Body, Btn, EmptyState, Fab, H1, Meta, Screen, Section, TxRow } from '../components';
import { snapshotEntries } from '../lib/snapshot';
import { sortNewestFirst } from '../lib/filters';
import { colors } from '../theme';
import type { RootStackParamList } from '../navtypes';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const ACCOUNTS_SHOWN = 5;

export default function Home(): React.JSX.Element {
  const ledger = useLedger();
  const navigation = useNavigation<Nav>();
  const { t } = useStrings();
  const accounts = useMemo(() => new Map(ledger.accounts.map((a) => [a.id, a])), [ledger.accounts]);
  const categories = useMemo(() => new Map(ledger.categories.map((c) => [c.id, c])), [ledger.categories]);
  const words = { minus: t.a11yMinus, plus: t.a11yPlus, zero: t.a11yZero };

  const snapshot = useMemo(() => snapshotEntries(ledger.accounts, ledger.transactions), [ledger.accounts, ledger.transactions]);
  const visibleAccounts = useMemo(() => ledger.accounts.filter((a) => a.type !== 'EQUITY'), [ledger.accounts]);
  const balances = useMemo(() => accountBalances(ledger.transactions), [ledger.transactions]);
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
            {visibleAccounts.length > 0 ? (
              <>
                <Section>{t.accountsTitle}</Section>
                {visibleAccounts.slice(0, ACCOUNTS_SHOWN).map((account) => {
                  const amount = balances.get(account.id)?.get(account.currency) ?? 0n;
                  const line = `${formatDisplayAmount(amount, account.currency)} ${account.currency}`;
                  return (
                    <Pressable
                      key={account.id}
                      style={({ pressed }) => [
                        { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
                        pressed ? { opacity: 0.7 } : null,
                      ]}
                      onPress={() => navigation.navigate('AccountDetail', { accountId: account.id })}
                      accessibilityRole="button"
                      accessibilityLabel={`${account.name}, ${line}`}
                      android_ripple={{ color: 'rgba(255,255,255,0.08)' }}
                    >
                      <View style={{ flex: 1 }}>
                        <Body>{account.name}</Body>
                        <Meta>{account.currency}</Meta>
                      </View>
                      <Body>{line}</Body>
                      <MaterialIcons name="chevron-right" size={22} color={colors.textMuted} />
                    </Pressable>
                  );
                })}
                {visibleAccounts.length > ACCOUNTS_SHOWN ? (
                  <Btn
                    title={t.showAll(visibleAccounts.length)}
                    onPress={() => navigation.navigate('Tabs', { screen: 'Accounts' })}
                    kind="secondary"
                    icon="expand-more"
                  />
                ) : null}
              </>
            ) : null}
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
