import React, { useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { listTransactions, loadRefs } from '../../../src/persistence/repository.ts';
import { getDb } from '../db';
import { applyImport, planImport, type ImportPlan } from '../lib/import-csv';
import { useLedger } from '../state';
import { useStrings } from '../lang';
import { Body, Btn, Divider, Field, FormError, H1, Meta, Screen, Section, useToast } from '../components';
import type { RootStackParamList } from '../navtypes';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function ImportCsv(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const ledger = useLedger();
  const { t } = useStrings();
  const showToast = useToast();
  const [text, setText] = useState('');
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [error, setError] = useState('');

  function analyze(): void {
    try {
      const db = getDb();
      setPlan(planImport(text, { refs: loadRefs(db), transactions: listTransactions(db) }));
      setError('');
    } catch (e) {
      setPlan(null);
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function confirm(): void {
    if (plan === null || plan.newTransactions.length === 0) {
      return;
    }
    try {
      applyImport(getDb(), plan);
      setPlan(null);
      setText('');
      setError('');
      showToast(t.importDone, 'success');
      ledger.refresh();
      navigation.goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Screen>
      <H1>{t.importTitle}</H1>
      <Meta>{t.importBody}</Meta>
      <Field
        label={t.importField}
        value={text}
        onChangeText={(next) => {
          setText(next);
          setPlan(null);
        }}
        multiline
      />
      <Btn title={t.importAnalyze} onPress={analyze} kind="secondary" icon="search" disabled={text.trim() === ''} />
      {plan !== null ? (
        <View>
          <Divider />
          <Section>{t.importPreview}</Section>
          <Body>
            {t.importNew}: {plan.newTransactions.length}
          </Body>
          <Meta>
            {t.importDuplicates}: {plan.duplicates.length}
          </Meta>
          <Meta>
            {t.importConflicts}: {plan.conflicts.length}
          </Meta>
          <Meta>
            {t.importRejected}: {plan.rejected.length}
          </Meta>
          <Meta>
            {t.importNewAccounts}: {plan.newAccounts.length} · {t.importNewCategories}: {plan.newCategories.length}
          </Meta>
          {plan.rejected.slice(0, 5).map((entry) => (
            <Meta key={`${entry.txId}-${entry.row}`}>
              {`#${entry.row} ${entry.txId}: ${entry.detail}`}
            </Meta>
          ))}
          {plan.newTransactions.length > 0 ? <Btn title={t.importConfirm} onPress={confirm} icon="file-download" /> : <Body>{t.importNothing}</Body>}
        </View>
      ) : null}
      {error !== '' ? <FormError message={error} /> : null}
    </Screen>
  );
}
