# MoneyFOSS — Phase 2 Persistence Foundation

**Estado:** implementado y verificado contra `node:sqlite` (stdlib). Driver de producción = expo-sqlite (T-021 sigue PROVISIONAL: el adapter existe pero su ejecución requiere runtime React Native). Sin UI, sin cifrado, sin cambios a T-004/T-005/T-010.

---

## 1. Scope

Probar que el dominio validado sobrevive a persistencia sin perder corrección, precisión, atomicidad, portabilidad ni auditabilidad. Alcance: schema v1, migraciones deterministas, puerto `Db` mínimo, repositorio con validación en ambos caminos, drivers node (ejecutado) y expo (provisional), matriz de tests. Fuera de alcance: UI, SQLCipher, KDF, formato `.moneybackup` final, analytics de categorías, borrados en cascada de UX.

## 2. Database schema (v1)

`src/persistence/schema.ts`. Seis tablas, cero triggers, cero vistas:

| Tabla | Clave | Contenido |
|---|---|---|
| `schema_meta` | `key` | `('version', '<n>')` — única fuente de versión |
| `accounts` | `id TEXT` | name, type ∈ {ASSET,LIABILITY,EQUITY}, currency, archived ∈ {0,1} |
| `categories` | `id TEXT` | name, kind ∈ {income,expense} |
| `transactions` | `id TEXT` | date (texto), memo nullable |
| `conversions` | `transaction_id` (PK + FK) | from/to currency, rate_text, rate_num/den (texto), quote_direction, rate_at, source, rounding_mode — como máximo una fila por transacción (modelo T-016) |
| `postings` | `id TEXT` | transaction FK + `ON DELETE CASCADE`, position ≥ 0, account_id, currency, amount (texto), kind ∈ {normal,bridge}, category_id nullable + FK, UNIQUE(transaction_id, position) |

Decisiones estructurales:

- **Cuentas sistema (`sys:*`) NO son filas.** Son intrínsecas del dominio; materializarlas mezclaría el namespace de usuario con contrapartes axiomáticas. Por eso `postings.account_id` **no** tiene FK a `accounts` (documentado, testeado por la validación de lectura).
- **Sin saldos almacenados.** Balances = derivados (P-06). La DB guarda hechos (postings), nunca agregados.
- **Posting `id` determinista:** `{txid}:p{index}` — interno al storage, nunca entra al dominio, hace determinista la reconstrucción y evita `AUTOINCREMENT` (portabilidad/backup, §12 del encargo).
- **Sin jerarquía de categorías:** el dominio no la tiene; `kind` plano income/expense.

## 3. Mapping domain ↔ SQL

| Dominio | SQL |
|---|---|
| `Account{id,name,type,currency}` | fila `accounts` (+ `archived = 0` al crear; lectura ignora `archived`: sin semántica de archivado en Fase 2) |
| `Category{id,name,kind}` | fila `categories` |
| `Transaction{id,date,memo?}` | fila `transactions` (`memo` ausente = NULL) |
| `Posting{accountId,currency,amount,kind,categoryId?}` | fila `postings` (`amount` = `bigint.toString()` canónico; `categoryId` ausente = NULL; `position` = índice) |
| `Conversion{…}` | fila `conversions` (`rateRatio` = dos columnas de texto) |

Escritura: `saveTransaction` valida con `assertTransaction` contra refs **de la propia DB** antes de tocar una fila; inserción en **una** transacción SQLite (tx + conversión + postings). Lectura: filas → chequeo canónico de tipos (`CORRUPT_ROW` si un TEXT trae otra cosa) → `assertTransaction` con refs de la DB → objeto de dominio. La DB nunca se considera confiable por ser "nuestra".

## 4. ID strategy (DECIDED)

- IDs de transacción/cuenta/categoría = **TEXT provisto por el llamador** (los builders del dominio ya los exigen). Recomendación registrada: UUIDv4 vía `crypto.randomUUID()` de la stdlib en la capa app — **sin paquete `uuid`** (escalera §3).
- Tests usan IDs fijos (determinismo) + `randomUUID` solo donde se prueba colisión/unicidad.
- Sin `AUTOINCREMENT`: choca con portabilidad y semántica lógica de backup.
- IDs de posting = `{txid}:p{index}` (storage-interno, determinista).

## 5. Integer representation (DECIDED, con evidencia)

