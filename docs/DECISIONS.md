# MoneyFOSS — Decisiones (registro append-only)

**Regla:** este archivo es append-only. Nunca reescribir una entrada existente. Para cambiar una decisión se añade una entrada nueva con ID mayor que cita a la anterior y declara `SUPERSEDES` o `SUPERSEDED-BY`. Cada entrada tiene estatus: `DECIDED`, `PROVISIONAL` u `OPEN`.

**Convención de estatus** (definida en [AGENTS.md](../AGENTS.md)):

- `DECIDED` — fuente primaria verificable, spike reproducible, o principio de producto ratificado por el usuario.
- `PROVISIONAL` — recomendación con evidencia parcial; la entrada nombra qué evidencia falta.
- `OPEN` — sin recomendación; la entrada nombra la pregunta exacta y qué spike/investigación la resolvería.

Fecha de las entradas iniciales: **2026-09-29**. Fuente de ratificación de los principios: prompt de Fase 0 del usuario (producto definido en §1–§2 del informe).

---

## Parte A — Principios de producto (DECIDED)

Ratificados por el usuario como definición de producto. No son decisiones técnicas: son la constitución del proyecto. Un agente no puede proponer su reversión.

| ID | Principio | Estado |
|----|-----------|--------|
| P-01 | Offline-first / local-first real: la app funciona 100% sin red. | DECIDED |
| P-02 | Sin cuenta obligatoria, sin backend obligatorio, sin cloud obligatorio. | DECIDED |
| P-03 | Sin telemetría, sin analytics de usuario, sin publicidad, sin venta de datos. | DECIDED |
| P-04 | Sin operaciones financieras reales: registro + organización + análisis descriptivo. MoneyFOSS no mueve dinero. | DECIDED |
| P-05 | Datos bajo control del usuario; formatos portables; export/backup sin lock-in. | DECIDED |
| P-06 | Ledger como única fuente de verdad; balances derivados, nunca segunda fuente misteriosa. | DECIDED |
| P-07 | Representación monetaria entera (minor units). Floating point prohibido para dinero. | DECIDED |
| P-08 | Toda importación es untrusted input; pipeline de validación con confirmación del usuario y commit atómico. | DECIDED |
| P-09 | Backups lógicos, versionados y portables; SQLite nunca es el formato público de backup. | DECIDED |
| P-10 | Decisiones append-only (este archivo). | DECIDED |
| P-11 | Sin feature creep durante el MVP; cambios de scope solo con justificación escrita. | DECIDED |
| P-12 | Android-first; sin dependencia obligatoria de Google Play ni de Google Play Services. | DECIDED |
| P-13 | Inmutabilidad del registro original para análisis económico: la transacción original nunca se modifica para introducir valor real; todo análisis económico (p. ej. inflación) es vista derivada sobre datos nominales. | DECIDED |

## Parte B — Registro técnico

Cada entrada lista opciones, trade-offs y la evidencia que falta. Ninguna decisión técnica está congelada en Fase 0.

---

### T-001 — Stack de UI: React Native + Expo CNG vs Kotlin + Compose nativo

- **Estado:** PROVISIONAL (RN/Expo como candidato); Kotlin+Compose como alternativa documentada. No hay decisión.
- **Contexto:** hipótesis original del usuario: RN + Expo Development Build / CNG + TypeScript. Riesgo específico de este proyecto: la cadena de permisos (`INTERNET`) viene de los manifests nativos de las librerías; el requisito P-01 puede conflictuar con ella.
- **Opciones:** (a) RN + Expo CNG; (b) Kotlin + Jetpack Compose nativo.
- **Trade-offs:** (a) ecosistema JS, CNG genera el proyecto Android; un solo lenguaje en todo el repo, pero superficie de dependencias mayor y control menos directo del manifest final. (b) control nativo total del manifest y del ciclo de vida, sin puente JS, pero todo el desarrollo es Android (sin camino inmediato a iOS/desktop) y el core en TypeScript de la hipótesis se reemplaza por Kotlin.
- **Evidencia requerida para DECIDED:** resultado del spike T-002 (INTERNET) + decisión explícita del usuario. El informe (§12) lista las preguntas exactas del spike.

### T-002 — Permiso `android.permission.INTERNET` en el APK final

- **Estado:** OPEN. Pregunta exacta: *"¿Puede el APK release de una app RN/Expo carecer legítimamente de `INTERNET` sin romper el runtime, y cómo se verifica automáticamente?"*
- **Estado del conocimiento:** el merger de manifests combina app + variantes + librerías con prioridad al manifest del módulo app; `tools:node="remove"` en el manifest de mayor prioridad elimina elementos de menor prioridad [FACT, Android Developers, "Manage manifest files", developer.android.com/build/manage-manifests, consultado 2026-09-29]. Que la plantilla/main de RN declara `INTERNET` es INTERPRETATION no verificada en esta fase (los fetch de la plantilla devolvieron 404) — identificar el nodo exacto que la declara es la primera pregunta del spike.
- **Lo que falta:** (1) identificar en el spike qué nodo exacto declara `INTERNET` en la versión elegida (ReactAndroid vs Expo modules vs otra dependencia); (2) confirmar con AAB/apkanalyzer que el elemento desaparece del manifest final; (3) probar runtime sin red y sin permiso: crash de capa nativa, intent fallback, etc.; (4) definir el release gate automático.
- **Spike definido:** ver PHASE0_REPORT §12.4 (solo se ejecuta con autorización del usuario).

### T-003 — Implementación de persistencia: expo-sqlite / op-sqlite / WatermelonDB / otra

- **Estado:** OPEN (comparación hecha, decisión condicionada a T-001 y T-002).
- **Contexto:** WatermelonDB es un framework reactivo orientado a sync contra backend propio [FACT, README de Nozbe/WatermelonDB, consultado 2026-09-29]; MoneyFOSS no tiene backend (P-02), lo que hace su sync principal un coste sin beneficio actual. expo-sqlite provee acceso directo a SQLite y ya empaqueta SQLite3 y SQLCipher como fuentes vendorizadas [FACT, README de expo/expo packages/expo-sqlite, consultado 2026-09-29]. op-sqlite (MIT) es un driver JSI con SQLCipher opcional como target de compilación [FACT, README de OP-Engineering/op-sqlite, consultado 2026-09-29].
- **Trade-offs:** ver PHASE0_REPORT §12. Resumen: el dominio financiero debe aislarse detrás de una interfaz propia (puerto) para que la elección no se filtre al core; PERO sin sobre-abstracción (una sola implementación mientras no haya segunda).
- **Evidencia requerida para DECIDED:** T-001/T-002 resueltos + criterios del §12 (licencia, migraciones, cifrado posterior, build F-Droid, mantenimiento) aplicados a la versión concreta elegida.

### T-004 — Cifrado de la base de datos (SQLCipher u otro) en el MVP

