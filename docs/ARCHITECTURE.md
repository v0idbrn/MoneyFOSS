# MoneyFOSS — Architecture

**Estado:** desarrollo continuo de producto (fases 0–2 cerradas y verificadas; app implementada). Este documento cubre lo que ya existe y las reglas que las fases siguientes deben respetar. La fuente de autoridad de decisiones sigue siendo `docs/DECISIONS.md`.

## 1. Capas

```
┌─────────────────────────────────────────────┐
│ UI (React Native + Expo CNG, T-020)         │  ← EXISTE
│  - 8 pantallas, navegación Tabs + Stack     │
│  - llama operaciones del dominio; saldos    │
│    derivados vía src/domain/balances.ts     │
├─────────────────────────────────────────────┤
│ Aplicación / puertos           ← EXISTE    │
│  - repositorio sobre puerto Db mínimo       │
│  - SQLite: expo-sqlite adapter (T-021       │
│    PROVISIONAL, no ejecutado) + driver       │
│    node:sqlite de verificación (stdlib)     │
├─────────────────────────────────────────────┤
│ Dominio puro (src/domain)      ← EXISTE    │
│  - dinero, ledger, validación, wire         │
│  - cero dependencias, cero I/O, cero red    │
└─────────────────────────────────────────────┘
```

El dominio no conoce SQLite, React, ni `Date.now()` (las fechas entran como dato). Toda escritura financiera de las capas superiores pasa por `assertTransaction` antes de persistir.

## 2. Módulos (`src/domain/`)

| Archivo | Responsabilidad |
|---|---|
| `errors.ts` | `DomainError` con `code` — todo rechazo del dominio es un código identificable |
| `currency.ts` | tabla embebida offline (ARS/USD/EUR/CLP/JPY/KWD) + exponentes |
| `money.ts` | `Money` int64, parseo estricto, formateo, `deriveMinorUnits` (única división con modo), `convertMinor`, `parseRatio` |
| `types.ts` | entidades T-016: `Account`/`Category`/`Posting`/`Conversion`/`Transaction`, cuentas sistema, re-derivación de conversiones |
| `validate.ts` | **único punto de validación**: Σ por moneda = 0 exacta, bridge ⇔ Conversion, categorías, moneda de cuenta, re-derivación |
| `operations.ts` | constructores de operaciones (expense, income, transfer, cardPurchase, cardPayment, exchange, buildTransaction) con guardas explícitas |
| `serialize.ts` | wire estricto (`toWire`/`fromWire`) + JSON canónico `stableStringify` |
| `balances.ts` | derivación pura Σ por cuenta/moneda (única fuente de saldos para la UI) |

## 2b. Módulos (`src/persistence/`)

| Archivo | Responsabilidad |
|---|---|
| `db.ts` | puerto `Db` mínimo y propio (`exec`/`query`/`transaction`/`close`, solo placeholders `?`) |
| `schema.ts` | schema v2 (v1 + `budgets` en v2) + lista `MIGRATIONS` |
| `migrate.ts` | runner determinista (versión, idempotencia, mismatch, fallo cerrado) |
| `repository.ts` | mapping dominio↔filas con validación en escritura y lectura; sin SQL fuera de aquí |
| `drivers/node-sqlite.ts` | driver de verificación con `node:sqlite` (stdlib, ejecutado por los tests) |
| `drivers/expo-sqlite.ts` | adapter de producción (T-021 PROVISIONAL, no ejecutado aquí) |

## 2c. App (`app/src/`)

Pantallas: Home, Accounts, AccountDetail, Transactions, TransactionDetail, AddTransaction (6 tipos de operación), Categories, ImportCsv (preview de import → confirm → commit atómico), Budgets (límite mensual por categoría+moneda, medido desde el ledger), More. `lib/` pura y testeada (`format`, `describe`, `filters`, `snapshot`, `csv` (codec RFC 4180), `export-data`, `import-csv` (pipeline `planImport`/`applyImport`), `budgets` (medición mensual)); `db.ts` abre expo-sqlite + migra + siembra categorías (el handle se cachea solo tras init completo, para que retry sea honesto); `state.tsx` re-deriva todo en cada `refresh()` (sin caché financiera) y expone `retry` para estados `fatal`/`corrupt`. i18n ES/EN con completitud en compile-time; locale persistido en `schema_meta`.

## 3. Reglas vinculantes (resumen; el texto normativo vive en AGENTS/DECISIONS)

1. **El ledger es la única fuente de verdad.** Saldos, patrimonio, reportes = derivados de `Σ postings`. Prohibido persistir o cachear un saldo como segunda fuente.
2. **Validación en un solo punto.** Ninguna capa superior reimplementa reglas de balanceo; el import y el backup reutilizan `assertTransaction`.
3. **Dinero = entero int64 en minor units.** `Number` prohibido (T-018). Toda división financiera pasa por `deriveMinorUnits` con modo registrado (T-017).
4. **Sin red en el core.** Cero dependencias runtime; ninguna llamada de red en `src/`. Release gate de red intacto.
5. **Cross-currency es explícito.** Toda operación que cruza monedas lleva `Conversion` con tasa, dirección, fecha, fuente y modo; pagos mixtos sin tasa balancean moneda por moneda (§30.1 regla 6).
6. **Import/backup = untrusted input.** Pipeline `parse → validate schema → validate semantics → duplicates → preview → confirm → atomic commit`; nunca `eval`, rutas arbitrarias ni ejecución dinámica (AGENTS §5.3).

## 4. Qué no entra en UI

- Lógica de balanceo o redondeo duplicada en componentes (la UI llama al dominio o muestra lo que el dominio devuelve).
- Escrituras directas a la DB que no pasen por la validación.
- Persistencia de valores derivados (saldos, totales, formatos) como datos.
- Decisiones de formato de backup implementadas antes de T-010/T-005.

## 5. Verificación

```powershell
npm test          # node --test "tests/*.test.ts" (157 tests: dominio + persistencia + presentación + import/export + budgets)
npm run typecheck # tsc --noEmit (strict + erasableSyntaxOnly)
```

Pendiente (§24): restore completo de `.moneybackup` (T-010/T-005), gates de manifest Android (§32.4). El pipeline de import CSV ya está implementado (preview → confirm → commit atómico, `tests/import.test.ts`).
