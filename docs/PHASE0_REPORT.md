# MoneyFOSS — Phase 0 Planning Report

**Fecha:** 2026-09-29 · **Estado:** Fase 0 (planificación/auditoría) · **Código:** ninguno, por diseño
**Documentos hermanos:** [AGENTS.md](../AGENTS.md) (gobernanza de agentes) · [DECISIONS.md](DECISIONS.md) (registro append-only)

**Convención de etiquetas** (obligatoria en todo el informe):
- **FACT** — afirmación verificada contra fuente primaria o de referencia, con fuente y fecha.
- **INTERPRETATION** — lectura propia de un FACT; razonable pero no verificada como hecho.
- **RECOMMENDATION** — propuesta con evidencia parcial; no es una decisión.
- **OPEN QUESTION** — sin recomendación; se resuelve con investigación o spike definido.

Los estatus de decisión (DECIDED/PROVISIONAL/OPEN) viven en [DECISIONS.md](DECISIONS.md); este informe los referencia como T-001…T-015.

---

## 1. Executive Summary

MoneyFOSS se define como app Android FOSS, offline-first real, sin cuenta/backend/telemetría, de registro y análisis descriptivo de finanzas personales, con datos bajo control del usuario (principios P-01…P-13, ratificados).

Hallazgos principales de esta fase:

1. **FOSS+offline ya no diferencia** (§5). Ivy Wallet —referente Android FOSS— está oficialmente sin mantenimiento desde nov-2024 (FACT, repo). La diferenciación viable es verificable: explicabilidad de cada cifra, build sin red demostrable, y foco ARS/inflación.
2. **Double-entry interno es la recomendación fuerte** (§7) para evitar los errores clásicos (pagos de tarjeta contados dos veces, transferencias como ingresos), con la regla de balanceo multicurrency aún OPEN (T-008).
3. **El stack RN/Expo queda PROVISIONAL, no decidido** (T-001). El riesgo específico es el permiso `INTERNET` (T-002): la cadena completa (RN→CNG→manifests→merger→APK→runtime) debe demostrarse con spike antes de congelar. Kotlin+Compose es la alternativa documentada.
4. **Persistencia**: comparación seria en §12; WatermelonDB es reactivo y está orientado a sync con backend propio — incongruente con P-02 salvo coste justificado; expo-sqlite/op-sqlite son drivers SQLite directos; decisión condicionada (T-003).
5. **Dinero**: enteros en minor units es decisión congelada (P-07); la política exacta de redondeo es OPEN (T-007) — "half-up universal" fue rechazado sin evidencia.
6. **Seguridad**: threat model de 20 amenazas (§14) + matriz de cifrado (§15). La hipótesis MVP (app lock + backup cifrado opcionales, DB encryption diferida) queda PROVISIONAL hasta que el threat model la justifique (T-004/T-013).
7. **Legal AR**: Caso A (local, sin servidor) tiene la superficie mínima; cada afirmación de no-aplicabilidad requiere alcance verificado (§17). Los Casos B–F escalan la superficie de forma no lineal.
8. **Licencia**: GPL-3.0-or-later PROVISIONAL (T-009); corrección de hecho: Firefly III es AGPL-3.0, no GPL-3.

**Lo que esta fase NO decide:** stack UI definitivo, implementación SQLite, esquema de balanceo, redondeo, primitivas de cifrado, licencia final, schema de backup. Ver §26–§28 y DECISIONS.md.

## 2. Product Definition

> Una aplicación de finanzas personales local-first, privada, gratuita y de código abierto que permita al usuario registrar, organizar y analizar su dinero sin entregar sus datos financieros a una empresa.

- **Qué es:** registro (ingresos/gastos/transferencias), organización (cuentas, categorías, presupuestos, metas), análisis descriptivo (balances, reportes). Multimoneda desde el día uno (ARS/USD/EUR y más). Argentina como caso de uso prioritario (Mercado Pago/Ualá/Brubank como nombres de cuentas locales; CBU/CVU/alias como texto informativo).
- **Qué NO es:** ver §3. El límite duro: MoneyFOSS nunca mueve dinero ni aconseja.
- **Usuarios objetivo:** personas en Argentina (y regiones con monedas volátiles) que quieren control total de sus datos financieros sin depender de servicios.
- **Modelo de datos conceptual:** ledger de double-entry interno con UX simple por encima (§7, §8).
- **Fuente de verdad:** el ledger. Cualquier cifra mostrada debe poder explicarse desde los datos almacenados (P-06). RECOMMENDATION: cada pantalla que muestre una cifra agregada debería poder listar las transacciones que la componen ("explicar esta cifra").

## 3. What MoneyFOSS Should NOT Become

Lista de exclusión ratificada (detalle en DECISIONS.md): banco, billetera custodial, procesador de pagos, exchange, broker, plataforma de inversión, proveedor de crédito, asesor financiero, contador, servicio fiscal, remesas, scoring crediticio, plataforma de préstamos, app que mueve dinero.

**INTERPRETATION — por qué este límite es también una decisión de riesgo:**
- Cada ítem de esa lista dispara superficies regulatorias distintas en Argentina (BCRA/CNV) y en las políticas de Play (§17, §20). Quedarse en "registro + análisis descriptivo" mantiene la superficie mínima.
- El riesgo de creep es real: "solo calcular cuotas del préstamo" o "solo sugerir presupuesto" son los primeros pasos hacia consejo financiero. RECOMMENDATION: los "simuladores" neutrales (calculadora matemática sin recomendación) pueden evaluarse más adelante como caso límite explícito, con análisis legal propio, y no en MVP.

## 4. Competition Analysis

Licencias verificadas por archivo LICENSE de cada repo vía API de GitHub (FACT, consultado 2026-09-29).

| Proyecto | Plataforma / stack | Modelo financiero | Local/offline | Portabilidad | Licencia | Mantenimiento |
|---|---|---|---|---|---|---|
| Firefly III | Web self-hosted (PHP/Laravel) | Double-entry (transacciones con journal) | Servidor propio | CSV/importers, API REST | **AGPL-3.0** | Activo (repo) |
| Actual Budget | Desktop (Node/Electron) + sync opcional | Envelope budgeting, sobre SQLite | Local-first con sync opcional | JSON/CSV | **MIT** | Activo (repo) |
| Money Manager Ex | C++/wxWidgets, desktop + Android | Cuentas/categorías clásicas | Local (SQLite, AES opcional) | CSV/QIF | **GPL-2.0** | Activo (repo) |
| MyExpenses | Android nativo (Java/Kotlin) | Cuentas/transferencias, planes | Local-first (WebDAV opcional) | CSV/QIF/JSON | **GPL-3.0** | Activo (repo) |
| Ivy Wallet | Android nativo (Kotlin/Compose) | Manual tracker | Local | CSV | **GPL-3.0** | **Sin mantenimiento desde 2024-11-05 (FACT, README del repo)** |

**Decisiones a reutilizar:**
- De Actual: separación de core (`loot-core`) del UI — arquitectura en capas del §11; local-first con sync estrictamente opcional.
- De MyExpenses: reconciliación contra extracto y export/import robusto como ciudadano de primera clase.
- De MMEX: DB portable SQLite con cifrado opcional; simplicidad de alcance ("features que el 90% quiere").
- De Firefly III: el ledger como concepto central y la disciplina de "no contactar servidores externos hasta que el usuario lo pida".

**Decisiones a evitar:**
- De Ivy Wallet: depender de un único mantenedor sin plan de sucesión — lección de gobernanza (riesgo R-6).
- De Firefly III: complejidad de servidor + PHP (no aplica, pero también: su UI expone conceptos de double-entry demasiado crudos; MoneyFOSS los oculta).
- De MMEX: UI heredada de desktop en móvil (no copiar densidad de features).
- De todos: no copiar features sin necesidad demostrada (regla AGENTS.md §1).

## 5. Differentiation

**FACT del mercado:** las propiedades FOSS/offline/privacy ya existen en el espacio (los cinco competidores arriba). No son diferenciación por sí solas.

Diferenciación candidata de MoneyFOSS (RECOMMENDATION, a validar con usuarios):
1. **Explicabilidad verificable:** toda cifra deriva del ledger; cada agregado se puede descomponer. Nadie de la lista lo ofrece como principio explícito.
2. **Build verificablemente sin red:** release gate que comprueba permisos/deps/código network-capable (§11, §14). "No network" demostrable, no prometido.
3. **Foco AR:** multimoneda con inflación en el roadmap de diseño (valor nominal vs real como vista derivada, §9 del producto), monedas de precisión no-2 (ARS=2, CLP/JPY=0, KWD=3).
4. **Gobernanza de sostenibilidad:** decisiones append-only, core desacoplado, testing de invariantes — respuesta directa a la lección Ivy Wallet.
5. **Zero-telemetry por diseño y por build** (no por promesa): ausencia de INTERNET en el APK release como gate.

## 6. Product Risks

| # | Riesgo | Severidad | Mitigación |
|---|---|---|---|
| R-1 | Corrupción de datos financieros (bug en balanceo/rounding) | Alta | Invariantes con tests (§24); commit atómico; backup/restore verificado |
| R-2 | Pérdida de datos del usuario (sin backup, restore roto) | Alta | `.moneybackup` lógico versionado (§13); round-trip tests |
| R-3 | Import malicioso/corrupto | Alta | Pipeline untrusted-input (§13b); prohibiciones AGENTS.md §5 |
| R-4 | Fuga de datos sin INTERNET (clipboard, logs, share, screenshots) | Media-Alta | §16; minimización de surface; sin logs de contenido |
| R-5 | Decisiones prematuras de stack que cuesten caro después | Media | Este proceso: PROVISIONAL/OPEN + spikes |
| R-6 | Abandono del proyecto (lección Ivy Wallet) | Media | Docs, core desacoplado, bajos requisitos de mantenimiento, comunidad desde temprano |
| R-7 | Expectativas legales del usuario ("es contabilidad?") | Media | Disclaimer explícito: registro personal, no contador/fiscal |
| R-8 | Expectativas de seguridad superiores a lo entregado (teléfono rooteado, malware) | Media | THREAT MODEL honesto con riesgos residuales aceptados |
| R-9 | F-Droid no compila el build (toolchain) | Media | Spike de build temprano (T-012) |

## 7. Financial Model Comparison

Comparación formal de los tres modelos candidatos, con el usuario NO viendo contabilidad en la UI.

| Criterio | 1. Simple cash-flow | 2. Double-entry | 3. Híbrido |
|---|---|---|---|
| Pago de tarjeta contado dos veces | Riesgo alto (gasto + "pago" como gasto) | Evitado por diseño | Depende de reglas ad-hoc |
| Transferencia como ingreso | Riesgo alto | Evitado | Evitable con tipo especial |
| Deudas/patrimonio | No modela | Modela (liability accounts) | Parcial |
| Devoluciones/refunds | Ambiguo | Correcto (posting invertido) | Correcto si se modela |
| Presupuestos por categoría | Natural | Natural si categoría es atributo del posting | Natural |
| Coste cognitivo interno (dev) | Bajo | Medio-alto | Medio |
| Coste UX (si se oculta el modelo) | Bajo | Bajo si el diseño es bueno | Bajo-medio |
| Multi-monedas | Difícil de hacer correcto | Natural con regla de balanceo (T-008) | Medio |
| Testabilidad de invariantes | Débil | Fuerte (Σ=0 verificable) | Media |
| Migración futura (presupuestos, metas, préstamos) | Reescrituras | Extensible | Extensible parcialmente |

**RECOMMENDATION (evidencia suficiente): double-entry interno con ocultación total en la UX.** El conjunto de errores que el usuario pidió evitar (§5 del prompt) es exactamente la clase de errores que cash-flow no puede prevenir y que el híbrido solo previene con reglas especiales que terminan reimplementando double-entry de forma implícita. El coste se paga una vez en el dominio; el beneficio (invariante Σ=0 testeable) sostiene toda la promesa de P-06.

