// PROVISIONAL — NOT EXECUTED IN THIS ENVIRONMENT.
// Adapter over expo-sqlite implementing the domain-owned Db port. It requires
// a React Native runtime, so its atomicity and int64 behavior are unverified
// here; that pending integration evidence is what keeps T-021 PROVISIONAL.

import { openDatabaseSync, type ExpoDatabase } from 'expo-sqlite';
import type { Db, DbParam, DbRow } from '../db.ts';

class ExpoSqliteDb implements Db {
  private readonly inner: ExpoDatabase;

  constructor(inner: ExpoDatabase) {
    this.inner = inner;
  }

  exec(sql: string, params: readonly DbParam[] = []): void {
    if (params.length === 0) {
      this.inner.execSync(sql);
    } else {
      this.inner.runSync(sql, [...params]);
    }
  }

  query(sql: string, params: readonly DbParam[] = []): DbRow[] {
    return this.inner.getAllSync(sql, [...params]);
  }

  transaction<T>(fn: () => T): T {
    return this.inner.withTransactionSync(fn);
  }

  close(): void {
    this.inner.closeSync();
  }
}

export function openExpoDb(name: string): Db {
  const db = openDatabaseSync(name);
  const wrapped = new ExpoSqliteDb(db);
  wrapped.exec('PRAGMA foreign_keys = ON');
  return wrapped;
}
