# MoneyFOSS — Roadmap

**Estado actual:** Fase 0 completada · Fase 1 (Domain) completada · Fase 2 (Persistence) completada · App UI implementada

---

## DONE ✅

### Phase 0 — Planning & Architecture
- [x] Product definition & principles (P-01..P-13)
- [x] Financial model (Candidate C - explicit bridges)
- [x] Money representation (int64 minor units)
- [x] Multicurrency model (Candidate C - explicit bridges)
- [x] Offline-first architecture
- [x] Security threat model
- [x] Legal/compliance (Argentina + International)

### Phase 1 — Domain Core
- [x] Currency, Money, Account, Transaction, Posting, Category
- [x] Domain validation (invariants, balance rules)
- [x] Multicurrency operations (Candidate C - explicit bridges)
- [x] Conversion logic with exact re-derivation
- [x] Rounding policy (half-away-from-zero default, configurable)
- [x] Tests: 138 passing, typecheck passing

### Phase 2 — Persistence
- [x] Schema v1 (schema_meta, accounts, categories, transactions, conversions, postings)
- [x] Migrations (idempotent, versioned, in-transaction)
- [x] Repository layer (accounts, categories, transactions)
- [x] SQLite TEXT for money (no REAL/INTEGER loss)
- [x] Foreign keys, CHECK constraints (sin triggers: no existen en el schema)
- [x] Domain-owned validation (no SQL financial logic)

### App Shell & Navigation
- [x] Expo SDK 57 + React Native 0.86.3
- [x] React Navigation (Tabs + Stack)
- [x] Production build pipeline (R8, shrinkResources)
- [x] Production signing (custom keystore)
- [x] Android manifest hardened (INTERNET blocked, allowBackup=false)

### App Screens (Implemented)
- [x] Home (snapshot, recent transactions, FAB)
- [x] Accounts (list, create, rename, delete, opening balance)
- [x] Account Detail (balance, transactions, rename/delete)
- [x] Transactions list (filtering by text/account/category/kind)
- [x] Transaction Detail (postings, conversion details, delete)
- [x] Add Transaction (expense/income/transfer/card-purchase/card-payment/convert)
- [x] Categories (list by kind, CRUD, usage counts)
- [x] More (About, Currencies, Erase all, Export, Import)
- [x] ImportCsv (analyze → preview → confirm, nada escrito hasta confirmar)
- [x] Budgets (crear/eliminar límite mensual categoría+moneda, medido desde el ledger) — T-039 DECIDED
- [x] Reports (resumen mensual por moneda + gastos por categoría, solo lectura) — T-040 DECIDED
- [x] Goals (crear/editar/eliminar meta cuenta+moneda, progreso derivado del ledger, JSON export v3) — T-041

### Domain & Persistence
- [x] Currency, Money, Account, Transaction, Posting, Category
- [x] Domain validation (invariants, balance rules, multicurrency)
- [x] Conversion logic with exact re-derivation
- [x] 138 tests passing, typecheck passing
- [x] SQLite schema v3 with migrations (v1 + budgets + goals)
- [x] Repository layer (CRUD + validation)
- [x] Production build pipeline (R8, shrinkResources, release signing)

---

## IN PROGRESS 🚧

### P0 — MAKE THE CORE SOLID (Current Priority)

#### P0.1 Financial Core
- [x] accounts, transactions, income, expense, transfers, adjustments
- [x] categories (planas), dates, memo de transacción
- [ ] subcategorías / notas de cuenta — decisión UX OPEN (PHASE0 §15, §9); no cerrar por invención
- [x] multicurrency correctness, conversion correctness
- [x] **UX Polish - Home**: snapshot por moneda (cuentas en cero incluidas, equity excluido), lista de cuentas con saldo, empty states sin apilar, "Mostrar todo" a Movimientos, detail ES/EN en filas
- [x] **UX Polish - Accounts**: pressed/ripple, first-run form sin grupos "(0)", validación de nombre local, rename con toast
- [x] **UX Polish - Transactions**: conteo "N de M" honesto sobre el conjunto filtrado
- [x] **UX Polish - Transactions (resto)**: sorting indicators — descartado (YAGNI: orden estable ya garantizado)
- [x] **UX Polish - Transaction Detail**: postings con nombres de cuenta, block de conversión completo
- [x] **UX Polish - Categories**: two-tap delete armado, rename con toast, validación de nombre local
- [x] **UX Polish - Cross-flow (resto)**: loading states — descartado (YAGNI: reads síncronos; solo spinner de DB-open)