- **Estado:** OPEN. La hipótesis original (diferirlo) es solo eso: una hipótesis que el threat model debe confirmar o refutar.
- **Contexto:** el análisis preliminar (PHASE0_REPORT §15) muestra que la DB encryption no protege contra el escenario "dispositivo desbloqueado en manos de otra persona" si la app abre la DB, pero sí contra "copia de la DB exfiltrada" (malware con acceso a archivos, backup del sistema, root). La decisión depende de qué riesgos residuales acepte el usuario en el threat model.
- **Evidencia requerida para DECIDED:** threat model (§14) cerrado con el usuario; verificación de coste (tamaño, rendimiento) de la opción elegida si se adopta (expo-sqlite ya vendoriza SQLCipher — FACT citado en T-003 — lo que reduciría el coste de adopción).

### T-005 — Primitiva de cifrado de backups opcionales

- **Estado:** OPEN.
- **Restricciones heredadas (no negociables):** sin dependencias que introduzcan red; algoritmo recomendado por la plataforma: AES-256-GCM, SHA-2, HMAC-SHA-256 [FACT, Android Developers — "Cryptography", developer.android.com/privacy-and-security/cryptography, consultado 2026-09-29]; KDF moderno para passphrases (familia argon2/bcrypt/scrypt o PBKDF2 con parámetros altos — la elección exacta es parte de esta decisión); todo el stack debe funcionar offline.
- **Evidencia requerida para DECIDED:** auditoría de qué librería concreta implementa el KDF elegido dentro del stack (JS/RN o nativa), su licencia, y que su uso es puramente local; decisión de recovery keys (qué ocurre si se pierde la passphrase) documentada en el threat model.

### T-006 — Representación exacta de dinero

- **Estado:** PROVISIONAL.
- **Recomendación:** enteros int64 en minor units + exponente (precisión) tomado de una tabla embebida offline derivada de ISO 4217. El principio P-07 (enteros, nunca float) ya está congelado; lo PROVISIONAL aquí es la representación exacta (int64 vs bigint arbitrario, exponente fijo por moneda vs campo por importe).
- **Trade-offs:** int64 cubre con holgura finanzas personales en minor units (límite ~9.2×10¹⁸) pero exige reglas explícitas de saturación/validación al importar; exponente por moneda evita asumir 2 decimales (ARS=2, CLP/JPY=0, KWD=3 — FACT: ISO 4217 define minor units por moneda y se mantiene activamente [Wikipedia/ISO 4217 con referencia a la edición 2015 y mantenimiento por SIX Group, consultado 2026-09-29; verificación puntual ARS/CLP/JPY/KWD pendiente de test]).
- **Evidencia requerida para DECIDED:** decision record con los tests de frontera definidos (PHASE0_REPORT §9) + verificación puntual de exponents usados.

### T-007 — Política de redondeo

- **Estado:** OPEN. La hipótesis "half-up universal" fue rechazada como decisión por falta de evidencia (feedback del usuario).
- **Pregunta exacta:** *"¿En qué operaciones se produce redondeo, qué cantidades se almacenan exactamente, y qué regla evita pérdida silenciosa de precisión en conversiones y transacciones multicurrency?"*
- **Sub-preguntas:** conversión no exacta (¿se almacena la pata redondeada, la pata con residuo, o ambas?); transacción multicurrency (¿cómo balancea? — ver T-008); qué se conserva para auditabilidad (tasa, fecha-hora, fuente, método).
- **Evidencia requerida para DECIDED:** análisis formal de los escenarios (§9/§10 del informe) + decisión del usuario sobre el trade-off exactitud-vs-simplicidad de cada opción.

### T-008 — Regla de balanceo del ledger con multimoneda

- **Estado:** OPEN. El informe (§7/§8) presenta tres mecanismos candidatos con trade-offs; ninguno está congelado.
- **Opciones:** (a) Σ global = 0 con una sola moneda de consolidación implícita; (b) Σ = 0 estricta por moneda (cada transacción balancea en cada moneda que toca); (c) patas de conversión explícitas (la transacción lleva un posting puente que hace la conversión visible y auditable).
- **Criterios de decisión:** corrección del patrimonio, auditabilidad de conversiones, coste UX, testabilidad. La regla que sea, se implementa UNA vez en el dominio con tests (invariante crítica).
- **Evidencia requerida para DECIDED:** walkthrough de los 10 casos del checklist de PHASE0_REPORT §8 (activo nuevo, pasivo, ingreso, gasto, transferencia, pago de tarjeta, deuda, apertura de saldos, ajuste, conversión) contra cada opción + decisión del usuario. [Corregido en auditoría 2026-09-29: conteo previo inconsistente (6 vs 8 vs 10).]

### T-009 — Licencia del proyecto

- **Estado:** PROVISIONAL (GPL-3.0-or-later como opción fuerte, no congelada).
- **Contexto (FACT, verificado 2026-09-29 vía API de GitHub, archivo LICENSE de cada repo):** Firefly III es **AGPL-3.0** (no GPL-3 como se asumía); Money Manager Ex es GPL-2.0; MyExpenses e Ivy Wallet son GPL-3.0; Actual es MIT. React Native es MIT. Ponytail es MIT; el proxy de Caveman es BSL-1.1 (no copiable como código, no aplicable aquí).
- **Nota de compatibilidad (INTERPRETATION, a confirmar en auditoría de dependencias):** Apache-2.0 es compatible hacia GPLv3 (no a la inversa); MIT/BSD compatibles ambas direcciones; la licencia final depende del set real de dependencias (T-011) y de assets/fonts (OFL).
- **Evidencia requerida para DECIDED:** auditoría completa de dependencias y assets + decisión del usuario (copyleft fuerte vs permisivo).

### T-010 — Schema exacto del formato `.moneybackup`

- **Estado:** OPEN. Diseño conceptual en PHASE0_REPORT §13 (lógico, versionado, manifest+checksum, equivalencia semántica backup→restore). El schema exacto y su versión inicial 1 se definen cuando el modelo de datos (T-006/T-007/T-008) esté congelado.

### T-011 — Set final de dependencias

- **Estado:** OPEN. Cada dependencia futura requiere entrada en este registro con: justificación, licencia, ¿acceso a red?, tamaño, mantenimiento. Regla AGENTS.md §5.6.

### T-012 — Canales de distribución

- **Estado:** PROVISIONAL.
- **Recomendación:** F-Droid como canal principal + GitHub Releases + APK directo; Google Play opcional y no necesario. Sin GMS.
- **Contexto (FACT, F-Droid Inclusion Policy, f-droid.org/en/docs/Inclusion_Policy, consultado 2026-09-29):** la app debe ser FLOSS verificada, sin SDKs propietarios de tracking/ads/analytics, toolchain 100% FLOSS para el build de F-Droid, aplicación mantenida, con valor único y Application ID propio. Los builds de F-Droid los compila la infraestructura de F-Droid desde el source publicado.
- **Contexto (FACT, Play Console Help — Financial Services / Financial features declaration, support.google.com/googleplay/android-developer/answer/9876821 y /13849271, consultado 2026-09-29):** existe una declaración obligatoria de "financial features" para toda app en Play, con formulario específico aunque la app declare no tener features financieras; políticas específicas de servicios financieros aplican a préstamos etc. — no al caso de MoneyFOSS, pero el formulario existe.
- **Evidencia requerida para DECIDED:** reproducibilidad del build bajo toolchain F-Droid comprobada en spike de build (Fase de implementación), y confirmación de disponibilidad de firmante/metadata.

