import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { deleteCategory, hasCategoryUse, renameCategory, saveCategory } from '../../../src/persistence/repository.ts';
import { getDb, newTxId } from '../db';
import { useLedger } from '../state';
import { useStrings } from '../lang';
import { Body, Btn, Chip, EmptyState, Field, H1, Meta, Screen, Section } from '../components';

export default function Categories(): React.JSX.Element {
  const ledger = useLedger();
  const { t } = useStrings();
  const [name, setName] = useState('');
  const [kind, setKind] = useState<'expense' | 'income'>('expense');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState('');

  const useCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const tx of ledger.transactions) {
      for (const posting of tx.postings) {
        if (posting.categoryId !== undefined) {
          counts.set(posting.categoryId, (counts.get(posting.categoryId) ?? 0) + 1);
        }
      }
    }
    return counts;
  }, [ledger.transactions]);

  function create(): void {
    try {
      saveCategory(getDb(), { id: `cat-${newTxId()}`, name: name.trim(), kind });
      setName('');
      setError('');
      ledger.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function saveRename(id: string): void {
    try {
      renameCategory(getDb(), id, editName.trim());
      setEditingId(null);
      setEditName('');
      setError('');
      ledger.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function remove(id: string): void {
    try {
      if (hasCategoryUse(getDb(), id)) {
        setError(t.catsBlockedDelete);
        return;
      }
      deleteCategory(getDb(), id);
      setError('');
      ledger.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const listed = ledger.categories.filter((c) => c.kind === kind);

  return (
    <Screen>
      <H1>{t.catsTitle}</H1>
      <Meta>{t.catsSubtitle}</Meta>
      <View style={{ flexDirection: 'row' }}>
        <Chip label={t.catsExpense} active={kind === 'expense'} onPress={() => setKind('expense')} />
        <Chip label={t.catsIncome} active={kind === 'income'} onPress={() => setKind('income')} />
      </View>
      {listed.length === 0 ? (
        <EmptyState icon="label-outline" title={t.catsEmpty} body={t.catsEmptyBody} />
      ) : (
        listed.map((category) => (
          <View key={category.id} style={{ paddingVertical: 8 }}>
            <Body>{category.name}</Body>
            <Meta>{t.usedIn(useCounts.get(category.id) ?? 0)}</Meta>
            {editingId === category.id ? (
              <View>
                <Field label={t.catsNewName} value={editName} onChangeText={setEditName} placeholder={category.name} />
                <Btn title={t.catsSaveName} onPress={() => saveRename(category.id)} kind="secondary" icon="check" />
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                <Btn title={t.catsRename} onPress={() => { setEditingId(category.id); setEditName(category.name); }} kind="secondary" icon="edit" />
                <Btn title={t.catsDelete} onPress={() => remove(category.id)} kind="danger" icon="delete-outline" />
              </View>
            )}
          </View>
        ))
      )}
      <Section>{t.catsNewSection}</Section>
      <Field label={t.catsName} value={name} onChangeText={setName} placeholder={t.catsNamePh} />
      {error !== '' ? <Meta>{error}</Meta> : null}
      <Btn title={t.createCategory(kind === 'expense' ? t.catsExpense : t.catsIncome)} onPress={create} icon="add" />
    </Screen>
  );
}
