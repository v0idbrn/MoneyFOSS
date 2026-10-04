# MoneyFOSS — Overnight Report

**Fecha:** 2026-10-04 · **Alcance:** misión autónoma de una noche — cierre de bloqueos de Fase 0, git init, Fase 1 (núcleo financiero puro), contrato de backup, reporte. **Resultado:** cumplido, con las excepciones honestas de §11–§14.

---

## 1. Resumen ejecutivo

- Los tres bloqueos técnicos de Fase 0 quedaron **cerrados con evidencia**: T-008 (regla de balanceo multicurrency → Candidato C, DECIDED), T-007 (redondeo → requisitos DECIDED / método PROVISIONAL / dos restos OPEN), T-002 (APK sin `INTERNET` → mecanismo PROBADO, PROVISIONAL con runtime pendiente del gate).
- El repo pasó de "solo docs" a **git versionado con5 commits**, núcleo de dominio implementado y **53 tests verdes** + typecheck estricto.
- Se cerraron además T-001 (stack RN/Expo → DECIDED, T-020), T-006 (int64 → DECIDED, T-018), se avanzó T-003 (expo-sqlite → PROVISIONAL, T-021) y se abrió el registro de dependencias (T-022, DECIDED).
- Nada de UI, nada de DB, nada de red, cero dependencias runtime, cero invenciones de requisitos.

## 2. Gate de entrada a Fase 1 — cumplido

| Criterio del prompt de misión | Estado | Evidencia |
|---|---|---|
| Semántica financiera congelada (T-008) | ✅ | PHASE0_REPORT §30 + DECISIONS T-016 (walkthrough de 10 casos contra 3 candidatos) |
| Redondeo suficientemente definido (T-007) | ✅ | PHASE0_REPORT §31 + T-017 |
| Stack viable con evidencia (T-001/T-002) | ✅ | evidence/T002_EVIDENCE.md + T-019/T-020 |
| Persistencia con dirección clara (T-003) | ✅ (PROVISIONAL) | T-021 (expo-sqlite; spike de integración = Fase 2) |
| Sin requisitos financieros inventados | ✅ | todo lo ambiguo quedó marcado OPEN (§16) |

## 3. Limpieza y corrección de la documentación de Fase 0

- Referencias viejas P-01…P-12 → P-01…P-13 normalizadas (17 apariciones).
- Checklist canónico de 10 casos unificado (§8 ahora apunta a §30; el listado viejo de §8 quedó marcado como supersedido).
- Claims de ISO 4217 degradados de "FACT" a la graduación correcta (FACT = el estándar existe; INTERPRETATION = exponentes, con sus dos fuentes secundarias y fecha de consulta).
- §29 marcado con el puntero del spike; nuevas secciones §30 (walkthrough completo), §31 (redondeo), §32 (spike T-002/T-001/T-003 + gate de release §32.4).
- Corrección de una etiqueta invertida en la celda del caso 8 (`quoteDirection`): la sustancia (`rateRatio 1180/1`, destino `8475`) no cambia; la definición canónica quedó escrita en §30.3 y en `docs/DATA_FORMAT.md` §2.3.

## 4. T-008 cerrado — Candidato C (T-016, DECIDED)

Regla congelada: convención contable clásica (débito = positivo) + **Σ exacta por moneda = 0 en cada transacción** (enteros, sin tolerancia) + conversión = par de postings `bridge` sobre `sys:fx:<CUR>` + registro `Conversion` (1:1 con los bridges) + categoría solo en postings de `sys:income`/`sys:expense`.

Evidencia decisiva: los candidatos A y B fallan en los casos 8–10 con la propia tasa del usuario — A deja residuos de **+500, +540, −240 minor units** (invariante difusa o ajuste fantasma, ambos prohibidos por P-06); B puro no puede representar la conversión. C cierra con igualdades exactas en los 10 casos. Tabla completa de 15 criterios: §30.5.

## 5. T-007 cerrado (T-017 — estatus mixto)

- **DECIDED:** enteros solamente; parseo estricto (exceso de decimales = rechazo, nunca redondeo); derivar-una-vez → almacenar ambos enteros → registrar el modo; derivados nunca se escriben de vuelta; una única división con modo (`deriveMinorUnits`), testeada en empates.
- **PROVISIONAL:** modo por defecto `half-away-from-zero` (se almacena por operación, es conmutable).
- **OPEN acotados:** resto de cuotas (feature post-MVP) y UX del resto en splits (Fase 3).

## 6. Spike T-002 / T-001 / T-003 (§32, evidence/T002_EVIDENCE.md)

