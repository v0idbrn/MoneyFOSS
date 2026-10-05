import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { deleteCategory, hasCategoryUse, renameCategory, saveCategory } from '../../../src/persistence/repository.ts';
import { getDb, newTxId } from '../db';
import { useLedger } from '../state';
import { Body, Btn, Chip, EmptyState, Field, H1, Meta, Screen, Section } from '../components';

export default function Categories(): React.JSX.Element {
  const ledger = useLedger();
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
        setError('This category is used by transactions and cannot be deleted. History keeps its meaning.');
        return;
      }
      deleteCategory(getDb(), id);
      setError('');
      ledger.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Screen>
      <H1>Categories</H1>
      <Meta>Categories live on income and expense records — never on transfers or conversions.</Meta>
      {(kind === 'expense' ? ledger.categories.filter((c) => c.kind === 'expense') : ledger.categories.filter((c) => c.kind === 'income')).length ===
      0 ? (
        <EmptyState icon="label-outline" title="No categories here" body="Create one below to start classifying records." />
      ) : null}
      <View style={{ flexDirection: 'row' }}>
        <Chip label="Expense" active={kind === 'expense'} onPress={() => setKind('expense')} />
        <Chip label="Income" active={kind === 'income'} onPress={() => setKind('income')} />
      </View>
      {ledger.categories
        .filter((c) => c.kind === kind)
        .map((category) => (
          <View key={category.id} style={{ paddingVertical: 8 }}>
            <Body>{category.name}</Body>
            <Meta>
              Used in {useCounts.get(category.id) ?? 0} posting{useCounts.get(category.id) === 1 ? '' : 's'}
            </Meta>
            {editingId === category.id ? (
              <View>
                <Field label="New name" value={editName} onChangeText={setEditName} placeholder={category.name} />
                <Btn title="Save name" onPress={() => saveRename(category.id)} kind="secondary" icon="check" />
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                <Btn title="Rename" onPress={() => { setEditingId(category.id); setEditName(category.name); }} kind="secondary" icon="edit" />
                <Btn title="Delete" onPress={() => remove(category.id)} kind="danger" icon="delete-outline" />
              </View>
            )}
          </View>
        ))}
      <Section>New category</Section>
      <Field label="Name" value={name} onChangeText={setName} placeholder="Groceries, Bus, …" />
      {error !== '' ? <Meta>{error}</Meta> : null}
      <Btn title={`Create ${kind} category`} onPress={create} icon="add" />
    </Screen>
  );
}