**Montos y ratios se almacenan como TEXT canónico** (`/^-?(0|[1-9]\d*)$/`, ratios `/^[1-9]\d*$/`).

Por qué no `INTEGER`: expo-sqlite devuelve INTEGER como `number` de JS — pérdida de precisión sobre 2⁵³. El driver de verificación (`node:sqlite`) podría leer enteros con exactitud, pero el driver de producción no; la representación debe ser exacta en **ambos**, luego TEXT. Verificado: máximo/mínimo int64, negativos, cero (rechazado como posting, válido como `Money`), valores > 2⁵³ exactos ida y vuelta (`9007199254740993`), columna cruda siempre `typeof === 'string'`. `REAL` prohibido por construcción (ningún monto pasa por float en ningún camino; la corrupción `5.5` se rechaza en lectura).

## 6. Date/time representation (DECIDED)

Fechas financieras y `rateAt` se almacenan **verbatim como TEXT**, sin conversión de zona horaria: `date` = `YYYY-MM-DD` validado por el dominio; `rateAt` = fecha o datetime ISO validado por el dominio. Sin `TIMESTAMP`, sin época Unix, sin "display timezone" en storage. No se inventó semántica temporal: el dominio no pedía timestamps y no se agregaron.

## 7. FK/constraint strategy

La DB protege **integridad estructural**, nunca semántica financiera:

- FK: `postings.transaction_id`, `conversions.transaction_id` (+ CASCADE), `postings.category_id` (restrictiva por defecto: impide colgar categorías referenciadas).
- Sin FK en `postings.account_id` (ver §2: cuentas sistema intrínsecas).
- CHECKs: enums (`type`, `kind`, `quote_direction`, `source`, `rounding_mode`, `archived`), longitudes > 0, `position >= 0`, unicidades (PKs + `(transaction_id, position)`).
- `PRAGMA foreign_keys = ON` por conexión, en ambos drivers, verificado por test.
- Lo que SQL **no** puede expresar (forma canónica completa de enteros, Σ=0, re-derivación, tipado de categorías) queda en el validador del dominio — por diseño (§2 del encargo). Probado: con FKs desactivadas a la fuerza, la lectura sigue fallando cerrada.

## 8. Migration strategy (DECIDED)

- `MIGRATIONS` = lista explícita `[{version, name, statements[]}]`; versión objetivo = `SCHEMA_VERSION` (hoy 3; la v2 agrega la tabla `budgets`, la v3 agrega `goals` + `goal_accounts`).
- `migrate(db, migrations = MIGRATIONS)`: valida orden/unicidad, rehúsa versiones futuras (`SCHEMA_VERSION_MISMATCH`), aplica cada migración pendiente en **su propia transacción** (DDL + bump de versión atómicos), falla cerrado en SQL roto (versión y datos intactos), idempotente.
- Sin `CREATE TABLE IF NOT EXISTS` como sistema; sin migraciones destructivas automáticas.
- Lista inyectable → tests cubren: fresh, idempotencia, upgrade aditivo v1→v2 sintético, fallo a mitad, mismatch de versión, valores corruptos de versión (`'abc'`, fila ausente, `'007'`).

## 9. Transaction boundaries

Escritura: `operación de dominio → assertTransaction(refs de la DB) → pre-chequeo de duplicados (códigos estables) → UNA transacción SQLite (tx + conversión + postings) → commit`. Lectura: `filas → chequeos canónicos → assertTransaction → dominio`. Sin escrituras SQL fuera del repositorio; la UI futura no tocará filas financieras (regla de arquitectura).

## 10. Corruption behavior (fail-closed, sin reparación silenciosa)

| Fallo | Comportamiento (testeado) |
|---|---|
| Monto no canónico (`'abc'`, `'007'`, `5.5` vía afinidad) | `CORRUPT_ROW` en lectura |
| Posting faltante / moneda cambiada / kind cambiado / fecha rota / categoría fantasma (con FKs desactivadas) | `INVALID_TRANSACTION` en lectura |
| Conversión alterada o borrada con bridges presentes | `INVALID_TRANSACTION` (re-derivación / regla 1:1) |
| `UPDATE` que viola CHECK/FK (tipo de cuenta, categoría colgada) | bloqueado por la DB, datos intactos |
| Migración rota / versión futura / versión corrupta | `*_MISMATCH`/`INVALID`, versión y datos intactos |
| Archivo basura como DB | error del driver al abrir (fail-closed) |
| Memo entero (`42`) | normalizado por afinidad TEXT a `'42'`, válido (comportamiento SQLite documentado, no corrupción) |

