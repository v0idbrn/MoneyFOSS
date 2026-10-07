import React, { useState } from 'react';
import { View } from 'react-native';
import { listCurrencies } from '../../../src/domain/currency.ts';
import { parseMoney } from '../../../src/domain/money.ts';
import { budgetId } from '../../../src/domain/types.ts';
import { deleteBudget, saveBudget } from '../../../src/persistence/repository.ts';
import { getDb, todayLocal } from '../db';
import { useLedger } from '../state';
import { useStrings } from '../lang';
import { displayCategoryName } from '../lib/categories';
import { budgetProgress, monthOfDate } from '../lib/budgets';
import { formatDisplayAmount, formatSigned, normalizeAmountInput } from '../lib/format';
import { Body, Btn, Chip, Divider, EmptyState, Field, FormError, H1, Meta, Screen, Section, useToast } from '../components';

export default function Budgets(): React.JSX.Element {
  const ledger = useLedger();
  const { t } = useStrings();
  const showToast = useToast();
  const [kind, setKind] = useState<'expense' | 'income'>('expense');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [currency, setCurrency] = useState('ARS');
  const [limit, setLimit] = useState('');
  const [armedId, setArmedId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const month = monthOfDate(todayLocal());

  function create(): void {
    const category = ledger.categories.find((c) => c.id === categoryId);
    if (category === undefined) {
      setError(t.budgetsPickCategory);
      return;
    }
    try {
      const parsed = parseMoney(normalizeAmountInput(limit), currency);
      if (parsed.amount <= 0n) {
        setError(t.budgetsNeedPositive);
        return;
      }
      saveBudget(getDb(), { id: budgetId(category.id, currency), categoryId: category.id, currency, amountMinor: parsed.amount });
      setLimit('');
      setError('');
      ledger.refresh();
      showToast(t.toastCreated, 'success');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function remove(id: string): void {
    try {
      if (armedId !== id) {
        setArmedId(id);
        return;
      }
      deleteBudget(getDb(), id);
      setArmedId(null);
      setError('');
      ledger.refresh();
      showToast(t.toastDeleted, 'success');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setArmedId(null);
    }
  }

  const listedCategories = ledger.categories.filter((c) => c.kind === kind);

  return (
    <Screen>
      <H1>{t.budgetsTitle}</H1>
      <Meta>{t.budgetsSubtitle}</Meta>
      <Meta>{month}</Meta>
      {ledger.budgets.length === 0 ? (
        <EmptyState icon="account-balance-wallet" title={t.budgetsEmpty} body={t.budgetsEmptyBody} />
      ) : (
        ledger.budgets.map((budget) => {
          const category = ledger.categories.find((c) => c.id === budget.categoryId);
          const progress = budgetProgress(budget, ledger.transactions, month, category?.kind ?? 'expense');
          return (
            <View key={budget.id} style={{ paddingVertical: 8 }}>
              <Body>
                {category !== undefined ? displayCategoryName(category, t) : budget.categoryId} · {budget.currency}
              </Body>
              <Meta>{`${formatDisplayAmount(progress.spent, budget.currency)} / ${formatDisplayAmount(budget.amountMinor, budget.currency)}`}</Meta>
              <Meta>{`${t.budgetsRemaining}: ${formatSigned(progress.remaining, budget.currency)}`}</Meta>
              <Btn title={armedId === budget.id ? t.catsConfirmDelete : t.catsDelete} onPress={() => remove(budget.id)} kind="danger" icon="delete-outline" />
            </View>
          );
        })
      )}
      <Divider />
      <Section>{t.budgetsNewSection}</Section>
      <Meta>{t.budgetsCategory}</Meta>
      <View style={{ flexDirection: 'row' }}>
        <Chip label={t.catsExpense} active={kind === 'expense'} onPress={() => setKind('expense')} />
        <Chip label={t.catsIncome} active={kind === 'income'} onPress={() => setKind('income')} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {listedCategories.map((category) => (
          <Chip key={category.id} label={displayCategoryName(category, t)} active={categoryId === category.id} onPress={() => setCategoryId(category.id)} />
        ))}
      </View>
      <Meta>{t.budgetsCurrency}</Meta>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {listCurrencies().map((item) => (
          <Chip key={item.code} label={item.code} active={currency === item.code} onPress={() => setCurrency(item.code)} />
        ))}
      </View>
      <Field label={`${t.budgetsLimit} (${currency})`} value={limit} onChangeText={setLimit} keyboardType="decimal-pad" />
      <Btn title={t.budgetsCreate} onPress={create} icon="add" />
      {error !== '' ? <FormError message={error} /> : null}
    </Screen>
  );
}
