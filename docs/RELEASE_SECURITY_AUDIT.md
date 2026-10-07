# MoneyFOSS — Release Security Audit

**Fecha:** 2026-10-07 · **Fuente:** HEAD `c5f8e99` (código exacto del bundle; cambios posteriores solo documentales).

## Executive Summary

Release APK real producido localmente (no debug): 82 MB con R8+shrink, **cero permisos peligrosos**, `allowBackup=false`, **firmado con keystore de producción** (CN=MoneyFOSS). Suite 161/161, typechecks en 0, bundle verificado. Veredicto: **RELEASE CANDIDATE — DEVICE GATES REMAIN**.

## Build Evidence (VERIFIED)

| Campo | Valor |
|---|---|
| Package / version | `com.moneyfoss.app`, versionCode 1, versionName 1.0.0 |
| Stack | Expo SDK 57.0.26, RN 0.86.3, React 19.2.3, TS (strict, erasableSyntaxOnly) |
| Toolchain | Node 24.15.0, npm 12.0.2, Temurin JDK 17.0.20.1, Gradle 9.3.1, build-tools 35.0.0, compileSdk 36, targetSdk 36, minSdk 24, NDK 27.1.12297006, Windows |
| Comando | `expo prebuild --clean` + `gradlew -p android assembleRelease --max-workers=2` (online; `--offline` cuelga configure en este entorno: requiere red para resolución) |
| Variante | release (R8 `minifyReleaseWithR8` ejecutado, `mapping.txt` generado, shrinkResources, sin flag `debuggable`) |
| Firma | **keystore producción** (`CN=MoneyFOSS`, SHA-256 `83389ea5…326c`) — **no debug key** |
| Tamaño / SHA-256 | 82.069.792 B / `D86745B0123055D4877D9D11F9771545B22499C2BA67DBB2BD7380217D78B025` |
| Ruta | `app/android/app/build/outputs/apk/release/app-release.apk` (gitignored) |
| Resultado | `BUILD SUCCESSFUL`, 360 tareas; bundle Metro reconstruido (`createBundleReleaseJsAndAssets`) |

## Final APK Evidence

Ver §Build Evidence. Este artefacto (SHA `D86745B0…8B025`, fuente HEAD `c5f8e99`) supera al APK de T-033 para toda conclusión de release; no mezclarlos. Delta desde T-033: JSON export v2 con `budgets[]` (T-034) + Reports v1 (T-035). Gates de manifest/firma idénticos y re-verificados. T-033 queda como historial.

## CURRENT RELEASE ARTIFACT

- version: 1.0.0 · versionCode: 1 · `com.moneyfoss.app`
- APK: `app/android/app/build/outputs/apk/release/app-release.apk` (gitignored) — copia estable en `C:\Users\WinterOS\.moneyfoss\releases\app-release-T036.apk`
- SHA-256: `D86745B0123055D4877D9D11F9771545B22499C2BA67DBB2BD7380217D78B025`
- size: 82.069.792 B · firmado producción (`CN=MoneyFOSS`, cert SHA-256 `83389ea5…326c`), `apksigner verify` exit=0
- R8 + shrinkResources, sin `debuggable`, `allowBackup=false`
- permisos: solo propio DYNAMIC_RECEIVER; sin INTERNET/storage/alert/vibrate/network-state
- fuente: HEAD `c5f8e99` (bundle reconstruido de ese código); suite 161/161 + typechecks en 0 + `expo export` OK
- registro: DECISIONS T-036 (supera al artefacto de T-033)

## Permissions (VERIFIED vía aapt2 sobre el APK final)

Solicitados: **solo** `com.moneyfoss.app.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION` (propio, system-gated). **Ausentes:** `INTERNET`, `SYSTEM_ALERT_WINDOW`, `READ/WRITE_EXTERNAL_STORAGE`, `VIBRATE`, `ACCESS_NETWORK_STATE`, location, contacts. Eliminados vía `blockedPermissions` (5 entradas, con test de config que las fija) + `tools:node="remove"` en el merge. Declarantes originales: plantilla Expo + `expo-file-system@57.0.7` transitivo — ambos neutralizados en el merge final.

