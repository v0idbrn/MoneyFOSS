import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { deleteTransaction } from '../../../src/persistence/repository.ts';
import { getDb } from '../db';
import { useLedger } from '../state';
import { TX_KIND_LABELS, describeTransaction } from '../lib/describe';
import { formatDisplayAmount } from '../lib/format';
import { Amount, Body, Btn, Divider, ErrorState, H1, Meta, Screen, Section } from '../components';
import type { RootStackParamList } from '../navtypes';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'TransactionDetail'>;

export default function TransactionDetail(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const ledger = useLedger();
  const [showPostings, setShowPostings] = useState(false);
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState('');

  const accounts = useMemo(() => new Map(ledger.accounts.map((a) => [a.id, a])), [ledger.accounts]);
  const categories = useMemo(() => new Map(ledger.categories.map((c) => [c.id, c])), [ledger.categories]);
  const tx = ledger.transactions.find((t) => t.id === route.params.txId);

  if (tx === undefined) {
    return (
      <Screen>
        <ErrorState message="This transaction no longer exists." />
      </Screen>
    );
  }
  const current = tx;

  const view = describeTransaction(current, accounts, categories);
  const conversion = current.conversion;

  function remove(): void {
    if (!armed) {
      setArmed(true);
      return;
    }
    try {
      deleteTransaction(getDb(), current.id);
      ledger.refresh();
      navigation.goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setArmed(false);
    }
  }

  return (
    <Screen>
      <Meta>{TX_KIND_LABELS[view.kind]}</Meta>
      <H1>{view.title}</H1>
      {view.amounts.map((line, index) => (
        <Amount key={`${line.currency}-${String(index)}`} amount={line.amount} currency={line.currency} big />
      ))}
      <Meta>{current.date}</Meta>
      {current.memo !== undefined && current.memo !== '' ? <Body>“{current.memo}”</Body> : null}
      <Divider />
      <Section>What happened</Section>
      <Body>{view.detail}</Body>
      {conversion !== undefined ? (
        <View>
          <Section>Conversion</Section>
          <Body>
            {conversion.fromCurrency} → {conversion.toCurrency} at {conversion.rateText} (
            {conversion.quoteDirection === 'srcPerDest' ? 'source per destination' : 'destination per source'})
          </Body>
          <Meta>
            Source {conversion.source} · {conversion.rateAt} · {conversion.roundingMode}
          </Meta>
          {view.hasFee ? <Body>Includes a fee recorded as an expense.</Body> : null}
        </View>
      ) : null}
      <Section>Accounting details</Section>
      <Btn
        title={showPostings ? 'Hide postings' : 'Show postings'}
        onPress={() => setShowPostings(!showPostings)}
        kind="secondary"
        icon="receipt-long"
      />
      {showPostings
        ? current.postings.map((posting, index) => (
            <View key={`${posting.accountId}-${String(index)}`}>
              <Body>
                {posting.accountId} {posting.kind === 'bridge' ? '(bridge)' : ''}
              </Body>
              <Meta>
                {formatDisplayAmount(posting.amount, posting.currency)} {posting.currency}
                {posting.categoryId !== undefined ? ` · ${categories.get(posting.categoryId)?.name ?? posting.categoryId}` : ''}
              </Meta>
            </View>
          ))
        : null}
      <Divider />
      <Btn title={armed ? 'Tap again to confirm delete' : 'Delete transaction'} onPress={remove} kind="danger" icon="delete-outline" />
      {error !== '' ? <Meta>{error}</Meta> : null}
    </Screen>
  );
}
