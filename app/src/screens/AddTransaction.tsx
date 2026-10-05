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
import { normalizeAmountInput } from '../lib/format';
import { Btn, Chip, ErrorState, Field, H1, Meta, Screen, Section } from '../components';
import type { EntryKind, RootStackParamList } from '../navtypes';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'AddTransaction'>;

const KINDS: readonly { value: EntryKind; label: string }[] = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'card-purchase', label: 'Card purchase' },
  { value: 'card-payment', label: 'Card payment' },
  { value: 'convert', label: 'Convert' },
];

export default function AddTransaction(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const ledger = useLedger();

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

  function needAccount(id: string, what: string): Account {
    const account = accounts.get(id);
    if (account === undefined) {
      throw new Error(`Choose ${what}.`);
    }
    return account;
  }

  function needCategory(id: string, kind: 'expense' | 'income'): Category {
    const category = ledger.categories.find((c) => c.id === id && c.kind === kind);
    if (category === undefined) {
      throw new Error(`Choose a ${kind} category.`);
    }
    return category;
  }

  function parseAmount(text: string, currency: string, what: string): Money {
    const normalized = normalizeAmountInput(text);
    if (normalized === '') {
      throw new Error(`Enter ${what}.`);
    }
    return parseMoney(normalized, currency);
  }

  function rateInput(fromCurrency: string, toCurrency: string) {
    const text = rate.trim();
    if (text === '') {
      throw new Error('Enter the exchange rate.');
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

  function buildTx(): Transaction {
    const id = newTxId();
    if (kind === 'expense' || kind === 'card-purchase') {
      const account = needAccount(accountId, 'an account');
      if (kind === 'card-purchase' && account.type !== 'LIABILITY') {
        throw new Error('A card purchase needs a liability (card) account.');
      }
      const category = needCategory(categoryId, 'expense');
      const refs = { accounts, categories: new Map(ledger.categories.map((c) => [c.id, c])) };
      if (foreignPrice) {
        const price = parseAmount(priceAmount, priceCurrency, 'the price');
        const input = {
          refs,
          id,
          date,
          memo: memo(),
          account,
          amount: price,
          category,
          rate: rateInput(priceCurrency, account.currency),
        };
        return expense(input);
      }
      const input = {
        refs,
        id,
        date,
        memo: memo(),
        account,
        amount: parseAmount(amount, account.currency, 'an amount'),
        category,
      };
      return kind === 'card-purchase' ? cardPurchase(input) : expense(input);
    }
    if (kind === 'income') {
      const account = needAccount(accountId, 'an account');
      const refs = { accounts, categories: new Map(ledger.categories.map((c) => [c.id, c])) };
      return income({
        refs,
        id,
        date,
        memo: memo(),
        account,
        amount: parseAmount(amount, account.currency, 'an amount'),
        category: needCategory(categoryId, 'income'),
      });
    }
    if (kind === 'transfer') {
      const from = needAccount(accountId, 'the source account');
      const to = needAccount(toAccountId, 'the destination account');
      const refs = { accounts, categories: new Map(ledger.categories.map((c) => [c.id, c])) };
      return transfer({ refs, id, date, memo: memo(), from, to, amount: parseAmount(amount, from.currency, 'an amount') });
    }
    if (kind === 'card-payment') {
      const from = needAccount(accountId, 'the paying account');
      const to = needAccount(toAccountId, 'the card');
      const refs = { accounts, categories: new Map(ledger.categories.map((c) => [c.id, c])) };
      return cardPayment({ refs, id, date, memo: memo(), from, to, amount: parseAmount(amount, from.currency, 'an amount') });
    }
    const from = needAccount(accountId, 'the source account');
    const to = needAccount(toAccountId, 'the destination account');
    const refs = { accounts, categories: new Map(ledger.categories.map((c) => [c.id, c])) };
    const converted = parseAmount(amount, from.currency, 'an amount');
    if (!feeOn) {
      return exchange({ refs, id, date, memo: memo(), from, to, amount: converted, rate: rateInput(from.currency, to.currency) });
    }
    const feeCurrency = feeSide === 'from' ? from.currency : to.currency;
    return exchange({
      refs,
      id,
      date,
      memo: memo(),
      from,
      to,
      amount: converted,
      rate: rateInput(from.currency, to.currency),
      fee: { amount: parseAmount(feeAmount, feeCurrency, 'the fee'), category: needCategory(feeCategoryId, 'expense') },
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
      <H1>Add transaction</H1>
      <Meta>Type</Meta>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {KINDS.map((option) => (
          <Chip key={option.value} label={option.label} active={kind === option.value} onPress={() => setKind(option.value)} />
        ))}
      </View>

      {(kind === 'expense' || kind === 'card-purchase' || kind === 'income') && (
        <>
          <Meta>Account</Meta>
          {accountChips(kind === 'card-purchase' ? liabilities : spendable, accountId, setAccountId)}
        </>
      )}
      {(kind === 'transfer' || kind === 'card-payment' || kind === 'convert') && (
        <>
          <Meta>From</Meta>
          {accountChips(spendable, accountId, setAccountId)}
          <Meta>To</Meta>
          {accountChips(kind === 'card-payment' ? liabilities : spendable, toAccountId, setToAccountId)}
        </>
      )}

      <Field
        label={kind === 'convert' ? `Amount in ${pickedAccount?.currency ?? '…'}` : `Amount${pickedAccount !== undefined ? ` in ${pickedAccount.currency}` : ''}`}
        value={amount}
        onChangeText={setAmount}
        placeholder="0.00"
        keyboardType="decimal-pad"
      />

      {(kind === 'expense' || kind === 'card-purchase') && (
        <>
          <Meta>Priced in another currency?</Meta>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <Chip label="No" active={!foreignPrice} onPress={() => setForeignPrice(false)} />
            <Chip label="Yes" active={foreignPrice} onPress={() => setForeignPrice(true)} />
          </View>
        </>
      )}
      {foreignPrice && (kind === 'expense' || kind === 'card-purchase') && (
        <>
          <Meta>Price currency</Meta>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {listCurrencies()
              .filter((c) => c.code !== pickedAccount?.currency)
              .map((c) => (
                <Chip key={c.code} label={`${c.symbol} ${c.code}`} active={priceCurrency === c.code} onPress={() => setPriceCurrency(c.code)} />
              ))}
          </View>
          <Field label={`Price in ${priceCurrency}`} value={priceAmount} onChangeText={setPriceAmount} placeholder="0.00" keyboardType="decimal-pad" />
        </>
      )}

      {(kind === 'expense' || kind === 'card-purchase') && (
        <>
          <Meta>Category</Meta>
          {categoryChips(expenseCats, categoryId, setCategoryId)}
        </>
      )}
      {kind === 'income' && (
        <>
          <Meta>Category</Meta>
          {categoryChips(incomeCats, categoryId, setCategoryId)}
        </>
      )}

      {(kind === 'convert' || foreignPrice) && (
        <>
          <Field label="Exchange rate" value={rate} onChangeText={setRate} placeholder="1180" keyboardType="decimal-pad" />
          <Meta>Rate meaning</Meta>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <Chip label="Source per destination" active={!inverted} onPress={() => setInverted(false)} />
            <Chip label="Destination per source" active={inverted} onPress={() => setInverted(true)} />
          </View>
        </>
      )}

      {kind === 'convert' && (
        <>
          <Meta>Fee?</Meta>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <Chip label="No fee" active={!feeOn} onPress={() => setFeeOn(false)} />
            <Chip label="With fee" active={feeOn} onPress={() => setFeeOn(true)} />
          </View>
        </>
      )}
      {kind === 'convert' && feeOn && (
        <>
          <Field label="Fee amount" value={feeAmount} onChangeText={setFeeAmount} placeholder="0.00" keyboardType="decimal-pad" />
          <Meta>Fee currency</Meta>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <Chip label="Source" active={feeSide === 'from'} onPress={() => setFeeSide('from')} />
            <Chip label="Destination" active={feeSide === 'to'} onPress={() => setFeeSide('to')} />
          </View>
          <Meta>Fee category</Meta>
          {categoryChips(expenseCats, feeCategoryId, setFeeCategoryId)}
        </>
      )}

      <Field label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" maxLength={10} />
      <Field label="Note (optional)" value={note} onChangeText={setNote} placeholder="What was this?" />

      {error !== '' ? <ErrorState message={error} /> : null}
      <Btn title="Save transaction" onPress={save} icon="check" />
    </Screen>
  );
}
