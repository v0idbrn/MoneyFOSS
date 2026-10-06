# MoneyFOSS

**Offline-first, privacy-first personal finance. Your ledger lives on your device — nothing else.**

[Leer en español](README.es.md)

> **Status: active development, no public release yet.** There is a debug APK for on-device testing, but no signed release, no store listing, and several release gates still pending (see `docs/UI_UX_PROGRESS.md` and `docs/HARDENING_AUDIT.md`).

## What it is

MoneyFOSS records and organizes your money — expenses, income, transfers, credit-card flows and currency conversions — with an exact integer ledger (minor units, never float), auditable multi-currency conversions, and zero network, zero analytics, zero cloud.

What it is **not**: it does not move money, give advice, sync anywhere, or ask for accounts. See `docs/PHASE0_REPORT.md` §3 (what MoneyFOSS should NOT become).

## Principles

- **Offline-first** — works 100% without network; no INTERNET permission in the APK.
- **Ledger as the single source of truth** — balances are always derived, never stored.
- **Exact money** — signed int64 minor units; strict input parsing (excess decimals are rejected, never rounded).
- **Auditable conversions** — every currency conversion stores rate text, exact ratio, quote direction, timestamp, source and rounding mode.
- **Fail-closed** — corrupted data is reported, never silently repaired.

## Current state

- Financial domain core (`src/domain/`): exact balance invariant, 10-case multi-currency walkthrough, conversion bridges.
- Persistence (`src/persistence/`): SQLite behind a domain-owned port, deterministic migrations, atomic writes, corruption fail-closed.
- App (`app/`, Expo SDK 57 + React Native): Home, Accounts, transaction entry (6 flows), history with search/filter, detail with accounting drill-down, categories, bilingual ES/EN interface.
- Tests: 135 passing (`npm test`), strict typecheck in both packages, verified Android bundle + installable debug APK.

## Build & verify

```powershell
npm test            # 135 tests (domain, persistence, presentation)
npm run typecheck   # strict tsc
cd app
npm run typecheck   # strict tsc for the app
.\node_modules\.bin\expo export --platform android   # Metro bundle proof
```

Debug APK (needs JDK 17 + Android SDK, both outside this repo):

```powershell
.\node_modules\.bin\expo prebuild --platform android --clean
$env:JAVA_HOME = "<jdk17>"; $env:ANDROID_HOME = "<sdk>"
.\android\gradlew.bat -p android assembleDebug
```

## Documentation map

- `docs/PHASE0_REPORT.md` — product definition, financial model, threat model, testing strategy.
- `docs/DECISIONS.md` — append-only decision log (statuses: DECIDED / PROVISIONAL / OPEN).
- `docs/ARCHITECTURE.md` — layers, modules, binding rules.
- `docs/DATA_FORMAT.md` — wire format (DECIDED) and backup envelope (provisional).
- `docs/PHASE1_AUDIT.md` — adversarial audit of the domain (verdict: Phase 2 READY).
- `docs/PHASE2_PERSISTENCE.md` — persistence foundation andevidence.
- `docs/UI_UX.md` — design system (Belladonna identity, tokens, flows, accessibility).
- `docs/UI_UX_PROGRESS.md` — product sprint report.
- `docs/HARDENING_AUDIT.md` — post-UI hardening audit and device gates.

## License

**Pending (T-009).** No license file is included yet, which means default copyright applies until the author decides (GPL-3.0-or-later is the provisional strong option, not frozen). Do not redistribute builds until this is resolved.
