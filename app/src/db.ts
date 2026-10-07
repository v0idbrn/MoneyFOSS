import { openExpoDb } from '../../src/persistence/drivers/expo-sqlite.ts';
import { migrate } from '../../src/persistence/migrate.ts';
import { listAccounts, listCategories, saveAccount, saveCategory } from '../../src/persistence/repository.ts';
import { SEED_CATEGORIES } from './lib/seed-categories.ts';
import type { Db } from '../../src/persistence/db.ts';
import type { Account, Category } from '../../src/domain/types.ts';

export const DEFAULT_CATEGORIES: readonly Category[] = SEED_CATEGORIES;

let db: Db | null = null;

export function getDb(): Db {
  if (db === null) {
    const opened = openExpoDb('moneyfoss.db');
    migrate(opened);
    if (listCategories(opened).length === 0) {
      for (const category of DEFAULT_CATEGORIES) {
        saveCategory(opened, category);
      }
    }
    db = opened;
  }
  return db;
}

export function ensureOpeningAccount(db: Db, currency: string): Account {
  const id = `equity:opening:${currency}`;
  const found = listAccounts(db).find((account) => account.id === id);
  if (found !== undefined) {
    return found;
  }
  const account: Account = { id, name: 'Opening balance', type: 'EQUITY', currency };
  saveAccount(db, account);
  return account;
}

export function eraseAllData(db: Db): void {
  db.transaction(() => {
    db.exec('DELETE FROM budgets');
    db.exec('DELETE FROM postings');
    db.exec('DELETE FROM conversions');
    db.exec('DELETE FROM transactions');
    db.exec('DELETE FROM categories');
    db.exec('DELETE FROM accounts');
  });
  for (const category of DEFAULT_CATEGORIES) {
    saveCategory(db, category);
  }
}

export function newTxId(): string {
  return `tx-${Date.now().toString(36)}-${Math.floor(Math.random() * 2176782336).toString(36)}`;
}

export function newAccountId(): string {
  return `acc-${Date.now().toString(36)}-${Math.floor(Math.random() * 2176782336).toString(36)}`;
}

export function todayLocal(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}