#### P0.2 Ledger Integrity
- [x] Double-entry invariants
- [x] Multicurrency correctness
- [x] Conversion correctness
- [x] Validation centralized
- [x] Deterministic calculations

#### P0.3 UX Polish (Current Sprint)
- [x] **Home**: snapshot por moneda con cuentas en cero y sin equity, lista de cuentas (tap → detalle, "Mostrar todo" → Accounts), un solo empty state, "Mostrar todo" a Movimientos, FAB con guardia de cuentas en AddTransaction
- [x] **Accounts**: filas con pressed/ripple, primer formulario sin grupos "(0)", validación local de nombre, rename con toast
- [x] **Transactions**: Filter UX polish (sorting indicators descartados YAGNI — search/count/clear ya funcionan)
- [x] **Transaction Detail**: postings muestran nombres de cuenta (no ids crudos); block de conversión completo
- [x] **Categories**: two-tap delete armado por categoría, rename con toast, validación local de nombre
- [x] **Feedback**: success toasts on save/create/delete (in-house, zero deps); toast apila sobre el FAB
- [x] **ErrorState/rows ES/EN**: `ErrorState`, `FormError` (role=alert) y detalles de fila (transferencia/pago/tasa/comisión) localizados — sin strings hardcodeados en componentes compartidos
- [x] **Error Handling UI**: hints localizados para listas vacías en AddTransaction (categorías/tarjetas), gate fatal/corrupt con retry real, `getDb()` solo cachea el handle tras init completo
- [x] **Empty States**: Home sin estados apilados, Accounts sin grupos vacíos, CTA AddTransaction → Accounts cuando no hay cuentas
- [x] **Feedback rest**: loading states — descartados (YAGNI: reads síncronos; solo spinner de DB-open, ya implementado)

#### P0.4 Persistence
- [x] Restart persistence
- [x] Migration correctness
- [x] DB corruption handling
- [x] Deterministic reads/writes

#### P0.5 Data Portability
- [x] JSON export
- [ ] JSON import — sin importador a propósito: el restore entra solo por `.moneybackup` (T-010). Nota: este ítem estaba marcado sin evidencia; se corrige a pendiente.
- [x] CSV export (Share sheet, cero dependencias)
- [x] CSV import (`planImport`/`applyImport`: preview → confirm → commit atómico; `tests/import.test.ts`)
- [ ] Versioning (restore `.moneybackup`, bloqueado en T-010/T-005)
- [ ] Validation (restore `.moneybackup`, T-010)
- [ ] Preview (restore `.moneybackup`, T-010 — el preview de import CSV ya existe)
- [ ] Atomic restore (T-010)

---

## NEXT 🎯

### Immediate Next Steps (Vertical Slices)

| Priority | Feature | Status | Effort | Risk |
|----------|---------|--------|--------|------|
| 1 | **Home UX Polish** | Done (T-029 tree) | S | Low |
| 2 | **Accounts UX Polish** | Done (T-029 tree) | M | Low |
| 3 | **Transaction Detail Polish** | Done (postings + conversion) | M | Low |
| 4 | **Categories CRUD Polish** | Done (two-tap delete, rename toast) | S | Low |
| 5 | **Feedback System (toasts/alerts)** | Done | M | Low |
| 6 | **Error Handling UI** | Done (FormError, hints, gate retry) | M | Low |
| 7 | **Empty States** | Done | S | Low |

---

## BLOCKED 🔴

| Item | Blocked By | Status |
|------|------------|--------|
| T-019 (Device offline runtime) | Physical device test | PROVISIONAL |
| T-021 (expo-sqlite runtime) | Physical device test | PROVISIONAL |
| T-004 DB Encryption | Threat model decision | OPEN |
| T-005 Backup KDF | OPEN | Threat model pending |
| T-009 License | PROVISIONAL | GPL-3.0-or-later provisional |
| T-010 Backup Schema | OPEN | Depends on T-004/T-005 |
| T-019 | Device required | PROVISIONAL |
| T-021 | expo-sqlite runtime | PROVISIONAL |

---

## DEFERRED 📅

