import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { listCurrencies } from '../../../src/domain/currency.ts';
import { parseMoney, type Money } from '../../../src/domain/money.ts';
import { cardPayment, cardPurchase, exchange, expense, income, transfer } from '../../../src/domain/operations.ts';
import { saveTransaction } from '../../../src/persistence/repository.ts';
import type { Account, Category, Transaction } from '../../../src/domain/types.ts';
import { getDb, newTxId, todayLocal } from '../db';
import { useLedger } from '../state';
import { useStrings } from '../lang';
import { normalizeAmountInput } from '../lib/format';
import { Btn, Chip, ErrorState, Field, H1, Meta, Screen } from '../components';
import type { EntryKind, RootStackParamList } from '../navtypes';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'AddTransaction'>;

const KIND_VALUES: readonly EntryKind[] = ['expense', 'income', 'transfer', 'card-purchase', 'card-payment', 'convert'];

export default function AddTransaction(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const ledger = useLedger();
  const { t } = useStrings();

  const [kind, setKind] = useState<EntryKind>(route.params?.kind ?? 'expense');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState(route.params?.accountId ?? '');
  const [toAccountId, setToAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [foreignPrice, setForeignPrice] = useState(false);
  const [priceCurrency, setPriceCurrency] = useState('ARS');
  const [priceAmount, setPriceAmount] = useState('');
  const [rate, setRate] = useState('');
  const [inverted, setInverted] = useState(false);
  const [feeOn, setFeeOn] = useState(false);
  const [feeAmount, setFeeAmount] = useState('');
  const [feeCategoryId, setFeeCategoryId] = useState('');
  const [feeSide, setFeeSide] = useState<'from' | 'to'>('from');
  const [date, setDate] = useState(todayLocal());
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const accounts = useMemo(() => new Map(ledger.accounts.map((a) => [a.id, a])), [ledger.accounts]);
  const spendable = ledger.accounts.filter((a) => a.type === 'ASSET' || a.type === 'LIABILITY');
  const liabilities = ledger.accounts.filter((a) => a.type === 'LIABILITY');
  const expenseCats = ledger.categories.filter((c) => c.kind === 'expense');
  const incomeCats = ledger.categories.filter((c) => c.kind === 'income');

  function needAccount(id: string, message: string): Account {
    const account = accounts.get(id);
    if (account === undefined) {
      throw new Error(message);
    }
    return account;
  }

  function needCategory(id: string, kind: 'expense' | 'income'): Category {
    const category = ledger.categories.find((c) => c.id === id && c.kind === kind);
    if (category === undefined) {
      throw new Error(kind === 'expense' ? t.needExpenseCat : t.needIncomeCat);
    }
    return category;
  }

  function parseAmount(text: string, currency: string): Money {
    const normalized = normalizeAmountInput(text);
    if (normalized === '') {
      throw new Error(t.needAmount);
    }
    return parseMoney(normalized, currency);
  }

  function rateInput() {
    const text = rate.trim();
    if (text === '') {
      throw new Error(t.needRate);
    }
    return {
      text,
      quoteDirection: inverted ? ('destPerSrc' as const) : ('srcPerDest' as const),
      rateAt: date,
      source: 'manual' as const,
    };
  }

  function memo(): string | undefined {
    const trimmed = note.trim();
    return trimmed === '' ? undefined : trimmed;
  }

  function refs(): { accounts: ReadonlyMap<string, Account>; categories: ReadonlyMap<string, Category> } {
    return { accounts, categories: new Map(ledger.categories.map((c) => [c.id, c])) };
  }

  function buildTx(): Transaction {
    const id = newTxId();
    if (kind === 'expense' || kind === 'card-purchase') {
      const account = needAccount(accountId, t.needAccount);
      if (kind === 'card-purchase' && account.type !== 'LIABILITY') {
        throw new Error(t.cardNeedsLiability);
      }
      const category = needCategory(categoryId, 'expense');
      if (foreignPrice) {
        const price = parseAmount(priceAmount, priceCurrency);
        const input = {
          refs: refs(),
          id,
          date,
          memo: memo(),
          account,
          amount: price,
          category,
          rate: rateInput(),
        };
        return expense(input);
      }
      const input = {
        refs: refs(),
        id,
        date,
        memo: memo(),
        account,
        amount: parseAmount(amount, account.currency),
        category,
      };
      return kind === 'card-purchase' ? cardPurchase(input) : expense(input);
    }
    if (kind === 'income') {
      const account = needAccount(accountId, t.needAccount);
      return income({
        refs: refs(),
        id,
        date,
        memo: memo(),
        account,
        amount: parseAmount(amount, account.currency),
        category: needCategory(categoryId, 'income'),
      });
    }
    if (kind === 'transfer') {
      const from = needAccount(accountId, t.needFrom);
      const to = needAccount(toAccountId, t.needTo);
      return transfer({ refs: refs(), id, date, memo: memo(), from, to, amount: parseAmount(amount, from.currency) });
    }
    if (kind === 'card-payment') {
      const from = needAccount(accountId, t.needFrom);
      const to = needAccount(toAccountId, t.needTo);
      return cardPayment({ refs: refs(), id, date, memo: memo(), from, to, amount: parseAmount(amount, from.currency) });
    }
    const from = needAccount(accountId, t.needFrom);
    const to = needAccount(toAccountId, t.needTo);
    const converted = parseAmount(amount, from.currency);
    if (!feeOn) {
      return exchange({ refs: refs(), id, date, memo: memo(), from, to, amount: converted, rate: rateInput() });
    }
    const feeCurrency = feeSide === 'from' ? from.currency : to.currency;
    return exchange({
      refs: refs(),
      id,
      date,
      memo: memo(),
      from,
      to,
      amount: converted,
      rate: rateInput(),
      fee: { amount: parseAmount(feeAmount, feeCurrency), category: needCategory(feeCategoryId, 'expense') },
    });
  }

  function save(): void {
    try {
      const tx = buildTx();
      saveTransaction(getDb(), tx);
      ledger.refresh();
      navigation.goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function accountChips(list: Account[], value: string, onPick: (id: string) => void): React.JSX.Element {
    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {list.map((account) => (
          <Chip key={account.id} label={`${account.name} · ${account.currency}`} active={value === account.id} onPress={() => onPick(account.id)} />
        ))}
      </View>
    );
  }

  function categoryChips(list: Category[], value: string, onPick: (id: string) => void): React.JSX.Element {
    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {list.map((category) => (
          <Chip key={category.id} label={category.name} active={value === category.id} onPress={() => onPick(category.id)} />
        ))}
      </View>
    );
  }

  const pickedAccount = accounts.get(accountId);

  return (
    <Screen>
      <H1>{t.entryTitle}</H1>
      <Meta>{t.entryType}</Meta>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {KIND_VALUES.map((value) => (
          <Chip key={value} label={t.entryKinds[value]} active={kind === value} onPress={() => setKind(value)} />
        ))}
      </View>

      {(kind === 'expense' || kind === 'card-purchase' || kind === 'income') && (
        <>
          <Meta>{t.entryAccount}</Meta>
          {accountChips(kind === 'card-purchase' ? liabilities : spendable, accountId, setAccountId)}
        </>
      )}
      {(kind === 'transfer' || kind === 'card-payment' || kind === 'convert') && (
        <>
          <Meta>{t.entryFrom}</Meta>
          {accountChips(spendable, accountId, setAccountId)}
          <Meta>{t.entryTo}</Meta>
          {accountChips(kind === 'card-payment' ? liabilities : spendable, toAccountId, setToAccountId)}
        </>
      )}

      <Field
        label={t.amountIn(pickedAccount?.currency ?? null)}
        value={amount}
        onChangeText={setAmount}
        placeholder="0.00"
        keyboardType="decimal-pad"
      />

      {(kind === 'expense' || kind === 'card-purchase') && (
        <>
          <Meta>{t.entryForeign}</Meta>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <Chip label={t.no} active={!foreignPrice} onPress={() => setForeignPrice(false)} />
            <Chip label={t.yes} active={foreignPrice} onPress={() => setForeignPrice(true)} />
          </View>
        </>
      )}
      {foreignPrice && (kind === 'expense' || kind === 'card-purchase') && (
        <>
          <Meta>{t.entryPriceCurrency}</Meta>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {listCurrencies()
              .filter((c) => c.code !== pickedAccount?.currency)
              .map((c) => (
                <Chip key={c.code} label={`${c.symbol} ${c.code}`} active={priceCurrency === c.code} onPress={() => setPriceCurrency(c.code)} />
              ))}
          </View>
          <Field label={t.priceIn(priceCurrency)} value={priceAmount} onChangeText={setPriceAmount} placeholder="0.00" keyboardType="decimal-pad" />
        </>
      )}

      {(kind === 'expense' || kind === 'card-purchase') && (
        <>
          <Meta>{t.entryCategory}</Meta>
          {categoryChips(expenseCats, categoryId, setCategoryId)}
        </>
      )}
      {kind === 'income' && (
        <>
          <Meta>{t.entryCategory}</Meta>
          {categoryChips(incomeCats, categoryId, setCategoryId)}
        </>
      )}

      {(kind === 'convert' || foreignPrice) && (
        <>
          <Field label={t.entryRate} value={rate} onChangeText={setRate} placeholder="1180" keyboardType="decimal-pad" />
          <Meta>{t.entryRateMeaning}</Meta>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <Chip label={t.dirSrcPerDest} active={!inverted} onPress={() => setInverted(false)} />
            <Chip label={t.dirDestPerSrc} active={inverted} onPress={() => setInverted(true)} />
          </View>
        </>
      )}

      {kind === 'convert' && (
        <>
          <Meta>{t.entryFeeQ}</Meta>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <Chip label={t.entryNoFee} active={!feeOn} onPress={() => setFeeOn(false)} />
            <Chip label={t.entryWithFee} active={feeOn} onPress={() => setFeeOn(true)} />
          </View>
        </>
      )}
      {kind === 'convert' && feeOn && (
        <>
          <Field label={t.entryFeeAmount} value={feeAmount} onChangeText={setFeeAmount} placeholder="0.00" keyboardType="decimal-pad" />
          <Meta>{t.entryFeeCurrency}</Meta>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <Chip label={t.entryFeeSrc} active={feeSide === 'from'} onPress={() => setFeeSide('from')} />
            <Chip label={t.entryFeeDest} active={feeSide === 'to'} onPress={() => setFeeSide('to')} />
          </View>
          <Meta>{t.entryFeeCategory}</Meta>
          {categoryChips(expenseCats, feeCategoryId, setFeeCategoryId)}
        </>
      )}

      <Field label={t.entryDate} value={date} onChangeText={setDate} placeholder={t.entryDatePh} maxLength={10} />
      <Field label={t.entryNote} value={note} onChangeText={setNote} placeholder={t.entryNotePh} />

      {error !== '' ? <ErrorState message={error} /> : null}
      <Btn title={t.entrySave} onPress={save} icon="check" />
    </Screen>
  );
}
