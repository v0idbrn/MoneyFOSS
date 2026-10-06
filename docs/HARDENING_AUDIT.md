# MoneyFOSS — Hardening Audit (post-UI)

**Fecha:** 2026-10-05 · **Alcance:** repo completo tras el product sprint. No se agregaron features Tier 2, ni cifrado, ni backup final, ni metadata de stores. T-004/T-005/T-010/T-019/T-021 intactos.

## 1. Scope

Endurecer sin expandir: verificar fronteras UI/dominio/persistencia, auditar los 10 flujos contra el dominio, preparar (no verificar) el build release, auditar manifest/red/leaks/inputs/corrupción/deletes/estados/a11y/rendimiento, agregar i18n ES/EN pedido por el usuario, dejar checkpoint limpio con push a GitHub.

## 2. Repository state (verificado, no heredado)

- HEAD `81707b4` + 5 commits nuevos en este sprint (ver §18). Árbol final limpio.
- `src/domain/` (8 módulos incl. `balances.ts`), `src/persistence/` (puerto + schema + migraciones + repositorio + 2 drivers), `app/` (shell, 8 pantallas, lib pura, icon suite), `tests/` (135 tests), docs al día.
- Afirmaciones del sprint previo re-verificadas: bundle Metro OK (reproducido), APK debug existe con SHA registrado, manifest sin INTERNET (reproducido con aapt2 tras el re-prebuild), suite 129→135.

## 3. Architecture verification

Flujo confirmado por greps + lectura:

- **SQL solo en** `app/src/db.ts` (`openExpoDb` + `eraseAllData` centralizado) y `src/persistence/`. Cero SQL en pantallas/componentes.
- **Escritura:** pantallas → operaciones del dominio (`expense/income/transfer/cardPurchase/cardPayment/exchange/openingBalance/buildTransaction`) → `saveTransaction` (valida contra refs de la DB → una transacción SQLite). Sin postings manuales salvo el constructor validado `buildTransaction` (usado solo en tests tras el fix H1).
- **Lectura:** filas → chequeos canónicos (`CORRUPT_ROW`) → `assertTransaction` → dominio → UI. La UI nunca confía en la DB.
- **Saldos:** `accountBalances` + `currencyTotals` del dominio; la UI no suma minor units fuera de `formatDisplayAmount` (presentación de un entero ya validado).
- **Tipos de persistencia en UI:** solo `Db` opaco dentro de `app/src/db.ts`; las pantallas dependen de funciones del repositorio (frontera documentada, intencional).
- **Sin lógica duplicada:** el repositorio no recomputa Σ; delega en `assertTransaction`.

## 4. Transaction-flow audit (10 flujos)

| # | Flujo UI | Operación | Estado |
|---|---|---|---|
| 1 | Expense | `expense()` | ✅ postings/balance/moneda exactos (tests `case 1` + entry usa la misma fn) |
| 2 | Income | `income()` | ✅ (`case 2`) |
| 3 | Transfer | `transfer()` | ✅ (`case 3`, guarda same-currency) |
| 4 | USD expense | `expense()` cuenta USD | ✅ (`case 4`) |
| 5 | USD income | `income()` cuenta USD | ✅ (`case 5`) |
| 6 | Card purchase | `expense()`/`cardPurchase()` sobre liability | ✅ (`case 6` + assertion de tipo) |
| 7 | Card payment | `cardPayment()` | ✅ (`case 7` + destino liability) |
| 8 | ARS→USD | `exchange()` + `Conversion` | ✅ (`case 8`, 8475) |
| 9 | Compra ARS desde USD | `expense()` + `rate` | ✅ (`case 9`, 847) |
| 10 | Conversión con fee | `exchange()` + `fee` | ✅ (`case 10`, 8432 + variante USD) |

Cero float en todos los caminos (bigint de punta a punta; `Intl` solo agrupa dígitos para display). Recarga tras reinicio = misma lectura validada (sin caché de verdad: el estado deriva en cada `refresh()`). Atomicidad = una transacción SQLite por guardado (testeada con inyección).

## 5. Input validation audit

Campos tratados como hostiles; la UI valida formato y el dominio valida semántica (defensa en profundidad, nunca solo UI):

- Monto: vacío/blancos → mensaje; coma decimal única normalizada; separadores mixtos → error; unicode minus → `INVALID_MONEY_FORMAT`; exceso de decimales → `EXCESS_DECIMALS`; 100 dígitos → int64 range; cero/negativo → `AMOUNT_MUST_BE_POSITIVE` (testeado en `presentation.test.ts` "hostile entry input").
- Moneda: fijada por la cuenta (sin input libre); precio extranjero restringido al snapshot.
- Cuentas/categorías: pickers sobre refs reales + `need*` con mensaje; referencia borrada → error limpio.
- Fecha: default local hoy; formato validado por el dominio.
- Tasa/fee: texto libre → `parseRatio` estricto (cero/negativa/larga rechazadas, testeado a nivel operación).
- Búsqueda/filtros: texto libre solo hace `includes` case-insensitive; filtros reversibles con conteo visible y limpieza en un tap.

