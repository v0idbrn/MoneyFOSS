import { DatabaseSync } from 'node:sqlite';
import type { Db, DbParam, DbRow } from '../db.ts';

class NodeSqliteDb implements Db {
  private readonly inner: DatabaseSync;

  constructor(inner: DatabaseSync) {
    this.inner = inner;
  }

  exec(sql: string, params: readonly DbParam[] = []): void {
    if (params.length === 0) {
      this.inner.exec(sql);
    } else {
      this.inner.prepare(sql).run(...params);
    }
  }

  query(sql: string, params: readonly DbParam[] = []): DbRow[] {
    return this.inner.prepare(sql).all(...params);
  }

  transaction<T>(fn: () => T): T {
    this.inner.exec('BEGIN');
    try {
      const result = fn();
      this.inner.exec('COMMIT');
      return result;
    } catch (error) {
      try {
        this.inner.exec('ROLLBACK');
      } catch {
        throw error;
      }
      throw error;
    }
  }

  close(): void {
    this.inner.close();
  }
}

export function openNodeDb(path: string = ':memory:'): Db {
  const db = new DatabaseSync(path);
  const wrapped = new NodeSqliteDb(db);
  wrapped.exec('PRAGMA foreign_keys = ON');
  return wrapped;
}
