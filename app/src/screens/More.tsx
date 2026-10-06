import React, { useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { listCurrencies } from '../../../src/domain/currency.ts';
import { eraseAllData, getDb } from '../db';
import { useLedger } from '../state';
import { useStrings } from '../lang';
import type { Lang } from '../i18n';
import { Body, Btn, Chip, Divider, H1, Meta, Screen, Section } from '../components';
import type { RootStackParamList } from '../navtypes';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function More(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const ledger = useLedger();
  const { t, lang, setLang } = useStrings();
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
      setMessage(t.moreErased);
      ledger.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
      setArmed(false);
    }
  }

  function pick(next: Lang): void {
    setLang(next);
    ledger.refresh();
  }

  return (
    <Screen>
      <H1>{t.moreTitle}</H1>
      <Section>{t.moreAbout}</Section>
      <Body>{t.moreAboutBody}</Body>
      <Meta>{t.countsLine(ledger.accounts.length, ledger.transactions.length, ledger.categories.length)}</Meta>
      <Meta>{t.moreVersion}</Meta>
      <View style={{ marginTop: 8 }}>
        <Btn title={t.moreManageCats} onPress={() => navigation.navigate('Categories')} kind="secondary" icon="label-outline" />
      </View>
      <Divider />
      <Section>{t.moreLanguage}</Section>
      <View style={{ flexDirection: 'row' }}>
        <Chip label="Español" active={lang === 'es'} onPress={() => pick('es')} />
        <Chip label="English" active={lang === 'en'} onPress={() => pick('en')} />
      </View>
      <Divider />
      <Section>{t.moreCurrencies}</Section>
      <Meta>{t.moreCurrenciesBody}</Meta>
      {listCurrencies().map((currency) => (
        <View key={currency.code} style={{ flexDirection: 'row', paddingVertical: 6 }}>
          <Body>
            {currency.symbol} {currency.code}
          </Body>
          <View style={{ flex: 1 }} />
          <Meta>{t.decimalsLine(currency.exponent, currency.name)}</Meta>
        </View>
      ))}
      <Divider />
      <Section>{t.moreDanger}</Section>
      <Btn title={armed ? t.moreConfirmErase : t.moreErase} onPress={erase} kind="danger" icon="delete-forever" />
      {message !== '' ? <Meta>{message}</Meta> : null}
    </Screen>
  );
}