| Feature | Reason |
|---------|--------|
| Recurring Transactions | UX OPEN (no inventar frecuencias/edición) |
| Charts | T-035 dejó reports v1 sin charts; dibujado propio/lib pendiente de ratificación |
| Credit Cards | Requires P1 Planning |
| Desktop | Out of scope for mobile MVP |
| Sync/Cloud | Out of scope (P-02) |
| AI/ML | Out of scope |
| Bank APIs/Scraping | OUT OF SCOPE |

---

## OUT OF SCOPE (NEVER)

| Feature | Reason |
|---------|--------|
| Bank APIs / Scraping | Violates P-01, P-02 |
| Payment Processing | Violates P-04 |
| Bank Synchronization | Violates P-01 |
| Credit Scoring | Out of scope |
| Investment/Trading | Violates P-04 |
| Social Features | Violates P-01/P-02 |
| Cloud Sync | Violates P-01/P-02 |
| Analytics/Telemetry | Violates P-03 |
| Ads/Monetization | Violates P-03 |
| Biometrics | T-013 pending |
| Notifications | Not in MVP |
| Web Version | Android-first per P-12 |

---

## NEXT ACTIONS

### This Week (Vertical Slices)

1. ~~**Home UX Polish**~~ Done — snapshot, cuentas, empty states, "Mostrar todo", ES/EN de filas
2. ~~**Accounts Screen**~~ Done — pressed feedback, first-run form, validación local
3. ~~**Transaction Detail**~~ Done — postings con nombres, conversión completa
4. ~~**Categories**~~ Done — two-tap delete, rename toast
5. ~~**Feedback System**~~ Done — toasts + FormError
6. ~~**Error Handling UI**~~ Done — hints, gate retry
7. ~~**Sort indicators / loading states de lista**~~ descartado (YAGNI): reads son síncronos, el orden ya es estable; sin evidencia de necesidad
8. ~~**Import/Export CSV+JSON**~~ Done — Share sheet de export, ImportCsv con preview → confirm → commit atómico (T-031)
9. ~~**Budgets v1** (Fase 5)~~ Done — schema v2, regla mensual categoría+moneda, medición desde postings, pantalla Budgets con crear/eliminar; T-039 DECIDED (ratificación de moneda explícita + periodicidad mensual + medición)
10. ~~**Reports v1** (Fase 6)~~ Done — `lib/reports` + pantalla Reports (mes anterior/siguiente, totales ingreso/gasto/neto por moneda, gastos por categoría); T-040 DECIDED (sin charts, sin consolidado FX)
11. ~~**Goals v1** (Fase 5)~~ Done en host — `Goal` + tabla propia `goals`/`goal_accounts` (schema v3), progreso derivado Σ balances, pantalla Goals (crear/editar/eliminar, multi-select por moneda), JSON export v3 con `goals[]`; T-041 PROVISIONAL (pendiente solo prueba en dispositivo)

---

## NOTES

- **T-019** (offline runtime) and **T-021** (expo-sqlite runtime) remain PROVISIONAL pending physical device testing
- **T-004/T-005/T-010** remain OPEN pending threat model and KDF decisions
- **T-009** License remains PROVISIONAL (GPL-3.0-or-later provisional)
- Production APK de T-036 (SHA `D86745B0…8B025`, fuente `c5f8e99`) es el `LAST KNOWN GOOD PRODUCTION APK` — ver DECISIONS T-036 / RELEASE_SECURITY_AUDIT
- DO NOT re-verify device gates until physical device is available
- Focus development on P0 UX Polish before expanding features

---

*Last updated: 2026-10-08*
*Last build: T-042 — production-signed APK v1.1.0 (versionCode 2, Goals v1), 82.085.556 B, SHA-256 `872C429F5DF4BF49BCD834A66739556AA87DA6D5013D22D1F0D53C1C14356432`, instalado en dispositivo vía `adb install -r` (datos preservados, arranque sin crash)*
*Previous known-good: `c5f8e99` — production-signed APK (T-036), 82.069.792 B, SHA-256 `D86745B0123055D4877D9D11F9771545B22499C2BA67DBB2BD7380217D78B025` (copia estable preservada)*
*Tests: 178/178 pass | Typecheck: PASS (raíz + app) | Export: JSON v3 OK | Expo export: OK*