**OPEN (T-008):** la regla exacta de balanceo con multimoneda (global / por moneda / patas de conversión explícitas). No congelar hasta el walkthrough de los 10 casos del checklist de §8.

**NOTA de honestidad:** double-entry no garantiza por sí solo corrección de datos de entrada (basura entra, basura sale); garantiza consistencia interna y explicabilidad.

## 8. Proposed Domain Model

Definiciones conceptuales antes de cualquier tabla SQL (prohibido diseñar schema en Fase 0; T-010/T-008 pendientes).

**Entidades nucleares (MVP candidates):**

- **Currency**: código (ISO 4217 alpha), exponente (minor units), símbolo, dc. Tabla embebida offline. Verificación puntual ARS/CLP/JPY/KWD pendiente (test de frontera).
- **Account**: nombre, tipo (ver abajo), moneda única, estado activo/archivado, orden, notas. **Una Account es una bolsa de valor en una sola moneda** (recomendación fuerte; evita saldos mezclados).
- **Transaction**: fecha (y opcionalmente fecha valor), descripción/contraparte, notas, estado (pendiente/clear), grupo de reconciliación. Es el evento; **no** tiene monto propio.
- **Posting** (o "leg"): transacción ↔ cuenta, cantidad con signo en la moneda de la cuenta, categoría (atributo del posting, ver abajo), monto equivalente si hay conversión (ver §10).
- **Category**: jerárquica o plana (OPEN, decisión UX); aplicada a postings.
- **RecurringRule**: plantilla + calendario; genera transacciones (pendientes o automáticas — decisión UX).
- **Budget**: categoría × período × monto objetivo (en una moneda: la de la categoría/cuenta dominante — detalle OPEN).
- **Goal**: objetivo de ahorro sobre cuenta(s) o monto, con fecha objetivo.

**Tipos de Account — auditoría de la propuesta ASSET/LIABILITY/INCOME/EXPENSE/EQUITY:**

Es el esquema contable clásico. Para una app personal, se audita así:

- **ASSET** (efectivo, banco, Mercado Pago, Ualá, Brubank): sí, imprescindible.
- **LIABILITY** (tarjeta, préstamo, deuda con alguien): sí, imprescindible.
- **INCOME / EXPENSE**: **INTERPRETATION** — en contabilidad clásica son cuentas, pero para una app personal es mejor modelarlos como **atributo categoría del posting** + un par de cuentas-sistema para el plano de capital propio (ver Equity). Razones: (a) los presupuestos necesitan categoría×período de todos modos; (b) evita explosión de "cuentas" que el usuario no percibe como cuentas; (c) mantiene el ledger puro debajo.
- **EQUITY**: necesario para **saldos de apertura** (opening balances): la pata que "entra del pasado". Sin Equity, el primer balance no cierra. Se implementará como cuenta(s)-sistema oculta(s) o mecanismo equivalente — OPEN el detalle, DECIDED la necesidad conceptual de una contraparte de apertura.

**Operaciones a representar (checklist canónico de 10 casos para T-008 — definido en el cierre de la Fase 0, §30, y supersede a la lista previa de esta sección):** gasto ARS · ingreso ARS · transferencia ARS · gasto USD · ingreso USD · compra con tarjeta de crédito ARS · pago de tarjeta ARS · conversión ARS→USD con tasa explícita · compra con precio ARS pagada desde cuenta USD · conversión ARS→USD con comisión. Cada una debe expresarse como Transaction+Postings y testear Σ de la regla de balanceo.

**Entidades diferidas (no MVP):** Attachment, ExchangeRate como tabla histórica (MVP: tasa puntual registrada en la transacción de conversión), Reconciliation como objeto persistente (MVP: estado clear por transacción).

**Invariantes propuestas (para §24):**
1. Toda Transaction satisface la regla de balanceo vigente (T-008) — invariante crítica.
2. Todo Posting referencia Account existente y moneda de la cuenta; cantidad entera ≥ representable.
3. Account moneda inmutable (cambiar moneda = crear cuenta + transacción de conversión).
4. Transaction inmutable tras commit salvo edición explícita que re-valide (1).
5. Eliminación de Account solo si no tiene postings (o soft-delete + bloqueo).
6. Import/backup solo escriben vía el mismo validador del dominio.

## 9. Money / Currency Model

- **P-07 (DECIDED):** enteros en minor units. Float/double prohibido en todo el código y parsers (incluye JS: `Number` no es entero seguro para dinero; usar BigInt o int64 de la capa nativa según representación final — parte de T-006).
- **T-006 (PROVISIONAL):** representación recomendada: `int64 minor units` + `exponent` de tabla ISO 4217 embebida offline. Trade-offs documentados en DECISIONS.md T-006. Límite int64 ≈ 9.2×10¹⁸ minor units — holgado para finanzas personales; requiere validación explícita de rango al importar (prevención de overflow en sumas: regla del dominio, test incluido).
- **ISO 4217** (FACT: ISO 4217:2015 define códigos alfa/numéricos y la relación unidad-minor-unit por moneda; edición 8 (2015), confirmada vigente en revisión 2021 — iso.org, consultado 2026-10-04; la lista completa oficial es de pago). **INTERPRETATION con evidencia convergente (2026-10-04):** exponentes ARS=2, USD=2, EUR=2, CLP=0, JPY=0, KWD=3 verificados contra dos fuentes secundarias independientes sincronizadas con SIX Group (lista ISO-4217 de Mastercard cross-border + paquete iso4217 de Go con tabla completa alfa/numérico/exponente). La lista oficial completa sigue sin fuente primaria gratuita: el snapshot embebido se congela solo con test de verificación puntual por moneda. **INTERPRETATION:** embebemos un snapshot derivado (no en runtime online) + mecanismo de actualización vía release de la app (no vía red del core).
- **Casos de precisión a testear:** ARS (2), CLP/JPY (0), KWD/BHD (3), y monedas sin minor unit teórico (MRU=5). Verificación puntual de cada exponente contra tabla vigente = test.
- **Formateo:** separadores y símbolos según locale del usuario; **parseo** estricto (locale explícito o ISO) en import — el parseo ambiguo "1.000,00" vs "1,000.00" es fuente de corrupción: pipeline lo declara en el preview.
- **Nunca:** conversión implícita a float para calcular; redondeo implícito; asunción de 2 decimales.

## 10. Multi-Currency Model

- **Cada Account conoce su moneda** (DECIDED como principio; detalle en §8).
- **Conversión = información de primera clase.** Toda conversión conserva: moneda origen, moneda destino, cantidad origen, cantidad destino, tasa aplicada, fecha-hora de la tasa, fuente (manual/institución/archivo), método de redondeo aplicado. Con eso, cualquier operación es auditable después (P-06).
- **Tasas:** manuales en MVP. Sin APIs de cotización en el core (DECIDED). Una futura tabla ExchangeRate histórica es LATER; el MVP registra la tasa dentro de la operación puntual.
- **Transacción multicurrency:** (ej. dolarización de ahorros: salgo de ARS en cuenta A, entro a USD en cuenta B). La transacción tiene postings en dos monedas distintas; el balanceo se resuelve con el mecanismo de T-008 (opciones y trade-offs documentadas ahí). **RECOMMENDATION:** patas de conversión explícitas (la pata puente es visible en la UI como "tipo de cambio aplicado") — es la opción más auditable; sigue OPEN hasta el walkthrough.
- **Conversiones no exactas:** (ej. tasa que da 3.3333…) — el residuo no puede desaparecer silenciosamente. Opciones: (a) redondear la pata destino y registrar el método; (b) mantener pata con más precisión + pata visible redondeada. **OPEN (T-007).** Regla rectora ya ratificada: ninguna conversión pierde precisión sin que quede registro del método (P-06 aplicado a FX).
- **Cuentas en moneda extranjera:** el patrimonio "total" solo existe en una moneda de consolidación elegida por el usuario y a una tasa declarada — RECOMMENDATION: la UI debe etiquetarlo como "estimación a tasa X del día Y", nunca como saldo contable duro.

## 11. Offline Architecture

- **Principio (P-01, DECIDED):** todo funciona en airplane mode: cuentas, movimientos, edición, transferencias, historial, balances, presupuestos, metas, reportes, backup/restore, import/export.
- **Sin reloj de red:** timestamps del dispositivo; la app no depende de NTP ni de "hora del servidor". Consecuencia: fechas potencialmente erróneas si el reloj del usuario está mal — aceptado, es el precio de offline puro (INTERPRETATION; se documenta en THREAT_MODEL como amenaza de datos, no de seguridad).
- **Arquitectura en capas** (hipótesis original, auditada):

```
UI (Android / RN)
   ↓  (view models / estado de presentación; SIN semántica financiera)
Application layer (casos de uso: crear transacción, importar, respaldar)
   ↓
Financial Domain (ledger puro: entidades, invariantes, validadores, dinero entero)
   ↓ puerto (interfaz propia, definida por el dominio)
Persistence adapter (SQLite x, migraciones)
```

- **Regla ponytail aplicada:** el dominio es independiente de RN por diseño y de SQLite vía puerto — PERO una sola implementación del puerto mientras no exista la segunda (prohibida la sobre-abstracción).
- **INTERNET permission:** ver T-002. La investigación de la cadena completa:
  1. **Por qué aparece INTERNET:** INTERPRETATION a confirmar en spike — la convención de la plantilla RN es declararlo (para dev) y librerías comunes lo heredan; el manifest merger lo lleva al final si nadie lo quita. El punto de declaración exacto NO fue verificado en esta fase (los intentos de fetch de la plantilla devolvieron 404); queda como primera pregunta del spike.
  2. **Quién lo declara:** a determinar por versión (ReactAndroid, Expo modules, otros) — spike.
  3–4. **tools:node="remove" es suficiente en el merger** (FACT: el merger respeta marcadores tools del manifest de mayor prioridad para eliminar elementos de menor prioridad — Android Developers, "Manage manifest files", developer.android.com/build/manage-manifests, consultado 2026-09-29). Que el elemento desaparezca del APK final y que el runtime no lo necesite son afirmaciones distintas → spike.
  5. **Qué dependencia necesita red de verdad:** inventario en spike; regla: ninguna dependencia con red entra sin entrada en DECISIONS.md.
  6–7. **APK final sin permiso / efectos runtime:** verificación con apkanalyzer + pruebas sin red (crash de capa nativa, fallbacks).
  8. **Release gate automático** (RECOMMENDATION, diseño):
     - assert manifest final (del AAB/APK) no contiene `uses-permission` salvo lista blanca vacía o mínima;
     - SBOM de deps + scan de APIs de red conocidas (OkHttp/retrofit/websockets) — binario y código;
     - pruebas instrumentadas en airplane mode;
     - firma + hash reproducible cuando el toolchain lo permita.
- **iOS/desktop:** fuera de Fase 0; el puerto del dominio los hace posibles sin prometerlos.

## 12. SQLite vs WatermelonDB vs Alternatives

Comparación seria, con criterios del proyecto. FACT base por READMEs consultados 2026-09-29 (expo-sqlite vendoriza SQLite3+SQLCipher; WatermelonDB MIT, reactivo, "sync with your own backend"; op-sqlite MIT, JSI, SQLCipher opcional).

| Criterio | expo-sqlite | op-sqlite | WatermelonDB | SQLite nativa Kotlin (directa) |
|---|---|---|---|---|
| Modelo | driver SQLite (Expo) | driver SQLite (JSI, más cercano al metal) | ORM reactivo + lazy loading sobre SQLite | driver directo |
| Sync | no trae | no trae | su feature central (backend propio) | no trae |
| Encaje con P-02 (sin backend) | ✅ | ✅ | ⚠️ su sync queda muerto; coste del framework sin beneficio | ✅ |
| Cifrado posterior | SQLCipher vendorizado ✅ | SQLCipher como target ✅ | depende del adapter (limitado) | SQLCipher directo ✅ |
| Migraciones | manuales (control total) | manuales | propias del framework | manuales |
| Control del SQL | total | total | limitado (API del ORM) | total |
| Riesgo de dependencia | Expo (mitigable: vendor) | tercero individual (bus factor) | tercero + RxJS | ninguno externo |
| F-Droid build | ✅ (source disponible) | ✅ | ✅ | ✅ |
| Licencia | MIT (Expo) | MIT | MIT | N/A |
| Encaje con T-001 RN/Expo | alto | alto | alto | nulo (solo con Kotlin) |
| Encaje con T-001 Kotlin | nulo | nulo | nulo | alto |