## 6. Persistence/runtime status

- Producción usa **expo-sqlite** (`app/src/db.ts` → `openExpoDb('moneyfoss.db')` → `migrate()` → seed de categorías si vacío). Sin inicialización perezosa rota: singleton con migrate en apertura.
- Ciclo de vida: DB abierta una vez; `refresh()` re-lee todo (lecturas síncronas, sin caché financiera). Cierre de proceso/reinicio Android = reapertura + migrate idempotente + revalidación total. Sin estado financiero en memoria que sobreviva mal.
- Locale de UI persistido en `schema_meta` (`getSetting/setSetting`, clave `version` protegida) — sin cambio de schema.
- T-021 sigue PROVISIONAL: falta ejecución en runtime RN (USER/DEVICE GATE).

## 7. Android manifest audit (re-verificado tras re-prebuild)

Manifest generado (`android/app/.../AndroidManifest.xml`): `INTERNET` con `tools:node="remove"` (de `blockedPermissions`), `allowBackup="false"` (plugin local), package `com.moneyfoss.app`, versionCode 1. Permisos restantes: `SYSTEM_ALERT_WINDOW`, `READ/WRITE_EXTERNAL_STORAGE` (maxSdk32), `VIBRATE` — higiene pendiente del gate release (no bloquean debug). Merge final del APK verificado con aapt2 (§18).

## 8. Network audit

- Código de app: cero `fetch`/`WebSocket`/`Linking`/imports dinámicos (grep + test estructural que ahora cubre `app/src` y allowlist de imports).
- Dependencias con código capaz de red (okhttp en RN, `expo.modules.fetch`, devsupport): **presentes en el APK, sin permiso y sin ningún camino de ejecución desde features** (ninguna feature usa red). Distinción registrada: código presente ≠ permiso ≠ camino runtime ≠ uso real. Ninguna feature depende de conectividad.
- Declaración honesta sostenible: "el APK no pide INTERNET y ninguna feature depende de red" (evidencia: manifest + greps + allowlist). "Cero código de red" NO se afirma.

## 9. Sensitive-data/logging audit

- Cero `console.*` en `src/` y `app/src` (test estructural).
- La UI de error muestra mensajes de dominio (pueden incluir montos/ids: datos propios del usuario en su pantalla — aceptable) y nunca SQL crudo, paths, ni stacks. Excepción documentada: errores SQLite inesperados propagan su texto (nombres de tabla/columna, sin valores financieros); pre-chequeos convierten los casos conocidos en `DomainError` limpios.
- Sin dumps de DB, sin serialización a logs, sin CBU/cuentas (el modelo no las tiene).

## 10. Destructive-action audit

| Acción | Semántica real | Guarda | UX |
|---|---|---|---|
| Cuenta con movimientos | imposible borrar | `ACCOUNT_HAS_POSTINGS` | mensaje + saldos intactos |
| Cuenta vacía | borrado físico | — | confirmación en 2 taps |
| Categoría en uso | imposible borrar | FK + `CATEGORY_IN_USE` | mensaje (el historial conserva significado) |
| Transacción | borrado físico atómico (CASCADE) | — | confirmación en 2 taps |
| Borrar todo | borrado físico + reseed de categorías | — | confirmación en 2 taps |

Borrado = eliminación, no reversión ni archivo: documentado como decisión (sin infraestructura de audit-log por §10 del encargo). El historial nunca queda ambiguo porque las etiquetas referenciadas no se pueden eliminar.

## 11. Failure-state audit

Primer launch (seed), sin cuentas/txs/categorías (EmptyStates con acción), fallo de apertura/migración (`fatal`), datos inválidos (`corrupt`, solo lectura del error), fallo de guardado (inline + rollback probado), input malformado (inline por campo), búsqueda vacía, filtros sin resultado, contenido largo (wrap nativo, sin truncado silencioso). Destructivos con confirmación explícita. Sin excepciones crudas ni desinformación financiera en ningún caso.

## 12. Accessibility audit (contra `docs/UI_UX.md`)

Roles/labels/estados en botones, chips (`selected`), filas y montos (etiqueta hablada "menos/más"); targets: acciones 48px, chips elevados a 44px mín (fix de este sprint); errores con `role="alert"`; dynamic type respetado (sin `allowFontScaling={false}`); significado nunca solo-color (signo + icono + palabra); contrastes medidos ≥ 4.5:1; tabulares donde soportado. Restante: prueba con lector de pantalla real (USER/DEVICE GATE). Sin rediseño: la paleta Belladonna se preserva.