### T-013 — App lock (PIN/biometría) y recovery

- **Estado:** PROVISIONAL (opcional, no por defecto). El mecanismo concreto (código propio vs BiometricPrompt del sistema) y su interacción con recovery se cierran con el threat model (T-004/T-005). Ver análisis de mecanismos en PHASE0_REPORT §15.

### T-014 — Diseño para inflación futura (sin implementarla)

- **Estado:** PROVISIONAL. Principio DECIDED (P-13): las transacciones originales nunca se modifican para introducir valor real; todo análisis económico es vista derivada sobre datos nominales (valor nominal, fecha, moneda). La forma exacta de hooks (índices, fuentes offline de INDEC) queda OPEN para Fase posterior. Contexto INDEC: pendiente de investigación con fuentes oficiales (sin dependencia de red en el core).

### T-015 — Gobernanza de agentes (Caveman + Ponytail embebidos)

- **Estado:** DECIDED (documental).
- **Decisión:** las reglas de [ponytail](https://github.com/DietrichGebert/ponytail) (MIT, © 2026 DietrichGebert) y del *skill* [caveman](https://github.com/JuliusBrussee/caveman) (MIT; el proxy del mismo proyecto es BSL-1.1 y no se adopta) se **embeben adaptadas con atribución** en [AGENTS.md](../AGENTS.md) como gobernanza del repo. Precedencia: reglas financieras/de seguridad > ponytail > caveman-lite. Caveman nunca degrada explicabilidad de cifras, errores, confirmaciones ni documentos normativos.
- **Nota:** instalar los skills/proxy en el harness local del usuario queda fuera de este repo y es decisión del usuario; el repo queda gobernado por AGENTS.md en cualquier caso.

---

### T-016 — Cierre de T-008: regla de balanceo del ledger con multimoneda

- **Estado:** DECIDED
- **Fecha:** 2026-10-04
- **SUPERSEDE:** el estatus OPEN de T-008 (la pregunta queda respondida; el texto de T-008 se conserva como historial).
- **Evidencia exigida por T-008, producida:** walkthrough completo de los 10 casos del checklist canónico definido en el cierre de Fase 0 (PHASE0_REPORT §30, tabla 30.3), con postings concretos contra los tres candidatos. Autorización de congelado bajo evidencia: prompt de misión autónoma del usuario (§8: "si la evidencia fuertemente soporta un modelo, congélalo").
- **Decisión (Candidato C — puente explícito, con validación Σ por moneda):**
  1. Convención de signos: contable clásica, débito = positivo (ASSET/EXPENSE + al aumentar; LIABILITY/INCOME/EQUITY − al aumentar). Patrimonio = Σ saldos ASSET+LIABILITY.
  2. Invariante: en cada transacción, para cada moneda, Σ de importes enteros (minor units, int64) = 0. Exacta, sin tolerancia, sin redondeo. Validada en un único punto del dominio con tests (AGENTS §5.1).
  3. Cuentas ASSET/LIABILITY/EQUITY mono-moneda e inmutables en moneda; INCOME/EXPENSE son cuentas-sistema multi-moneda (no bolsas de valor); categorías sin moneda.
  4. Conversión = par de postings `bridge` sobre cuentas FX-sistema (`sys:fx:<CUR>`, EQUITY, ocultas, auto-creadas) + registro `Conversion{rateText, rateRatio num/den, quoteDirection, rateAt, source, roundingMode}` que los enlaza. Los importes viven solo en los postings (una copia de verdad). `Conversion` ⇔ exactamente dos bridge postings.
  5. Categoría: atributo solo de postings INCOME/EXPENSE; prohibida en cuentas de valor (incluye bridge). Hace estructuralmente imposible: transferencia como ingreso, pago de tarjeta como gasto, conversión como ingreso, liquidación de pasivo como gasto (walkthrough §30.4).
  6. Pagos mixtos multi-moneda sin tasa (cada moneda cierra por sus postings reales) no requieren `Conversion`.
- **Alternativas consideradas y por qué no:** (A) Σ global — imposible aritmética en enteros redondeados: residuos concretos +500, +540, −240 minor units en los casos 8–10 con la propia tasa del usuario; exigiría tolerancia (invariante difusa, prohibida por P-06) o ajustes fantasma. (B) Σ por moneda puro — invariante correcta pero la conversión queda inrepresentable; la salida (2 transacciones enlazadas) reintroduce el registro de tasa con peor UX y atomicidad en pareja = C peor ejecutado. Tabla completa de 15 criterios: PHASE0_REPORT §30.5.
- **Consecuencias:** el modelo y el schema de backup derivan de estas entidades (T-010); los tests de Fase 1 implementan esta invariante; abrir de nuevo T-008 exige evidencia nueva que contradiga el walkthrough.

### T-017 — Cierre de T-007: política de redondeo (requisitos congelados, método provisional, dos restos OPEN)

- **Estado:** mixto por componente — **DECIDED** (requisitos) · **PROVISIONAL** (método por defecto) · **OPEN** (dos restos acotados). SUPERSEDE el estatus OPEN global de T-007.
- **Fecha:** 2026-10-04
- **Evidencia:** redondeo identificado desde operaciones reales del walkthrough T-008 (PHASE0_REPORT §31), no inventado.
- **DECIDED:** (a) todo valor monetario almacenado es entero en minor units; (b) parsing estricto en límites de confianza — más decimales que el exponente de la moneda = rechazo, nunca redondeo; (c) la única derivación con redondeo financiero del MVP es conversión: derivar-una-vez → almacenar ambos enteros → registrar `roundingMode`; (d) valores derivados (display, porcentajes, agregados, consolidados) se redondean solo para presentación y **nunca** se escriben en el ledger (P-06/P-13); (e) división monetaria solo vía una función única con modo, testeada en empates.
- **PROVISIONAL:** modo por defecto `half-away-from-zero` para derivaciones. Evidencia que falta: no hay fuente normativa que mandate un modo (por eso el modo se almacena por operación y es conmutable); si una fuente primaria o necesidad de interop lo exige, se supersede con entrada nueva.
- **OPEN (acotados, no bloquean Fase 1):** (a) política de resto al dividir en cuotas — se decide al diseñar la feature post-MVP; (b) UX del resto en splits por categoría — Fase 3. En ambos: requisito ya congelado = el resto es siempre explícito, nunca silencioso.

### T-019 — Cierre de T-002: permiso INTERNET en el APK release (mecanismo probado; runtime pendiente del gate)

- **Estado:** PROVISIONAL (mecanismo DECIDED-class probado; falta la prueba de runtime que la pregunta original también exigía)
- **Fecha:** 2026-10-04
- **Spike:** ejecutado (throwaway, fuera del repo). Evidencia completa: `evidence/T002_EVIDENCE.md` (expo 57.0.26, RN 0.86.3, 5 builds release, A/B/C, apkanalyzer sobre APK final).
- **Resultados probados:** (1) APK release **sin** `INTERNET` existe (5 permisos, 3 builds, SHA256 registrado); (2) `<uses-permission android:name="android.permission.INTERNET" tools:node="remove"/>` en el manifest app lo elimina del merge y del APK — matriz A/B/C completa incluyendo el caso "declaración app eliminada → sigue presente"; (3) declarantes exactos: plantilla prebuild (manifest app) + **expo-file-system** 57.0.7 (merger blame `host.exp.exponent:expo.modules.filesystem:57.0.7:8`); (4) `react-android`/`hermes-android` NO lo declaran (escaneados); (5) el dex final contiene okhttp3/expo-fetch/devsupport (con permiso negado por el OS) — hallazgo para el gate (R8).
- **Lo que falta para DECIDED:** prueba de arranque y flujo en airplane mode con emulador/dispositivo (ningún dispositivo en el entorno del spike). Se ejecuta en el gate de release (Fase 2); si el runtime falla sin permiso, se supersede T-020 con la nueva evidencia.
- **Gate de release automatizable ya definido:** PHASE0_REPORT §32.4.

### T-020 — Cierre de T-001: stack de UI = React Native + Expo CNG

- **Estado:** DECIDED
- **Fecha:** 2026-10-04
- **SUPERSEDE:** estatus PROVISIONAL de T-001.
- **Autorización:** prompt de misión del usuario, §11 ("si RN/Expo pasa: congélalo como stack actual"); el criterio de paso (viabilidad y auditabilidad de red) fue el spike T-002, ejecutado con el resultado registrado en T-019/evidence.
- **Decisión:** React Native + Expo SDK 57 (Development Build / CNG, TypeScript) como stack actual; Kotlin+Compose deja de ser alternativa activa (queda documentada en T-001 histórico como fallback si un fallo de runtime posterior lo reabre).
- **Consecuencias registradas (no bloqueantes, entran al gate):** APK 68 MB (considerar splits por ABI); dev-support networking en dex de release → habilitar R8/minify; permisos de plantilla a purgar (`READ/WRITE_EXTERNAL_STORAGE`, `SYSTEM_ALERT_WINDOW`); `allowBackup="true"` → forzar `false`; prueba de runtime en airplane mode pendiente (T-019).

### T-021 — Avance de T-003: persistencia = expo-sqlite (PROVISIONAL)

- **Estado:** PROVISIONAL (recomendación con evidencia parcial). Avanza desde OPEN porque T-001/T-002 quedaron resueltos.
- **Fecha:** 2026-10-04
- **Recomendación:** `expo-sqlite` — driver SQLite directo, MIT, vendoriza SQLite3+SQLCipher como fuentes (habilita evaluación futura de T-004 sin cambiar de librería), sin ORM, control total de SQL/migraciones/transacciones, mismo toolchain ya probado en el spike. Alternativa documentada: `op-sqlite` (MIT, JSI, más cercano al metal, bus factor individual). Descartado: WatermelonDB (sync sin backend = coste sin beneficio, P-02); cualquier ORM (sin razón demostrada, AGENTS §3).
- **Reglas heredadas:** el dominio no conoce SQLite (puerto, una sola implementación mientras no haya segunda); toda escritura financiera en transacción atómica; migraciones versionadas y testadas; enteros int64 bindeados sin paso por float (verificar en la integración: bind/return de int64 o string, no Number).
- **Evidencia que falta para DECIDED:** spike de integración en Fase 2 — transacción atómica con rollback, bind de int64, control de migraciones, y build F-Droid del proyecto real.

### T-018 — Cierre de T-006: representación exacta de dinero

- **Estado:** DECIDED
- **Fecha:** 2026-10-04
- **SUPERSEDE:** estatus PROVISIONAL de T-006 (el trade-off quedó resuelto por la Fase 1 implementada; el texto histórico de T-006 se conserva).
- **Evidencia:** núcleo de dominio implementado y verificado (`src/domain/money.ts`, `src/domain/serialize.ts`) con 53 tests verdes (`npm test`) y typecheck estricto (`npm run typecheck`): rango int64 exacto en ambos extremos (`INT64_MIN`/`INT64_MAX`), desbordes rechazados en construcción y en decodificación de wire, parseo estricto de strings (exceso de decimales = rechazo, nunca redondeo), roundtrip parse/format exacto, montos fuera del rango seguro de Number (`9000000000000000`) sobreviven roundtrip sin pérdida.
- **Decisión:** (a) representación de dinero en el dominio = enteros signados en minor units con rango int64, tipados como `bigint` en TypeScript con `assertInt64` en todo punto de entrada (constructor `money()`, decodificación wire); (b) en wire/backup = string decimal canónico de integer (`/^-?(0|[1-9]\d*)$/`, sin separadores, sin decimales, sin notación científica), `BigInt` en la decodificación con chequeo de rango; (c) `Number` queda prohibido para dinero en todo el código (incluye tests y parsers), regla heredada de P-07; (d) la bindeación a SQLite int64 sin pasar por Number queda como verificación obligatoria de la integración de Fase 2 (ya registrada en T-021).

### T-022 — Registro de dependencias del proyecto (entrada inicial)

- **Estado:** DECIDED
- **Fecha:** 2026-10-04
- **Contexto:** AGENTS §2 exige justificación escrita para toda dependencia; hasta hoy el repo no tenía `package.json`.
- **Decisión (inventario completo al cierre de la Fase 1):**
  - Dependencias runtime del núcleo: **ninguna** (`src/domain/` tiene cero imports de paquetes externos; solo JS estándar; `@types/node` aparece únicamente en tests).
  - `typescript` (dev): typecheck estricto con `erasableSyntaxOnly` — los tests corren como `.ts` nativos en Node 24 (type stripping), sin bundler ni transpilación.
  - `@types/node` (dev): tipos de `node:test`/`node:assert` para los tests; sin efecto en runtime.
  - Framework de tests: **ninguno** — `node:test` nativo (escalera §3: la standard library lo hace).
  - Red: ninguna dependencia con acceso a red (release gate de red intacto). `npm audit` al instalar: 0 vulnerabilidades (2026-10-04). Lockfile versionado.
- **Regla para futuras entradas:** toda dependencia nueva requiere entrada en este archivo con licencia, justificación y confirmación de que no rompe el gate de red.

### T-023 — Phase 2: fundación de persistencia (schema, enteros, IDs, migraciones, puerto)

- **Estado:** mixto — **DECIDED** (schema v1, representación de enteros, estrategia de IDs, fechas como texto, migraciones, puerto `Db`, adapter node:sqlite como driver de verificación) · **PROVISIONAL** (adapter expo-sqlite: escrito, no ejecutado). **SUPERSEDE:** nada; T-021 queda PROVISIONAL sin cambios, T-004/T-005/T-010 quedan OPEN sin cambios.
- **Fecha:** 2026-10-04
- **Evidencia:** capa `src/persistence/` + matriz de tests (`tests/db-*.test.ts`, `tests/db-fixtures.ts`): suite completa verde, typecheck estricto, SQLite 3.51.3 vía `node:sqlite` (stdlib, cero dependencias nuevas).
- **DECIDED:**
  - (a) Schema v1 (`schema_meta`, `accounts`, `categories`, `transactions`, `conversions`, `postings`): cuentas sistema `sys:*` no son filas; sin saldos almacenados; posting id `{txid}:p{index}` determinista e interno; FK en transacción/conversión/categoría pero no en `account_id`; CHECKs de enums y unicidades; `PRAGMA foreign_keys = ON` por conexión.
  - (b) Dinero en SQLite = **TEXT canónico** (no INTEGER: expo-sqlite devuelve `number` y pierde precisión sobre 2⁵³; no REAL jamás). Rango int64 impuesto en la frontera de mapeo + validación de dominio.
  - (c) IDs de dominio = TEXT del llamador (UUIDv4 vía `crypto` stdlib recomendado, sin paquete `uuid`); sin `AUTOINCREMENT`.
  - (d) Fechas = TEXT verbatim, sin conversión de zona horaria; sin semántica temporal nueva.
  - (e) Migraciones explícitas versionadas, aplicadas por migración en su propia transacción, idempotentes, sin destrucción automática; lista inyectable para tests.
  - (f) Puerto `Db` mínimo y propio (`exec`/`query`/`transaction`/`close`, parámetros `string|number|null`, solo `?`); el dominio no importa persistencia (verificado por test estructural).
  - (g) Escritura = validar contra refs de la DB → una transacción SQLite; lectura = filas → chequeos canónicos → validar → dominio; corrupción = fail-closed, nunca reparación silenciosa.
- **PROVISIONAL:** `src/persistence/drivers/expo-sqlite.ts` implementa el puerto 1:1 con tipos ambientales (sin paquete instalado) pero **no ejecutado aquí** (sin runtime React Native). Evidencia que falta (la misma de T-021): atomicidad, bind int64, migraciones y build F-Droid en el proyecto real.
- **Regla heredada:** el archivo SQLite no es el formato de backup (frontera con T-010 intacta).

### T-024 — Dependencias de producto de la app (inventario verificado)

- **Estado:** DECIDED
- **Fecha:** 2026-10-05
- **Contexto:** la regla de T-022 exige entrada por dependencia. Todas MIT (verificado en `app/node_modules/*/package.json`, campo `license`).
- **Inventario (`app/package.json`, Expo SDK 57 = pin de T-020):**
  - `expo ~57.0.26`, `react 19.2.3`, `react-native 0.86.3`: base del stack ya decidido (T-020).
  - `expo-status-bar ~57.0.1`: barra de estado clara sobre fondo oscuro.
  - `expo-sqlite ~57.0.3`: driver de producción (T-021); SQLite vendorizado, sin ORM.
  - `expo-font ~57.0.4`: requerido por `@expo/vector-icons` (carga de la fuente de iconos).
  - `@expo/vector-icons 15.1.1`: una sola familia (MaterialIcons), sin mezclar packs, sin emoji.
  - `expo-navigation-bar ~57.0.3`: botones del sistema legibles sobre fondo AMOLED (componente declarativo `style="dark"`).
  - `@react-navigation/native 7.5.0`, `bottom-tabs 7.20.0`, `native-stack 7.20.0`, `react-native-screens ~4.26.0`, `react-native-safe-area-context ~5.7.0`: navegación Tabs + Stack, sin deep links.
  - dev: `typescript ~6.0.3`, `@types/react ~19.2.2`.
- **Hallazgo de red (evidencia, no rumor):** `expo-file-system@57.0.7` existe como dependencia **transitiva de `expo`** (`app/node_modules/expo/node_modules/`) y su manifest declara `INTERNET` + storage — el mismo declarante de T-002. No se instala `expo-file-system` directo (export/sharing queda fuera del MVP por esto). `app.json` trae `blockedPermissions: [INTERNET]` (mecanismo probado en T-019); la verificación del merge final queda para el prebuild.
- **Rechazado explícitamente:** `expo-file-system` directo, date-pickers nativos, toast libs, splash packages, frameworks de test de componentes (la lógica de presentación se testea con `node:test` sin framework), WatermelonDB/ORMs (T-021, P-02).

### T-026 — Delta de dependencias del hardening sprint

- **Estado:** DECIDED
- **Fecha:** 2026-10-05
- **Agregadas (todas MIT, verificadas en `package.json` instalados):**
  - `expo-system-ui ~57.0.4` — aplica el tema oscuro a la UI del sistema; exigida por el warning de prebuild sobre `userInterfaceStyle`. Sin permisos, sin red, sin código nativo con sockets propios.
  - `expo-build-properties ~57.0.22` — **solo build-time** (config plugin, no se empaqueta lógica en runtime): `enableMinifyInReleaseBuilds`, `enableShrinkResourcesInReleaseBuilds`, `enablePngCrunchInReleaseBuilds` (solo variante release; debug intacto).
- **Plugin local sin dependencia nueva:** `app/plugins/withAllowBackupFalse.cjs` (usa `@expo/config-plugins@57.0.9`, ya presente como transitiva de `expo`) — fija `android:allowBackup="false"` en el manifest generado. Sin paquete `uuid`, sin `crypto` nativo: los IDs siguen siendo `timestamp+random` con la PK como backstop.
- **Red:** ningún agregado declara ni necesita red. El declarante transitivo `expo-file-system@57.0.7` sigue presente (dependencia de `expo`); `blockedPermissions: [INTERNET]` verificado en el merge (T-025, re-verificado en este sprint).

### T-027 — Release APK real (evidencia, sin cerrar gates físicos)

- **Estado:** PROVISIONAL (evidencia de artefacto; runtime y firma release pendientes)
- **Fecha:** 2026-10-06
- **Evidencia:** `assembleRelease` OK (Gradle 9.3.1, JDK Temurin 17.0.20.1): `app-release.apk`, 82.023.112 B, SHA-256 `0BAEE0CB…1552506`, `com.moneyfoss.app` v1.0.0, R8+shrink verificados (`minifyReleaseWithR8`, `mapping.txt`, sin `debuggable`). Manifest final (aapt2): cero permisos peligrosos (INTERNET/storage/alert/vibrate eliminados vía `blockedPermissions`), `allowBackup=false`, solo MainActivity exportada (+ receiver estándar con permiso DUMP), sin deep links. Dex tras R8 conserva `okhttp3`/`expo.modules.fetch` (sin permiso, sin uso). Fuente: HEAD `929b84b`, árbol limpio.
- **NO evidencia:** firma release (firmado con clave debug `CN=Android Debug`: no distribuible; el keystore release es acción del usuario fuera del repo), tráfico real, runtime en dispositivo. T-019 y T-021 siguen PROVISIONALES sin cambios.

### T-033 — Quinto release APK (Fase 3 completa: import/export CSV/JSON + Budgets v1, schema v2)

- **Estado:** PROVISIONAL (evidencia de artefacto; runtime en dispositivo pendiente)
- **Fecha:** 2026-10-07
- **SUPERSEDE (artefacto):** el APK de T-030 como referencia vigente; la evidencia de T-030 se conserva como historial. **Nota honesta:** el archivo de T-030 vivía solo en la ruta de build y quedó sobrescrito por este build; su evidencia durable (SHA, cert, manifest) permanece en DECISIONS T-030 y RELEASE_SECURITY_AUDIT. Este build se copió además a `C:\Users\WinterOS\.moneyfoss\releases\app-release-T033.apk`.
- **Alcance del código desde `ae8aae8`:** 12 commits — export CSV/JSON por Share sheet (`cf0279f`); pipeline de import CSV con preview/confirm y commit atómico + fix raíz de transacciones anidadas en ambos drivers (`7604835`); pantalla ImportCsv (`196d161`); BOM de Excel en el parser (`d18378e`); budgets v1 (schema v2, CRUD, medición desde postings) (`ab9eeeb`); pantalla Budgets + `budgets` en el ledger state (`3d61bf3`); fixes de honestidad de copy/UI (`3ba29e4`, `7d617c4`); docs (`010a801`, `4708434`, `c78eace`, `5478848`, `7807048`).
- **Evidencia:** `assembleRelease` OK (9m41s, online, `--max-workers=2`): `app-release.apk`, 82.063.632 B, SHA-256 `6753476F28B19F606A8B57C03642763703459AF6A1FD0D51F8BA8E92573452FC`, `com.moneyfoss.app` v1.0.0 (versionCode 1), bundle Metro reconstruido, R8+shrink con `mapping.txt`. `apksigner verify` exit=0, firma producción (`CN=MoneyFOSS`, cert SHA-256 `83389ea5…326c`). Manifest (aapt2, build-tools 36.0.0): único `uses-permission` = `DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION` propio; sin INTERNET/storage/alert/vibrate/network-state; `allowBackup=false`; sin `debuggable`; exportados: launcher MainActivity + receiver estándar DUMP. Fuente: HEAD `7d617c4`, árbol limpio; suite 157/157 + typechecks en 0 en la misma fuente.
- **NO evidencia:** runtime en dispositivo (T-019/T-021), prueba manual de import/budgets en hardware. T-019, T-021, T-031 y T-032 siguen PROVISIONALES sin cambios.

### T-032 — Budgets v1 (Fase 5): regla mensual, moneda explícita, medición desde postings

- **Estado:** PROVISIONAL — recomendación + evidencia parcial (implementada y testeada en host); falta la ratificación explícita de los tres puntos marcados. Precedente: T-003 se implementó con estado PROVISIONAL.
- **Fecha:** 2026-10-07
- **Contexto:** Fase 5 (PHASE0 §23) = Budgets + Goals + Recurring. PHASE0 §9 fija `Budget: categoría × período × monto objetivo (en una moneda)` y marca "la de la categoría/cuenta dominante — detalle OPEN". §24.6 exige tests de límites de período, monedas y medición contra postings categorizados. §18: solo descriptivo, nunca recomendación. §641 (Q9): progreso de presupuestos = derivado, jamás se escribe en el ledger.
- **Preguntas abiertas, opciones y recomendación:**
  1. **Moneda del presupuesto** (el "detalle OPEN" de §9): (a) campo explícito por presupuesto; (b) derivarla de la cuenta dominante de la categoría; (c) presupuesto multi-moneda. → (b) es frágil: las categorías no tienen moneda y la cuenta dominante cambia con el uso; (c) contradice "en una moneda" ya congelado. **Recomendación: (a).** Evidencia que falta: ratificación del usuario.
  2. **Periodicidad:** (a) regla mensual (categoría + moneda + límite, medida por mes calendario local); (b) fila distinta por mes; (c) granularidad configurable (semanal/anual). → (b) duplica filas sin beneficio en v1; (c) YAGNI hasta evidencia de uso. **Recomendación: (a).** Evidencia que falta: ratificación del usuario.
  3. **Medición:** no es decisión nueva — está forzada por el modelo: Σ de postings con `category_id = categoría`, `currency = moneda del presupuesto`, `kind = 'normal'`, en transacciones con fecha local dentro del mes calendario (`YYYY-MM` por prefijo de fecha ISO; fechas locales, sin zonas horarias). Gastos de la categoría en otras monedas no contaminan (límite por moneda). Reembolsos (postings negativos en `sys:expense`) restan naturalmente. Transferencias y pagos de tarjeta no cuentan (no llevan categoría).
- **Decisión (v1, PROVISIONAL):** (a) + (b) + medición de §3; schema `budgets(id, category_id → categories, currency, amount_minor TEXT canónico >0, UNIQUE(category_id, currency))` en migración v2; upsert por id derivado `categoryId@currency` (la regla se actualiza re-ingresando la misma categoría); CRUD validado por `assertBudget` en el dominio + CHECKs SQL; sin floats (la UI muestra importes enteros formateados, no porcentajes).
- **Fuera de alcance v1 (registrado, no olvidado):** Goals; Recurring; presupuestos en export CSV/JSON (el formato `moneyfoss-export` v1 queda sin `budgets[]` — deuda de formato a resolver antes de marcar el export como "completo"); presupuestos en `.moneybackup` (depende de T-010); granularidades distintas de mensual.
- **Evidencia:** `src/domain/validate.ts` (`assertBudget`), `src/persistence/schema.ts` (migración v2) + `repository.ts` (CRUD), `app/src/lib/budgets.ts` (medición) y su test (límites de mes, monedas, casos de §30), suite en verde; UI `Budgets` con preview de gasto vs límite.
- **NO evidencia:** prueba en dispositivo; ratificación de los puntos 1 y 2 (los marca PROVISIONAL, no DECIDED).

### T-031 — Import CSV: semántica existing-wins (cierre de alcance de Fase 3)

- **Estado:** PROVISIONAL (semántica implementada y testeada en host; UI pendiente de prueba en dispositivo)
- **Fecha:** 2026-10-07
- **Contexto:** P-08 (DECIDED) exige pipeline de import con validación, dedup, preview, confirmación y commit atómico; PHASE0 §23 define Fase 3 = Accounts + Transactions UI + import/export CSV/JSON. Quedaba sin fijar la semántica concreta de dedup/conflictos y la creación de cuentas/categorías.
- **Opciones:** (a) overwrite/merge del id existente; (b) rechazar el archivo completo ante el primer conflicto; (c) existing-wins por transacción — idéntico se omite, distinto conserva lo existente, el resto del archivo importa.
- **Decisión:** (c), con comparación exacta por `stableStringify(toWire(tx))` (sin fingerprints heurísticos — T-007/T-011 siguen abiertos y este mecanismo no los anticipa). Nunca sobrescribir. Cuentas/categorías nuevas solo desde defs validadas del CSV (`account_type`+`account_name` consistentes; `kind` consistente con la cuenta sistema); `sys:*` jamás se crea; cada grupo pasa por `assertTransaction` (cero reglas de validación nuevas en el import); `applyImport` escribe todo en una transacción única (todo o nada).
- **Evidencia:** `app/src/lib/import-csv.ts`; `tests/import.test.ts` (round-trip export→DB vacía, idempotencia de re-import, conflicto no sobrescribe, rechazos `unknown-account`/`bad-row`/`mixed-conversion`/`invalid-transaction`/defs inconsistentes, rollback atómico con `FailAfter`, nested transactions con fix raíz en ambos drivers); suite 154/154, typechecks 0. Commits `7604835` (pipeline) y `196d161` (pantalla ImportCsv, preview → confirm).
- **NO evidencia:** prueba en dispositivo (analizar/preview/confirm/toast); T-019 y T-021 siguen PROVISIONALES sin cambios.

### T-030 — Cuarto release APK (fix FAB sobre contenido)

- **Estado:** PROVISIONAL (evidencia de artefacto; runtime en dispositivo pendiente)
- **Fecha:** 2026-10-07
- **SUPERSEDE (artefacto):** el APK de T-029 como referencia vigente; la evidencia de T-029 se conserva como historial.
- **Alcance del código:** 1 commit (`ae8aae8`) — `screenContent.paddingBottom = xxl + FAB(60)` en el estilo compartido: la última fila y el botón "Mostrar todo" dejan de quedar bajo el FAB absoluto en Home/Transactions (fix raíz en un solo lugar, no por screen).
- **Evidencia:** `assembleRelease` OK: `app-release.apk`, 82.029.380 B, SHA-256 `B7C6D34A…F805E`, `com.moneyfoss.app` v1.0.0 (versionCode 1), bundle Metro reconstruido (`createBundleReleaseJsAndAssets`); dex/R8 sin cambios (solo JS), `minifyReleaseWithR8`/`optimizeReleaseResources` vigentes, sin `debuggable`, `allowBackup=false`, firmado producción (`CN=MoneyFOSS`, cert `83389ea5…326c`). Manifest (aapt2): único `uses-permission` propio (DYNAMIC_RECEIVER); sin INTERNET/storage/alert/vibrate/network-state; exportados: launcher MainActivity + receiver estándar DUMP; sin deep links. Fuente: HEAD `ae8aae8`; suite 140/140 + typechecks en 0.
- **NO evidencia:** tráfico real, runtime en dispositivo. T-019 y T-021 siguen PROVISIONALES sin cambios.

### T-029 — Tercer release APK (P0 UX polish: Home/Accounts/errores, suite 140)

- **Estado:** PROVISIONAL (evidencia de artefacto; runtime en dispositivo pendiente)
- **Fecha:** 2026-10-07
- **SUPERSEDE (artefacto):** el APK de T-028 como referencia vigente; la evidencia de T-028 se conserva como historial.
- **Alcance del código desde T-028:** 5 commits (`f5229fd`, `854f79b`, `bcf16ae`, `a293c65`, `4279e79`) — snapshot de Home por moneda con cuentas en cero incluidas y equity excluido (`lib/snapshot.ts`, totales vía `currencyTotals` del dominio), lista de cuentas en Home con navegación, `FormError` localizado con `role="alert"` para errores de acción/validación, hints localizados para listas vacías en AddTransaction, gate fatal/corrupt con retry real (`getDb()` solo cachea el handle tras init completo), two-tap delete armado por categoría, renames con toast, conteo "N de M" honesto sobre el conjunto filtrado en Transactions, detalles de fila (transferencia/pago/tasa) ES/EN.
- **Evidencia:** `assembleRelease` OK (online; el bundle Metro se reconstruyó: `createBundleReleaseJsAndAssets` ejecutado): `app-release.apk`, 82.029.376 B, SHA-256 `A7AA1491…315BE5`, `com.moneyfoss.app` v1.0.0 (versionCode 1), R8+shrink (`minifyReleaseWithR8`, `optimizeReleaseResources`), sin `debuggable`, `allowBackup=false`, firmado producción (`CN=MoneyFOSS`, cert `83389ea5…326c` — no debug). Manifest final (aapt2): un único `uses-permission` propio (DYNAMIC_RECEIVER); sin INTERNET/storage/alert/vibrate/network-state; MainActivity exportada (+ receiver estándar con permiso DUMP); sin deep links hacia la app. Fuente: HEAD `4279e79` (cambios posteriores solo documentales, no afectan el bundle); suite 140/140 + typechecks en 0 + `expo export` OK sobre ese código.
- **NO evidencia:** tráfico real, runtime en dispositivo. T-019 y T-021 siguen PROVISIONALES sin cambios.

### T-028 — Segundo release APK (post-toasts, post-permisos, firmado producción)

- **Estado:** PROVISIONAL (evidencia de artefacto; runtime en dispositivo pendiente)
- **Fecha:** 2026-10-07
- **SUPERSEDE (artefacto):** el APK de T-027 como referencia vigente; la evidencia de T-027 se conserva como historial.
- **Evidencia:** `assembleRelease` OK (online; `--offline` cuelga la fase de configure en este entorno): `app-release.apk`, 82.025.156 B, SHA-256 `38EAEC62…211312145F`, `com.moneyfoss.app` v1.0.0, R8+shrink, sin `debuggable`, `allowBackup=false`, firmado producción (`CN=MoneyFOSS`, cert `83389ea5…326c` — no debug). Manifest final (aapt2): un único `uses-permission` propio (DYNAMIC_RECEIVER); sin INTERNET/storage/alert/vibrate/network-state; MainActivity exportada (+ receiver estándar). Fuente: HEAD `d98a667`, árbol limpio; suite 138/138 + typechecks en 0.
- **NO evidencia:** tráfico real, runtime en dispositivo. T-019 y T-021 siguen PROVISIONALES sin cambios.

### T-025 — Primer build Android de la app + delta de dependencias

- **Estado:** PROVISIONAL (evidencia de build real; runtime pendiente como en T-019)
- **Fecha:** 2026-10-05
- **Dependencia agregada:** `expo-system-ui ~57.0.4` (MIT) — aplica el tema oscuro a la UI del sistema; exigida por el warning de prebuild sobre `userInterfaceStyle`. Sin permisos, sin red.
- **Evidencia de build (debug, no release):**
  - `expo prebuild --platform android --clean` OK; `assembleDebug` OK con Temurin JDK 17.0.20.1 + SDK local (SDK en `%LOCALAPPDATA%\Android\Sdk`, JDK descargado a directorio temporal fuera del repo).
  - APK: `app/android/app/build/outputs/apk/debug/app-debug.apk` (gitignored), 169.571.515 B, SHA256 `BBBA1080CE8A59C9B8B93CAC976BD3008E39BB3E89AFCC99DABD3DD5F47E8472`, `com.moneyfoss.app`, versionCode 1, minSdk 24, targetSdk 36.
  - Manifest fusionado (aapt2): **sin `android.permission.INTERNET`** — el `tools:node="remove"` de `blockedPermissions` sobrevivió al merge con el declarante transitivo `expo-file-system@57.0.7`. Permisos presentes: `SYSTEM_ALERT_WINDOW`, `READ/WRITE_EXTERNAL_STORAGE` (maxSdk 32), `VIBRATE` (+ permiso propio `DYNAMIC_RECEIVER_NOT_EXPORTED`). `allowBackup="true"`, `debuggable="true"` (esperable en debug).
- **Lo que NO prueba:** variante release (R8, purga de permisos, `allowBackup=false` siguen pendientes del gate §32.4), ni runtime en dispositivo/emulador. No se cierra T-019.

---

### T-034 — JSON export v2: `budgets[]` (cierra la deuda de formato de T-032)

- **Estado:** PROVISIONAL (formato de solo salida, sin consumidores externos conocidos; evidencia = suite)
- **Fecha:** 2026-10-07
- **SUPERSEDE (alcance):** la deuda "presupuestos en export JSON" del párrafo *Fuera de alcance v1* de T-032 queda cerrada con este cambio; el resto de T-032 sigue vigente.
- **Contexto:** el JSON export era `moneyfoss-export` v1 sin `budgets[]`; la UI no podía describirlo como estado completo y T-032 lo registró como deuda.
- **Decisión:** `JSON_EXPORT_VERSION = 2`; `exportJson` acepta `budgets` y emite `budgets: [{ id, category_id, currency, amount_minor }]` (`amount_minor` string canónico de minor units, nunca número/float). Versión bump en lugar de cambio silencioso dentro de v1: cualquier consumidor que cacheara un `version` no confundirá payloads distintos. Sin importador (sigue siendo solo salida); restore de budgets entra únicamente por `.moneybackup` (T-010). Copy de UI actualizado a "cuentas, categorías, movimientos y presupuestos"; sigue describiendo al JSON como no-restorable.
- **Evidencia:** `tests/export.test.ts` (JSON declara formato/versión, `budgets[]` exacto, transacciones re-validan con `fromWire`); §8 de DATA_FORMAT actualizado a v2. Deuda restante de T-032: budgets en `.moneybackup` (depende de T-010) y Goals/Recurring, que no cambian con esto.

---

### T-035 — Reports v1 (Fase 6): resumen mensual descriptivo, series por moneda

- **Estado:** PROVISIONAL (alcance mínimo recomendado; nada de esto escribe en el ledger y las reglas de agregación vienen ratificadas — falta la ratificación de producto del usuario)
- **Fecha:** 2026-10-07
- **Contexto:** PHASE0 §23 lista Fase 6 = "Reports + charts"; §614 (reportes por moneda, iguales los necesitan aparte), §641 (agregados = solo display, derivados del ledger) y §643 (por defecto series por moneda; consolidado transversal solo con tasa declarada por el usuario y etiquetado) fijan las reglas. Budgets (T-032) ya midió el mismo tipo de agregado.
- **Decisión (v1, PROVISIONAL):** pantalla "Reportes" (desde Más) con selector de mes (anterior/siguiente), por cada moneda: total de ingresos, total de gastos y neto del mes; y lista de gastos por categoría del mes (enteros en minor units, formateados para display). Fuente única: postings `kind='normal'` **con categoría**, agrupados por `currency` del posting; se usa `category.kind` para clasificar (gasto suma `amount`, ingreso suma `-amount`); los refunds de gasto (amount negativo) restan naturalmente. Bridges, conversiones y transferencias sin categoría quedan fuera (no son ingreso/gasto). Cero escrituras, cero dependencias, cero charts en v1.
- **Fuera de alcance v1 (registrado):** charts/gráficos (dibujado propio o lib → pendiente de ratificación); consolidado transversal de monedas (exige tasa declarada por usuario, §643); export de reportes; drill-down a transacciones desde el reporte; histórico de varios meses en una vista; porcentajes (display entero, §661).
- **Evidencia:** `app/src/lib/reports.ts` puro con `monthFlowTotals`/`categoryFlowTotals` + `tests/reports.test.ts` (meses, monedas, signos, exclusión de transferencias/bridges, mes inválido falla cerrado).

---

### T-036 — Sexto release APK (budgets UI fixes + JSON export v2 + Reports v1)

- **Estado:** PROVISIONAL (evidencia de artefacto; runtime en dispositivo pendiente)
- **Fecha:** 2026-10-07
- **SUPERSEDE (artefacto):** el APK de T-033 como referencia vigente; la evidencia de T-033 se conserva como historial. Copia estable en `C:\Users\WinterOS\.moneyfoss\releases\app-release-T036.apk`.
- **Alcance del código desde `7d617c4`:** 3 commits — JSON export v2 con `budgets[]` y copy actualizado (`7be5b73`), Reports v1 (`c5f8e99`), docs T-033 (`dee97ce`, solo documentación).
- **Evidencia:** `assembleRelease` OK (6m11s, online, `--max-workers=2`): `app-release.apk`, 82.069.792 B, SHA-256 `D86745B0123055D4877D9D11F9771545B22499C2BA67DBB2BD7380217D78B025`, `com.moneyfoss.app` v1.0.0 (versionCode 1). `apksigner verify` exit=0, firma producción (`CN=MoneyFOSS`, cert SHA-256 `83389ea5…326c`). Manifest (aapt2, build-tools 36.0.0): un solo `uses-permission` = `DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION` propio (cero `android.permission.*`), `allowBackup=false`, sin `debuggable`, exportados: launcher + receiver estándar (×2). Fuente: HEAD `c5f8e99`, árbol limpio; suite 161/161 + typechecks en 0 + `expo export` OK en la misma fuente.
- **NO evidencia:** runtime en dispositivo. T-019, T-021, T-031, T-032 y T-035 siguen PROVISIONALES sin cambios.

---

## Cómo añadir una decisión nueva

```
### T-NNN — Título
- **Estado:** DECIDED | PROVISIONAL | OPEN
- **Fecha:** AAAA-MM-DD
- **Contexto:** ...
- **Opciones:** ... (con trade-offs)
- **Decisión:** ... (solo si DECIDED; citar fuente primaria o spike)
- **Evidencia requerida para DECIDED:** ... (si PROVISIONAL)
- **Pregunta exacta + spike que la resolvería:** ... (si OPEN)
```
