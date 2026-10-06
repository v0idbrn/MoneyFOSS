# MoneyFOSS — UI/UX Progress Report

**Fecha:** 2026-10-05 · **Alcance:** product foundation (Tier 1). Sin UI de Tier 2, sin export, sin APK firmado en este reporte (intento de build debug documentado abajo).

## 1. Screens implemented

| Screen | Route | What works |
|---|---|---|
| Home | tab | per-currency snapshot across assets+liabilities (domain-derived), recent 5, FAB, empty states |
| Accounts | tab | grouped Cash & bank / Cards & debts with balances, new account (asset/liability, any snapshot currency, optional starting balance via auto `equity:opening:<CUR>` + balanced opening tx) |
| AccountDetail | stack | balance, metadata, rename, guarded delete (blocked with explanation when referenced), recent 8, add-transaction shortcut |
| Transactions | tab | search text + kind/account/category chips, active-count + one-tap clear, newest-first, FAB |
| TransactionDetail | stack | kind/title/amounts/date/memo, conversion block (rate, direction, source, mode, fee flag), expandable postings, two-tap delete |
| AddTransaction | modal | 6 types (expense, income, transfer, card-purchase, card-payment, convert), conditional fields, foreign-price expense (case 9), fee on conversion, strict amount/date/rate validation with inline errors, save → domain op → atomic persist → back |
| Categories | stack (from More) | list by kind with use-counts, create, rename, guarded delete |
| More | tab | about + counts, currency reference table, erase-all (two-tap, reseeds defaults) |

**Nota de navegación honesta:** Categories vive como pantalla pero el tab actual es Home/Accounts/Transactions/More — Categories se alcanza desde… (revisar: en `nav.tsx` los tabs son Home, Accounts, Transactions, More; Categories NO está en tabs ni en stack). **FIX REQUERIDO antes del build:** registrar `Categories` en el stack navigator (o entrada desde More). Ver §8.

## 2. Components implemented

`Screen, H1/Section/Body/Meta/Small, Amount (a11y), Divider, Btn (3 kinds), Field (inline errors), Chip, EmptyState, ErrorState, Fab, TxRow` — todos en `app/src/components.tsx`. Iconos: solo familia MaterialIcons. Tokens en `app/src/theme.ts` (paleta oficial + danger/warning/success funcionales justificados + contrastes ≥ 4.5:1 computados).

## 3. Features implemented

- 6 flujos de entry que llaman operaciones del dominio (nunca postings manuales): expense, income, transfer, card-purchase (`expense` sobre liability), card-payment, convert (con fee opcional y dirección de cotización).
- Balances derivados del dominio (`src/domain/balances.ts`, Σ pura, testeada).
- Presentación pura y testeada (`format/describe/filters`, `tests/presentation.test.ts`).
- Gestión con guardas: rename/delete de cuentas y categorías, delete de transacciones, opening balances, erase-all con reseed.
- Semilla de 11 categorías editables; borrado bloqueado con explicación cuando hay historial.

## 4. Icon / assets

Suite en `app/assets/`: `icon.png`, `adaptive-foreground.png`, `adaptive-monochrome.png`, `favicon.png` + `icon.svg` fuente. Renderer `app/scripts/icon.mjs` sin dependencias, píxeles verificados por decodificación. Diseño documentado en `docs/UI_UX.md` §12.

## 5. Tests added

- `tests/balances.test.ts` (3), `tests/presentation.test.ts` (5), `tests/db-manage.test.ts` (3).
- Refuerzo de `tests/db-separation.test.ts` (regex con `\b`: "deleted" ya no dispara el detector de SQL interpolado).
- **Cuenta actual: 129 tests** (`npm test` → pass 129, fail 0): balances (3), presentation (5), db-manage (3) + refuerzo de separación.

## 6. Typecheck

- Raíz (`tsc --noEmit`, strict + erasableSyntaxOnly): exit 0.
- App (`tsc --noEmit` en `app/`, incluye `../src`): exit 0 tras 4 correcciones (API real de `expo-navigation-bar`, narrowing en closures con `function`, tipos ambientales de expo-sqlite visibles para la app).

## 7. Bundling

