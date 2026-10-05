# MoneyFOSS — Phase 1 Adversarial Audit

**Fecha:** 2026-10-04 · **Alcance:** solo `src/domain/` + `tests/` (núcleo financiero puro). **Fuera de alcance por orden expresa:** Phase 2, SQLite, UI, crypto, T-004/T-005/T-010, evidencia de airplane-mode, cierre de T-019.

**Veredicto: PHASE 2 READY** — cero BLOCKER, cero issues financieros sin resolver. Justificación en §14.

---

## 1. Scope

Atacar el núcleo financiero intentando: aceptar transacciones inválidas como válidas, perder u ocultar dinero (redondeo silencioso, overflow, residuos), cruzar monedas sin tasa, clasificar flujos como lo que no son, y romper la decodificación del wire. Todo bypass real se clasifica (§11), se arregla con test, o bloquea la Fase 2.

## 2. Estado inicial verificado (no memoria: filesystem + git + runner)

| Pregunta | Evidencia |
|---|---|
| ¿Existe `docs/PHASE1_AUDIT.md`? | **No** (`Test-Path` → `False`; este archivo la crea) |
| ¿Cuántos tests existen? | **53** (`npm test` → `tests 53, pass 53, fail 0`, log previo al audit) |
| ¿Archivos modificados desde el checkpoint? | **Ninguno** (`git status` limpio, `git diff HEAD --stat` vacío) |
| ¿Commits creados desde el checkpoint? | **Ninguno** (HEAD = `e2459f2`, 5 commits totales) |
| ¿Cambios en `src/domain/` posteriores al overnight? | **Ninguno** |

## 3. Archivos auditados

`src/domain/errors.ts`, `currency.ts`, `money.ts`, `types.ts`, `validate.ts` (**modificado por este audit**), `operations.ts`, `serialize.ts`. Testigos: `tests/fixtures.ts`, `money/currency/validate/operations/conversion/serialize/property.test.ts` (**todos extendidos por este audit**).

## 4. Modelo financiero auditado

Candidato C (T-016): débito = positivo; Σ exacta por moneda = 0 por transacción (enteros int64, sin tolerancia); cuentas ASSET/LIABILITY/EQUITY mono-moneda; `sys:income`/`sys:expense` multi-moneda con categoría obligatoriamente tipada; conversión = 2 bridges sobre `sys:fx:<CUR>` + registro `Conversion` (re-derivable desde `rateRatio + modo`); dinero = `bigint` con rango int64; wire = strings de enteros canónicos.

## 5. Matriz de 10 casos — docs vs implementación vs tests

Revalidación posting por posting contra §30.3. "Orden doc" = orden listado en la tabla; el balance es independiente del orden (§30.6.10).

| # | §30.3 canónico | Builder (postings en orden) | Test | Resultado |
|---|---|---|---|---|
| 1 | `[Bank −1.000.000][sys:expense +1.000.000 cat=Food]` | idéntico | `operations.test.ts` "case 1" | ✅ exacto |
| 2 | `[Bank +10.000.000][sys:income −10.000.000 cat=Salary]` | idéntico | "case 2" | ✅ exacto |
| 3 | `[Cash −500.000][Bank +500.000]`, sin categoría | idéntico | "case 3" | ✅ exacto |
| 4 | `[Bank:USD −2.000][sys:expense +2.000]` | idéntico | "case 4" | ✅ exacto |
| 5 | `[Bank:USD +50.000][sys:income −50.000]` | idéntico | "case 5" | ✅ exacto |
| 6 | `[sys:expense +1.000.000][Card −1.000.000]` | **orden invertido:** `[Card −1.000.000][sys:expense +1.000.000]` | "case 6" | ⚠️ solo orden → NOTE C1 |
| 7 | `[Bank −1.000.000][Card +1.000.000]`, sin categoría | idéntico | "case 7" | ✅ exacto |
| 8 | `[Bank:ARS −10.000.000][fx:ARS +10.000.000][fx:USD −8.475][Bank:USD +8.475]` + `Conversion{1180, 1180/1, srcPerDest}` | idéntico | "case 8" | ✅ exacto |
| 9 | `[sys:expense +1.000.000][fx:ARS −1.000.000][fx:USD +847][Bank:USD −847]` | idéntico | "case 9" | ✅ exacto |
| 10 | `[Bank:ARS −10.000.000][sys:expense +50.000 Fees][fx:ARS +9.950.000][fx:USD −8.432][Bank:USD +8.432]` | idéntico | "case 10" | ✅ exacto |

