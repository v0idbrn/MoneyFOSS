# MoneyFOSS — Data Format

**Estados por sección:** §1–§4 (wire de transacción) = **DECIDED** — implementado en `src/domain/serialize.ts` y testeado. §5 (envelope de backup) = **PROVISIONAL** — depende de T-010 y T-005, ambos **OPEN**. CSV = **sin diseñar** (pertenece al pipeline de import, Fase 2+).

---

## 1. Principios (heredados de P-06/P-07/T-016/T-018)

1. Todo importe monetario es un **string de entero en minor units** en el wire. Prohibido float, notación científica, separadores de miles y decimales.
2. El esquema es **estricto**: campos desconocidos = rechazo (`WIRE_INVALID`). Compatibilidad hacia adelante = bump de versión, nunca campos ignorados en silencio.
3. La única copia de la verdad de un importe es el posting. `Conversion` guarda tasa y modo, **no** importes derivados.
4. El formulario canónico (para checksum/fingerprint) es `stableStringify`: claves ordenadas alfabéticamente en todo nivel, sin `undefined`, sin dependencia del orden de inserción.

## 2. Wire de `Transaction` v1

Objeto plano, JSON serializable. `fromWire(wire, refs)` decodifica con validación estricta de estructura y luego ejecuta la validación de dominio completa (`assertTransaction`).

### 2.1 Campos de transacción

| Campo | Tipo wire | Reglas |
|---|---|---|
| `id` | string | no vacío, ≤ 128 caracteres |
| `date` | string | `YYYY-MM-DD`, fecha de calendario válida |
| `postings` | array | ≥ 1 en wire (el dominio exige ≥ 2 balanceados) |
| `conversion` | object \| ausente | presente **si y solo si** hay exactamente 2 postings `kind:"bridge"` |
| `memo` | string \| ausente | opcional |

### 2.2 Campos de posting

| Campo | Tipo wire | Reglas |
|---|---|---|
| `accountId` | string | cuenta existente o sistema (`sys:income`, `sys:expense`, `sys:fx:<CUR>`) |
| `currency` | string | código de la tabla embebida (§3 de currency snapshot) |
| `amount` | string | `/^-?(0|[1-9]\d*)$/`, sin `+`, sin `007`, sin `-0`, rango int64, ≠ 0 |
| `kind` | string | `"normal"` \| `"bridge"` |
| `categoryId` | string \| ausente | solo en postings sobre `sys:income`/`sys:expense` |

### 2.3 Campos de `conversion`

| Campo | Tipo wire | Reglas |
|---|---|---|
| `fromCurrency` / `toCurrency` | string | conocidas y distintas |
| `rateText` | string | ratio decimal plano, > 0, ≤ 32 caracteres (lo que ingresó el usuario) |
| `rateRatio.num` / `rateRatio.den` | string | enteros positivos canónicos (`/^[1-9]\d*$/`), guardados **reducidos**; deben coincidir con `rateText` al re-parsear |
| `quoteDirection` | string | `srcPerDest` \| `destPerSrc` |
| `rateAt` | string | fecha `YYYY-MM-DD` o datetime ISO 8601 |
| `source` | string | `manual` \| `institution` \| `file` |
| `roundingMode` | string | `half-away-from-zero` \| `half-even` \| `truncate` |

**Semántica de `quoteDirection` (canónica):** `srcPerDest` = el ratio cuenta unidades de la moneda **origen** por cada unidad de la **destino** → destino = origen × den/num. `destPerSrc` = unidades **destino** por cada **origen** → destino = origen × num/den. Ejemplo del walkthrough (§30.3 caso 8): `rateText "1180"`, `rateRatio 1180/1`, `srcPerDest` (1180 ARS por 1 USD) → `10.000.000` minor units ARS → `8475` minor units USD.

### 2.4 Ejemplo: caso 8 + comisión (walkthrough §30.3)

```json
{
  "conversion": {
    "fromCurrency": "ARS",
    "rateAt": "2026-10-04T12:00:00Z",
    "rateRatio": { "den": "1", "num": "1180" },
    "rateText": "1180",
    "quoteDirection": "srcPerDest",
    "roundingMode": "half-away-from-zero",
    "source": "manual",
    "toCurrency": "USD"
  },
  "date": "2026-10-04",
  "id": "c10",
  "postings": [
    { "accountId": "bank-ars", "amount": "-10000000", "currency": "ARS", "kind": "normal" },
    { "accountId": "sys:expense", "amount": "50000", "categoryId": "fees", "currency": "ARS", "kind": "normal" },
    { "accountId": "sys:fx:ARS", "amount": "9950000", "currency": "ARS", "kind": "bridge" },
    { "accountId": "sys:fx:USD", "amount": "-8432", "currency": "USD", "kind": "bridge" },
    { "accountId": "bank-usd", "amount": "8432", "currency": "USD", "kind": "normal" }
  ]
}
```

Montos verificados por tests: conversión 100.000,00 ARS → **8475** (84,75 USD); precio 10.000,00 ARS pagado desde USD → **847**; conversión con comisión 500,00 ARS sobre neto 99.500,00 → **8432**.

## 3. JSON canónico

`stableStringify(value)` — para huellas, checksums y comparaciones de restore:

- claves de objeto ordenadas alfabéticamente (recursivo);
- entradas `undefined` eliminadas;
- arrays conservan orden;
- números solo los que trae el wire (importes ya son strings).

## 4. Errores

| Código | Cuándo |
|---|---|
| `WIRE_INVALID` | estructura, tipos, claves desconocidas, strings no canónicos, enums inválidos |
| `AMOUNT_OUT_OF_INT64_RANGE` | entero fuera de rango int64 |
| `INVALID_TRANSACTION` | el wire pasa estructura pero el dominio rechaza (balance, cuentas, categorías, re-derivación) |
| `UNKNOWN_CURRENCY` | código fuera de la tabla embebida |

## 5. Envelope `.moneybackup` v1 — PROVISIONAL (no decidir hasta T-010/T-005)

Lo que el dominio ya fija y el backup debe contener (orden de restore: primero refs, luego transacciones):

```json
{
  "format": "moneybackup",
  "version": 1,
  "currencies": [ { "code": "ARS", "exponent": 2 } ],
  "accounts": [ { "id": "bank-ars", "name": "...", "type": "ASSET", "currency": "ARS" } ],
  "categories": [ { "id": "food", "name": "Food", "kind": "expense" } ],
  "transactions": [ { "…wire de §2…": "" } ]
}
```

**Queda OPEN y no se inventa aquí:** cifrado y KDF (T-005), schema exacto, checksum y política de versionado del archivo (T-010), extensión final, límites de tamaño, compatibilidad hacia atrás. Regla ya congelada: el restore pasa por el mismo validador del dominio y es atómico (AGENTS §5.3–5.4).

## 6. Compatibilidad

- Toda adición o cambio de campo exige bump de `version` y entrada nueva en `DECISIONS.md`.
- Los campos desconocidos **nunca** se ignoran: se rechazan (un lector viejo que aceptara campos nuevos estaría mintiendo sobre qué entendió).
- CSV de import/export: sin diseño todavía; será documentado aquí con su pipeline `parse → validate → preview → confirm → atomic commit`.