- **PROBADO:** APK release de 68 MB **sin** `INTERNET` (matriz A/B/C con `tools:node="remove"`); declarantes exactos = plantilla prebuild + `expo-file-system` 57.0.7 (merger blame); `react-android`/`hermes-android` NO lo declaran; dex contiene okhttp3/expo-fetch (R8 off → gate); reproducible bit-a-bit en la misma máquina (SHA256 registrado).
- **CONTRADICIDO:** "react-android declara INTERNET".
- **NO PROBADO:** arranque en airplane mode (sin dispositivo en el entorno) → es la evidencia que le falta a T-019 para ser DECIDED; queda como checkbox del gate §32.4.
- **Decisiones:** T-020 = RN + Expo SDK 57 CNG (DECIDED); T-021 = expo-sqlite (PROVISIONAL).

## 7. Git

Repo inicializado; identidad global del usuario respetada (sin overrides). Commits:

1. `0548ebd` chore: initialize repository with gitignore and agent governance
2. `6739a57` docs: phase 0 closure — cleanup, T-008/T-007 semantics, T-002 spike, stack decisions
3. `117875d` feat: pure financial domain core (Fase 1)
4. `a014bac` test: ledger invariants, 10-case walkthrough, wire roundtrip, property checks
5. (docs: backup contract, architecture, decisions, this report)

APKs y el spike nunca entraron al repo (`.gitignore` + spike en directorio temporal).

## 8. Fase 1 — núcleo financiero implementado

`src/domain/` (cero dependencias runtime, cero I/O, sin `Date.now()`, sin `Number` para dinero):

- `money.ts` — `bigint` int64 con `assertInt64`, parseo estricto por exponente de moneda, `deriveMinorUnits` (única división con modo: half-away/half-even/truncate), `convertMinor`, `parseRatio` reducido.
- `currency.ts` — snapshot offline ARS/USD/EUR/CLP/JPY/KWD (2/2/2/0/0/3).
- `types.ts` — esquema T-016; cuentas sistema `sys:income`/`sys:expense`/`sys:fx:<CUR>`; re-derivación de conversiones.
- `validate.ts` — **único punto de validación**: Σ por moneda = 0 exacta, bridge ⇔ Conversion, categoría prohibida en cuentas de valor, moneda mono-moneda en cuentas de valor, re-derivación de toda conversión desde `rateRatio + modo`, fechas/ids/int64/range.
- `operations.ts` — `expense` (con `rate` opcional para pagar en otra moneda), `income`, `transfer`, `cardPurchase`, `cardPayment`, `exchange` (con `fee` en moneda origen o destino), `buildTransaction` (pagos mixtos multi-moneda sin tasa). Guardas con error explícito: cross-currency sin tasa, rate redundante, cuenta equivocada, conversión degenerada a 0, fee que iguala o excede el monto.
- `serialize.ts` — wire estricto (importes como strings de enteros canónicos, campos desconocidos rechazados) + `stableStringify` (JSON canónico con claves ordenadas).

## 9. Verificación

```powershell
npm test          # 53/53 pass, 0 fail (node --test "tests/*.test.ts")
npm run typecheck # tsc --noEmit, exit 0 (strict + erasableSyntaxOnly)
```

- **Walkthrough de los 10 casos** con postings exactos: destino de conversión **8475** (100.000,00 ARS @1180), **847** (10.000,00 ARS desde cuenta USD), **8432** (neto 99.500,00 tras comisión 500,00 ARS); fee en USD también balancea (−8475/+8432/+43).
- **Invariantes:** property test con generador sembrado — 500 operaciones aleatorias válidas todas balancean Σ=0 por moneda (chequeo independiente del validador); toda perturbación de 1 minor unit en 100 transacciones es detectada; 300 roundtrips parse/format aleatorios.
- **Trust boundary del wire:** `007`, `1.5`, `-0`, `0x`, campos desconocidos, ratios `0`/negativos/con cero a la izquierda, montos fuera de int64 → todos rechazados con código.
- **Modos de redondeo:** half-away vs half-even divergen exactamente donde deben (500000,5 → 500001 vs 500000) y el modo queda almacenado por conversión.

## 10. Decisiones cerradas/avanzadas esta sesión

| Entrada | Tema | Estado |
|---|---|---|
| T-016 | T-008 balanceo multicurrency (Candidato C) | DECIDED |
| T-017 | T-007 redondeo (mixto: DECIDED/PROVISIONAL/OPEN) | mixto |
| T-019 | T-002 permiso INTERNET (mecanismo probado) | PROVISIONAL |
| T-020 | T-001 stack RN + Expo CNG | DECIDED |
| T-021 | T-003 persistencia expo-sqlite | PROVISIONAL |
| T-018 | T-006 dinero int64 (evidencia: Fase 1 + tests) | DECIDED |
| T-022 | registro de dependencias (0 runtime, 2 dev) | DECIDED |

## 11. Gate de release §32.4 — estado