Montos destino verificados por derivación independiente: `10.000.000/1180 → 8475`, `1.000.000/1180 → 847`, `9.950.000/1180 → 8432` (half-away). **Cero diferencias financieras.**

## 6. Money — hallazgos y cobertura

Cobertura previa: parse/format/rango/división/ratios. Faltaba y se agregó:

- **Cero:** `money(0n)` construye; `parseMoney('-0.00')` → `0n` → formatea `'0.00'`; posting con `0n` sigue rechazado (test previo, referenciado).
- **Negativos:** parseo y `convertMinor(-1.000.000,…,1/1180) = −847` exactos.
- **int64 max/min:** construcción en ambos bordes (previo); **nuevo:** `addMoney(MAX,1)` y `subMoney(MIN,1)` → `AMOUNT_OUT_OF_INT64_RANGE`; `±0` en el borde acepta.
- **Multiplicación:** no existe `multiplyMoney` (diseño: el único camino multiplicativo es `convertMinor`, con rango impuesto en el posting). **Nuevo:** overflow vía tasa extrema → `INVALID_TRANSACTION` (ver §7).
- **División/empates más allá de 2⁵³:** `(2⁵³+1)/2` → half-even `4503599627370496`, half-away `4503599627370497`, con signos — prueba que el `bigint` no hereda el redondeo de `Number`.
- **Serialización/malformados:** roundtrip y rechazos ya cubiertos; sin cambios.

Resultado: sin bugs en `money.ts`. Comportamiento de overflow = **explícito y fail-closed** en construcción, suma, resta y frontera de posting.

## 7. Currency / conversion — hallazgos y cobertura

Cobertura previa: direcciones, modos, fee en origen/destino, degenerada. Faltaba y se agregó (todo vía `exchange()`, camino real):

- **Same currency:** `exchange()` misma moneda → `SAME_CURRENCY_EXCHANGE` (previo); `transfer()` cross-currency → rechazado (previo).
- **Exacta:** tasa `'1'` → destino idéntico al origen (nuevo).
- **Residuo:** 8475/847/8432 (previo, §5).
- **Reversa:** USD→ARS con `destPerSrc '1180'`: `8475 USD → 10.000.500 ARS` (nuevo). Durante el audit la expectativa inicial del test asumió signo `+` en el bridge `fx:ARS`; el código devuelve `−10.000.500` porque **en `exchange()` el bridge del lado destino siempre es negativo y el del lado origen positivo** (en `expense` con tasa es al revés: lo fija el flujo de valor, §30.3 casos 8 vs 9). No es bug: la invariante rige sobre valores absolutos + Σ=0, y ambas direcciones validan. Se corrigió la expectativa y quedó como prueba de la convención de signos en ambas direcciones (NOTE T1, ver §11).
- **Fee:** origen, destino e igualdad con el monto (`FEE_EXCEEDS_AMOUNT` en `==`, nuevo el caso destino).
- **Zero rate:** `'0'`, `'0.00'`, `'00.000'` → `RATE_MUST_BE_POSITIVE` (nuevo).
- **Negative rate:** `'-5'` → `INVALID_RATE_FORMAT` (nuevo).
- **Extreme rate:** texto de 33 caracteres → `RATE_TEXT_TOO_LONG` (nuevo a nivel operación); tasa de 32 nueves `destPerSrc` × 10¹² → destino ≈ 10⁴⁴ → `INVALID_TRANSACTION` por rango int64 (nuevo); la misma tasa `srcPerDest` → destino 0 → `DEGENERATE_CONVERSION`, nunca silencio (nuevo).
- **Determinismo:** mismas entradas → transacciones `deepEqual` (nuevo).

Resultado: semántica de conversión **probada en ambas direcciones, modos, fees, bordes y overflow**.

## 8. Candidate C — hallazgos

