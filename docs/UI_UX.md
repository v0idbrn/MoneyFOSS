# MoneyFOSS — UI/UX Design System

**Estado:** implementado en `app/` (SDK 57, dark-first). Este documento es la fuente reproducible del sistema visual: tokens, componentes, flujos y rationale. El código la implementa; nada vive solo aquí.

## 1. Visual principles

1. Dark, premium, technical, serious. Belladonna `#24020E` as the deepest background (AMOLED-first).
2. Hierarchy through tone, border, spacing and type — not through cards everywhere, gradients, or glass.
3. Money is data: dense but calm. Amounts prominent, never trading-terminal giant.
4. Every number is explainable: aggregates drill down to transactions → postings.
5. Color never carries meaning alone: sign prefix (`+`/`−`), icon and label always accompany color.
6. Errors are unmistakable and actionable; never a bare "Something went wrong."

## 2. Color tokens (`app/src/theme.ts`)

Palette (official): Belladonna `#24020E` · Dark Sanctuary `#4B032A` · Velvet `#720F50` · Magenta Red `#943A79` · Pink Parade `#B36FA3`.

| Token | Value | Use |
|---|---|---|
| `background` | `#24020E` | deepest background |
| `backgroundElevated` | `#2E0511` | inputs, headers, tab bar |
| `surface` | `#4B032A` | secondary surfaces, icon wells, secondary buttons |
| `surfaceElevated` | `#571237` | pressed/emphasized surface (sparingly) |
| `primary` / `primaryPressed` | `#720F50` / `#5C0C42` | main actions (Save, FAB, Create) |
| `secondary` | `#943A79` | reserved, barely used |
| `highlight` | `#B36FA3` | active filter, icons, accents — never large areas |
| `border` | `#5E1E45` | hairlines, input borders, row separators |
| `textPrimary` | `#F7EFF3` | all body/amount text |
| `textSecondary` | `#C4A3B4` | metadata, labels |
| `textMuted` | `#9C7B8E` | hints, placeholders, inactive |
| `danger` | `#E5484D` | errors and destructive actions ONLY |
| `warning` | `#E8A33D` | warnings (reserved for future use) |
| `success` | `#46A758` | confirmations (reserved for future use) |

Contrast on Belladonna (computed): textPrimary ~15:1 · highlight ~5.3:1 · danger ~5.0:1 · warning ~9:1 · success ~6.4:1 · textMuted ~5.2:1. All ≥ 4.5:1 for text. Amounts use `textPrimary` with explicit `+`/`−`, never color-alone.

Deliberately outside the palette: `danger`/`warning`/`success`. Rationale: errors must be inequívocos and the purple family cannot carry "destructive" unambiguously (§4 del encargo).

## 3. Typography (`type` in theme)

System font (zero font dependencies). Scale: hero 28/700 · title 20/700 · section 16/600 · body 16/400 · amount 20/600 · meta 14 · small 12. Amounts use `fontVariant: tabular-nums` where supported. No fixed `allowFontScaling={false}` anywhere: dynamic type is respected. Hierarchy: balance (hero) > row amount (amount) > account/category (section/body) > date/meta (meta) > hints (small).

## 4. Spacing and shape

`xs 4 · sm 8 · md 12 · lg 16 · xl 24 · xxl 32`. Radius restrained: `sm 6` (inputs), `md 10` (buttons); rows use hairline separators, not cards; FAB is the only circle. Primary buttons `minHeight 48` (touch target).

## 5. Components (`app/src/components.tsx`)

`Screen` (SafeArea + scroll + padding) · `H1/Section/Body/Meta/Small` · `Amount` (grouped exact integer formatting + `accessibilityLabel` "minus/plus …") · `Btn` (primary/secondary/danger, ripple, disabled state) · `Field` (label + input + inline error, `accessibilityLabel`, error has `role="alert"`) · `Chip` (filters/options, `selected` state) · `EmptyState` (icon + what-next + optional action) · `ErrorState` (icon + domain message, no stack traces) · `Fab` (single primary action) · `TxRow` (icon by kind + title + date/detail + signed amount lines).

## 6. Iconography

Single family: MaterialIcons via `@expo/vector-icons` (consistent strokes, no emoji, no mixed packs). Mapping: expense `remove` · income `add` · transfer `swap-horiz` · card-payment `credit-card` · conversion `currency-exchange` · bank `account-balance` · wallet `account-balance-wallet` · history `receipt-long` · search `search` · filter `filter-list` · edit `edit` · delete `delete-outline` · confirm `check` · warning `warning-amber` · error `error-outline` · empty `inbox` · add `add` · back/next `chevron-right` · close implicit (modal swipe/back).

