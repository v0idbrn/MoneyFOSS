import React, { useState } from 'react';
import { Share, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { listCurrencies } from '../../../src/domain/currency.ts';
import { eraseAllData, getDb } from '../db';
import { exportJson, transactionsCsv } from '../lib/export-data';
import { useLedger } from '../state';
import { useStrings } from '../lang';
import type { Lang } from '../i18n';
import { Body, Btn, Chip, Divider, FormError, H1, Meta, Screen, Section, useToast } from '../components';
import type { RootStackParamList } from '../navtypes';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function More(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const ledger = useLedger();
  const { t, lang, setLang } = useStrings();
  const showToast = useToast();
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState('');

  function erase(): void {
    if (!armed) {
      setArmed(true);
      return;
    }
    try {
      eraseAllData(getDb());
      setArmed(false);
      setError('');
      showToast(t.moreErased, 'success');
      ledger.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setArmed(false);
    }
  }

  function pick(next: Lang): void {
    setArmed(false);
    const ok = setLang(next);
    if (!ok) {
      showToast(t.langPersistFailed, 'error');
    }
  }

  function shareExport(kind: 'csv' | 'json'): void {
    try {
      const content =
        kind === 'csv'
          ? transactionsCsv(ledger.transactions, ledger.accounts, ledger.categories)
          : exportJson(ledger.accounts, ledger.categories, ledger.transactions, ledger.budgets);
      Share.share({ message: content, title: kind === 'csv' ? 'moneyfoss-transactions.csv' : 'moneyfoss-export.json' })
        .then((result) => {
          if (result.action === Share.sharedAction) {
            setError('');
            showToast(t.exportShared, 'success');
          }
        })
        .catch(() => setError(t.exportFailed));
    } catch {
      setError(t.exportFailed);
    }
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
      <View style={{ marginTop: 8 }}>
        <Btn title={t.budgetsTitle} onPress={() => navigation.navigate('Budgets')} kind="secondary" icon="account-balance-wallet" />
      </View>
      <View style={{ marginTop: 8 }}>
        <Btn title={t.reportsTitle} onPress={() => navigation.navigate('Reports')} kind="secondary" icon="assessment" />
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
      <Section>{t.moreExport}</Section>
      <Meta>{t.moreExportBody}</Meta>
      <Btn title={t.exportCsv} onPress={() => shareExport('csv')} kind="secondary" icon="table-chart" />
      <Btn title={t.exportJson} onPress={() => shareExport('json')} kind="secondary" icon="code" />
      <Btn title={t.importTitle} onPress={() => navigation.navigate('ImportCsv')} kind="secondary" icon="file-download" />
      <Divider />
      <Section>{t.moreDanger}</Section>
      <Btn title={armed ? t.moreConfirmErase : t.moreErase} onPress={erase} kind="danger" icon="delete-forever" />
      {error !== '' ? <FormError message={error} /> : null}
    </Screen>
  );
}