## 11. Testing strategy

Aislamiento total: `:memory:` por test + `close()` en `finally`; sin estado de máquina; sin red. Archivos ↔ matriz del encargo:

| Área | Archivo |
|---|---|
| Fresh DB, versión, tablas, constraints | `db-schema.test.ts` |
| CRUD, roundtrip de los 10 casos, duplicados, derivación de balances pre/post, determinismo cross-DB | `db-repository.test.ts` |
| Commit OK, rollback pre-validación, rollback en 1er/medio write (inyección `FailAfter`), rollback crudo, duplicado conserva estado | `db-atomicity.test.ts` |
| FK/CHECK/UNIQUE, batería de 10 corrupciones, bypass de FKs, afinidad TEXT | `db-integrity.test.ts` |
| Bordes int64, >2⁵³, negativos, cero, columna cruda TEXT | `db-precision.test.ts` |
| Fresh/idempotencia/mismatch/versión corrupta/fallo/upgrade | `db-migration.test.ts` |
| Separación dominio↔persistencia, imports permitidos, SQL sin interpolar, sin logs/red | `db-separation.test.ts` |

Derivación de balances (§15 del encargo): **sin agregación SQL**. Los tests reconstruyen transacciones validadas y derivan sumas por cuenta en el test, probando la equivalencia pre/post persistencia. Si un día se agrega SQL agregado por performance, su test de equivalencia contra el dominio ya tiene el patrón.

## 12. Security boundaries

- Solo queries parametrizadas (`?`); test estructural prohíbe `${` en literales SQL.
- Sin `console.*`, sin `fetch`/`WebSocket`/`child_process`, sin imports dinámicos en `src/` (tests estructurales).
- Sin valores financieros en logs: no hay logging en `src/`.
- Sin paths derivados de datos importados (DB `:memory:`/nombre fijo en tests; la ruta del archivo real será decisión de la app, no del dominio).
- Sin cifrado implementado (T-004/T-005 OPEN a propósito).

## 13. Backup boundary

El archivo SQLite **no** es el formato de backup. La exportación futura será: estado del dominio (objetos validados) → envelope versionado (`docs/DATA_FORMAT.md` §5, PROVISIONAL). Schema interno ≠ schema externo, por diseño.

## 14. Unresolved T-004 / T-005 / T-010

Intactos y OPEN. Esta fase no implementa SQLCipher, ni KDF, ni `.moneybackup` final, ni siquiera como "capacidad disponible".

## 15. T-021 status (PROVISIONAL — sin cambios)

- Evidencia nueva a favor: puerto `Db` mínimo definido; schema, migraciones y repositorio probados contra SQLite real (3.51.3); adapter `expo-sqlite.ts` escrito 1:1 contra el puerto (tipos ambientales, sin paquete instalado).
- Lo que sigue faltando (sin cambios): ejecución en runtime React Native — atomicidad real, comportamiento de bind de int64, migraciones en dispositivo y build F-Droid del proyecto real.
- Driver de verificación: `node:sqlite` (stdlib, cero dependencias), mismo SQL, mismo puerto. Decisión ambiental documentada, no cambio de stack: producción sigue siendo expo-sqlite.

## 16. Phase 2 gate criteria

- ✅ schema documentado (§2)
- ✅ migraciones deterministas (§8, testeadas §11)
- ✅ dominio sin dependencias nuevas (test estructural: imports relativos solo; persistencia solo depende de dominio + `node:sqlite`/`expo-sqlite`)
- ✅ precisión monetaria sobrevive roundtrip (§5, >2⁵³ exacto)
- ✅ transacciones financieras lógicas atómicas (commit/rollback probados incl. inyección)
- ✅ reconstrucción de lectura valida invariantes (batería de corrupción)
- ✅ corrupción fail-closed (§10)
- ✅ tests cubren atomicidad/integridad/migración/precisión (§11)
- ✅ cero decisiones de cifrado inventadas (§14)
- ✅ backup separado del storage (§13)
- ✅ T-019 honestamente pendiente (sin cambios; §15 + §23 del encargo)
