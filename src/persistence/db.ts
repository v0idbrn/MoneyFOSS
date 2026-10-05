export type DbParam = string | number | null;

export interface DbRow {
  readonly [column: string]: unknown;
}

export interface Db {
  exec(sql: string, params?: readonly DbParam[]): void;
  query(sql: string, params?: readonly DbParam[]): DbRow[];
  transaction<T>(fn: () => T): T;
  close(): void;
}
