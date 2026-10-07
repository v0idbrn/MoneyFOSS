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
- [x] More (About, Currencies, Erase all)

### Domain & Persistence
- [x] Currency, Money, Account, Transaction, Posting, Category
- [x] Domain validation (invariants, balance rules, multicurrency)
- [x] Conversion logic with exact re-derivation
- [x] 138 tests passing, typecheck passing
- [x] SQLite schema v1 with migrations
- [x] Repository layer (CRUD + validation)
- [x] Production build pipeline (R8, shrinkResources, release signing)

---

## IN PROGRESS 🚧

### P0 — MAKE THE CORE SOLID (Current Priority)

#### P0.1 Financial Core
- [x] accounts, transactions, income, expense, transfers, adjustments
- [x] categories, subcategories, notes, dates
- [x] multicurrency correctness, conversion correctness
- [x] **UX Polish - Home**: snapshot por moneda (cuentas en cero incluidas, equity excluido), lista de cuentas con saldo, empty states sin apilar, "Mostrar todo" a Movimientos, detail ES/EN en filas
- [x] **UX Polish - Accounts**: pressed/ripple, first-run form sin grupos "(0)", validación de nombre local, rename con toast
- [x] **UX Polish - Transactions**: conteo "N de M" honesto sobre el conjunto filtrado
- [ ] **UX Polish - Transactions (resto)**: sorting indicators
- [x] **UX Polish - Transaction Detail**: postings con nombres de cuenta, block de conversión completo
- [x] **UX Polish - Categories**: two-tap delete armado, rename con toast, validación de nombre local
- [ ] **UX Polish - Cross-flow (resto)**: loading states de lista (reads sync; solo spinner de DB-open existe)

#### P0.2 Ledger Integrity
- [x] Double-entry invariants
- [x] Multicurrency correctness
- [x] Conversion correctness
- [x] Validation centralized
- [x] Deterministic calculations

#### P0.3 UX Polish (Current Sprint)
- [x] **Home**: snapshot por moneda con cuentas en cero y sin equity, lista de cuentas (tap → detalle, "Mostrar todo" → Accounts), un solo empty state, "Mostrar todo" a Movimientos, FAB con guardia de cuentas en AddTransaction
- [x] **Accounts**: filas con pressed/ripple, primer formulario sin grupos "(0)", validación local de nombre, rename con toast
- [ ] **Transactions**: Filter UX polish (sorting indicators only — search/count/clear ya funcionan)
- [x] **Transaction Detail**: postings muestran nombres de cuenta (no ids crudos); block de conversión completo
- [x] **Categories**: two-tap delete armado por categoría, rename con toast, validación local de nombre
- [x] **Feedback**: success toasts on save/create/delete (in-house, zero deps); toast apila sobre el FAB
- [x] **ErrorState/rows ES/EN**: `ErrorState`, `FormError` (role=alert) y detalles de fila (transferencia/pago/tasa/comisión) localizados — sin strings hardcodeados en componentes compartidos
- [x] **Error Handling UI**: hints localizados para listas vacías en AddTransaction (categorías/tarjetas), gate fatal/corrupt con retry real, `getDb()` solo cachea el handle tras init completo
- [x] **Empty States**: Home sin estados apilados, Accounts sin grupos vacíos, CTA AddTransaction → Accounts cuando no hay cuentas
- [ ] **Feedback rest**: loading states (reads are sync; only DB-open spinner exists)

#### P0.4 Persistence
- [x] Restart persistence
- [x] Migration correctness
- [x] DB corruption handling
- [x] Deterministic reads/writes

#### P0.5 Data Portability
- [x] JSON export
- [x] JSON import
- [ ] CSV export
- [ ] CSV import
- [ ] Versioning
- [ ] Validation
- [ ] Preview
- [ ] Atomic restore

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
| Budgets/Goals | Requires P0 solid first |
| Recurring Transactions | Requires P1 Planning |
| Reports/Charts | Requires P0 solid |
| Credit Cards | Requires P1 Planning |
| Recurring/Planning | Requires P1 Planning |
| Reports/Charts | Requires P0 solid |
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
7. **Transactions sort indicators / loading states de lista** — pendientes menores P0

---

## NOTES

- **T-019** (offline runtime) and **T-021** (expo-sqlite runtime) remain PROVISIONAL pending physical device testing
- **T-004/T-005/T-010** remain OPEN pending threat model and KDF decisions
- **T-009** License remains PROVISIONAL (GPL-3.0-or-later provisional)
- Production APK de T-030 (SHA `B7C6D34A…F805E`, fuente `ae8aae8`) es el `LAST KNOWN GOOD PRODUCTION APK` — ver DECISIONS T-030 / RELEASE_SECURITY_AUDIT
- DO NOT re-verify device gates until physical device is available
- Focus development on P0 UX Polish before expanding features

---

*Last updated: 2026-10-07*
*Last build: `ae8aae8` — production-signed APK (T-030), 82.029.380 B, SHA-256 `B7C6D34AC3DE52463F4680F26A39C3E68412A830040FA435AE143C2E4CAF805E`*
*Tests: 140/140 pass | Typecheck: PASS (raíz + app) | Export: OK | APK: 82MB, signed (prod key), R8+shrink*