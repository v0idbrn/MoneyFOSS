import { DomainError } from '../domain/errors.ts';
import { MIGRATIONS, type Migration } from './schema.ts';
import type { Db } from './db.ts';

const VERSION_RE = /^(0|[1-9]\d*)$/;

export function getSchemaVersion(db: Db): number {
  const meta = db.query("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'schema_meta'");
  if (meta.length === 0) {
    return 0;
  }
  const rows = db.query('SELECT value FROM schema_meta WHERE key = ?', ['version']);
  const value = rows[0]?.value;
  if (typeof value !== 'string' || !VERSION_RE.test(value)) {
    throw new DomainError(
      'SCHEMA_VERSION_INVALID',
      `schema_meta.version is not a canonical non-negative integer: ${JSON.stringify(value)}`,
    );
  }
  return Number(value);
}

export function migrate(db: Db, migrations: readonly Migration[] = MIGRATIONS): number {
  const seen = new Set<number>();
  for (const migration of migrations) {
    if (!Number.isInteger(migration.version) || migration.version <= 0) {
      throw new DomainError(
        'SCHEMA_VERSION_INVALID',
        `migration ${JSON.stringify(migration.name)} has an invalid version: ${String(migration.version)}`,
      );
    }
    if (seen.has(migration.version)) {
      throw new DomainError(
        'SCHEMA_VERSION_INVALID',
        `duplicate migration version: ${migration.version}`,
      );
    }
    seen.add(migration.version);
  }
  const sorted = [...migrations].sort((a, b) => a.version - b.version);
  let target = 0;
  for (const migration of sorted) {
    if (migration.version > target) {
      target = migration.version;
    }
  }

  const current = getSchemaVersion(db);
  if (current > target) {
    throw new DomainError(
      'SCHEMA_VERSION_MISMATCH',
      `database schema version ${current} is newer than supported ${target}; refusing to open`,
    );
  }
  for (const migration of sorted) {
    if (migration.version <= current) {
      continue;
    }
    db.transaction(() => {
      for (const sql of migration.statements) {
        db.exec(sql);
      }
      db.exec('INSERT OR REPLACE INTO schema_meta (key, value) VALUES (?, ?)', ['version', String(migration.version)]);
    });
  }
  return getSchemaVersion(db);
}