**Lectura honesta (INTERPRETATION):**
- WatermelonDB resuelve un problema que MoneyFOSS no tiene (sync) y su valor reactivo se puede lograr con queries + estado simple; su coste (framework, adapter, API propia sobre el SQL) no está justificado **hoy**. Esto NO es una decisión: es la evaluación actual (T-003 OPEN).
- La elección real depende de T-001: si RN/Expo sobrevive al spike T-002, el driver expo-sqlite u op-sqlite son candidatos directos (elección entre ellos = otra comparación fina de Fase de implementación: rendimiento, soporte SQLCipher, FTS si se necesita búsqueda, mantenimiento); si el spike mata RN/Expo, la alternativa Kotlin usa SQLite nativa directa.
- **Invariantes de arquitectura independientes de la elección:** el dominio no conoce SQLite; todas las escrituras pasan por transacciones atómicas; migraciones versionadas y testadas; imposible "mystery balance" persistido (P-06).

**Spike definido (T-002, a ejecutar solo con autorización):**
1. Proyecto RN+Expo CNG mínimo, sin código de red propio.
2. `npx expo prebuild` → inspeccionar manifests de todos los AARs (qué nodo declara `INTERNET`).
3. Aplicar `tools:node="remove"` en el manifest app release → build → `apkanalyzer manifest print` sobre el AAB/APK final.
4. Pruebas instrumentadas sin red ni permiso: flujos básicos + expo-sqlite.
5. Registro de resultados y del release gate (§11.8).

*(Ejecutado 2026-10-04: ver §32 y `evidence/T002_EVIDENCE.md`.)*

## 13. Backup / Import / Export Architecture

### 13a. Tres formatos, tres propósitos (DECIDED como principio P-05/P-09)

- **CSV:** para hojas de cálculo y análisis humano. Plano, legible, con advertencias de redondeo. No es para restore.
- **JSON:** interoperabilidad máquina-a-máquina (y futuras integraciones). Estructura documentada, versionada.
- **`.moneybackup`:** recuperación completa y única fuente de restore. Lógico, versionado, validable, portable, independiente de SQLite, capaz de sobrevivir a migraciones.

**NO usar (DECIDED):** ZIP del archivo SQLite, dump de base, copia de directorio de la DB como formato público. Razón: acopla el formato a la estructura física y a las migraciones; encriptar/corruptar/versionar todo eso es frágil.

**Equivalencia semántica (definición):** `restore(backup(app_state)) == app_state` a nivel lógico: mismas cuentas (ids), monedas, transacciones, postings, categorías, presupuestos, metas, reglas recurrentes, tasas registradas en operaciones, ajustes aplicables, y versiones. **Fuera del estado lógico:** cachés, búsquedas, preferencias triviales de UI (tema), y archivos adjuntos si existieran (quedan explícitamente marcados como no cubiertos hasta que existan). **Estado del schema exacto: OPEN (T-010).** Estructura conceptual: manifest (versión de formato, versión de app, fecha, conteos, checksum) + cuerpo lógico completo. Validación al restore: schema válido → semántica válida (invariantes del dominio) → conteos coinciden → commit atómico reemplazando estado anterior (con backup de seguridad del estado previo antes de restaurar).

### 13b. Importación (untrusted input — pipeline obligatorio)

`parse → validate schema → validate semantics → duplicates/conflicts → preview → confirm → atomic commit`

| Etapa | Qué significa exactamente |
|---|---|
| parse | decodificar bytes → estructura bruta. Cero contacto con la DB. Límites de tamaño/tiempo. Prohibido todo lenguaje dinámico (AGENTS.md §5.3) |
| validate schema | tipos, campos obligatorios/unknown, códigos de moneda existen, fechas bien formadas, cantidades enteras |
| validate semantics | invariantes del dominio: cuentas referidas existen o se crean (política explícita en preview), regla de balanceo, rangos de cantidad (overflow), monedas de cuentas correctas |
| duplicates/conflicts | ver abajo — produce lista de acciones propuestas, nunca muta |
| preview | UI muestra: altas, posibles duplicados, conflictos, rechazos con razón — el usuario decide por acción o lote |
| confirm | acción explícita del usuario |
| atomic commit | transacción única de DB; si algo falla, nada queda escrito; log del resultado |

**Identidad de transacción (para duplicados) — opciones con trade-offs:**
- ID externo (si el archivo lo trae: id de otro sistema): fuerte pero no siempre existe.
- Fingerprint compuesto: cuenta + fecha (+/- tolerancia) + moneda + monto + descripción normalizada + import source (+ metadata). Trade-offs: tolerancia corta = falsos duplicados; larga = falsos negativos; normalización de descripción (mayúsculas, espacios, montos dentro del texto) es la parte difícil.
- Hash exacto de la fila cruda: solo detecta reimportación idéntica.
- **RECOMMENDATION:** fingerprint compuesto + ID externo cuando exista + hash de fila para idempotencia de reimportación. La calibración de tolerancia es decisión UX en preview (el usuario ve candidatos y decide). **Nota honesta:** esto NO es una decisión congelada; es el diseño candidato (parte de T-007/T-011 si se materializa como regla).

**Duplicado ≠ conflicto (DECIDED como principio):** mismo identificador (externo o fingerprint) + contenido idéntico = duplicado (se omite o se marca). Mismo identificador + contenido distinto (ej. monto diferente) = **conflicto**: nunca sobrescribir silenciosamente; se presenta y el usuario elige (mantener propio / tomar nuevo / crear ambos renombrados).

**Idempotencia:** importar dos veces el mismo archivo = cero cambios netos la segunda vez (test obligatorio).

## 14. Security Threat Model

Metodología: para cada amenaza — asset, atacante, vector, impacto, mitigación, riesgo residual. Sin marketing.

| # | Amenaza | Asset | Atacante | Vector | Impacto | Mitigación | Riesgo residual |
|---|---|---|---|---|---|---|---|
| 1 | Teléfono robado (apagado) | DB completa | Ladrón común | Extracción de flash / boot | Lectura de datos | FBE del SO (dispositivo cifrado por defecto), bloqueo de pantalla del sistema | Bajo (FACT-INTERP: FBE protege en reposo; ver §15) |
| 2 | Dispositivo desbloqueado en otras manos | DB abierta | Conocido, físico | Uso directo | Lectura total | App lock opcional (T-013) | Alto si no se activa; medio si activo (ver §15 límites) |
| 3 | Backup robado | Backup completo | Quien obtenga el archivo | Cloud/compartir mal hecho | Lectura total | Cifrado opcional del backup (T-005) | Alto si sin cifrar y filtrado |
| 4 | Backup compartido por error | Backup | — (error del usuario) | Share sheet equivocado | Exposición | Nombre/destino claro; advertencia en share; sin autoupload | Residuo humano; mitigación educativa |
| 5 | Archivo importado malicioso | DB, dispositivo | Remoto/local | CSV/JSON/backup crafted | Corrupción, inflación de datos, en extremo explotar el parser | Pipeline §13b; límites; sin evaluación dinámica | Bajo-medio (bugs de parser) |
| 6 | Deep link malicioso | DB | Remoto | URL que abre la app con acción | Acción no autorizada | RECOMMENDATION: no registrar deep links en MVP (sin deeplinks, sin superficie) | Bajo si no hay deeplinks |
| 7 | Share accidental | Export | — (error usuario) | Share sheet | Exposición | Previews de destino; nombres claros | Humano |
| 8 | Logs | Metadatos | Cualquiera con acceso a logs | logcat / archivos | Fuga de descripciones/montos | Sin log de contenido financiero; log de diagnóstico opt-in, sanitizado | Bajo |
| 9 | Screenshots | Pantallas | Otra persona | Captura | Exposición visual | FLAG_SECURE opcional (decisión UX, afecta UX) | Medio si no se usa |
| 10 | Clipboard | Montos/descripciones | Otra app (local) | Lectura del portapapeles | Fuga puntual | Evitar copiar datos sensibles; no leer clipboard nunca | Bajo-medio (sistema) |
| 11 | Intents Android | DB/export | Otra app | Envío de intents | Acción no autorizada | Exported=false por defecto; sin receivers innecesarios | Bajo con auditoría de manifest |
| 12 | Malware local | DB | Malware con privileges | Lectura de archivos internos (con root o exploit) | Lectura total | DB encryption (T-004) reduce lectura en reposo; sin garantía en memoria activa | Alto frente a root/exploit activo — NO resoluble por la app |
| 13 | Dependencia comprometida | Todo | Supply chain | Paquete malicioso | Variable | Política de dependencias (T-011); SBOM; mínimas deps; hashes/lockfile | Medio (residuo de ecosistema) |
| 14 | DB corrupta | DB | — (bug/hardware) | I/O, crash, disco | Pérdida | Transacciones atómicas; verificación al abrir; backups; modo de recuperación de solo lectura | Medio |
| 15 | Backup corrupto | Backup | — | Transporte/storage | Restore falla | Checksums; validación total antes de commit; estado previo intacto | Bajo |
| 16 | Pérdida de contraseña/PIN | Datos cifrados | — (usuario) | Olvido | Datos inaccesibles | Recovery keys opcionales (T-005); trade-off documentado; sin backdoor | Elegido por el usuario |
| 17 | Downgrade | App/DB | Atacante local | APK viejo con vulnerabilidad | Variable | Firma; no soportar restore a formatos viejos sin migración explícita | Bajo-medio |
| 18 | Restore incompatible | Estado | — (usuario) | Backup de versión distinta | Fallo o corrupción | Validación estricta de versión de formato; migraciones de formato documentadas | Bajo |
| 19 | APK modificado | Todo | Distribuidor malicioso | Repack firmado distinto | Todo | F-Droid builds desde source; firmas publicadas; reproducibilidad cuando posible | Medio (canal de distribución) |
| 20 | Usuario malicioso con acceso físico | DB | root/ingeniero inverso | Extracción | Lectura total (si sin cifrado) | Igual que 12; límite honesto: contra root determinado no hay defensa completa en la app | Alto — documentado como no resoluble |

**Amenazas que explícitamente NO resolvemos (documentado para no prometer):**
- Atacante con root activo mientras la app corre y descifra.
- Malware con privilegios de sistema en el dispositivo.
- Errores humanos de share/backup.
- Dispositivo comprometido a nivel firmware/OS.

## 15. Encryption Analysis

Marco por mecanismo — qué protege, contra quién, qué NO protege, pérdida de credencial, migración/restore, coste, riesgo de implementación, compatibilidad offline. FACT base: recomendaciones de algoritmos de la plataforma (AES-GCM 256, SHA-2, HMAC) — Android Developers "Cryptography", consultado 2026-09-29; Android Keystore para mayor seguridad de claves — misma fuente.

