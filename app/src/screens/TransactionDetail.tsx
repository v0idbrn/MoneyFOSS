import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { deleteTransaction } from '../../../src/persistence/repository.ts';
import { getDb } from '../db';
import { useLedger } from '../state';
import { useStrings } from '../lang';
import { describeTransaction } from '../lib/describe';
import { displayCategoryName } from '../lib/categories';
import { formatDisplayAmount } from '../lib/format';
import { Amount, Body, Btn, Divider, ErrorState, H1, Meta, Screen, Section } from '../components';
import type { RootStackParamList } from '../navtypes';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'TransactionDetail'>;

export default function TransactionDetail(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const ledger = useLedger();
  const { t } = useStrings();
  const [showPostings, setShowPostings] = useState(false);
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState('');

  const accounts = useMemo(() => new Map(ledger.accounts.map((a) => [a.id, a])), [ledger.accounts]);
  const categories = useMemo(() => new Map(ledger.categories.map((c) => [c.id, c])), [ledger.categories]);
  const tx = ledger.transactions.find((item) => item.id === route.params.txId);

  if (tx === undefined) {
    return (
      <Screen>
        <ErrorState message={t.accNotFound} />
      </Screen>
    );
  }
  const current = tx;
  const words = { minus: t.a11yMinus, plus: t.a11yPlus, zero: t.a11yZero };

  const view = describeTransaction(current, accounts, categories, t);
  const conversion = current.conversion;

  function categoryLabel(id: string): string {
    const stored = categories.get(id);
    return stored === undefined ? id : displayCategoryName(stored, t);
  }

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
      <Meta>{t.kinds[view.kind]}</Meta>
      <H1>{view.title}</H1>
      {view.amounts.map((line, index) => (
        <Amount key={`${line.currency}-${String(index)}`} amount={line.amount} currency={line.currency} big words={words} />
      ))}
      <Meta>{current.date}</Meta>
      {current.memo !== undefined && current.memo !== '' ? <Body>“{current.memo}”</Body> : null}
      <Divider />
      <Section>{t.detailWhat}</Section>
      <Body>{view.detail}</Body>
      {conversion !== undefined ? (
        <View>
          <Section>{t.detailConversion}</Section>
          <Body>
            {conversion.fromCurrency} → {conversion.toCurrency} · {conversion.rateText} (
            {conversion.quoteDirection === 'srcPerDest' ? t.dirSrcPerDest : t.dirDestPerSrc})
          </Body>
          <Meta>
            {conversion.source} · {conversion.rateAt} · {conversion.roundingMode}
          </Meta>
          {view.hasFee ? <Body>{t.detailFee}</Body> : null}
        </View>
      ) : null}
      <Section>{t.detailAccounting}</Section>
      <Btn
        title={showPostings ? t.detailHide : t.detailShow}
        onPress={() => setShowPostings(!showPostings)}
        kind="secondary"
        icon="receipt-long"
      />
      {showPostings
        ? current.postings.map((posting, index) => (
            <View key={`${posting.accountId}-${String(index)}`}>
              <Body>
                {posting.accountId} {posting.kind === 'bridge' ? t.detailBridge : ''}
              </Body>
              <Meta>
                {formatDisplayAmount(posting.amount, posting.currency)} {posting.currency}
                {posting.categoryId !== undefined ? ` · ${categoryLabel(posting.categoryId)}` : ''}
              </Meta>
            </View>
          ))
        : null}
      <Divider />
      <Btn title={armed ? t.detailConfirmDelete : t.detailDelete} onPress={remove} kind="danger" icon="delete-outline" />
      {error !== '' ? <Meta>{error}</Meta> : null}
    </Screen>
  );
}
