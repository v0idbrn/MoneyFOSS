# MoneyFOSS — Architecture

**Estado:** Fase 2 en curso (persistencia implementada y verificada; ver `docs/PHASE2_PERSISTENCE.md`). Este documento cubre lo que ya existe y las reglas que las fases siguientes deben respetar. La fuente de autoridad de decisiones sigue siendo `docs/DECISIONS.md`.

## 1. Capas

```
┌─────────────────────────────────────────────┐
│ UI (React Native + Expo CNG, T-020)         │  Fase 3+
│  - rendering, input, navegación             │
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

## 2b. Módulos (`src/persistence/`)

| Archivo | Responsabilidad |
|---|---|
| `db.ts` | puerto `Db` mínimo y propio (`exec`/`query`/`transaction`/`close`, solo placeholders `?`) |
| `schema.ts` | schema v1 + lista `MIGRATIONS` |
| `migrate.ts` | runner determinista (versión, idempotencia, mismatch, fallo cerrado) |
| `repository.ts` | mapping dominio↔filas con validación en escritura y lectura; sin SQL fuera de aquí |
| `drivers/node-sqlite.ts` | driver de verificación con `node:sqlite` (stdlib, ejecutado por los tests) |
| `drivers/expo-sqlite.ts` | adapter de producción (T-021 PROVISIONAL, no ejecutado aquí) |

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
npm test          # node --test "tests/*.test.ts" (118 tests: dominio + persistencia)
npm run typecheck # tsc --noEmit (strict + erasableSyntaxOnly)
```

Tests de Fase 3+ a agregar (§24): pipeline de import con commit parcial, round-trip completo de backup, gates de manifest Android (§32.4).
