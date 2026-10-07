import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getDb } from './db';
import { listAccounts, listBudgets, listCategories, listTransactions } from '../../src/persistence/repository.ts';
import type { Account, Budget, Category, Transaction } from '../../src/domain/types.ts';

export type LedgerStatus = 'loading' | 'ready' | 'fatal' | 'corrupt';

export interface LedgerState {
  readonly status: LedgerStatus;
  readonly message: string;
  readonly accounts: readonly Account[];
  readonly categories: readonly Category[];
  readonly transactions: readonly Transaction[];
  readonly budgets: readonly Budget[];
  readonly refresh: () => void;
  readonly retry: () => void;
}

const LedgerContext = createContext<LedgerState>({
  status: 'loading',
  message: '',
  accounts: [],
  categories: [],
  transactions: [],
  budgets: [],
  refresh: () => {},
  retry: () => {},
});

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function LedgerProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [status, setStatus] = useState<LedgerStatus>('loading');
  const [message, setMessage] = useState('');
  const [version, setVersion] = useState(0);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    try {
      getDb();
      setStatus('ready');
    } catch (error) {
      setStatus('fatal');
      setMessage(messageOf(error));
    }
  }, [attempt]);

  const refresh = useCallback(() => {
    setVersion((v) => v + 1);
  }, []);

  const retry = useCallback(() => {
    setStatus('loading');
    setMessage('');
    setAttempt((a) => a + 1);
  }, []);

  const data = useMemo(() => {
    if (status !== 'ready') {
      return { accounts: [], categories: [], transactions: [] as Transaction[], budgets: [] as Budget[], error: '' };
    }
    try {
      const db = getDb();
      return {
        accounts: listAccounts(db),
        categories: listCategories(db),
        transactions: listTransactions(db),
        budgets: listBudgets(db),
        error: '',
      };
    } catch (error) {
      return { accounts: [], categories: [], transactions: [] as Transaction[], budgets: [] as Budget[], error: messageOf(error) };
    }
  }, [status, version]);

  const value: LedgerState = {
    status: data.error !== '' ? 'corrupt' : status,
    message: data.error !== '' ? data.error : message,
    accounts: data.accounts,
    categories: data.categories,
    transactions: data.transactions,
    budgets: data.budgets,
    refresh,
    retry,
  };

  return <LedgerContext.Provider value={value}>{children}</LedgerContext.Provider>;
}

export function useLedger(): LedgerState {
  return useContext(LedgerContext);
}
