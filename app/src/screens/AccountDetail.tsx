import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { accountBalances } from '../../../src/domain/balances.ts';
import { deleteAccount, hasPostings, renameAccount } from '../../../src/persistence/repository.ts';
import { getDb } from '../db';
import { useLedger } from '../state';
import { useStrings } from '../lang';
import { sortNewestFirst } from '../lib/filters';
import { Amount, Body, Btn, ErrorState, Field, FormError, H1, Meta, Screen, Section, TxRow, useToast } from '../components';
import type { RootStackParamList } from '../navtypes';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'AccountDetail'>;

export default function AccountDetail(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const ledger = useLedger();
  const { t } = useStrings();
  const showToast = useToast();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState('');
  const [armed, setArmed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState('');

  const account = ledger.accounts.find((a) => a.id === route.params.accountId);
  const accounts = useMemo(() => new Map(ledger.accounts.map((a) => [a.id, a])), [ledger.accounts]);
  const categories = useMemo(() => new Map(ledger.categories.map((c) => [c.id, c])), [ledger.categories]);
  const balances = useMemo(() => accountBalances(ledger.transactions), [ledger.transactions]);
  const matching = useMemo(
    () => sortNewestFirst(ledger.transactions.filter((tx) => tx.postings.some((p) => p.accountId === route.params.accountId))),
    [ledger.transactions, route.params.accountId],
  );
  const recent = expanded ? matching : matching.slice(0, 8);

  if (account === undefined) {
    return (
      <Screen>
        <ErrorState message={t.accNotFound} />
      </Screen>
    );
  }
  const current = account;
  const words = { minus: t.a11yMinus, plus: t.a11yPlus, zero: t.a11yZero };

  const amount = balances.get(current.id)?.get(current.currency) ?? 0n;

  function saveRename(): void {
    if (name.trim() === '') {
      setError(t.needName);
      return;
    }
    try {
      renameAccount(getDb(), current.id, name.trim());
      setRenaming(false);
      setName('');
      setError('');
      setArmed(false);
      ledger.refresh();
      showToast(t.toastNameSaved, 'success');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function remove(): void {
    if (!armed) {
      if (hasPostings(getDb(), current.id)) {
        setError(t.accBlockedDelete);
        return;
      }
      setArmed(true);
      return;
    }
    try {
      deleteAccount(getDb(), current.id);
      ledger.refresh();
      showToast(t.toastDeleted, 'success');
      navigation.goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setArmed(false);
    }
  }

  return (
    <Screen>
      <H1>{current.name}</H1>
      <Amount amount={amount} currency={current.currency} big words={words} />
      <Meta>
        {current.type === 'ASSET' ? t.accountsCashBank : current.type === 'LIABILITY' ? t.accountsCardsDebts : t.accountsEquity} ·{' '}
        {current.currency}
      </Meta>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        <Btn title={t.accAddTx} onPress={() => navigation.navigate('AddTransaction', { accountId: current.id })} icon="add" />
      </View>
      <Section>{t.accManage}</Section>
      {renaming ? (
        <View>
          <Field label={t.accNewName} value={name} onChangeText={setName} placeholder={current.name} />
          <Btn title={t.accSaveName} onPress={saveRename} kind="secondary" icon="check" />
        </View>
      ) : (
        <Btn
          title={t.accRename}
          onPress={() => {
            setRenaming(true);
            setArmed(false);
          }}
          kind="secondary"
          icon="edit"
        />
      )}
      <View style={{ marginTop: 8 }}>
        <Btn title={armed ? t.accConfirmDelete : t.accDelete} onPress={remove} kind="danger" icon="delete-outline" />
      </View>
      {error !== '' ? <FormError message={error} /> : null}
      <Section>{t.recentIn(matching.length)}</Section>
      {matching.length === 0 ? (
        <Body>{t.accNoRecent}</Body>
      ) : (
        <>
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
          {!expanded && matching.length > recent.length ? (
            <Btn title={t.showAll(matching.length)} onPress={() => setExpanded(true)} kind="secondary" icon="expand-more" />
          ) : null}
        </>
      )}
    </Screen>
  );
}
