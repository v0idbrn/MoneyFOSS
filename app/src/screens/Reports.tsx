import React, { useState } from 'react';
import { View } from 'react-native';
import { todayLocal } from '../db';
import { useLedger } from '../state';
import { useStrings } from '../lang';
import { displayCategoryName } from '../lib/categories';
import { categoryFlowTotals, monthFlowTotals } from '../lib/reports';
import { monthOfDate } from '../lib/budgets';
import { formatDisplayAmount, formatSigned } from '../lib/format';
import { Body, Btn, Divider, EmptyState, H1, Meta, Screen, Section } from '../components';

function shiftMonth(month: string, delta: number): string {
  const year = Number(month.slice(0, 4));
  const monthIndex = Number(month.slice(5, 7)) - 1 + delta;
  const next = new Date(Date.UTC(year, monthIndex, 1));
  const nextYear = next.getUTCFullYear();
  if (nextYear < 1 || nextYear > 9999) {
    return month;
  }
  return `${nextYear}-${String(next.getUTCMonth() + 1).padStart(2, '0')}`;
}

export default function Reports(): React.JSX.Element {
  const ledger = useLedger();
  const { t } = useStrings();
  const [month, setMonth] = useState(() => monthOfDate(todayLocal()));
  const flows = monthFlowTotals(ledger.transactions, ledger.categories, month);
  const expenses = categoryFlowTotals(ledger.transactions, ledger.categories, month, 'expense');
  const isEmpty = flows.length === 0;

  return (
    <Screen>
      <H1>{t.reportsTitle}</H1>
      <Meta>{t.reportsSubtitle}</Meta>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <Btn title={t.reportsPrev} onPress={() => setMonth((current) => shiftMonth(current, -1))} kind="secondary" icon="chevron-left" />
        <Body>{month}</Body>
        <Btn title={t.reportsNext} onPress={() => setMonth((current) => shiftMonth(current, 1))} kind="secondary" icon="chevron-right" />
      </View>
      {isEmpty ? (
        <EmptyState icon="assessment" title={t.reportsEmpty} body={t.reportsEmptyBody} />
      ) : (
        flows.map((flow) => (
          <View key={flow.currency} style={{ paddingVertical: 8 }}>
            <Body>{flow.currency}</Body>
            <Meta>{`${t.reportsIncome}: ${formatDisplayAmount(flow.income, flow.currency)}`}</Meta>
            <Meta>{`${t.reportsExpense}: ${formatDisplayAmount(flow.expense, flow.currency)}`}</Meta>
            <Meta>{`${t.reportsNet}: ${formatSigned(flow.income - flow.expense, flow.currency)}`}</Meta>
          </View>
        ))
      )}
      {!isEmpty && expenses.length > 0 ? (
        <>
          <Divider />
          <Section>{t.reportsByCategory}</Section>
          {expenses.map((flow) => {
            const category = ledger.categories.find((item) => item.id === flow.categoryId);
            return (
              <View key={`${flow.categoryId}@${flow.currency}`} style={{ flexDirection: 'row', paddingVertical: 4 }}>
                <Body>{category !== undefined ? displayCategoryName(category, t) : flow.categoryId}</Body>
                <View style={{ flex: 1 }} />
                <Meta>{formatDisplayAmount(flow.total, flow.currency)}</Meta>
              </View>
            );
          })}
        </>
      ) : null}
    </Screen>
  );
}