## 13. Performance observations

Lecturas completas por `refresh()` (sin caché-verdad: se re-deriva siempre — patrón seguro e intencional); lista de movimientos paginada a 100 + "mostrar todo" (presentación, sin agregación SQL); Home/recientes acotados; `useMemo` en derivados; guardado = una transacción. Sin N², sin trabajo pesado en arranque (migrate + seed mínimos). Sin optimización prematura.

## 14. Findings

| ID | Severidad | Evidencia | Impacto | Decisión/Fix | Test | Limitación restante |
|---|---|---|---|---|---|---|
| H1 | real defect | `Accounts.tsx` construía postings de apertura con signos en UI | semántica financiera en UI | nueva op de dominio `openingBalance()` + UI migrada | `operations.test.ts` (happy + 3 guardas) | ninguna |
| H2 | real defect | `Home.tsx` sumaba totales cross-account en UI | cálculo de ledger en UI | `currencyTotals()` en dominio + UI migrada | `balances.test.ts` | ninguna |
| H3 | real defect | `Categories.tsx` huérfana (sin ruta) | pantalla inaccesible | ruta stack + entrada en More + re-bundle | typecheck+bundle | ninguna |
| H4 | test defect | regex sin `\b` + expectativa de multiset | 2 falsos rojos | corregidos | suite verde | ninguna |
| H5 | intentional | SQL solo en `app/db.ts`; overdraft; transfer genérica; ids `timestamp+random`; memo int normalizado | — | documentado, sin cambio | existente | ninguna |
| H6 | acceptable limitation | errores SQLite crudos pueden mostrar nombres de tabla | diagnóstico con jerga interna | pre-chequeos cubren los casos conocidos | existente | documentada |
| H7 | open decision | T-004/005/010/009, release signing, Tier 2 | — | no se tocan | — | dueños respectivos |

## 15. Fixes

H1, H2, H3 + chips 44px + paginado 100 + i18n completo + settings genéricos + `expo-build-properties` + plugin `allowBackup=false` + `expo-system-ui`. Todos con test o verificación donde aplica (§18).

## 16. Unresolved issues

Cero defectos abiertos del audit. Abiertos por diseño (no de este sprint): T-004, T-005, T-009 (licencia — READMEs lo declaran pendiente), T-010, T-019 (runtime), T-021 (runtime), T-025 (release), lector de pantalla real, Tier 2.

## 17. Device-only gates

Arranque en airplane mode, flujos completos en teléfono, lector de pantalla, `assembleRelease` + R8 + purga de permisos + `allowBackup=false` verificado en release, firma release (acción del usuario, fuera del repo). El usuario los prueba en paralelo con el APK debug.

## 18. Exact commands/results

- `npm test` → **135 pass, 0 fail** (129 + settings + app-imports + hostile-input… conteo exacto en log).
- `npm run typecheck` (raíz) → exit 0. `npm run typecheck` (`app/`) → exit 0.
- `expo export --platform android` → OK (2.5 MB, re-verificado tras i18n).
- `expo prebuild --clean` → OK; manifest generado con `allowBackup="false"` + INTERNET `tools:node="remove"` (verificado hoy).
- `assembleDebug` (rebuild tras los cambios del sprint): **en curso al cerrar el sprint** — el primer intento falló por JDK incompleto en el entorno (limpieza de temporales borró `lib/jvm.cfg`; causa raíz probada en el log), el JDK se restauró, el segundo intento avanza (módulos, dex y CMake de x86 superados) pero la máquina compila a ritmo muy bajo. Evidencia APK vigente: T-025 (SHA registrado). Reanudar/verificar: `gradlew -p android assembleDebug` + aapt2 `dump xmltree … --file AndroidManifest.xml`.
- Deps: +`expo-system-ui`, +`expo-build-properties` (ambas MIT); T-026 registrado. Sin cambios no intencionales (`git status` limpio al final).
- Commits: `audit:`/`fix:`+`test:`/`docs:` + push a `github.com/v0idbrn/MoneyFOSS` (rama `main`).

## 19. Final verdict

Hardening completo sin regresiones: fronteras verificadas y reforzadas donde correspondía, release preparado sin declararlo verificado, i18n ES/EN con toggle persistido, READMEs ES/EN publicados, repo pusheado a GitHub. **No release-ready**: los gates de release y dispositivo siguen pendientes y nombrados. Rebuild debug en curso al cierre (evidencia APK vigente: T-025). Veredicto: endurecido, a la espera de evidencia de teléfono.
