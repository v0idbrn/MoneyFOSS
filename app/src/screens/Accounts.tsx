import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { getCurrency, listCurrencies } from '../../../src/domain/currency.ts';
import { parseMoney } from '../../../src/domain/money.ts';
import { accountBalances } from '../../../src/domain/balances.ts';
import { buildTransaction } from '../../../src/domain/operations.ts';
import { loadRefs, saveAccount, saveTransaction } from '../../../src/persistence/repository.ts';
import { ensureOpeningAccount, getDb, newAccountId, newTxId, todayLocal } from '../db';
import { useLedger } from '../state';
import { formatDisplayAmount } from '../lib/format';
import { normalizeAmountInput } from '../lib/format';
import { Body, Btn, Chip, EmptyState, Field, H1, Meta, Screen, Section } from '../components';
import { colors } from '../theme';
import type { RootStackParamList } from '../navtypes';
import type { Account } from '../../../src/domain/types.ts';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const FRIENDLY_TYPE: Record<Account['type'], string> = { ASSET: 'Cash & bank', LIABILITY: 'Cards & debts', EQUITY: 'Equity' };

export default function Accounts(): React.JSX.Element {
  const ledger = useLedger();
  const navigation = useNavigation<Nav>();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<'ASSET' | 'LIABILITY'>('ASSET');
  const [currency, setCurrency] = useState('ARS');
  const [opening, setOpening] = useState('');
  const [error, setError] = useState('');

  const balances = useMemo(() => accountBalances(ledger.transactions), [ledger.transactions]);
  const visible = useMemo(() => ledger.accounts.filter((a) => a.type !== 'EQUITY'), [ledger.accounts]);
  const assets = visible.filter((a) => a.type === 'ASSET');
  const liabilities = visible.filter((a) => a.type !== 'ASSET');

  function balanceLine(account: Account): string {
    const perCurrency = balances.get(account.id);
    const amount = perCurrency?.get(account.currency) ?? 0n;
    return `${formatDisplayAmount(amount, account.currency)} ${account.currency}`;
  }

  function create(): void {
    try {
      const db = getDb();
      const account: Account = { id: newAccountId(), name: name.trim(), type: kind, currency };
      saveAccount(db, account);
      const openingText = normalizeAmountInput(opening);
      if (openingText !== '') {
        const parsed = parseMoney(openingText, currency);
        if (parsed.amount !== 0n) {
          const equity = ensureOpeningAccount(db, currency);
          const refs = loadRefs(db);
          const openingTx = buildTransaction({
            refs,
            id: newTxId(),
            date: todayLocal(),
            memo: 'Opening balance',
            postings: [
              { accountId: account.id, currency, amount: parsed.amount, kind: 'normal' },
              { accountId: equity.id, currency, amount: -parsed.amount, kind: 'normal' },
            ],
          });
          saveTransaction(db, openingTx);
        }
      }
      setName('');
      setOpening('');
      setError('');
      setShowForm(false);
      ledger.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function renderGroup(title: string, list: Account[]): React.JSX.Element {
    return (
      <View key={title}>
        <Section>
          {title} ({list.length})
        </Section>
        {list.map((account) => (
          <Pressable
            key={account.id}
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}
            onPress={() => navigation.navigate('AccountDetail', { accountId: account.id })}
            accessibilityRole="button"
            accessibilityLabel={`${account.name}, ${balanceLine(account)}`}
          >
            <View style={{ flex: 1 }}>
              <Body>{account.name}</Body>
              <Meta>
                {FRIENDLY_TYPE[account.type]} · {getCurrency(account.currency).symbol} {account.currency}
              </Meta>
            </View>
            <Body>{balanceLine(account)}</Body>
            <MaterialIcons name="chevron-right" size={22} color={colors.textMuted} />
          </Pressable>
        ))}
      </View>
    );
  }

  return (
    <Screen>
      <H1>Accounts</H1>
      {visible.length === 0 && !showForm ? (
        <EmptyState
          icon="account-balance-wallet"
          title="No accounts yet"
          body="Add a cash wallet, a bank account or a credit card. Each account holds a single currency."
          actionLabel="New account"
          onAction={() => setShowForm(true)}
        />
      ) : (
        <>
          {renderGroup('Cash & bank', assets)}
          {renderGroup('Cards & debts', liabilities)}
          <Btn title={showForm ? 'Cancel' : 'New account'} onPress={() => setShowForm(!showForm)} kind="secondary" icon="add" />
        </>
      )}
      {showForm ? (
        <View>
          <Section>New account</Section>
          <Field label="Name" value={name} onChangeText={setName} placeholder="Cash, My bank, Visa…" />
          <Meta>Kind</Meta>
          <View style={{ flexDirection: 'row' }}>
            <Chip label="Cash & bank" active={kind === 'ASSET'} onPress={() => setKind('ASSET')} />
            <Chip label="Card & debts" active={kind === 'LIABILITY'} onPress={() => setKind('LIABILITY')} />
          </View>
          <Meta>Currency</Meta>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {listCurrencies().map((c) => (
              <Chip key={c.code} label={`${c.symbol} ${c.code}`} active={currency === c.code} onPress={() => setCurrency(c.code)} />
            ))}
          </View>
          <Field
            label="Starting balance (optional)"
            value={opening}
            onChangeText={setOpening}
            placeholder="0.00"
            keyboardType="decimal-pad"
            error={undefined}
          />
          {error !== '' ? <Meta>{error}</Meta> : null}
          <Btn title="Create account" onPress={create} icon="check" />
        </View>
      ) : null}
    </Screen>
  );
}