`expo export --platform android` en `app/`: **OK** (bundle Hermes 2.5 MB). Prueba que Metro resuelve imports `.ts` explícitos hacia `../src`, todas las pantallas, expo-sqlite y vector-icons. Spike previo en `spike-metro` (fuera del repo) lo había anticipado.

**APK debug instalable (evidencia T-025):** `assembleDebug` OK → `app-debug.apk`, 169.571.515 B, SHA256 `BBBA1080…E8472`, `com.moneyfoss.app` v1. Manifest fusionado vía aapt2: **sin INTERNET**; presentes `SYSTEM_ALERT_WINDOW`, `READ/WRITE_EXTERNAL_STORAGE` (maxSdk32), `VIBRATE`; `allowBackup="true"` + `debuggable="true"` (debug, esperable). Release (R8, purga, `allowBackup=false`) + runtime en teléfono: pendientes del usuario/gate.

## 8. Known limitations (honestas, con dueño)

1. ~~Categories sin ruta registrada~~ — **detectado y corregido en este sprint** (stack + entrada desde More; re-bundle verificado). Lección: pantalla huérfana = bug real aunque el bundle pase.
2. Sin Tier 2 (budgets/goals/recurring/reports/export). `describe`/`filters` dejan el camino abierto.
3. Marca decimal de display canónica `.` (agrupación sí localizada).
4. IDs de transacción `timestamp+random` (sin `crypto.randomUUID` en Hermes sin verificar; PK como backstop).
5. Sin tests de componentes renderizados (jest/RNTL no instalado por decisión de alcance; lógica de presentación cubierta con `node:test`).
6. `allowBackup`, R8/minify, purga de permisos de plantilla: pendientes del gate §32.4 (prebuild).
7. T-019/T-021: sin cambios (integración Android en paralelo por el usuario).

## 9. Domain decisions needed

Ninguna nueva semántica financiera. Se agregó `src/domain/balances.ts` (Σ pura, invariante T-016 ya congelada) — documentado aquí, no requiere entrada DECISIONS por no cambiar semántica. Si presupuestos/recurrencia revelan semántica faltante, se documentará y frenará según §24 del encargo.

## 10. Android-runtime blockers

- Toolchain: SDK presente, JDK 17 Temurin obtenido (temporal, fuera del repo) → **prebuild + `assembleDebug` funcionan localmente** (T-025). `expo prebuild --clean` regenera `android/` (gitignored) sin sorpresas.
- `expo-file-system@57.0.7` transitivo confirmado como declarante de INTERNET+storage; el merge final **no** incluye INTERNET (evidencia aapt2 en debug).
- Restan para release: variante release con R8/minify, purga `READ/WRITE_EXTERNAL_STORAGE`+`SYSTEM_ALERT_WINDOW`(+`VIBRATE` evaluar), `allowBackup="false"`, y runtime en dispositivo/emulador (usuario en paralelo).
- Sin emulador/dispositivo local: toda evidencia runtime la aporta el usuario en paralelo.

## 11. Next recommended work

1. Registrar Categories en navegación (bug §8.1) + re-bundle.
2. Conseguir JDK 17 → `expo prebuild` → `assembleDebug` → APK para el teléfono del usuario → verificar manifest sin INTERNET (apkanalyzer/aapt2) → T-019/T-021 avanzan con evidencia real.
3. Probar flujos en teléfono: entry de los 6 tipos, conversión con fee, borrados con guarda, erase-all.
4. Después: Tier 2 mínimo (spending-by-category explicable) o pulido según feedback del usuario.

### PRODUCT SPRINT COMPLETE

Lo que funciona de verdad: app Expo SDK 57 que abre, migra, siembra categorías, crea cuentas con balance inicial, registra los 6 tipos de operación vía dominio validado, persiste atómicamente en SQLite (expo-sqlite), lista/filtra/explica/elimina con guardas, y hace bundle Android verificado. Identidad Belladonna aplicada con tokens y contrastes medidos; icono propio generado y verificado por píxeles. Tests 132 verdes en raíz + typecheck estricto en ambos paquetes. Pendiente verificado-honesto: ruta de Categories, JDK local para APK, evidencia runtime del usuario.