| # | Check | Estado hoy |
|---|---|---|
| 1 | APK sin `INTERNET` verificable con apkanalyzer | mecanismo probado (T-019); automatizar en CI |
| 2 | `allowBackup="false"` | ❌ hoy `true` → config Expo en Fase 2 |
| 3 | Sin deep links/exported salvo LAUNCHER | ✅ en spike |
| 4 | Sin cleartext | ✅ en spike |
| 5 | Purgar `READ/WRITE_EXTERNAL_STORAGE`, `SYSTEM_ALERT_WINDOW` | ❌ pendiente |
| 6 | R8/minify en release (dev-support networking) | ❌ pendiente |
| 7 | Pruebas en airplane mode | ❌ **pendiente, requiere emulador/dispositivo** |
| 8 | SBOM + scan dex de APIs de red | ❌ pendiente |
| 9 | Permisos declarados en DECISIONS | ⏳ con T-022 empezado |

## 12. Contrato de backup

`docs/DATA_FORMAT.md`: wire de transacción **DECIDED** (implementado y testeado, con ejemplos y semántica de `quoteDirection`); envelope `.moneybackup` **PROVISIONAL** — el contenido deriva del dominio (cuentas, categorías, transacciones en wire), pero **no se inventó** cifrado, KDF, checksum ni política de versionado: esos son T-010 y T-005, ambos OPEN. Regla ya congelada: restore por el mismo validador, commit atómico.

## 13. Barrido de seguridad de esta sesión

- `grep` en `src/` y `tests/`: **0 hits** de `eval`, `new Function`, `child_process`, `fetch`, `XMLHttpRequest`, `WebSocket`, `require(`, `process.env`.
- Dependencias runtime: **0**. Dev: `typescript` + `@types/node`, justificadas en T-022. `npm audit`: 0 vulnerabilidades (2026-10-04).
- Sin telemetría, sin analytics, sin backend, sin permisos, sin código de red.

## 14. Limitaciones honestas

1. **Runtime sin permiso de red no probado** (sin emulador/dispositivo) — bloquea la promoción de T-019 a DECIDED, no el uso del repo.
2. Reproducibilidad de build solo probada en la misma máquina.
3. La Fase 1 NO incluye: UI, DB, migraciones, import/export de archivos, presupuestos, recurrencias, apertura de saldos (mecanismo Equity), cifrado. Todo eso es Fase 2+.
4. Formateo "según locale" del §9: el dominio expone `formatMoney` canónico (`1234.56`); la localización de display es trabajo de UI (Fase 2), y el parseo ambiguo sigue prohibido.
5. El envelope de backup en DATA_FORMAT es un esqueleto marcado PROVISIONAL: tratarlo como especificación final sería inventar requisitos.

## 15. Qué NO se hizo (y por qué)

- Sin nuevas features "porque otras apps las tienen" (AGENTS §1).
- Sin dependencias nuevas: la escalera §3 resolvió tests (node:test) y tipos (tsc) sin frameworks.
- Sin decidir T-004 (cifrado DB), T-005 (KDF backup), T-009 (licencia), T-010 (schema exacto de backup), T-014 (inflación): todos requieren evidencia o elección del usuario que no existe todavía.
- Sin spike de autenticación/keystore (app lock T-013): no estaba en el alcance de la noche.

## 16. Pendientes de decisión del usuario

1. **T-009 licencia** (PROVISIONAL en §19 del reporte) — necesaria antes de publicar.
2. **T-004 cifrado de DB en el MVP** — abre/threshold del threat model.
3. **T-005 KDF/primitiva de backup** — auditoría de libs offline del stack.
4. **T-010 schema exacto de `.moneybackup`** — ya hay sitio para decidirlo (DATA_FORMAT §5).
5. **Categorías jerárquicas o planas** — decisión UX, no antes de un prototipo.
6. Iniciar Fase 2 (criterio de aceptación de Fase 0 en PHASE0_REPORT §F) — requiere autorización explícita (AGENTS §7).

## 17. Próximos pasos recomendados

1. Empaquetado de Fase 2: shell Expo (CNG), config de release con los checks §32.4 (allowBackup, R8, purga de permisos), gate de manifest en CI.
2. Integración expo-sqlite (T-021): bind int64 sin Number, transacciones atómicas con rollback, migraciones versionadas — spike que promueve T-021 a DECIDED.
3. Repositorio sobre el dominio existente (el validador es el único camino de escritura) + round-trip de backup según DATA_FORMAT cuando T-010 se decida.
4. Emulador Android para el check7 del gate (airplane mode).

## 18. Anexo — comandos reproducibles

```powershell
git log --oneline                       # 5 commits de la sesión
npm ci && npm test                      # 53/53
npm run typecheck                       # exit 0
# evidencia del spike (fuera del repo):
#   docs/evidence/T002_EVIDENCE.md      # matriz A/B/C, blame, SHA256, apkanalyzer
```

**Estado final:** Fase 0 cerrada con evidencia; Fase 1 (dominio puro) implementada y verificada; reporte, decisiones y arquitectura al día; siguiente puerta = autorización de Fase 2 por el usuario.