| Mecanismo | Protege / contra quién | NO protege | Pérdida de credencial | Migración/restore | Coste | Riesgo impl. | Offline |
|---|---|---|---|---|---|---|---|
| **FBE (dispositivo, del SO)** | Datos en reposo ante robo apagado | Dispositivo desbloqueado; malware vivo | N/A (del sistema) | N/A | 0 (ya está) | 0 | ✅ |
| **Android Keystore** | Claves no extraíbles (biometría/app lock, claves de backup) | Malware vivo con root; extracción de chip en teoría avanzada | Clave irrecuperable si borrada | Clave ligada al dispositivo → backups cifrados con Keystore no restauran en otro dispositivo sin diseño explícito | Bajo-medio | Bajo (API estable) | ✅ |
| **App lock (PIN/biométrico)** | Uso casual del dispositivo desbloqueado | Root; obtención de PIN por observación; exploit del lock | PIN olvido → RECOMMENDATION: sin recuperación (sin backdoor), datos siguen accesibles si sin cifrado de DB | N/A | Bajo-medio | Bajo | ✅ |
| **Backup encryption (passphrase + KDF + AEAD)** | Backup en reposo (cloud/mail/compartido) | Passphrase débil; malware en el dispositivo al crear/restaurar | Sin passphrase = sin datos (o recovery keys opcionales — T-005) | El cifrado viaja DENTRO del formato; restore en cualquier dispositivo | Medio | Medio (KDF y AEAD bien elegidos; ver T-005) | ✅ |
| **DB encryption (SQLCipher u otro)** | Archivo de DB en reposo ante exfiltración (root file access, backup del SO) | Dispositivo desbloqueado en uso; memoria; root activo | Contraseña olvidada = DB inaccesible (o clave en Keystore con límites) | Requiere diseño: la DB cifrada con clave local no se restaura igual en otro dispositivo; backups lógicos siguen siendo el camino | Medio-alto (tamaño, rendimiento, migraciones) | Medio | ✅ |
| **Export encryption** | Export puntual compartido | Igual que backup | Igual | Igual | Bajo (reusar mecanismo de backup) | Bajo | ✅ |

**Hipótesis MVP original (backup cifrado opcional + app lock opcional; DB encryption diferida) — auditoría:**
- A favor: cubre los vectores más probables (robo apagado→FBE; desbloqueado casual→app lock; backup filtrado→cifrado). Evita el coste/riesgo de SQLCipher en MVP.
- En contra honesto: deja expuesta la exfiltración del archivo de DB por root/malware (amenazas 12/20). La existencia de SQLCipher vendorizado en expo-sqlite (FACT citado en T-003) reduce el coste de adoptarlo más adelante.
- **Estado: PROVISIONAL (T-004/T-013)** — la decisión final sale del threat model con riesgos residuales aceptados explícitamente por el usuario, no de esta tabla.

## 16. Android Security Boundaries

FACT/INTERPRETATION sobre qué puede escapar aunque la app no tenga INTERNET (con fuente: documentación de Android Developers sobre almacenamiento, SAF, intents, clipboard — consultada 2026-09-29 donde indicado):