## Network / INTERNET (VERIFIED ausencia de permiso; tráfico NOT VERIFIED sin dispositivo)

- Permiso: ausente (aapt2, APK final).
- Código capaz de red PRESENTE tras R8: `okhttp3` (ambos dex), `expo.modules.fetch`, `WebSocket` (strings en dex); `devtools://` ausente.
- Uso por features: ninguno (grep + allowlist de imports en `app/src`; test estructural).
- Declaración sostenible: "el APK no pide INTERNET y ninguna feature depende de red". Tráfico real: NOT VERIFIED (requiere dispositivo, T-019).

## Backup / Data Extraction (VERIFIED en manifest)

`allowBackup="false"` en el APK final. Sin `dataExtractionRules` dedicadas (nada que extraer por diseño: sin backup implementado). Sin deep links (un solo intent-filter MAIN/LAUNCHER). Sin servicios en background.

## Exported Components (VERIFIED)

`MainActivity` exportada (launcher, requerido). Providers no exportados. `ProfileInstallReceiver` exportado con permiso `DUMP` (system-only, estándar AndroidX). Sin receivers/servicios propios exportados.

## Dependency Audit (VERIFIED)

Sin dependencias nuevas en este sprint salvo `expo-build-properties`/`expo-system-ui` ya registradas (T-026, MIT). `expo-file-system` sigue transitiva-solamente (test de config lo fija). Nativo R8 no eliminó okhttp (se usa desde expo core) — documentado, sin permiso, sin uso.

## Financial Regression (VERIFIED)

Suite completa 140/140: int64, >2⁵³, overflow, negativos, cero, multicurrency, conversión + fee, tarjeta compra/pago, transfer, income/expense, balances, T-016, validación determinista, fail-closed, snapshot de Home, detalles de fila localizados. Cero cambios a invariantes.

## Persistence Regression (VERIFIED)

Schema, migraciones (fresh/idempotente/upgrade/corrupta), rollback, atomicidad, roundtrip, corrupción, FK/CHECK, int64 y >2⁵³ en TEXT, representación cruda verificada. SQL sin semántica financiera; validación siempre en dominio.

## Offline Evidence (PROVISIONAL)

Estatuto offline por construcción (sin permiso, sin features de red, DB local). Prueba en airplane mode: NOT VERIFIED — DEVICE GATE (protocolo de 19 pasos en T-019/hardening doc, listo para el teléfono).

## Device Evidence (NOT VERIFIED)

Sin emulador/dispositivo local. T-019 y T-021 permanecen PROVISIONALES. Protocolo T-021 (expo-sqlite runtime): instalar APK, crear cuenta/categoría, guardar los 10 casos, matar proceso, reabrir, verificar balances, repetir con airplane mode, revisar que no haya errores SQLite.

## Accessibility (estática VERIFIED, TalkBack NOT VERIFIED)

Roles/labels/estados, targets 44–48px, contraste ≥4.5:1 medido, dynamic type, significado nunca solo-color, montos hablados. Lector real: DEVICE GATE.

## Logging / Privacy (VERIFIED estáticamente)

Cero `console.*` en `src/` y `app/src` (test estructural). Errores UI sin SQL/paths/stacks. Excepción documentada: mensajes SQLite crudos solo en fallos imprevistos (nombres de tabla, sin valores).

## I18N (VERIFIED)

Dict ES/EN con completitud en compile-time; categorías semilla por id estable (`cat:*`, renombres respetados, custom intactas); enums de dominio/códigos/fechas/montos/identidades nunca traducidos; locale en `schema_meta` sin tocar filas financieras; toggle persistido. Tests: mapeo + config.

## Remaining Open Decisions

T-004, T-005, T-009 (licencia — READMEs la declaran pendiente), T-010, T-019, T-021. Sin cambios.

## Remaining Device Gates

Airplane-mode (19 pasos), runtime expo-sqlite, TalkBack, firma release con keystore del usuario, instalación en teléfono del APK final.

## Release Verdict

**RELEASE CANDIDATE — DEVICE GATES REMAIN.** Todo lo verificable sin dispositivo está cerrado con evidencia; la firma debug impide distribuir; ningún gate físico se declara cerrado por inferencia.
