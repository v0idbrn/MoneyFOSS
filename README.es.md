# MoneyFOSS

**Finanzas personales offline-first, privacy-first. Tu registro vive en tu dispositivo — nada más.**

[Read in English](README.md)

> **Estado: desarrollo activo, sin release público.** Hay un APK debug para pruebas en teléfono, pero sin release firmada, sin publicación en tiendas y con varios gates pendientes (ver `docs/UI_UX_PROGRESS.md` y `docs/HARDENING_AUDIT.md`).

## Qué es

MoneyFOSS registra y organiza tu dinero — gastos, ingresos, transferencias, tarjeta y conversiones de moneda — con un ledger entero exacto (minor units, nunca float), conversiones auditables y cero red, cero analítica, cero nube.

Lo que **no** es: no mueve dinero, no aconseja, no sincroniza nada, no pide cuentas. Ver `docs/PHASE0_REPORT.md` §3 (lo que MoneyFOSS no debe ser).

## Principios

- **Offline-first** — funciona 100% sin red; el APK no pide permiso INTERNET.
- **Ledger como única fuente de verdad** — los saldos siempre se derivan, nunca se almacenan.
- **Dinero exacto** — enteros int64 con signo en minor units; parseo estricto (decimales de más se rechazan, nunca se redondean).
- **Conversiones auditables** — cada conversión guarda texto de tasa, razón exacta, dirección, fecha, fuente y modo de redondeo.
- **Fail-closed** — el dato corrupto se reporta, nunca se "repara" en silencio.

## Estado actual

- Núcleo financiero (`src/domain/`): invariante de balanceo exacta, walkthrough de 10 casos multimoneda, puentes de conversión.
- Persistencia (`src/persistence/`): SQLite tras un puerto propio del dominio, migraciones deterministas, escritura atómica, corrupción fail-closed.
- App (`app/`, Expo SDK 57 + React Native): Inicio, Cuentas, alta de movimientos (6 flujos), historial con búsqueda/filtros, detalle con drill-down contable, categorías, interfaz bilingüe ES/EN.
- Tests: 135 verdes (`npm test`), typecheck estricto en ambos paquetes, bundle Android verificado + APK debug instalable.

## Compilar y verificar

```powershell
npm test            # 135 tests (dominio, persistencia, presentación)
npm run typecheck   # tsc estricto
cd app
npm run typecheck   # tsc estricto de la app
.\node_modules\.bin\expo export --platform android   # prueba de bundle Metro
```

APK debug (requiere JDK 17 + Android SDK, ambos fuera de este repo):

```powershell
.\node_modules\.bin\expo prebuild --platform android --clean
$env:JAVA_HOME = "<jdk17>"; $env:ANDROID_HOME = "<sdk>"
.\android\gradlew.bat -p android assembleDebug
```

## Mapa de documentación

- `docs/PHASE0_REPORT.md` — definición de producto, modelo financiero, threat model, estrategia de testing.
- `docs/DECISIONS.md` — registro append-only de decisiones (estados: DECIDED / PROVISIONAL / OPEN).
- `docs/ARCHITECTURE.md` — capas, módulos, reglas vinculantes.
- `docs/DATA_FORMAT.md` — formato wire (DECIDED) y envelope de backup (provisional).
- `docs/PHASE1_AUDIT.md` — auditoría adversarial del dominio (veredicto: Phase 2 READY).
- `docs/PHASE2_PERSISTENCE.md` — fundación de persistencia y evidencia.
- `docs/UI_UX.md` — sistema de diseño (identidad Belladonna, tokens, flujos, accesibilidad).
- `docs/UI_UX_PROGRESS.md` — reporte del sprint de producto.
- `docs/HARDENING_AUDIT.md` — auditoría de hardening post-UI y gates de dispositivo.

## Licencia

**Pendiente (T-009).** Todavía no hay archivo de licencia, lo que significa que rige el copyright por defecto hasta que el autor decida (GPL-3.0-or-later es la opción fuerte provisional, no congelada). No redistribuir builds hasta resolverlo.