- 9/10 casos idénticos en contenido y orden; caso 6 difiere solo en orden (NOTE C1, §11).
- Regla 6 (§30.1) verificada ejecutablemente: pago mixto ARS+USD sin tasa balancea moneda por moneda sin `Conversion` (test previo, revalidado).
- No-conflación (§30.4) atacada: transferencia con categoría, pago de tarjeta como gasto, categoría en bridge, bridge en cuenta de valor, normal en cuenta FX — todo rechazado con mensaje específico (tests previos + 2 nuevos: bridge en `sys:expense`, categoría en transferencia).

## 9. AccountType — hallazgos

| Ataque | Resultado |
|---|---|
| ASSET con saldo negativo (overdraft) | **Aceptado** — la suficiencia no es regla del ledger; queda documentado como responsabilidad de capas superiores (test nuevo lo fija) |
| LIABILITY sobrepagada | Aceptada por la misma razón (semántica de `transfer`) |
| Transferencia genérica ASSET→LIABILITY sin wrapper `cardPayment` | **Aceptada** — `transfer()` es movimiento genérico; `cardPayment` añade el assertion de tipos (test nuevo lo fija) |
| Cuenta de usuario tipo INCOME/EXPENSE | Imposible por tipos (`AccountType` = ASSET\|LIABILITY\|EQUITY); **nuevo:** refs corruptos con `type` basura ahora rechazados (fix V4) |
| EQUITY / opening balance | Expresable vía `buildTransaction` (`[Bank +][opening −]`), validado (test nuevo) |
| Compra/pago con tarjeta | Casos 6/7 exactos + assertion `LIABILITY` en wrappers (previo) |

## 10. Validator — hallazgos (con fix)

Todos los caminos de aceptación pasan por `assertTransaction`: los 6 builders vía `finish()`, `buildTransaction`, `fromWire`. `findTransactionProblems` es de solo lectura. Ataques ejecutados:

- **V1 — MAJOR (fixed):** `conversion: null` (cast) → `TypeError` en `conv.fromCurrency` en vez de `DomainError`. Fail-closed pero sucio. Fix: guarda de objeto con problema explícito + test.
- **V2 — MAJOR (fixed):** posting `null` en el array (cast) → `TypeError` en `posting.accountId` y en el filtro de bridges. Fix: guarda por posting + filtro defensivo + test.
- **V3 — MINOR (fixed):** `findTransactionProblems(null)` → `TypeError`. Ahora lanza `INVALID_TRANSACTION` ("transaction must be an object") + test.
- **V4 — MINOR (fixed):** `account.type` de refs nunca se chequeaba; un registro corrupto con tipo inexistente se trataba como cuenta de valor. Ahora se exige ASSET\|LIABILITY\|EQUITY + test (detección de corrupción, §24.12).
- Sin bypass silencioso encontrado: montos como `number`/`string` (cast) → "must be an integer bigint" (nuevo); `kind` inválido, monedas desconocidas/minúsculas (`'ars'` → unknown, nuevo), categorías cruzadas, bridges 1/3, `Conversion` sin bridges y viceversa, `rateText`≠`rateRatio`, re-derivación alterada — todo rechazado (previo + nuevo).
- `assert`s no-nulos (`!`) y `as never` en `src/`: auditados a mano — `CURRENCIES[code]!` tras `hasOwnProperty`, grupos de regex obligatorios tras `exec` exitoso. Seguros.
- Límites aceptados y documentados: `refs` corruptos más allá de `type` (responsabilidad de la capa que los construye); `stableStringify` con `bigint` lanza `TypeError` (ruidoso, correcto: nunca serializa silenciosamente mal); fechas año `0000–0099` rechazadas por conservadurismo de `Date.UTC` (documentado, no financiero).

## 11. Wire — hallazgos

Cobertura previa: roundtrip, `>2⁵³`, strings no canónicos, estructura/enums, semántica básica. Nuevo en este audit:

- Moneda inválida (`'XXX'`) que pasa estructura → `INVALID_TRANSACTION` por semántica.
- **Tamper que preserva Σ pero rompe re-derivación** (`fx:USD −8432→−8433` y `bank-usd +8432→+8433`): Σ sigue 0 en ambas monedas, el validador lo rechaza por "does not re-derive". Este es el ataque que justifica guardar `rateRatio + modo`.
- `id` de 129 caracteres y `conversion: undefined` explícito con bridges → `INVALID_TRANSACTION`.
- **Límite documentado con test:** el mismo `id` decodifica dos veces sin queja — la unicidad de IDs es deber del repositorio de Fase 2, no del wire.

