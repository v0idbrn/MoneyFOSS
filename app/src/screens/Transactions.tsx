import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useLedger } from '../state';
import { EMPTY_FILTER, activeFilterCount, filterTransactions, sortNewestFirst, type TxFilter } from '../lib/filters';
import { TX_KINDS, TX_KIND_LABELS } from '../lib/describe';
import { Body, Btn, Chip, EmptyState, Fab, Field, H1, Meta, Screen, TxRow } from '../components';
import type { RootStackParamList } from '../navtypes';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function Transactions(): React.JSX.Element {
  const ledger = useLedger();
  const navigation = useNavigation<Nav>();
  const [filter, setFilter] = useState<TxFilter>(EMPTY_FILTER);

  const accounts = useMemo(() => new Map(ledger.accounts.map((a) => [a.id, a])), [ledger.accounts]);
  const categories = useMemo(() => new Map(ledger.categories.map((c) => [c.id, c])), [ledger.categories]);
  const visible = useMemo(
    () => sortNewestFirst(filterTransactions(ledger.transactions, filter, accounts, categories)),
    [ledger.transactions, filter, accounts, categories],
  );
  const active = activeFilterCount(filter);

  function set(partial: Partial<TxFilter>): void {
    setFilter({ ...filter, ...partial });
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <H1>Transactions</H1>
        <Field label="Search" value={filter.text} onChangeText={(text) => set({ text })} placeholder="Amount note, category, account…" />
        <Meta>Type</Meta>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          <Chip label="All" active={filter.kind === null} onPress={() => set({ kind: null })} />
          {TX_KINDS.map((kind) => (
            <Chip key={kind} label={TX_KIND_LABELS[kind]} active={filter.kind === kind} onPress={() => set({ kind })} />
          ))}
        </View>
        <Meta>Account</Meta>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          <Chip label="All" active={filter.accountId === null} onPress={() => set({ accountId: null })} />
          {ledger.accounts
            .filter((a) => a.type !== 'EQUITY')
            .map((account) => (
              <Chip
                key={account.id}
                label={account.name}
                active={filter.accountId === account.id}
                onPress={() => set({ accountId: account.id })}
              />
            ))}
        </View>
        <Meta>Category</Meta>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          <Chip label="All" active={filter.categoryId === null} onPress={() => set({ categoryId: null })} />
          {ledger.categories.map((category) => (
            <Chip
              key={category.id}
              label={category.name}
              active={filter.categoryId === category.id}
              onPress={() => set({ categoryId: category.id })}
            />
          ))}
        </View>
        {active > 0 ? (
          <Btn title={`Clear filters (${active})`} onPress={() => setFilter(EMPTY_FILTER)} kind="secondary" icon="filter-list" />
        ) : null}
        {ledger.transactions.length === 0 ? (
          <EmptyState
            icon="receipt-long"
            title="No transactions yet"
            body="Every expense, income, transfer and conversion you save will appear here."
            actionLabel="Add transaction"
            onAction={() => navigation.navigate('AddTransaction', {})}
          />
        ) : visible.length === 0 ? (
          <Body>No transactions match these filters.</Body>
        ) : (
          <>
            <Meta>
              {visible.length} of {ledger.transactions.length}
            </Meta>
            {visible.map((tx) => (
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
      </Screen>
      <Fab onPress={() => navigation.navigate('AddTransaction', {})} label="Add transaction" />
    </View>
  );
}
