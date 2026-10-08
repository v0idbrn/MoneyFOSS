import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { getCurrency, listCurrencies } from '../../../src/domain/currency.ts';
import { parseMoney } from '../../../src/domain/money.ts';
import { goalId } from '../../../src/domain/types.ts';
import { deleteGoal, saveGoal } from '../../../src/persistence/repository.ts';
import { getDb } from '../db';
import { useLedger } from '../state';
import { useStrings } from '../lang';
import { goalProgress } from '../lib/goals';
import { formatDisplayAmount, formatSigned, normalizeAmountInput } from '../lib/format';
import { Body, Btn, Chip, Divider, EmptyState, Field, FormError, H1, Meta, Screen, Section, useToast } from '../components';

export default function Goals(): React.JSX.Element {
  const ledger = useLedger();
  const { t } = useStrings();
  const showToast = useToast();
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('ARS');
  const [target, setTarget] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [armedId, setArmedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  function minorToInput(minor: bigint, code: string): string {
    const exp = getCurrency(code).exponent;
    const digits = minor.toString().padStart(exp + 1, '0');
    if (exp === 0) {
      return digits;
    }
    return `${digits.slice(0, digits.length - exp)}.${digits.slice(digits.length - exp)}`;
  }

  function resetForm(): void {
    setName('');
    setTarget('');
    setTargetDate('');
    setSelectedAccountIds([]);
    setEditingId(null);
    setArmedId(null);
  }

  function startEdit(goalIdValue: string): void {
    const goal = ledger.goals.find((g) => g.id === goalIdValue);
    if (goal === undefined) {
      return;
    }
    setName(goal.name);
    setCurrency(goal.currency);
    setTarget(minorToInput(goal.targetMinor, goal.currency));
    setTargetDate(goal.targetDate ?? '');
    setSelectedAccountIds([...goal.accountIds]);
    setEditingId(goal.id);
    setArmedId(null);
    setError('');
  }

  const accounts = useMemo(() => new Map(ledger.accounts.map((a) => [a.id, a])), [ledger.accounts]);
  const assetLiabilityAccounts = ledger.accounts.filter((a) => a.type === 'ASSET' || a.type === 'LIABILITY');

  function create(): void {
    if (name.trim() === '') {
      setError(t.needName);
      return;
    }
    if (target.trim() === '') {
      setError(t.goalsNeedPositive);
      return;
    }
    if (selectedAccountIds.length === 0) {
      setError(t.goalsPickAccounts);
      return;
    }
    try {
      const parsed = parseMoney(normalizeAmountInput(target), currency);
      if (parsed.amount <= 0n) {
        setError(t.goalsNeedPositive);
        return;
      }
      if (targetDate.trim() !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
        setError(t.goalsInvalidDate);
        return;
      }
      const wasEditing = editingId !== null;
      saveGoal(getDb(), {
        id: wasEditing && editingId !== null ? editingId : goalId(name, currency),
        name: name.trim(),
        currency,
        targetMinor: parsed.amount,
        ...(targetDate.trim() !== '' ? { targetDate: targetDate } : {}),
        accountIds: selectedAccountIds,
      });
      resetForm();
      setError('');
      ledger.refresh();
      showToast(wasEditing ? t.toastNameSaved : t.toastCreated, 'success');
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
      deleteGoal(getDb(), id);
      setArmedId(null);
      setError('');
      ledger.refresh();
      showToast(t.toastDeleted, 'success');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setArmedId(null);
    }
  }

  const accountsByCurrency = useMemo(() => {
    const map = new Map<string, typeof assetLiabilityAccounts>();
    for (const account of assetLiabilityAccounts) {
      const list = map.get(account.currency) ?? [];
      list.push(account);
      map.set(account.currency, list);
    }
    return map;
  }, [assetLiabilityAccounts]);

  const compatibleAccounts = accountsByCurrency.get(currency) ?? [];

  return (
    <Screen>
      <H1>{t.goalsTitle}</H1>
      <Meta>{t.goalsSubtitle}</Meta>
      {ledger.goals.length === 0 ? (
        <EmptyState icon="flag" title={t.goalsEmpty} body={t.goalsEmptyBody} />
      ) : (
        ledger.goals.map((goal) => {
          const progress = goalProgress(goal, ledger.transactions);
          const pct = progress.percentage !== null ? `${progress.percentage.toFixed(1)}%` : '—';
          return (
            <View key={goal.id} style={{ paddingVertical: 8 }}>
              <Body>{goal.name} · {goal.currency}</Body>
              <Meta>{`${t.goalsTarget}: ${formatDisplayAmount(goal.targetMinor, goal.currency)}`}</Meta>
              <Meta>{`${t.goalsProgress}: ${formatDisplayAmount(progress.progress, goal.currency)} / ${formatDisplayAmount(goal.targetMinor, goal.currency)} (${pct})`}</Meta>
              <Meta>{`${t.goalsRemaining}: ${formatSigned(progress.remaining, goal.currency)}`}</Meta>
              {goal.targetDate !== undefined && <Meta>{`${t.goalsTargetDate}: ${goal.targetDate}`}</Meta>}
              {goal.accountIds.length > 0 && (
                <Meta>
                  {goal.accountIds.map((aid) => accounts.get(aid)?.name ?? aid).join(', ')}
                </Meta>
              )}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                <Btn title={t.goalsEdit} onPress={() => startEdit(goal.id)} kind="secondary" icon="edit" />
                <Btn title={armedId === goal.id ? t.catsConfirmDelete : t.catsDelete} onPress={() => remove(goal.id)} kind="danger" icon="delete-outline" />
              </View>
            </View>
          );
        })
      )}
      <Divider />
      <Section>{t.goalsNewSection}</Section>
      <Field label={t.goalsName} value={name} onChangeText={setName} placeholder={t.goalsNamePh} />
      <Meta>{t.goalsCurrency}</Meta>
      {editingId !== null ? (
        <Meta>{currency}</Meta>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {listCurrencies().map((item) => (
            <Chip key={item.code} label={item.code} active={currency === item.code} onPress={() => { setCurrency(item.code); setSelectedAccountIds([]); }} />
          ))}
        </View>
      )}
      <Field label={`${t.goalsTarget} (${currency})`} value={target} onChangeText={setTarget} keyboardType="decimal-pad" />
      <Field label={t.goalsTargetDate} value={targetDate} onChangeText={setTargetDate} placeholder="YYYY-MM-DD" maxLength={10} />
      <Meta>{t.goalsAccounts}</Meta>
      {compatibleAccounts.length === 0 ? (
        <Meta>{t.goalsNoAccountsForCurrency}</Meta>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {compatibleAccounts.map((account) => (
            <Chip
              key={account.id}
              label={account.name}
              active={selectedAccountIds.includes(account.id)}
              onPress={() => {
                const newSet = selectedAccountIds.includes(account.id)
                  ? selectedAccountIds.filter((id) => id !== account.id)
                  : [...selectedAccountIds, account.id];
                setSelectedAccountIds(newSet);
              }}
            />
          ))}
        </View>
      )}
      {selectedAccountIds.length === 0 && compatibleAccounts.length > 0 && <Meta>{t.goalsPickAtLeastOne}</Meta>}
      {error !== '' ? <FormError message={error} /> : null}
      <Btn title={editingId !== null ? t.goalsUpdate : t.goalsCreate} onPress={create} icon="check" />
      {editingId !== null ? (
        <View style={{ marginTop: 8 }}>
          <Btn title={t.cancel} onPress={resetForm} kind="secondary" icon="close" />
        </View>
      ) : null}
    </Screen>
  );
}