## 12. Property tests — veredicto de cobertura

Los 53 tests previos **no eran triviales** (asserts exactos de postings, mensajes y códigos), pero tenían huecos reales en bordes: overflow de suma/resta, tasas cero/negativas/extremas, reversa, 1:1 exacta, tipos corruptos, no-objetos, pares en el borde int64. Todos cubiertos ahora. Nuevo property: pares en bordes int64 (`MAX`, `MAX−1`, `MAX−1000`, `2⁶²`) validan **iff** balanceados; deriva de 1 minor unit siempre detectada; montos fuera de rango rechazados aunque las sumas "cancelarían". Generadores sembrados → deterministas.

## 13. Seguridad

- `grep` en `src/` + `tests/`: 0 hits de `eval`, `new Function`, `child_process`, `fetch`, `XMLHttpRequest`, `WebSocket`, `require(`, `process.env`, `http` (re-ejecutado en este audit).
- Deps runtime: 0. `npm audit`: 0 vulnerabilidades (instalación del overnight, sin cambios desde entonces).
- Sin telemetría, sin red, sin `Number` para dinero (un `Number` residual: parsing de fechas en `validate.ts` — fechas, no dinero; fuera de P-07).

## 14. Clasificación de severidad y estado

**BLOCKER** = dinero incorrecto/aceptación inválida sin resolver. **MAJOR** = fail-closed sucio o hueco de validación, con fix. **MINOR** = robustez/detección de corrupción, con fix. **NOTE** = observación sin acción.

| ID | Severidad | Estado |
|---|---|---|
| V1 `conversion` no-objeto | MAJOR | ✅ fixed + test |
| V2 postings no-objeto | MAJOR | ✅ fixed + test |
| V3 tx nula | MINOR | ✅ fixed + test |
| V4 `account.type` sin chequear | MINOR | ✅ fixed + test |
| T1 signo de bridge en reversa (expectativa del test) | NOTE | ✅ test corregido, convención probada |
| C1 orden del caso 6 doc vs builder | NOTE | Sin acción (orden irrelevante por §30.6.10) |
| T-019 runtime airplane-mode | Fuera de alcance | Pendiente del gate con emulador (sin cambios) |

**Issues financieros sin resolver: 0. BLOCKERs: 0.**

## 15. Números del audit (concretos)

- Tests antes: **53** (53 pass, 0 fail).
- Tests agregados: **24** → money +4, conversion +6, operations +5, validate +4, serialize +4, property +1.
- Tests después: **77** (`npm test` → `tests 77, pass 77, fail 0`, exit 0).
- Typecheck: `npm run typecheck` → exit 0 (strict + `erasableSyntaxOnly`).
- Archivos cambiados: `src/domain/validate.ts` (4 guardas, +~20 líneas), 6 archivos de tests.
- Hallazgos descubiertos: 6 (V1–V4, T1, C1). Arreglados: 4 (+1 expectativa de test). Restantes: 0 (2 NOTEs sin acción requerida).

## 16. Gate de Fase 2

- ✅ zero BLOCKER
- ✅ zero unresolved financial correctness issue
- ✅ overflow behavior explicit (construcción, suma, resta, posting, conversión extrema)
- ✅ conversion semantics proven (ambas direcciones, modos, fees, residuo, reversa, degenerada)
- ✅ validator boundaries proven (constructores, deserialización, casts, no-objetos, tipos corruptos, rutas de conversión)
- ✅ wire boundaries proven (campos, tipos, monedas, montos, duplicados, tamper con Σ intacta, canonicalización)
- ✅ 10 canonical cases consistent across docs/code/tests (1 diferencia cosmética de orden, registrada)

**FASE 2 READY** — el gate técnico está pasado. No se empezó Phase 2, no se tocó T-004/T-005/T-010, no se inventó evidencia de runtime. Siguen pendientes del usuario: licencia (T-009), decisiones de cifrado/backup (T-004/T-005/T-010) y la autorización explícita de Fase 2.
