import assert from 'node:assert/strict';
import { DomainError } from '../src/domain/errors.ts';
import { openNodeDb } from '../src/persistence/drivers/node-sqlite.ts';
import { migrate } from '../src/persistence/migrate.ts';
import { saveAccount, saveCategory } from '../src/persistence/repository.ts';
import type { Db } from '../src/persistence/db.ts';
import { refs } from './fixtures.ts';

export function openTestDb(): Db {
  const db = openNodeDb(':memory:');
  migrate(db);
  return db;
}

export function seedStandardRefs(db: Db): void {
  for (const account of refs.accounts.values()) {
    saveAccount(db, account);
  }
  for (const category of refs.categories.values()) {
    saveCategory(db, category);
  }
}

export function throwsCode(fn: () => void, code: string, messagePart?: string): void {
  try {
    fn();
  } catch (error) {
    assert.ok(error instanceof DomainError, `expected DomainError, got ${String(error)}`);
    assert.equal(error.code, code, `expected ${code}, got ${error.code}: ${error.message}`);
    if (messagePart !== undefined) {
      assert.ok(error.message.includes(messagePart), `expected message to include ${JSON.stringify(messagePart)}, got: ${error.message}`);
    }
    return;
  }
  assert.fail(`expected DomainError ${code} but nothing was thrown`);
}

export function tableNames(db: Db): unknown[] {
  return db.query("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").map((row) => row.name);
}