## 7. Navigation

Four tabs, no more: **Home · Accounts · Transactions · More**. Stack on top: `AccountDetail`, `TransactionDetail`, `AddTransaction` (modal). No deep links (release gate). The primary action (Add) is a FAB on Home and Transactions plus contextual buttons on Accounts/AccountDetail. Transaction entry is never more than one tap away.

## 8. Transaction entry flow

`Amount → Type/Category → Account → Date → Note → Save`, with type-driven fields:

- Expense / Card purchase (liability-only accounts): amount in account currency, category; optional foreign price (amount + currency + rate + quote direction) = §30.3 case 9.
- Income: account, amount, income category.
- Transfer: from, to, amount (domain enforces same currency, different accounts).
- Card payment: paying account + card (domain asserts liability destination).
- Convert: from, to, amount, rate + quote direction (`source per destination` default), optional fee (amount + side + expense category).

Amount input: `decimal-pad` keyboard, strict domain parse (`parseMoney`) after normalizing a single decimal comma; mixed separators = explicit error. Dates default to local today, editable `YYYY-MM-DD`, domain-validated. Every failure shows the domain/clear message inline; nothing saves half-valid.

## 9. Display rules (presentation, not ledger)

- `app/src/lib/format.ts`: grouping via `Intl` on the integer part only (BigInt, exact); decimal mark canonical `.` (limitation documented: full locale decimal marks = future work); `+`/`−` prefixes; screen-reader labels.
- `app/src/lib/describe.ts`: kind/title/detail/amount-lines per transaction (expense/income by category; transfer/card-payment by account direction; conversion by currencies + rate + fee flag). Pure, tested.
- `app/src/lib/filters.ts`: text (memo/id/category/account, case-insensitive) + account + category + kind; visible active count; one-tap clear; newest-first stable sort.
- Balances: **domain-derived only** (`src/domain/balances.ts`, pure Σ). The UI never sums around the domain.

## 10. Accessibility

Touch targets ≥ 48px on actions; `accessibilityRole`/`accessibilityLabel`/`accessibilityState` on buttons, chips, rows, amounts; errors announced (`role="alert"`); dynamic type respected; meaning never color-only (sign + icon + words); logical top-down order; amounts readable via grouped digits + spoken "minus/plus".

## 11. Empty / error / loading / corrupt states

- Empty: named icon + what-it-is + what-to-do-next + action button. Every list screen has one.
- Error: `ErrorState` with the actionable message (domain codes included), optional retry; stack traces never shown.
- Loading: single centered indicator during DB open only (reads are synchronous via expo-sqlite sync API).
- Corrupt/unreadable: ledger-wide `corrupt`/`fatal` states render `ErrorState` full-screen (fail-closed, read-only); transaction deletes are two-tap confirmed; account/category deletes blocked with explanation when referenced.

## 12. App icon (`app/assets/`, `app/scripts/icon.mjs`)

Concept: two ledger columns (Velvet tall / Magenta short = debit and credit sides) crossed by a Pink Parade balance beam on Belladonna. No dollar sign, no piggy, no wallet, no text. Geometry (`icon.svg`, 1024 grid): bars x336–456/y288–736 and x568–688/y400–736, beam x288–736/y556–588. Suite: `icon.png` (1024, full-bleed), `adaptive-foreground.png` (mark at 62% on transparent), `adaptive-monochrome.png` (white mark on transparent), `favicon.png` (64). Renderer is dependency-free Node (`zlib` + hand-rolled CRC32); pixels verified by decode test (beam/bars/background/monochrome spots). Recognizable as silhouette: bars + beam survive monochrome and small sizes.

## 13. Rationale log (decisiones de producto menores, reversibles)

- No icon pack beyond MaterialIcons; no custom font; no splash package; no toast/alert library (minimal in-house toasts, zero deps; errors stay inline); no date-picker package (strict text date); no export/share yet (would need `expo-file-system`, an INTERNET declarer — refused).
- Text date entry over picker: zero deps + strict validation; revisit if users struggle.
- Duplicate transaction IDs: repository concern of a later phase, wire accepts (documented in audit).
- Display decimal mark stays canonical `.` for now (grouping is locale-aware).
