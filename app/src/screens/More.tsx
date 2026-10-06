import React, { useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { listCurrencies } from '../../../src/domain/currency.ts';
import { eraseAllData, getDb } from '../db';
import { useLedger } from '../state';
import { Body, Btn, Divider, H1, Meta, Screen, Section } from '../components';
import type { RootStackParamList } from '../navtypes';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function More(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const ledger = useLedger();
  const [armed, setArmed] = useState(false);
  const [message, setMessage] = useState('');

  function erase(): void {
    if (!armed) {
      setArmed(true);
      return;
    }
    try {
      eraseAllData(getDb());
      setArmed(false);
      setMessage('All data erased. Default categories were restored.');
      ledger.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
      setArmed(false);
    }
  }

  return (
    <Screen>
      <H1>More</H1>
      <Section>About MoneyFOSS</Section>
      <Body>Offline-first personal finance. Your ledger lives on this device only.</Body>
      <Meta>
        {ledger.accounts.length} accounts · {ledger.transactions.length} transactions · {ledger.categories.length} categories
      </Meta>
      <Meta>Version 1.0.0 · No network · No analytics · No cloud</Meta>
      <View style={{ marginTop: 8 }}>
        <Btn title="Manage categories" onPress={() => navigation.navigate('Categories')} kind="secondary" icon="label-outline" />
      </View>
      <Divider />
      <Section>Currencies</Section>
      <Meta>Amounts are stored as integers in each currency&apos;s minor units.</Meta>
      {listCurrencies().map((currency) => (
        <View key={currency.code} style={{ flexDirection: 'row', paddingVertical: 6 }}>
          <Body>
            {currency.symbol} {currency.code}
          </Body>
          <View style={{ flex: 1 }} />
          <Meta>
            {currency.exponent} decimal{currency.exponent === 1 ? '' : 's'} · {currency.name}
          </Meta>
        </View>
      ))}
      <Divider />
      <Section>Danger zone</Section>
      <Btn title={armed ? 'Tap again to erase everything' : 'Erase all data'} onPress={erase} kind="danger" icon="delete-forever" />
      {message !== '' ? <Meta>{message}</Meta> : null}
    </Screen>
  );
}
