import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { getCurrency, listCurrencies } from '../../../src/domain/currency.ts';
import { parseMoney } from '../../../src/domain/money.ts';
import { accountBalances } from '../../../src/domain/balances.ts';
import { openingBalance } from '../../../src/domain/operations.ts';
import { loadRefs, saveAccount, saveTransaction } from '../../../src/persistence/repository.ts';
import { ensureOpeningAccount, getDb, newAccountId, newTxId, todayLocal } from '../db';
import { useLedger } from '../state';
import { useStrings } from '../lang';
import { formatDisplayAmount } from '../lib/format';
import { normalizeAmountInput } from '../lib/format';
import { Body, Btn, Chip, EmptyState, Field, FormError, H1, Meta, Screen, Section, useToast } from '../components';
import { colors } from '../theme';
import type { RootStackParamList } from '../navtypes';
import type { Account } from '../../../src/domain/types.ts';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function Accounts(): React.JSX.Element {
  const ledger = useLedger();
  const navigation = useNavigation<Nav>();
  const { t } = useStrings();
  const showToast = useToast();
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

  const friendlyType: Record<Account['type'], string> = { ASSET: t.accountsCashBank, LIABILITY: t.accountsCardsDebts, EQUITY: t.accountsEquity };

  function balanceLine(account: Account): string {
    const perCurrency = balances.get(account.id);
    const amount = perCurrency?.get(account.currency) ?? 0n;
    return `${formatDisplayAmount(amount, account.currency)} ${account.currency}`;
  }

  function create(): void {
    if (name.trim() === '') {
      setError(t.needName);
      return;
    }
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
          const openingTx = openingBalance({
            refs,
            id: newTxId(),
            date: todayLocal(),
            memo: 'Opening balance',
            account,
            amount: parsed,
            equityAccount: equity,
          });
          saveTransaction(db, openingTx);
        }
      }
      setName('');
      setOpening('');
      setError('');
      setShowForm(false);
      ledger.refresh();
      showToast(t.toastCreated, 'success');
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
                {friendlyType[account.type]} · {getCurrency(account.currency).symbol} {account.currency}
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
      <H1>{t.accountsTitle}</H1>
      {visible.length === 0 && !showForm ? (
        <EmptyState
          icon="account-balance-wallet"
          title={t.accountsEmpty}
          body={t.accountsEmptyBody}
          actionLabel={t.accountsNew}
          onAction={() => setShowForm(true)}
        />
      ) : (
        <>
          {visible.length > 0 ? (
            <>
              {renderGroup(t.accountsCashBank, assets)}
              {renderGroup(t.accountsCardsDebts, liabilities)}
            </>
          ) : null}
          <Btn title={showForm ? t.cancel : t.accountsNew} onPress={() => setShowForm(!showForm)} kind="secondary" icon="add" />
        </>
      )}
      {showForm ? (
        <View>
          <Section>{t.accountsNewSection}</Section>
          <Field label={t.accountsName} value={name} onChangeText={setName} placeholder={t.accountsNamePh} />
          <Meta>{t.accountsKind}</Meta>
          <View style={{ flexDirection: 'row' }}>
            <Chip label={t.accountsCashBank} active={kind === 'ASSET'} onPress={() => setKind('ASSET')} />
            <Chip label={t.accountsCardsDebts} active={kind === 'LIABILITY'} onPress={() => setKind('LIABILITY')} />
          </View>
          <Meta>{t.accountsCurrency}</Meta>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {listCurrencies().map((c) => (
              <Chip key={c.code} label={`${c.symbol} ${c.code}`} active={currency === c.code} onPress={() => setCurrency(c.code)} />
            ))}
          </View>
          <Field
            label={t.accountsOpening}
            value={opening}
            onChangeText={setOpening}
            placeholder="0.00"
            keyboardType="decimal-pad"
            error={undefined}
          />
          {error !== '' ? <FormError message={error} /> : null}
          <Btn title={t.accountsCreate} onPress={create} icon="check" />
        </View>
      ) : null}
    </Screen>
  );
}
