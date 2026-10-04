# MoneyFOSS — Architecture

**Estado:** Fase 1 en curso. Este documento cubre lo que ya existe (núcleo de dominio puro) y las reglas que la Fase 2 debe respetar. La fuente de autoridad de decisiones sigue siendo `docs/DECISIONS.md`.

## 1. Capas

```
┌─────────────────────────────────────────────┐
│ UI (React Native + Expo CNG, T-020)         │  Fase 2+
│  - rendering, input, navegación             │
├─────────────────────────────────────────────┤
│ Aplicación / puertos                        │  Fase 2+
│  - repositorios, pipeline de import/backup  │
│  - SQLite (expo-sqlite, T-021 PROVISIONAL)  │
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
npm test          # node --test "tests/*.test.ts" (53 tests: invariantes, walkthrough 10 casos, wire, property)
npm run typecheck # tsc --noEmit (strict + erasableSyntaxOnly)
```

Tests de Fase 2 a agregar (§24): integración SQLite (bind int64, transacción atómica con rollback), pipeline de import con commit parcial, round-trip completo de backup, gates de manifest Android (§32.4).