| Vector | ¿Escapa información sin INTERNET? | Detalle y mitigación |
|---|---|---|
| Sandbox + internal storage | No por sí mismo | Archivos internos de la app, aislados por UID (INTERPRETATION de modelo de seguridad Android) |
| External storage / SAF | Sí, si el usuario elige | El usuario puede exportar/importar a cualquier lugar (eso es diseño); SIN la interacción del usuario no hay acceso directo moderno a storage general |
| SAF (Storage Access Framework) | Por diseño, con consentimiento | Cada export/import es una acción explícita del usuario — bien |
| Intents / share | Sí | share/send de exports a cualquier app destino elegida; mitigación: previews claros, no autoshare |
| Deep links | Si se registran | RECOMMENDATION MVP: no registrar |
| Clipboard | Sí, local | Otras apps pueden leer; no copiar datos sensibles innecesariamente; nunca leer clipboard |
| Screenshots | No "escapa" del dispositivo; sí del app | FLAG_SECURE opcional (T-013-adjacente) |
| Notifications | Sí, si meten contenido | MVP: notificaciones mínimas o ninguna; nunca montos en notificaciones |
| Cache/temp files | Sí a otras apps del perfil (limitado) | Borrar temporales de import/export inmediatamente; usar internal storage |
| Crash logs / debug logs | Sí (logcat, reportes opt-in) | Sin contenido financiero en logs (THREAT #8); sin reportes remotos |
| Backups del SO (Android Auto Backup / Transfer) | Sí — puede copiar DB a Google/otro destino | **RECOMMENDATION explícita:** `android:allowBackup="false"` (o reglas de backup de datos finas) — sin esto, una app "sin INTERNET" puede igual terminar en la nube del usuario vía backup del sistema. Verificación en el gate (§11.8) |
| Malware local | Sí, con root/exploit | THREAT 12/20 — no resoluble por la app |

**Conclusión (INTERPRETATION, fuerte):** "sin INTERNET" ≠ "sin fuga". La superficie real de escape es: backups del SO, share explícito, clipboard, logs, y archivos temporales. Todas las mitigaciones listadas son baratas y deben entrar al checklist de release (§24/§11.8).

## 17. Argentina Legal Research

**Metodología:** solo afirmaciones con alcance verificado; lo no verificado = OPEN QUESTION. Etiquetas por afirmación. Fuentes primarias consultadas 2026-09-29.

- **FACT — Ley 25.326 (Protección de Datos Personales, sanción 2000-10-04, BO 2000-11-02):** su objeto es "la protección integral de los datos personales asentados en archivos, registros, bancos de datos, u otros medios técnicos de tratamiento de datos, sean éstos públicos o privados **destinados a dar informes**" (Art. 1, texto original consultado en argentina.gob.ar/normativa/nacional/ley-25326-64790/texto). Define responsable de archivo, tratamiento, transferencia, etc.
- **INTERPRETATION (caso A):** una app local que no recolecta ni transmite datos de nadie, y donde el único tratamiento de datos lo hace el propio usuario sobre sus propios datos, está fuera del núcleo típico de la ley (archivos de terceros "destinados a dar informes"). **No es una afirmación de inaplicabilidad general** — es lectura del alcance del Art. 1 para el caso A. **OPEN QUESTION:** ¿existe jurisprudencia/guía AAIP específica sobre software local de uso personal sin servicio? (investigar con AAIP; no se encontró guía específica en esta fase).
- **FACT — AAIP:** es la autoridad de aplicación de la Ley 25.326 (estructura institucional; argentina.gob.ar/aaip). Guía específica para apps locales sin servicio: no encontrada en esta fase (OPEN).
- **BCRA — FACT:** regula proveedores de servicios de pago (registro de PSP, cuentas de pago; bcra.gob.ar "Registro de proveedores de servicios de pago"; texto ordenado PSP en bcra.gob.ar/archivos/Pdfs/Texord/t-snp-psp.pdf). **INTERPRETATION:** ese régimen alcanza a quien provee servicios de pago / cuentas de pago — no a un registro contable local. **No se afirma "BCRA no aplica" como hecho general**: se afirma que el régimen identificado regula intermediación de pagos, que MoneyFOSS caso A no hace. Cualquier feature futura que toque pagos/retenciones/intermediación invalida esta lectura (Casos D–F).
- **CNV:** regula mercados/inversores (ámbito propio). **INTERPRETATION caso A:** sin funcionalidad de inversión ni asesoramiento, no hay vínculo normativo identificado. OPEN QUESTION: verificar si existiera algún régimen aplicable a "recomendaciones" (Caso E) antes de evaluar ese futuro.
- **INDEC (para el roadmap de inflación):** proveedor oficial de índices de precios (institucional, indec.gob.ar). Diseño: los índices entran como datos que el usuario importa/elige, no como dependencia de red del core (DECIDED en espíritu P-01; mecanismo exacto OPEN, T-014).
- **Superficie por caso:**

| Caso | Superficie legal (INTERPRETATION salvo indicado) |
|---|---|
| A. Local, sin cuenta, sin servidor, datos en dispositivo | Mínima. Sin tratamiento de terceros (ley 25.326); sin intermediación (BCRA/CNV). Disclaimer + revisión profesional antes de distribuir |
| B. Cloud sync | Aparece tratamiento/transferencia de datos (25.326), terminos de servicio, responsabilidad; si es el usuario con su propio storage (WebDAV propio), superficie menor pero existente |
| C. Analytics remoto | Tratamiento de datos personales (25.326), GDPR si hay usuarios UE (§18), políticas Play, obligación de aviso |
| D. Banking integration | Régimen PSP/BCRA potencialmente aplicable, requisitos de seguridad, contratos — revisión profesional obligatoria |
| E. Financial recommendations | Posible calificación como asesoramiento (CNV si es inversión; responsabilidad civil) — revisión profesional obligatoria |
| F. Investment functionality | Régimen CNV/brokerage — revisión profesional obligatoria |

- **Disclaimer permanente (buena práctica):** esta fase no es asesoramiento legal. Antes de distribución pública: revisión de abogado especializado. Casos D–F: revisión profesional obligatoria antes de diseñarlos.

## 18. International Legal Considerations

- **GDPR (FACT, Reglamento (UE) 2016/679, Art. 5 consultado vía gdpr-info.eu, 2026-09-29):** principios de minimización, limitación de propósito, integridad/confidencialidad, accountability. **INTERPRETATION:** una app sin telemetría, sin cuentas, sin servidor, que no recolecta nada, tiene una superficie GDPR mínima (no hay tratamiento por el desarrollador). Las obligaciones aparecen con: analytics (C), sync gestionado (B), o distribución con servicios integrados. **OPEN QUESTION:** obligaciones específicas si se distribuye por Play/Apple con sus declaraciones de datos (Play Data Safety) — verificar en la fase de distribución.
- **App stores:** Play exige declaraciones (Data Safety, Financial features declaration — ver §20); F-Droid exige política de inclusión (ver §20). **INTERPRETATION:** las declaraciones son más simples cuanto menos recolección: MoneyFOSS diseñada así minimiza el esfuerzo de cumplimiento.
- **Financial advice boundary (INTERPRETATION general):** la frontera entre "herramienta de registro" y "consejo financiero" es regulatoriamente sensible en muchas jurisdicciones (ver Caso E). RECOMMENDATION de producto: nunca presentar saldos/presupuestos como recomendaciones ("deberías…"); solo descriptivo.
- **Consumer protection (OPEN QUESTION):** verificar si la distribución gratuita sin contrato activa obligaciones específicas en AR/UE para software gratuito — investigación en fase de distribución.
- **Conclusión:** las decisiones de arquitectura sin-recolección (P-01/P-02/P-03) son también la mejor estrategia legal internacional: menos datos = menos obligaciones.

## 19. Open Source License Analysis

FACTs (verificados 2026-09-29 por LICENSE en cada repo): Firefly III = AGPL-3.0; MMEX = GPL-2.0; MyExpenses = GPL-3.0; Ivy Wallet = GPL-3.0; Actual = MIT; React Native = MIT; expo (SDK) = MIT; WatermelonDB = MIT; op-sqlite = MIT; ponytail = MIT; proxy caveman = BSL-1.1.

| Criterio | GPL-3.0-or-later | MIT | Apache-2.0 |
|---|---|---|---|
| Copyleft | Fuerte (distribución → misma licencia) | Ninguno | Ninguno (patent grant sí) |
| Forks cerrados | Impedidos (si distribuyen) | Permitidos | Permitidos |
| Compatibilidad inbound | MIT/BSD ✅; Apache-2.0 ✅ hacia GPLv3 (one-way); LGPL ✅ con condiciones | Todo entra | Todo entra |
| Obligaciones al distribuir | Fuente completa, licencia, cambios | Aviso | Aviso + NOTICE + cambios |
| F-Droid | ✅ | ✅ | ✅ |
| Play | ✅ | ✅ | ✅ |
| Assets/fonts/icons | Necesitan licencias libres redistribuibles (OFL típico) | Igual | Igual |
| Riesgo para el proyecto | Bajo (nadie está obligado a liberar si no distribuye; SaaS no dispara GPLv3 — pero sí AGPL) | Ninguno | Ninguno |
| Interop con competidores GPL | GPLv3 ← AGPL del ecosistema: reutilizar código de Firefly III (AGPL) obligaría a AGPL, no GPL — atento si algún día copiamos código suyo | — | — |

**Hipótesis GPL-3.0-or-later — auditoría:**
- A favor: el ecosistema de referencia (MyExpenses, Ivy) es GPL-3; impide forks cerrados del trabajo comunitario; el usuario no pierde derechos (recibe fuente siempre que se distribuya).
- En contra honesto: complica reutilizar el código en productos no-copyleft futuros (si existieran) y exige disciplina con assets/deps.
- **Estado: PROVISIONAL (T-009).** Decisión final tras: auditoría del set real de dependencias (T-011), licencias de assets/fonts (OFL/SIL o equivalentes verificados), y decisión explícita del usuario sobre copyleft.
- **RECOMMENDATION provisional:** GPL-3.0-or-later (el "-or-later" da flexibilidad futura contra cambios del ecosistema) — pero no congelada.

## 20. F-Droid / Play / GitHub Distribution

| Canal | FACT relevantes | Implicación |
|---|---|---|
| **GitHub Releases** | Distribución directa de APKs firmados por nosotros | Control total; el usuario debe confiar en nuestra firma; auto-update no incluido |
| **Direct APK** | Igual que arriba | Igual |
| **F-Droid** | Inclusion Policy: FLOSS verificado, sin SDKs propietarios de tracking/ads/analytics (Google Play Services, Firebase, Crashlytics prohibidos), toolchain 100% FLOSS, app mantenida, Application ID propio, builds compilados por la infraestructura de F-Droid desde source (consultado 2026-09-29, f-droid.org/en/docs/Inclusion_Policy) | Nuestro modelo encaja; exige: sin deps propietarias, build reproducible/compilable por su toolchain, metadata, anti-features correctamente declaradas si existieran (no deberían) |
| **Google Play** | Financial features declaration obligatoria para TODAS las apps (formulario en App content; policies de Financial Services para préstamos etc.) (consultado 2026-09-29, support.google.com/googleplay/android-developer/answer/9876821 y /13849271) | Para MoneyFOSS: declarar que no hay features financieras reguladas; Data Safety honesto (cero recolección). Play NO es dependencia (P-12) |

- **Anti-features F-Droid:** conceptos como publicidad/tracking/no-sync up-stream — MoneyFOSS no debería declarar ninguna.
- **Reproducibilidad:** objetivo (no promesa): builds reproducibles; F-Droid compila desde source — el spike de build (T-012) validará el toolchain.
- **Signing:** clave de firma de release gestionada por nosotros (no App Signing de Play, que ataría a Play); almacenamiento seguro de la clave = decisión operativa (no de código).
- **GMS:** ninguna dependencia (P-12). Sin FCM, sin Play Services, sin billing.
- **RECOMMENDATION:** F-Droid como canal principal (confianza, verificación), GitHub Releases como canal directo, Play opcional al final si el costo de cumplimiento vale la audiencia.

## 21. Dependency Policy

Reglas (refuerzan AGENTS.md §1/§5 y T-011):

1. Toda dependencia nueva requiere entrada en DECISIONS.md: qué problema resuelve, qué alternativa (incl. "ninguna"), licencia, ¿acceso a red?, tamaño binario, mantenimiento (última release, bus factor).
2. Preferencia descendente: stdlib/función de plataforma → código propio simple → dependencia ya usada → dependencia nueva mínima.
3. Dependencias con red: prohibidas en el core; si una dependencia indirecta necesita red (o declara permisos), se documenta y pasa el release gate (§11.8). Inventario permanente de permisos inducidos.
4. Sin frameworks "para todo": sin state managers globales por defecto, sin DI pesado, sin HTTP clients, sin analytics de ningún tipo.
5. Lockfile + hashes (supply chain, THREAT 13); revisión de diffs de upgrades mayores.
6. Licencias aceptables para inbound: MIT/BSD/Apache-2.0/ISC/OFL(assets); LGPL solo si la forma de enlace es clara; GPL en librería obliga a evaluar T-009 antes de aceptar. AGPL: prohibida como dependencia salvo decisión explícita en contrario.
7. Cero dependencias "mientras tanto": una dep que se deja de usar se elimina en la misma fase.

## 22. MVP Proposal

Auditoría del scope candidato. Cambios propuestos (justificados, no por capricho):

- **`reconciliation` baja de SHOULD a LATER:** el estado clear/pendiente por transacción cubre el caso práctico mínimo; la reconciliación formal (import de extracto + matching) es costo alto y depende de la identidad de duplicados (T-007) que aún está abierta.
- **`duplicate detection` sube a MUST dentro del import:** no es una feature, es parte del pipeline de seguridad (§13b) — sin ella, importar dos veces corrompe los datos.
- **`widgets/shortcuts` baja a LATER:** valor real pero no crítico; cada surface de UI es superficie de riesgo/mantenimiento en MVP.
- **`app lock` y `backup encryption` siguen SHOULD con estatus PROVISIONAL** (T-004/T-005/T-013): son los mecanismos que el threat model probablemente pedirá, pero la decisión es del threat model, no del scope.

### MUST (núcleo, ninguna negociable)
Accounts · categories · income/expenses/transfers · balances derivados del ledger · history · multi-currency · dinero entero (P-07) · ledger + invariantes testeadas · search/filter básico · notes · SQLite (u otra implementación decidida) · migraciones · **import con pipeline completo y dedup** · export CSV · JSON export · `.moneybackup` lógico versionado · restore validado atómico · transacciones atómicas de DB · validación en límites · **cero telemetría** · **sin backend** · **sin INTERNET en release (objetivo del gate)** · allowBackup deshabilitado (§16) · sin deep links MVP.

### SHOULD (siguiente tanda, tras MUST estable)
Budgets · goals · recurring · CSV import además de JSON/backup · backup encryption (T-005) · app lock + biometría (T-013) · reportes y charts (sobre el dominio, no en UI) · duplicate detection calibrada en UI de preview · Flag_SECURE opcional.

### LATER (diseñado, no implementado)
Inflación/valor real (T-014, vista derivada) · historical FX table · attachments · OCR/QR · sync opcional (revisión legal propia, Caso B) · desktop/iOS · investment tracking (evaluar Caso F antes) · widgets/shortcuts · reconciliación formal · "simuladores" neutrales (evaluar frontera Caso E antes).

### NEVER / OUT OF SCOPE (congelado con P-04 y §3)
Banco · pagos · custodia · lending · broker · trading · credit scoring · scraping bancario · credenciales bancarias · cloud obligatorio · ads · tracking · venta de datos · recomendaciones financieras · chatbot financiero · cloud AI · social · gamificación.

## 23. Revised Roadmap

El roadmap propuesto reordena dos cosas con justificación técnica (no por preferencia):

1. **Portabilidad sube:** el formato `.moneybackup` v1 debe existir desde que existen los datos (fase 1–2), no en fase 4. Razón: el formato es el contrato público; diseñarlo tarde = migraciones dolorosas y riesgo R-2. Costo: es solo serialización del modelo, no feature de UI.
2. **El release gate de red sube a CI desde la fase 1** (no "hardening" en fase 7). Razón: el gate solo es confiable si nunca hubo una versión que lo violara; retro-fit de permisos/deps es donde se cuelan regresiones.

```
Fase 0  Research / Architecture (esta fase)
Fase 1  Financial Core (dominio puro + invariantes + tests) + contrato de datos v1 (.moneybackup conceptual)
Fase 2  Persistence (implementación del puerto + migraciones + round-trip tests) + gate de red en CI
Fase 3  Accounts + Transactions (UI mínima sobre el dominio) + import/export CSV/JSON
Fase 4  Portability en UI (backup/restore end-to-end + preview de import)
Fase 5  Budgets + Goals + Recurring
Fase 6  Reports + charts
Fase 7  Security hardening (app lock, backup encryption, Flag_SECURE, auditoría de permisos) — con threat model cerrado
Fase 8  Distribution (F-Droid spike de build, firmas, metadata, releases)
```

**Estado: PROVISIONAL** (secuencia recomendada; no congelada). La única secuencia parcialmente forzada: 1→2 (dominio antes que persistencia) y el gate desde 2.

## 24. Testing Strategy

Derivada de los invariantes (§8) y del pipeline (§13b). Categorías:

1. **Monetary precision:** enteros, sin float, exponentes por moneda (ARS/CLP/JPY/KWD/MRU), overflow/underflow en sumas, parseo estricto de strings.
2. **Currency handling:** monedas desconocidas, cuenta con moneda fija, formateo/parseo por locale.
3. **Ledger balance (invariante crítica):** toda transacción satisface la regla de balanceo vigente (T-008) — test de propiedad sobre generadores aleatorios + casos fijos.
4. **Casos del usuario (walkthrough de T-008, checklist canónico de §30):** los 10 casos (gasto/ingreso/transferencia ARS, gasto/ingreso USD, compra y pago de tarjeta, conversión ARS→USD, compra en ARS desde cuenta USD, conversión con comisión); más, cuando se implementen, apertura de saldos y ajuste (mecanismos de Equity, §8).
5. **Recurring:** reglas que generan exactamente lo esperado, sin duplicados en fronteras de mes/año, DST no aplica (fechas locales, no instantes).
6. **Budgets/Goals:** límites de período, monedas, medición contra postings categorizados.
7. **Multi-currency/FX:** conversión conserva los 7 datos de §10; idempotencia de conversiones; caso "no exacta" según política T-007 cuando exista.
8. **Import:** schema inválido, semántica inválida, duplicados idénticos (idempotencia), conflictos (nunca sobrescribir), archivos gigantes/malformados (límites), commit atómico con fallo a mitad (rollback verificado).
9. **Backup/restore:** round-trip completo (estado → backup → restore → estado), incompatibilidad de versión rechazada limpio, backup corrupto rechazado, restore atómico.
10. **Export/import round-trip:** CSV y JSON igual.
11. **Migrations:** subir y bajar versiones, datos reales sintéticos, failure a mitad.
12. **Corruption:** DB truncada → detección y modo seguro, sin escribir encima.
13. **Security boundaries:** manifest sin permisos inesperados (gate), sin deep links, sin exported components, allowBackup off, logs sin contenido financiero, temporales borrados.

**Infra:** tests de dominio puros (sin UI, sin DB) + tests de integración de persistencia + instrumentados Android para boundaries. Invariante crítica también como assertion en runtime (fail-closed) — decisión de implementación futura, no de Fase 0.

## 25. Documentation Strategy

Contenido requerido por documento (en el repo eventual):

- **DECISIONS.md** (ya sembrado): append-only; formato por decisión con estatus; principios vs técnica separados. Nunca reescribir: se supersede con entrada nueva.
- **ARCHITECTURE.md:** capas, puertos, decisiones de flujo de datos, diagramas, reglas "qué no entra en UI".
- **SECURITY.md:** modelo de seguridad del usuario final (qué protegemos/qué no), configuración recomendada, limitaciones honestas.
- **THREAT_MODEL.md:** la tabla §14 mantenida; cambios de surface = actualizar threat model en el mismo PR.
- **DATA_FORMAT.md:** spec completa de `.moneybackup`, CSV y JSON: versiones, ejemplos, reglas de validación, política de compatibilidad.
- **PRIVACY.md:** qué recolectamos (nada), qué sale del dispositivo (nada salvo acción del usuario), declaraciones de stores.
- **LEGAL.md:** licencia, aviso de no-asesoramiento, referencias normativas con alcance (hereda §17), disclaimer de revisión profesional.
- **TESTING.md:** estrategias §24 + cómo correr cada suite + definición de done por categoría.
- **DISTRIBUTION.md:** canales, firmas, reproducibilidad, metadata F-Droid, gate de release completo (manifest, permisos, deps, SDKs, network-capable code).

## 26. Open Architectural Questions

1. **T-002 (cerrado en §32):** ¿APK release sin `INTERNET` en RN/Expo es viable y verificable? → spike §12.4, resultados §32.
2. **T-001 (cerrado en §32):** RN/Expo vs Kotlin+Compose → decisión tras spike, §32.
3. **T-003 (avanzado en §32):** implementación de persistencia → PROVISIONAL tras spike, §32.
4. **T-008 (cerrado en §30):** regla de balanceo multicurrency → walkthrough de los 10 casos del checklist canónico de §30.
5. **T-007 (cerrado en §31):** política de redondeo y qué se almacena en conversiones no exactas → §31.
6. **T-004 (OPEN):** DB encryption MVP o diferida → threat model con riesgos residuales aceptados.
7. **T-005 (OPEN):** KDF/primitiva de backup encryption + política de recovery keys → auditoría de librerías offline disponibles en el stack elegido.
8. **T-009 (PROVISIONAL):** licencia final → auditoría de deps y assets.
9. **T-010 (OPEN):** schema exacto de `.moneybackup` v1 → después de 4/5/6.
10. **T-014 (OPEN):** mecanismo de índices de inflación offline (INDEC) → investigación con fuentes oficiales, sin red en core.
11. **OPEN (nueva):** ¿categorías jerárquicas o planas? → decisión UX con prototipo de Fase 3, no antes.
12. **OPEN (nueva):** tolerancia de fecha en fingerprints de duplicados → calibración con datos reales en preview (Fase de import).

## 27. Decisions Ready to Freeze

1. **Principios P-01…P-13** (DECISIONS.md Parte A) — ya ratificados.
2. **Double-entry interno con ocultación en UX** (§7) — RECOMMENDATION con evidencia suficiente; congelar con tu OK explícito.
3. **Account de una sola moneda** (§8) — idem.
4. **Categoría como atributo del posting** + contraparte de apertura (Equity o equivalente) (§8) — idem.
5. **Pipeline de import y prohibiciones** (§13b, P-08) — ya ratificado como principio; el detalle de fingerprint queda abierto.
6. **Formatos: CSV/JSON/backup separados; SQLite nunca como formato público** (P-09) — ratificado.
7. **Duplicado ≠ conflicto; nunca sobrescribir en silencio** (§13b) — principio, congelable.
8. **allowBackup off + sin deep links en MVP + no notificaciones con montos** (§16) — mitigaciones baratas, congelables.
9. **Gobernanza de agentes con ponytail+caveman embebidos** (AGENTS.md, T-015) — hecha.
10. **Dependency policy** (§21) — congelable como política.

## 28. Decisions NOT Ready to Freeze

Todo lo técnico del stack: T-001 (UI stack), T-002 (INTERNET), T-003 (persistencia), T-004 (DB encryption), T-005 (primitiva de cifrado), T-006 (representación exacta — PROVISIONAL), T-007 (redondeo), T-008 (balanceo), T-009 (licencia final), T-010 (schema backup), T-011 (set de deps), T-012 (canales — PROVISIONAL), T-013 (app lock), T-014 (inflación). Razón común: falta spike o decisión informada del usuario; congelarlos hoy sería construir sobre supuestos no verificados.

*(Estado actualizado al cierre de la Fase 0 (2026-10-04): T-006/T-007/T-008 cerrados en §30/§31; T-001/T-002 cerrados y T-003 avanzado en §32; siguen sin cerrar T-004, T-005, T-009, T-010, T-012, T-013, T-014. Fuente de verdad de estatus: `DECISIONS.md`.)*

## 29. Recommended Next Research Step

**Spike T-002 (INTERNET en RN/Expo)** — es el único experimento que destraba dos decisiones en cadena (T-001 stack y T-003 persistencia) y es barato: proyecto mínimo, prebuild, apkanalyzer, pruebas sin red. Plan detallado en §12.4. Alternativa si prefieres no ejecutarlo todavía: walkthrough formal de los 10 casos del checklist de §8 (T-008) en una tabla con postings concretos — es trabajo de papel, no de código, y destraba el dominio (el resto del stack se decide en paralelo).

*(Ambos pasos ejecutados el 2026-10-04: walkthrough T-008 en §30, redondeo T-007 en §31, spike T-002/T-001/T-003 en §32.)*

---

## 30. Cierre T-008 — Walkthrough multicurrency (10 casos)

**Fecha:** 2026-10-04 · **Estado:** la evidencia exigida en T-008 (walkthrough de 10 casos) se produjo; el resultado es la decisión T-016 de `DECISIONS.md`. Esta sección es el registro completo del walkthrough.

### 30.1 Convención de signos y regla de balanceo

**Convención de signos (convención contable clásica, no inventada):** débito = positivo. ASSET y EXPENSE tienen naturaleza deudora (+ cuando aumentan); LIABILITY, INCOME y EQUITY tienen naturaleza acreedora (− cuando aumentan). Ejemplo: un banco con 100.000 ARS tiene saldo +100.000.000 (minor units); una tarjeta que debe 10.000 ARS tiene saldo −1.000.000. Patrimonio (net worth) = Σ saldos de cuentas ASSET + LIABILITY (los pasivos ya son negativos: 500.000 en banco, −10.000 en tarjeta → 490.000). Ni INCOME, ni EXPENSE, ni EQUITY entran en el patrimonio: son el plano contraparte.

**La regla de balanceo (decisión T-016 — Candidato C):**

1. Todo `Posting` lleva: `accountId`, `amount` (entero con signo, int64, minor units), `currency`, y opcionalmente `categoryId` (solo en postings sobre cuentas INCOME/EXPENSE).
2. **Invariante exacta:** para cada transacción y para cada moneda `c` presente en ella: `Σ amount(postings con currency = c) = 0` (suma entera exacta, sin tolerancia, sin redondeo).
3. Cuentas ASSET/LIABILITY/EQUITY son **mono-moneda** (bolsa de valor): la moneda de la cuenta es inmutable y todo posting sobre ella debe usarla. Las cuentas-sistema INCOME/EXPENSE (ver §8) no son bolsas de valor: aceptan postings en cualquier moneda y sus saldos se derivan por moneda.
4. **Conversión = par de postings puente (bridge) explícitos** sobre cuentas-sistema FX mono-moneda (`sys:fx:<CUR>`, tipo EQUITY, ocultas en la UI), más un registro `Conversion` que los enlaza. El registro `Conversion` guarda: `rateText` (texto tal como lo ingresó el usuario), `rateRatio` (razón exacta num/den derivada del texto y la dirección de cotización), `quoteDirection` (`srcPerDest` | `destPerSrc`), `rateAt` (fecha-hora de la tasa), `source` (`manual` | `institution` | `file`), `roundingMode`. **Los importes viven solo en los postings** (P-06: una sola copia de la verdad).
5. **Categoría:** atributo del posting sobre cuentas INCOME/EXPENSE; prohibida en postings sobre cuentas de valor (ASSET/LIABILITY/EQUITY, incluye puente FX). Esto hace estructuralmente imposible clasificar una transferencia, un pago de tarjeta o una conversión como ingreso/gasto.
6. Un registro `Conversion` existe **sí y solo sí** la transacción tiene exactamente dos postings `kind: "bridge"` (una moneda cada uno, coincidentes con `fromCurrency`/`toCurrency`). Pagos mixtos multi-moneda sin tasa (p. ej. mitad efectivo ARS mitad USD) son válidos sin `Conversion`: cada moneda balancea sola por su par de postings reales.

### 30.2 Definición operativa de los tres candidatos

- **Candidato A — Σ global:** una sola ecuación Σ = 0 en una moneda de consolidación elegida; cada posting se convierte al valor de consolidación con la tasa almacenada. Requiere que la suma valorizada sea exactamente cero.
- **Candidato B — Σ por moneda (puro):** cada moneda debe balancear por separado dentro de la transacción y **solo** hay postings sobre cuentas reales (sin puente). Prohibido cruzar monedas dentro de una transacción salvo que cada moneda cierre sola.
- **Candidato C — puente explícito:** Σ por moneda = 0 (la regla de B) **más** el mecanismo de postings puente + registro de conversión que permite que una misma transacción cruce monedas de forma auditable. C = B + mecanismo de conversión; en operaciones mono-moneda C y B son idénticos.

*(Matiz honesto de B: "B con transferencias divididas en dos transacciones enlazadas" también representa conversiones, a costa de dos transacciones para una acción de usuario — se evalúa en §30.5.)*

Montos de referencia del walkthrough (minor units, ARS/USD exponente 2): 10.000,00 ARS = `1.000.000` · 100.000,00 ARS = `10.000.000` · 5.000,00 ARS = `500.000` · 20,00 USD = `2.000` · 500,00 USD = `50.000`. Tasa de ejemplo: **1180 ARS por 1 USD** (cotización ingresada manualmente por el usuario).

### 30.3 Tabla de los 10 casos

Signo: `−` sale de la cuenta, `+` entra. Cantidades en minor units entre ` backticks `.

| # | Acción del usuario | Candidato A | Candidato B | Candidato C (postings canónicos) | Problemas | Datos obligatorios a almacenar | Recomendación |
|---|---|---|---|---|---|---|---|
| 1 | Gasto 10.000,00 ARS de banco ARS (comida) | Idéntico: `[Bank −1.000.000 ARS] [sys:expense +1.000.000 ARS cat=Food]`, ΣARS=0 | Ídem | `[Bank:ARS −1.000.000]` `[sys:expense +1.000.000 ARS cat=Food]` ΣARS=0 | Ninguno en A/B/C: mono-moneda, los tres modelos colapsan al mismo Σ=0 | id, fecha, cuenta, importe entero, moneda, categoría (expense) | C (=B en mono-moneda) |
| 2 | Ingreso 100.000,00 ARS de salario | Idéntico: `[Bank +10.000.000] [sys:income −10.000.000 cat=Salary]` | Ídem | `[Bank:ARS +10.000.000]` `[sys:income −10.000.000 ARS cat=Salary]` ΣARS=0 | Ninguno | id, fecha, cuenta, importe, moneda, categoría (income) | C |
| 3 | Transferencia 5.000,00 ARS: efectivo → banco | Idéntico: `[Cash −500.000] [Bank +500.000]` | Ídem | `[Cash:ARS −500.000]` `[Bank:ARS +500.000]` ΣARS=0 | Ninguno. **Sin categoría posible** (regla 5): imposible clasificarla como ingreso | id, fecha, 2 cuentas, importe, moneda | C |
| 4 | Gasto 20,00 USD desde cuenta USD | Idéntico en USD | Ídem | `[Bank:USD −2.000]` `[sys:expense +2.000 USD cat=Food]` ΣUSD=0 | Ninguno | id, fecha, cuenta, importe, moneda, categoría | C |
| 5 | Ingreso 500,00 USD en cuenta USD | Idéntico | Ídem | `[Bank:USD +50.000]` `[sys:income −50.000 USD cat=Freelance]` ΣUSD=0 | Ninguno | id, fecha, cuenta, importe, moneda, categoría | C |
| 6 | Compra 10.000,00 ARS de comida **con tarjeta** (LIABILITY) | Idéntico | Ídem | `[sys:expense +1.000.000 ARS cat=Food]` `[Card:LIAB −1.000.000 ARS]` ΣARS=0 | Ninguno; pasivo queda en −1.000.000 (debe 10.000) | id, fecha, tarjeta, importe, moneda, categoría | C |
| 7 | Pago 10.000,00 ARS de la tarjeta desde banco | Idéntico | Ídem | `[Bank:ARS −1.000.000]` `[Card:LIAB +1.000.000 ARS]` ΣARS=0; tarjeta → 0 | Ninguno. **Sin categoría posible**: no es gasto (regla 5) | id, fecha, 2 cuentas, importe, moneda | C |
| 8 | Convertir 100.000,00 ARS → USD a tasa 1180 ARS/USD | `[Bank:ARS −10.000.000] [Bank:USD +8.475]` valorizado en ARS: `−10.000.000 + 8.475×1180 = +500` → **Σ≠0: residuo de 5,00 ARS**. Exige tolerancia (invariante difusa) o un posting residual fantasma que no corresponde a ninguna cuenta real | **No representable** con solo postings reales (ΣARS=−10.000.000 sin contraparte ARS). Viable solo dividiendo en 2 transacciones enlazadas (ver §30.5) = entonces exige registro de tasa igual que C | `[Bank:ARS −10.000.000]` `[fx:ARS +10.000.000]` `[fx:USD −8.475]` `[Bank:USD +8.475]`; ΣARS=0, ΣUSD=0 exactas. 84,75 USD = `100.000,00/1180 = 84,7457…` → half-away → `8.475` | A: imposibilidad aritmética (ver columna A); B puro: rechaza la operación | Todo lo anterior + `Conversion{rateText:"1180", rateRatio:1180/1, quote:ARS-per-USD→srcPerDest, source:manual, rateAt, roundingMode}` + 2 postings bridge | **C** |
| 9 | Compra con precio 10.000,00 ARS pagada desde cuenta **USD** (tasa 1180) | `[sys:expense +1.000.000 ARS] [Bank:USD −847]` valorizado: `+1.000.000 − 847×1180 = +540` → **Σ≠0: residuo 5,40 ARS** | No representable (cada moneda sin contraparte propia) | `[sys:expense +1.000.000 ARS cat=Food]` `[fx:ARS −1.000.000]` `[fx:USD +847]` `[Bank:USD −847]`; ΣARS=0, ΣUSD=0. 8,47 USD = `10.000,00/1180 = 8,4746…` → `847` | A: residuo; B: imposible. La verdad económica "costó 10.000,00 ARS" queda en la pata expense; la salida de USD queda exacta en su moneda | Igual que caso 8 + categoría expense en la pata ARS | **C** |
| 10 | Convertir 100.000,00 ARS → USD con **comisión 500,00 ARS**, tasa 1180 | `[Bank −10.000.000] [sys:expense +50.000 cat=Fees] [Bank:USD +8.432]` valorizado: `−9.950.000 + 8.432×1180 = −240` → **Σ≠0: residuo 2,40 ARS** | No representable | `[Bank:ARS −10.000.000]` `[sys:expense +50.000 ARS cat=Fees]` `[fx:ARS +9.950.000]` `[fx:USD −8.432]` `[Bank:USD +8.432]`; ΣARS=0 exacta, ΣUSD=0 exacta. Neto 99.500,00/1180 = 84,3220… → `8.432` | A: residuo; B: imposible. Comisión en USD también representable: `[fx:USD −8.475] [Bank:USD +8.432] [sys:expense +43 USD cat=Fees]` (ΣUSD=0) | Igual que caso 8 + posting de comisión con su moneda propia + importes bruto y neto enteros | **C** |

**Lectura de la columna "Problemas":** en los casos 1–7 los tres candidatos son exactamente la misma función. Los candidatos se diferencian únicamente en conversión (8–10): A **no puede** balancear en enteros (residuos concretos +500, +540, −240 minor units calculados con la propia tasa del usuario), B puro **no puede representar** la operación, y C balancea con igualdades exactas en todas las monedas.

**Definición canónica de `quoteDirection` (la que implementa y testea el código, `src/domain/`):** `srcPerDest` = el ratio almacenado cuenta unidades de la moneda **origen** por cada unidad de la **destino** (ej. "1180 ARS por USD" con origen ARS → `srcPerDest`, destino = origen × den/num); `destPerSrc` = el ratio cuenta unidades **destino** por cada unidad de **origen** (destino = origen × num/den). La celda del caso 8 rotulaba antes la dirección de forma invertida; la sustancia (`rateText "1180"`, `rateRatio 1180/1`, destino `8475` minor units) no cambia — ver `docs/DATA_FORMAT.md`.

### 30.4 Chequeo de no-conflación (patrimonio vs flujo de caja)

Estructural, por regla 5 (categoría prohibida en cuentas de valor) + estructura de postings verificada en la tabla:

- **Transferencia como ingreso:** imposible — los casos 3 y 8–10 no pueden llevar `categoryId` (validator lo rechaza).
- **Pago de tarjeta como gasto:** imposible — caso 7 solo tiene postings ASSET+LIABILITY, sin cuenta INCOME/EXPENSE donde poner categoría.
- **Conversión/compra-venta de divisas como ingreso:** imposible — los postings bridge son EQUITY, categoría prohibida.
- **Liquidación de pasivo como gasto corriente:** imposible — caso 7 no toca cuentas de gasto; el gasto solo existió en el caso 6 (compra).
- **Dinero duplicado por conversión:** Σ por moneda = 0 exacta en cada transacción; la conversión solo cambia la composición de moneda del patrimonio (100.000,00 ARS sale, 84,75 USD entran, delta valorizado = ±redondeo de tasa, nunca creación).
- **Pérdida silenciosa por redondeo:** los dos importes enteros quedan almacenados y el modo de redondeo queda registrado (§31).
- **Cambios de balance sin explicación:** todo movimiento es un posting con cuenta; los agregados se recomponen desde los postings (P-06).

### 30.5 Comparación de candidatos (15 criterios)

| Criterio | A — Σ global | B — Σ por moneda (puro) | C — puente explícito |
|---|---|---|---|
| 1. Corrección financiera | Falla en enteros: residuo obligatorio (casos 8–10) o tolerancia | Correcto en mono-moneda; no representa conversión | Correcto: Σ entera exacta por moneda en los 10 casos |
| 2. Auditabilidad | Tasa obligatoria en toda validación; "¿por qué cierra?" depende de la tasa | Alta, pero la conversión queda fuera del registro | Tasa, fecha, fuente y modo en `Conversion`; bridge visible en el ledger |
| 3. Explicabilidad al usuario | Exige explicar consolidación | No puede explicar la conversión en una pantalla | "Convertiste 100.000,00 ARS → 84,75 USD a 1180, comisión 500,00" = una transacción |
| 4. Multimoneda | Moneda de consolidación implícita en cada chequeo | La conversión requiere diseño ad-hoc igual que C | Casos 8–10 nativos; pagos mixtos multi-moneda también |
| 5. UX simple | Media | Baja (2 transacciones para 1 acción: editar/borrar/enlazar) | Alta: 1 acción = 1 transacción |
| 6. Reporting | Reportes por moneda igual los necesitan aparte | Correcto | Correcto + reportes FX desde `Conversion` |
| 7. Backup/export | Guarda tasa o no cierra al restaurar | Guarda enlace entre 2 transacciones (frágil) | Un objeto transacción autocontenido con su `Conversion` |
| 8. Import | Requiere derivar valorización por tasa filas | Requiere emparejar dos filas | Postings + registro; validable fila a fila |
| 9. Migración | Cambio de moneda de consolidación = recalcular | Cambiar a conversión = migración de datos | Aditivo: nuevas monedas solo agregan cuentas FX |
| 10. Redondeo | El residuo ENTRA en la invariante (tolerancia) | Sin redondeo en balance | El redondeo queda en los importes enteros + modo registrado; invariante intacta |
| 11. Comisiones | Posting extra no cierra valorizado sin residuo | Posting extra OK | Composting de comisión en su moneda, Σ=0 exacta (caso 10) |
| 12. Tasas históricas | Obligatorias para validar | En registro aparte entre 2 transacciones | En `Conversion` junto a la operación |
| 13. Integridad de datos | Invariante débil (±tolerancia) | Invariante fuerte pero la conversión es ilegal | Invariante fuerte en todas las monedas |
| 14. Testabilidad | Tests con tolerancias | Tests de mono-moneda; conversión = caso especial | Σ=0 exacta testeable property-based + walkthrough |
| 15. Extensibilidad | Deuda: cada feature FX hereda la tolerancia | Reescribir si se quiere una sola transacción | Puente reutilizable para tarjeta multi-moneda, deudas en divisa, etc. |

**A — por qué se rechaza:** la igualdad `Σ valorizada = 0` con importes enteros redondeados no tiene solución en general (los casos 8–10 dan residuos concretos: +500, +540, −240). Para hacerla cerrar hay que o (a) aceptar tolerancia — la invariante crítica pasa a ser difusa, exactamente el fallo silencioso que P-06 prohíbe, o (b) insertar un posting residual sin cuenta real — que es un "ajuste" no explicable. Además valoriza cada chequeo con una tasa: la validación deja de ser local y determinista.

**B — por qué es insuficiente solo:** la regla Σ-por-moneda es correcta y la adoptamos, pero sin mecanismo de puente la operación natural de conversión queda **inrepresentable** (los casos 8–10 fallan). La única salida de B puro es dividir la conversión en dos transacciones enlazadas: eso reintroduce registro de tasa, exige atomicidad/editado/borrado en pareja, y muestra al usuario dos movimientos donde hubo una acción. Es C con una peor forma — el costo de B puro no se justifica.

**C — por qué gana:** conserva la invariante fuerte de B (entera, exacta, por moneda, sin tolerancia), añade el único mecanismo que faltaba (bridge + `Conversion`), y en los casos mono-moneda es idéntico a A y B — cero costo donde no hace falta. Un solo sitio de validación, una sola copia de cada importe, edición/borrado transaccional único, y la conversión completa es reconstruible desde la transacción. Costo honesto: dos cuentas FX-sistema por moneda usada (auto-creadas, ocultas) y un registro `Conversion` más — complejidad pequeña y acotada, pagada solo en operaciones FX.

### 30.6 Respuestas a los requisitos del dominio multicurrency

1. **¿Las cuentas son mono-moneda?** Sí para ASSET/LIABILITY/EQUITY (bolsas de valor): mezclar monedas en una bolsa haría el saldo ilegible sin tasa (rompe P-06). La moneda es inmutable; "cambiar de moneda" de una cuenta = crear cuenta nueva + operación de conversión (regla previa §8, confirmada). INCOME/EXPENSE **no** son bolsas de valor: son cuentas-sistema que aceptan cualquier moneda y se derivan por moneda. Las categorías no tienen moneda.
2. **¿Qué es una transacción?** Evento financiero atómico: `{id, date, postings[], conversions?[], memo?}`. No tiene importe propio (§8); balancea Σ=0 por moneda; o se persiste completa o no se persiste.
3. **¿Qué es un posting?** `{accountId, amount: int64 con signo (minor units), currency, categoryId?, kind: "normal"|"bridge"}`. Sobre cuentas de valor exige `currency` = moneda de la cuenta; `categoryId` solo en INCOME/EXPENSE; `kind:"bridge"` solo en cuentas FX-sistema.
4. **¿Una transacción normal puede contener varias monedas?** Sí. Multi-moneda sin puente es válido cuando cada moneda cierra sola por sus postings reales (p. ej. pago mixto efectivo+USD, sin tasa). Multi-moneda con cruce de una moneda a otra **requiere** el par bridge + `Conversion` (regla 6).
5. **¿Cómo se representa la conversión?** Par de postings bridge (uno por moneda, sobre `sys:fx:<CUR>`) + registro `Conversion` que los enlaza con la tasa. Nunca como ajuste de patrimonio ni como ingreso/gasto.
6. **¿Dónde vive la tasa?** Solo en el registro `Conversion` de esa transacción: texto ingresado + razón exacta num/den + dirección de cotización + fecha-hora + fuente + modo de redondeo. Nunca en cuentas, nunca recomputada al leer, nunca una segunda copia.
7. **¿Tasa con más precisión que la moneda destino?** Se deriva **una vez** en el momento de crear la conversión, con modo explícito (§31); ambos importes enteros quedan almacenados; el balance usa los enteros almacenados (exacto). La reproducibilidad exacta queda garantizada por `rateRatio + roundingMode + importe origen` (permiten re-derivAR y verificar contra el posting almacenado en cada restore).
8. **¿Cuál es el importe canónico almacenado?** Los **dos** enteros de los postings de cada pata son verdad almacenada, más `rateRatio` tal cual el usuario lo ingresó. Nada se recalcula después. Los decimales formateados son derivados.
9. **¿Qué es derivado?** Strings formateados, porcentajes, agregados (gasto mensual, balances consolidados), patrimonio a tasa de cambio, progreso de presupuestos, cualquier cifra de reporte. Nunca se escriben de vuelta en el ledger (P-06/P-13).
10. **¿Cómo se calculan los balances?** `Σ` de postings por cuenta, por moneda, exacta e independiente del orden. El saldo **no se almacena** (P-06): se deriva en cada lectura.
11. **¿Reportes multicurrency?** Por defecto: series por moneda (nativas, exactas). Consolidado transversal = estimación derivada a una tasa declarada por el usuario, etiquetada "estimación a tasa X del día Y" (§10), nunca saldo duro.
12. **¿Qué se necesita para reproducir históricamente una transacción?** `id`, `date`, postings completos (cuentas, enteros, moneda, categorías), `Conversion` completa (ratio num/den, texto, dirección, modo, fecha, fuente), snapshot de exponentes de moneda y moneda inmutable de cada cuenta. Con eso el rebuild es bit-exacto y el validator re-verifica Σ=0 y la re-derivación de cada conversión.

---

## 31. Cierre T-007 — Redondeo derivado del walkthrough

**Fecha:** 2026-10-04 · **Resultado completo:** entrada T-017 de `DECISIONS.md` (requisitos DECIDED, método por defecto PROVISIONAL, dos restos OPEN acotados).

### 31.1 Operaciones que producen redondeo (identificadas desde los casos reales, no inventadas)

| # | Operación | ¿Dónde redondea? | Tratamiento |
|---|---|---|---|
| 1 | **Derivación de conversión** (casos 8/9/10): importe destino = f(importe origen, razón exacta) | Único punto de redondeo financiero real del MVP | Se deriva **una vez** al crear la conversión con `roundingMode` explícito; los dos enteros quedan almacenados; modo registrado. Σ=0 usa enteros: exacta |
| 2 | Parsing de importes (entrada de dinero) | No redondea: rechaza | Parser estricto: máximo `exponente` decimales; más decimales = error (nunca redondeo de input en límite de confianza). El campo de entrada UI limita dígitos por moneda |
| 3 | Fee/comisión porcentaje (futuro) | Derivación → entero | Mismo patrón: derivar-una-vez-almacenar con modo. Fee ingresado directamente (caso 10): sin redondeo |
| 4 | Cuotas de compra en cuotas (futuro, post-MVP) | División con resto | Derivar enteros con modo + **reparto explícito del resto** (primera/última cuota) — política del resto = **OPEN** (requiere decisión de feature/UX, no se adivina) |
| 5 | Split de un importe entre categorías (futuro) | Resto de división | UX: app muestra el resto y el usuario confirma los enteros finales — **OPEN acotado** a UX de Fase 3; requisito ya congelado: nunca silencioso |
| 6 | Porcentajes, agregados, reportes, patrimonio consolidado | Solo display | Redondeo de presentación con precisión ≥ la mostrada; **nunca** se escribe en el ledger |
| 7 | Cualquier división | Punto único | Única función de división con modo (`deriveMinorUnits(num, den, mode)`), testeada en empates; prohibido `/` sobre dinero en otro lugar |

### 31.2 Verdad almacenada vs cálculo derivado

- **Almacenada (nunca se redondea de nuevo):** enteros int64 en minor units (importes de postings, ambos lados de toda conversión, fees), `rateRatio` exacto, `roundingMode`.
- **Deriado (redondeo de display permitido, escritura prohibida):** strings formateados, tasas mostradas en decimal, porcentajes, totales, consolidados.
- **Patrón general (DECIDED):** *derivar una vez → almacenar el entero → validar con enteros.* El redondeo existe exactamente una vez por valor derivado, es explícito, queda registrado, y es reproducible.

### 31.3 Qué congela y qué queda abierto

**Congelado (T-017):** todo valor monetario almacenado es entero; parsing estricto sin redondeo en límites de confianza; conversiones almacenan ambos enteros + ratio + modo; valores derivados nunca mutan el ledger; función única de división con modo testeada en empates.

**PROVISIONAL:** modo por defecto `half-away-from-zero` para derivaciones (convención de dinero al por menor; no hay fuente normativa que lo mande — por eso además el modo se **almacena** por conversión y es conmutable por llamada).

**OPEN acotado:** (a) política de resto de cuotas (se decide al diseñar la feature post-MVP); (b) UX del resto en splits (Fase 3). Ninguno de los dos bloquea Fase 1.

---

## 32. Cierre T-002 / T-001 / T-003 — Spike RN/Expo y persistencia

**Fecha:** 2026-10-04 · **Evidencia completa:** `evidence/T002_EVIDENCE.md` (spike desechable en directorio temporal, fuera del repo; APKs no versionados).

### 32.1 Qué se ejecutó

Spike mínimo (expo 57.0.26, react-native 0.86.3, react 19.2.3, blank template, sin código de red propio): `expo prebuild` → escaneo de manifests de `node_modules` (13 manifests + 6 AARs) → 5 builds `assembleRelease` (A/B/C: declaración simple / declaración eliminada / `tools:node="remove"`) → auditoría con `apkanalyzer` sobre el APK final → dex dump. Toolchain: JDK 17 (Temurin), cmdline-tools 12.0, Gradle 9.3.1, AGP 8.12.0.

### 32.2 Resultados T-002 (claim → veredicto → artefacto)

| Claim | Veredicto | Artefacto |
|---|---|---|
| Un APK release **puede existir sin** `INTERNET` | **PROBADO** | APK de 68.626.516 B con `apkanalyzer manifest permissions`: 5 permisos, sin INTERNET (3 builds) |
| `tools:node="remove"` en el manifest app elimina INTERNET del APK final | **PROBADO** | Matriz A/B/C: simple → presente; eliminada → **sigue presente** (proviene de lib); remove → ausente |
| Una dependencia (no solo la plantilla) declara INTERNET | **PROBADO** | Manifest merger blame: `[host.exp.exponent:expo.modules.filesystem:57.0.7]` línea 8 |
| Los declarantes son: plantilla prebuild (manifest app línea 2) + **expo-file-system** 57.0.7 | **PROBADO** | Escaneo: 2 hits, ambos expo-file-system; app template en su manifest |
| `react-android` / `hermes-android` declaran INTERNET | **CONTRADICIDO** (para los artefactos escaneados) | ReactAndroid manifests y 6 AARs Meta escaneados: sin INTERNET |
| El APK final contiene código capaz de red (OkHttp / expo fetch / WebSocket dev-support) | **PROBADO** | `dex packages`: okhttp3, `expo.modules.fetch`, devsupport RN (R8/minify off por defecto) |
| **Sin requisito de red en runtime** (arranca en airplane mode) | **NO PROBADO** | Sin dispositivo/emulador (`adb devices` vacío) |
| Manifest final: `allowBackup="true"`, sin cleartext, sin deep links, MainActivity exported (LAUNCHER), package `com.anonymous.spiket002` | **PROBADO** | `apkanalyzer manifest print` APK final |
| Build reproducible bit-a-bit en misma máquina | **PROBADO (misma máquina)** | SHA256 `84B6A3E1…` idéntico en 2 runs separados; cross-machine NO probado |
| Permisos heredados de la plantilla: `READ/WRITE_EXTERNAL_STORAGE` (maxSdk32), `SYSTEM_ALERT_WINDOW` | **PROBADO** | Presentes en APK final; SAF no los necesita → higiene de manifest pendiente (gate) |

### 32.3 Decisiones derivadas

- **T-001 → DECIDED (entrada T-020):** RN + Expo CNG queda como stack actual. El riesgo que motivaba la cautela (cadena INTERNET) quedó resuelto con evidencia de APK real, con autorización de congelado condicionada al spike dada por el usuario (misión §11). Racionales adicionales: mismo lenguaje (TypeScript) para dominio y UI, dependencias directas MIT, build de release exitoso y reproducible en máquina. Racionales documentados en contra: APK de 68 MB (solucionable con splits por ABI), dev-support con red dentro del dex (habilitar R8/minify en release = gate), higiene de permisos/allowBackup de la plantilla (config, gate).
- **T-002 → PROVISIONAL (entrada T-019):** mecanismo de remoción probado y verificable automáticamente (gate = `apkanalyzer manifest permissions` sobre APK release, assert sin INTERNET). **Evidencia que falta:** prueba de arranque/runtime en airplane mode con emulador o dispositivo (requisito del gate de release, no bloquea la elección de stack; si falla, T-020 se supersede con evidencia nueva).
- **T-003 → PROVISIONAL (entrada T-021):** recomendación **expo-sqlite** (driver SQLite directo, MIT, empaqueta SQLite3+SQLCipher vendorizados, mismo toolchain del stack ya validado, sin ORM, control total de SQL/migraciones/transacciones) sobre op-sqlite (alternativa documentada: JSI, bus factor individual) y WatermelonDB (descartado: sync sin backend = coste sin beneficio, P-02). **Evidencia que falta:** integración real en Fase 2 (bind de int64, transacciones atómicas, migraciones, F-Droid build del proyecto final). Sin ORM.

### 32.4 Gate de release derivado del spike (checkboxes para CI, Fase 2)

1. `apkanalyzer manifest permissions` del APK release: assert = sin `INTERNET` (lista blanca vacía o mínima) [mecanismo probado].
2. `allowBackup="false"` en manifest release [hoy `true` — corregir en config Expo].
3. Sin deep links / sin exported salvo LAUNCHER [hoy OK en el spike].
4. Sin cleartext en release [hoy OK].
5. Permisos de plantilla a eliminar: `READ/WRITE_EXTERNAL_STORAGE`, `SYSTEM_ALERT_WINDOW` (SAF no los requiere).
6. R8/minify habilitado en release (hoy dev-support networking ships en el dex) + verificación post-build de que desaparece.
7. Pruebas instrumentadas en airplane mode (arranque + flujos core) — **pendiente, requiere emulador**.
8. SBOM de dependencias npm + scan dex de APIs de red conocidas (hoy: okhttp3/expo-fetch presentes y documentados como aceptados-con-permiso-negado; cada dep nueva revisa §21).
9. APK sin `uses-permission` no declaradas en `DECISIONS.md`.

---

# Cierre

### A. Architecture summary

Ledger double-entry interno (oculto en UX) con dinero entero por moneda; capas UI → application → domain → persistence vía puerto; SQLite (implementación a decidir) con migraciones testeadas; import como pipeline untrusted con confirmación y commit atómico; backup lógico versionado como único formato de restore; cero red en el core con release gate verificable; threat model con mitigaciones baratas en MVP (allowBackup off, sin deep links, logs limpios) y cifrado opcional por decidir con el threat model.

### B. Main risks

R-1 corrupción financiera → invariantes testeadas; R-2 pérdida de datos → backup v1 temprano; R-3 import malicioso → pipeline; R-4 fugas sin INTERNET → §16/gate; R-5 decisiones prematuras → este proceso; R-6 abandono → gobernanza y bajo mantenimiento; R-8 expectativas de seguridad → threat model honesto; R-9 F-Droid build → spike temprano.

### C. Decisions that should be frozen

Ver §27 (principios ratificados + 6 recomendaciones listas para tu OK explícito: double-entry oculto, cuenta mono-moneda, categoría en posting, duplicado≠conflicto, mitigaciones Android baratas, dependency policy).

### D. Decisions that still require human discussion

Ver §28: todo el stack técnico (T-001…T-014) + las 2 preguntas nuevas (§26.11/12). En particular: balanceo multicurrency (T-008) y redondeo (T-007) definen el corazón del dominio y merecen tu decisión explícita tras el walkthrough.

### E. Recommended next research task

Spike T-002 (§12.4) — o, en paralelo y sin código, el walkthrough de T-008.

### F. Criterio de aceptación de Fase 0 (del plan aprobado)

1. Principios DECIDED y ratificados ✅ (Parte A de DECISIONS.md).
2. Cada decisión técnica con estatus explícito, evidencia faltante nombrada (PROVISIONAL) o spike definido (OPEN) ✅ (T-001…T-015).
3. Cadena INTERNET investigada con fuentes primarias; spike definido, no ejecutado ✅ (§11/§12.4).
4. Invariantes del ledger formalizados y refutables ✅ (§8, pendiente solo la regla T-008).
5. Threat model con riesgos residuales a aceptar explícitamente por el usuario ⏳ (§14/§15 — requiere tu revisión).
6. Cero features inventadas; cambios de scope justificados por escrito ✅ (§22).
