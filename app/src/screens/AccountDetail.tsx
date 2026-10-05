import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { accountBalances } from '../../../src/domain/balances.ts';
import { deleteAccount, hasPostings, renameAccount } from '../../../src/persistence/repository.ts';
import { getDb } from '../db';
import { useLedger } from '../state';
import { sortNewestFirst } from '../lib/filters';
import { Amount, Body, Btn, ErrorState, Field, H1, Meta, Screen, Section, TxRow } from '../components';
import type { RootStackParamList } from '../navtypes';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'AccountDetail'>;

export default function AccountDetail(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const ledger = useLedger();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState('');
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState('');

  const account = ledger.accounts.find((a) => a.id === route.params.accountId);
  const accounts = useMemo(() => new Map(ledger.accounts.map((a) => [a.id, a])), [ledger.accounts]);
  const categories = useMemo(() => new Map(ledger.categories.map((c) => [c.id, c])), [ledger.categories]);
  const balances = useMemo(() => accountBalances(ledger.transactions), [ledger.transactions]);
  const recent = useMemo(
    () =>
      sortNewestFirst(ledger.transactions.filter((tx) => tx.postings.some((p) => p.accountId === route.params.accountId))).slice(0, 8),
    [ledger.transactions, route.params.accountId],
  );

  if (account === undefined) {
    return (
      <Screen>
        <ErrorState message="This account no longer exists." />
      </Screen>
    );
  }
  const current = account;

  const amount = balances.get(current.id)?.get(current.currency) ?? 0n;

  function saveRename(): void {
    try {
      renameAccount(getDb(), current.id, name.trim());
      setRenaming(false);
      setName('');
      setError('');
      ledger.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function remove(): void {
    if (!armed) {
      if (hasPostings(getDb(), current.id)) {
        setError('This account has transactions and cannot be deleted. Balances stay untouched.');
        return;
      }
      setArmed(true);
      return;
    }
    try {
      deleteAccount(getDb(), current.id);
      navigation.goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setArmed(false);
    }
  }

  return (
    <Screen>
      <H1>{account.name}</H1>
      <Amount amount={amount} currency={account.currency} big />
      <Meta>
        {account.type === 'ASSET' ? 'Cash & bank' : account.type === 'LIABILITY' ? 'Card & debt' : 'Equity'} · {account.currency}
      </Meta>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        <Btn title="Add transaction" onPress={() => navigation.navigate('AddTransaction', { accountId: account.id })} icon="add" />
      </View>
      <Section>Manage</Section>
      {renaming ? (
        <View>
          <Field label="New name" value={name} onChangeText={setName} placeholder={account.name} />
          <Btn title="Save name" onPress={saveRename} kind="secondary" icon="check" />
        </View>
      ) : (
        <Btn title="Rename" onPress={() => setRenaming(true)} kind="secondary" icon="edit" />
      )}
      <View style={{ marginTop: 8 }}>
        <Btn title={armed ? 'Tap again to confirm delete' : 'Delete account'} onPress={remove} kind="danger" icon="delete-outline" />
      </View>
      {error !== '' ? <Meta>{error}</Meta> : null}
      <Section>Recent in this account ({recent.length})</Section>
      {recent.length === 0 ? (
        <Body>No transactions in this account yet.</Body>
      ) : (
        recent.map((tx) => (
          <TxRow
            key={tx.id}
            tx={tx}
            accounts={accounts}
            categories={categories}
            onPress={() => navigation.navigate('TransactionDetail', { txId: tx.id })}
          />
        ))
      )}
    </Screen>
  );
}
