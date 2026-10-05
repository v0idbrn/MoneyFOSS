declare module 'expo-sqlite' {
  export interface ExpoDatabase {
    execSync(sql: string): void;
    getAllSync(sql: string, params?: readonly unknown[]): Array<Record<string, unknown>>;
    runSync(sql: string, params?: readonly unknown[]): void;
    withTransactionSync<T>(task: () => T): T;
    closeSync(): void;
  }
  export function openDatabaseSync(name: string): ExpoDatabase;
}
