import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useLedger } from '../state';
import { useStrings } from '../lang';
import { EMPTY_FILTER, activeFilterCount, filterTransactions, sortNewestFirst, type TxFilter } from '../lib/filters';
import { displayCategoryName } from '../lib/categories';
import { TX_KINDS } from '../lib/describe';
import { Body, Btn, Chip, EmptyState, Fab, Field, H1, Meta, Screen, TxRow } from '../components';
import type { RootStackParamList } from '../navtypes';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const PAGE_SIZE = 100;

export default function Transactions(): React.JSX.Element {
  const ledger = useLedger();
  const navigation = useNavigation<Nav>();
  const { t } = useStrings();
  const [filter, setFilter] = useState<TxFilter>(EMPTY_FILTER);
  const [expanded, setExpanded] = useState(false);

  const accounts = useMemo(() => new Map(ledger.accounts.map((a) => [a.id, a])), [ledger.accounts]);
  const categories = useMemo(() => new Map(ledger.categories.map((c) => [c.id, c])), [ledger.categories]);
  const visible = useMemo(
    () => sortNewestFirst(filterTransactions(ledger.transactions, filter, accounts, categories)),
    [ledger.transactions, filter, accounts, categories],
  );
  const active = activeFilterCount(filter);
  const shown = expanded ? visible : visible.slice(0, PAGE_SIZE);

  function set(partial: Partial<TxFilter>): void {
    setExpanded(false);
    setFilter({ ...filter, ...partial });
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <H1>{t.txsTitle}</H1>
        <Field label={t.txsSearch} value={filter.text} onChangeText={(text) => set({ text })} placeholder={t.txsSearchPh} />
        <Meta>{t.txsType}</Meta>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          <Chip label={t.all} active={filter.kind === null} onPress={() => set({ kind: null })} />
          {TX_KINDS.map((kind) => (
            <Chip key={kind} label={t.kinds[kind]} active={filter.kind === kind} onPress={() => set({ kind })} />
          ))}
        </View>
        <Meta>{t.txsAccount}</Meta>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          <Chip label={t.all} active={filter.accountId === null} onPress={() => set({ accountId: null })} />
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
        <Meta>{t.txsCategory}</Meta>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          <Chip label={t.all} active={filter.categoryId === null} onPress={() => set({ categoryId: null })} />
          {ledger.categories.map((category) => (
            <Chip
              key={category.id}
              label={displayCategoryName(category, t)}
              active={filter.categoryId === category.id}
              onPress={() => set({ categoryId: category.id })}
            />
          ))}
        </View>
        {active > 0 ? (
          <Btn
            title={t.clearFilters(active)}
            onPress={() => {
              setExpanded(false);
              setFilter(EMPTY_FILTER);
            }}
            kind="secondary"
            icon="filter-list"
          />
        ) : null}
        {ledger.transactions.length === 0 ? (
          <EmptyState
            icon="receipt-long"
            title={t.txsEmpty}
            body={t.txsEmptyBody}
            actionLabel={t.txsAdd}
            onAction={() => navigation.navigate('AddTransaction', {})}
          />
        ) : visible.length === 0 ? (
          <Body>{t.txsNoMatch}</Body>
        ) : (
          <>
            <Meta>{t.showing(shown.length, visible.length)}</Meta>
            {shown.map((tx) => (
              <TxRow
                key={tx.id}
                tx={tx}
                accounts={accounts}
                categories={categories}
                t={t}
                onPress={() => navigation.navigate('TransactionDetail', { txId: tx.id })}
              />
            ))}
            {!expanded && visible.length > PAGE_SIZE ? (
              <Btn title={t.showAll(visible.length)} onPress={() => setExpanded(true)} kind="secondary" icon="add" />
            ) : null}
          </>
        )}
      </Screen>
      <Fab onPress={() => navigation.navigate('AddTransaction', {})} label={t.homeFab} />
    </View>
  );
}
