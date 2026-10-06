export type Lang = 'es' | 'en';

export interface TxKindLabels {
  readonly expense: string;
  readonly income: string;
  readonly transfer: string;
  readonly 'card-payment': string;
  readonly conversion: string;
}

export interface Dict {
  readonly loading: string;
  readonly couldntLoad: string;
  readonly tryAgain: string;
  readonly cancel: string;
  readonly all: string;
  readonly no: string;
  readonly yes: string;
  readonly tabsHome: string;
  readonly tabsAccounts: string;
  readonly tabsTransactions: string;
  readonly tabsMore: string;
  readonly homeTitle: string;
  readonly homeSnapshot: string;
  readonly homeEmpty: string;
  readonly homeNoAccounts: string;
  readonly homeNoAccountsBody: string;
  readonly homeGoAccounts: string;
  readonly homeNoTx: string;
  readonly homeNoTxBody: string;
  readonly homeAddHint: string;
  readonly homeRecent: string;
  readonly homeFab: string;
  readonly accountsHold: (n: number) => string;
  readonly accountsTitle: string;
  readonly accountsEmpty: string;
  readonly accountsEmptyBody: string;
  readonly accountsNew: string;
  readonly accountsCashBank: string;
  readonly accountsCardsDebts: string;
  readonly accountsEquity: string;
  readonly accountsNewSection: string;
  readonly accountsName: string;
  readonly accountsNamePh: string;
  readonly accountsKind: string;
  readonly accountsCurrency: string;
  readonly accountsOpening: string;
  readonly accountsCreate: string;
  readonly accTitle: string;
  readonly accNotFound: string;
  readonly accAddTx: string;
  readonly accManage: string;
  readonly accNewName: string;
  readonly accSaveName: string;
  readonly accRename: string;
  readonly accDelete: string;
  readonly accConfirmDelete: string;
  readonly accBlockedDelete: string;
  readonly recentIn: (n: number) => string;
  readonly accNoRecent: string;
  readonly txsTitle: string;
  readonly txsSearch: string;
  readonly txsSearchPh: string;
  readonly txsType: string;
  readonly txsAccount: string;
  readonly txsCategory: string;
  readonly kinds: TxKindLabels;
  readonly clearFilters: (n: number) => string;
  readonly txsEmpty: string;
  readonly txsEmptyBody: string;
  readonly txsAdd: string;
  readonly txsNoMatch: string;
  readonly showing: (visible: number, total: number) => string;
  readonly showAll: (total: number) => string;
  readonly detailTitle: string;
  readonly detailWhat: string;
  readonly detailConversion: string;
  readonly dirSrcPerDest: string;
  readonly dirDestPerSrc: string;
  readonly detailFee: string;
  readonly detailAccounting: string;
  readonly detailShow: string;
  readonly detailHide: string;
  readonly detailBridge: string;
  readonly detailDelete: string;
  readonly detailConfirmDelete: string;
  readonly entryTitle: string;
  readonly entryType: string;
  readonly entryKinds: TxKindLabels & { readonly 'card-purchase': string; readonly convert: string };
  readonly entryAccount: string;
  readonly entryFrom: string;
  readonly entryTo: string;
  readonly amountIn: (currency: string | null) => string;
  readonly entryForeign: string;
  readonly entryPriceCurrency: string;
  readonly priceIn: (currency: string) => string;
  readonly entryCategory: string;
  readonly entryRate: string;
  readonly entryRateMeaning: string;
  readonly entryFeeQ: string;
  readonly entryNoFee: string;
  readonly entryWithFee: string;
  readonly entryFeeAmount: string;
  readonly entryFeeCurrency: string;
  readonly entryFeeSrc: string;
  readonly entryFeeDest: string;
  readonly entryFeeCategory: string;
  readonly entryDate: string;
  readonly entryDatePh: string;
  readonly entryNote: string;
  readonly entryNotePh: string;
  readonly entrySave: string;
  readonly needAccount: string;
  readonly needFrom: string;
  readonly needTo: string;
  readonly needExpenseCat: string;
  readonly needIncomeCat: string;
  readonly needAmount: string;
  readonly needRate: string;
  readonly cardNeedsLiability: string;
  readonly catsTitle: string;
  readonly catsSubtitle: string;
  readonly catsEmpty: string;
  readonly catsEmptyBody: string;
  readonly catsExpense: string;
  readonly catsIncome: string;
  readonly usedIn: (n: number) => string;
  readonly catsNewName: string;
  readonly catsSaveName: string;
  readonly catsRename: string;
  readonly catsDelete: string;
  readonly catsBlockedDelete: string;
  readonly catsNewSection: string;
  readonly catsName: string;
  readonly catsNamePh: string;
  readonly createCategory: (kindLabel: string) => string;
  readonly moreTitle: string;
  readonly moreAbout: string;
  readonly moreAboutBody: string;
  readonly countsLine: (accounts: number, txs: number, categories: number) => string;
  readonly moreVersion: string;
  readonly moreLanguage: string;
  readonly moreManageCats: string;
  readonly moreCurrencies: string;
  readonly moreCurrenciesBody: string;
  readonly decimalsLine: (exponent: number, name: string) => string;
  readonly moreDanger: string;
  readonly moreErase: string;
  readonly moreConfirmErase: string;
  readonly moreErased: string;
  readonly a11yMinus: string;
  readonly a11yPlus: string;
  readonly a11yZero: string;
}

const es: Dict = {
  loading: 'Cargando…',
  couldntLoad: 'No se pudieron cargar los datos',
  tryAgain: 'Reintentar',
  cancel: 'Cancelar',
  all: 'Todo',
  no: 'No',
  yes: 'Sí',
  tabsHome: 'Inicio',
  tabsAccounts: 'Cuentas',
  tabsTransactions: 'Movimientos',
  tabsMore: 'Más',
  homeTitle: 'Inicio',
  homeSnapshot: 'Resumen',
  homeEmpty: 'Sin movimientos todavía. Los saldos están en cero.',
  homeNoAccounts: 'Sin cuentas todavía',
  homeNoAccountsBody: 'Creá tu primera cuenta para empezar a registrar dinero. Puede ser efectivo, un banco o una tarjeta.',
  homeGoAccounts: 'Ir a Cuentas',
  homeNoTx: 'Sin movimientos todavía',
  homeNoTxBody: 'Registrá tu primer gasto con el botón + en menos de 30 segundos.',
  homeAddHint: 'Usá el botón + para registrar un gasto, ingreso, transferencia o conversión.',
  homeRecent: 'Recientes',
  homeFab: 'Agregar movimiento',
  accountsHold: (n) => `${n} ${n === 1 ? 'cuenta tiene' : 'cuentas tienen'}`,
  accountsTitle: 'Cuentas',
  accountsEmpty: 'Sin cuentas todavía',
  accountsEmptyBody: 'Agregá una billetera de efectivo, una cuenta de banco o una tarjeta. Cada cuenta tiene una sola moneda.',
  accountsNew: 'Nueva cuenta',
  accountsCashBank: 'Efectivo y banco',
  accountsCardsDebts: 'Tarjetas y deudas',
  accountsEquity: 'Patrimonio',
  accountsNewSection: 'Nueva cuenta',
  accountsName: 'Nombre',
  accountsNamePh: 'Efectivo, Mi banco, Visa…',
  accountsKind: 'Tipo',
  accountsCurrency: 'Moneda',
  accountsOpening: 'Saldo inicial (opcional)',
  accountsCreate: 'Crear cuenta',
  accTitle: 'Cuenta',
  accNotFound: 'Esta cuenta ya no existe.',
  accAddTx: 'Agregar movimiento',
  accManage: 'Gestionar',
  accNewName: 'Nuevo nombre',
  accSaveName: 'Guardar nombre',
  accRename: 'Renombrar',
  accDelete: 'Eliminar cuenta',
  accConfirmDelete: 'Tocá de nuevo para confirmar la eliminación',
  accBlockedDelete: 'Esta cuenta tiene movimientos y no se puede eliminar. Los saldos quedan intactos.',
  recentIn: (n) => `Recientes en esta cuenta (${n})`,
  accNoRecent: 'Sin movimientos en esta cuenta todavía.',
  txsTitle: 'Movimientos',
  txsSearch: 'Buscar',
  txsSearchPh: 'Nota, categoría, cuenta…',
  txsType: 'Tipo',
  txsAccount: 'Cuenta',
  txsCategory: 'Categoría',
  kinds: { expense: 'Gasto', income: 'Ingreso', transfer: 'Transferencia', 'card-payment': 'Pago de tarjeta', conversion: 'Conversión' },
  clearFilters: (n) => `Limpiar filtros (${n})`,
  txsEmpty: 'Sin movimientos todavía',
  txsEmptyBody: 'Cada gasto, ingreso, transferencia y conversión que guardes aparece acá.',
  txsAdd: 'Agregar movimiento',
  txsNoMatch: 'Ningún movimiento coincide con estos filtros.',
  showing: (visible, total) => `${visible} de ${total}`,
  showAll: (total) => `Mostrar todo (${total})`,
  detailTitle: 'Detalle',
  detailWhat: 'Qué pasó',
  detailConversion: 'Conversión',
  dirSrcPerDest: 'origen por destino',
  dirDestPerSrc: 'destino por origen',
  detailFee: 'Incluye una comisión registrada como gasto.',
  detailAccounting: 'Detalle contable',
  detailShow: 'Mostrar movimientos',
  detailHide: 'Ocultar movimientos',
  detailBridge: '(puente)',
  detailDelete: 'Eliminar movimiento',
  detailConfirmDelete: 'Tocá de nuevo para confirmar la eliminación',
  entryTitle: 'Agregar movimiento',
  entryType: 'Tipo',
  entryKinds: { expense: 'Gasto', income: 'Ingreso', transfer: 'Transferencia', 'card-purchase': 'Compra con tarjeta', 'card-payment': 'Pago de tarjeta', conversion: 'Conversión', convert: 'Convertir' },
  entryAccount: 'Cuenta',
  entryFrom: 'Desde',
  entryTo: 'Hacia',
  amountIn: (currency) => (currency === null ? 'Monto' : `Monto en ${currency}`),
  entryForeign: '¿Precio en otra moneda?',
  entryPriceCurrency: 'Moneda del precio',
  priceIn: (currency) => `Precio en ${currency}`,
  entryCategory: 'Categoría',
  entryRate: 'Tasa de cambio',
  entryRateMeaning: 'Significado de la tasa',
  entryFeeQ: '¿Comisión?',
  entryNoFee: 'Sin comisión',
  entryWithFee: 'Con comisión',
  entryFeeAmount: 'Monto de la comisión',
  entryFeeCurrency: 'Moneda de la comisión',
  entryFeeSrc: 'Origen',
  entryFeeDest: 'Destino',
  entryFeeCategory: 'Categoría de la comisión',
  entryDate: 'Fecha',
  entryDatePh: 'AAAA-MM-DD',
  entryNote: 'Nota (opcional)',
  entryNotePh: '¿Qué fue esto?',
  entrySave: 'Guardar movimiento',
  needAccount: 'Elegí una cuenta.',
  needFrom: 'Elegí la cuenta de origen.',
  needTo: 'Elegí la cuenta de destino.',
  needExpenseCat: 'Elegí una categoría de gasto.',
  needIncomeCat: 'Elegí una categoría de ingreso.',
  needAmount: 'Ingresá un monto.',
  needRate: 'Ingresá la tasa de cambio.',
  cardNeedsLiability: 'La compra con tarjeta necesita una cuenta de pasivo (tarjeta).',
  catsTitle: 'Categorías',
  catsSubtitle: 'Las categorías viven en los registros de ingreso y gasto, nunca en transferencias ni conversiones.',
  catsEmpty: 'Sin categorías acá',
  catsEmptyBody: 'Creá una abajo para empezar a clasificar registros.',
  catsExpense: 'Gasto',
  catsIncome: 'Ingreso',
  usedIn: (n) => `Usada en ${n} movimiento${n === 1 ? '' : 's'}`,
  catsNewName: 'Nuevo nombre',
  catsSaveName: 'Guardar nombre',
  catsRename: 'Renombrar',
  catsDelete: 'Eliminar',
  catsBlockedDelete: 'Esta categoría está usada en movimientos y no se puede eliminar. El historial conserva su significado.',
  catsNewSection: 'Nueva categoría',
  catsName: 'Nombre',
  catsNamePh: 'Comida, Colectivo, …',
  createCategory: (kindLabel) => `Crear categoría de ${kindLabel.toLowerCase()}`,
  moreTitle: 'Más',
  moreAbout: 'Acerca de MoneyFOSS',
  moreAboutBody: 'Finanzas personales offline. Tu registro vive solo en este dispositivo.',
  countsLine: (accounts, txs, categories) => `${accounts} cuentas · ${txs} movimientos · ${categories} categorías`,
  moreVersion: 'Versión 1.0.0 · Sin red · Sin analítica · Sin nube',
  moreLanguage: 'Idioma',
  moreManageCats: 'Gestionar categorías',
  moreCurrencies: 'Monedas',
  moreCurrenciesBody: 'Los montos se guardan como enteros en las unidades menores de cada moneda.',
  decimalsLine: (exponent, name) => `${exponent} decimal${exponent === 1 ? '' : 'es'} · ${name}`,
  moreDanger: 'Zona de peligro',
  moreErase: 'Borrar todos los datos',
  moreConfirmErase: 'Tocá de nuevo para borrar todo',
  moreErased: 'Datos borrados. Se restauraron las categorías por defecto.',
  a11yMinus: 'menos',
  a11yPlus: 'más',
  a11yZero: 'cero',
};

const en: Dict = {
  loading: 'Loading…',
  couldntLoad: "Couldn't load this data",
  tryAgain: 'Try again',
  cancel: 'Cancel',
  all: 'All',
  no: 'No',
  yes: 'Yes',
  tabsHome: 'Home',
  tabsAccounts: 'Accounts',
  tabsTransactions: 'Transactions',
  tabsMore: 'More',
  homeTitle: 'Home',
  homeSnapshot: 'Snapshot',
  homeEmpty: 'No movements yet. Balances are zero across all accounts.',
  homeNoAccounts: 'No accounts yet',
  homeNoAccountsBody: 'Create your first account to start tracking money. It can be cash, a bank, or a card.',
  homeGoAccounts: 'Go to Accounts',
  homeNoTx: 'No transactions yet',
  homeNoTxBody: 'Record your first expense with the + button in under 30 seconds.',
  homeAddHint: 'Use the + button to record an expense, income, transfer or conversion.',
  homeRecent: 'Recent',
  homeFab: 'Add transaction',
  accountsHold: (n) => `${n} ${n === 1 ? 'account holds' : 'accounts hold'}`,
  accountsTitle: 'Accounts',
  accountsEmpty: 'No accounts yet',
  accountsEmptyBody: 'Add a cash wallet, a bank account or a credit card. Each account holds a single currency.',
  accountsNew: 'New account',
  accountsCashBank: 'Cash & bank',
  accountsCardsDebts: 'Cards & debts',
  accountsEquity: 'Equity',
  accountsNewSection: 'New account',
  accountsName: 'Name',
  accountsNamePh: 'Cash, My bank, Visa…',
  accountsKind: 'Kind',
  accountsCurrency: 'Currency',
  accountsOpening: 'Starting balance (optional)',
  accountsCreate: 'Create account',
  accTitle: 'Account',
  accNotFound: 'This account no longer exists.',
  accAddTx: 'Add transaction',
  accManage: 'Manage',
  accNewName: 'New name',
  accSaveName: 'Save name',
  accRename: 'Rename',
  accDelete: 'Delete account',
  accConfirmDelete: 'Tap again to confirm delete',
  accBlockedDelete: 'This account has transactions and cannot be deleted. Balances stay untouched.',
  recentIn: (n) => `Recent in this account (${n})`,
  accNoRecent: 'No transactions in this account yet.',
  txsTitle: 'Transactions',
  txsSearch: 'Search',
  txsSearchPh: 'Note, category, account…',
  txsType: 'Type',
  txsAccount: 'Account',
  txsCategory: 'Category',
  kinds: { expense: 'Expense', income: 'Income', transfer: 'Transfer', 'card-payment': 'Card payment', conversion: 'Conversion' },
  clearFilters: (n) => `Clear filters (${n})`,
  txsEmpty: 'No transactions yet',
  txsEmptyBody: 'Every expense, income, transfer and conversion you save will appear here.',
  txsAdd: 'Add transaction',
  txsNoMatch: 'No transactions match these filters.',
  showing: (visible, total) => `${visible} of ${total}`,
  showAll: (total) => `Show all (${total})`,
  detailTitle: 'Details',
  detailWhat: 'What happened',
  detailConversion: 'Conversion',
  dirSrcPerDest: 'source per destination',
  dirDestPerSrc: 'destination per source',
  detailFee: 'Includes a fee recorded as an expense.',
  detailAccounting: 'Accounting details',
  detailShow: 'Show postings',
  detailHide: 'Hide postings',
  detailBridge: '(bridge)',
  detailDelete: 'Delete transaction',
  detailConfirmDelete: 'Tap again to confirm delete',
  entryTitle: 'Add transaction',
  entryType: 'Type',
  entryKinds: { expense: 'Expense', income: 'Income', transfer: 'Transfer', 'card-purchase': 'Card purchase', 'card-payment': 'Card payment', conversion: 'Conversion', convert: 'Convert' },
  entryAccount: 'Account',
  entryFrom: 'From',
  entryTo: 'To',
  amountIn: (currency) => (currency === null ? 'Amount' : `Amount in ${currency}`),
  entryForeign: 'Priced in another currency?',
  entryPriceCurrency: 'Price currency',
  priceIn: (currency) => `Price in ${currency}`,
  entryCategory: 'Category',
  entryRate: 'Exchange rate',
  entryRateMeaning: 'Rate meaning',
  entryFeeQ: 'Fee?',
  entryNoFee: 'No fee',
  entryWithFee: 'With fee',
  entryFeeAmount: 'Fee amount',
  entryFeeCurrency: 'Fee currency',
  entryFeeSrc: 'Source',
  entryFeeDest: 'Destination',
  entryFeeCategory: 'Fee category',
  entryDate: 'Date',
  entryDatePh: 'YYYY-MM-DD',
  entryNote: 'Note (optional)',
  entryNotePh: 'What was this?',
  entrySave: 'Save transaction',
  needAccount: 'Choose an account.',
  needFrom: 'Choose the source account.',
  needTo: 'Choose the destination account.',
  needExpenseCat: 'Choose an expense category.',
  needIncomeCat: 'Choose an income category.',
  needAmount: 'Enter an amount.',
  needRate: 'Enter the exchange rate.',
  cardNeedsLiability: 'A card purchase needs a liability (card) account.',
  catsTitle: 'Categories',
  catsSubtitle: 'Categories live on income and expense records — never on transfers or conversions.',
  catsEmpty: 'No categories here',
  catsEmptyBody: 'Create one below to start classifying records.',
  catsExpense: 'Expense',
  catsIncome: 'Income',
  usedIn: (n) => `Used in ${n} posting${n === 1 ? '' : 's'}`,
  catsNewName: 'New name',
  catsSaveName: 'Save name',
  catsRename: 'Rename',
  catsDelete: 'Delete',
  catsBlockedDelete: 'This category is used by transactions and cannot be deleted. History keeps its meaning.',
  catsNewSection: 'New category',
  catsName: 'Name',
  catsNamePh: 'Groceries, Bus, …',
  createCategory: (kindLabel) => `Create ${kindLabel.toLowerCase()} category`,
  moreTitle: 'More',
  moreAbout: 'About MoneyFOSS',
  moreAboutBody: 'Offline-first personal finance. Your ledger lives on this device only.',
  countsLine: (accounts, txs, categories) => `${accounts} accounts · ${txs} transactions · ${categories} categories`,
  moreVersion: 'Version 1.0.0 · No network · No analytics · No cloud',
  moreLanguage: 'Language',
  moreManageCats: 'Manage categories',
  moreCurrencies: 'Currencies',
  moreCurrenciesBody: "Amounts are stored as integers in each currency's minor units.",
  decimalsLine: (exponent, name) => `${exponent} decimal${exponent === 1 ? '' : 's'} · ${name}`,
  moreDanger: 'Danger zone',
  moreErase: 'Erase all data',
  moreConfirmErase: 'Tap again to erase everything',
  moreErased: 'All data erased. Default categories were restored.',
  a11yMinus: 'minus',
  a11yPlus: 'plus',
  a11yZero: 'zero',
};

export const STRINGS: Record<Lang, Dict> = { es, en };

export function isLang(value: unknown): value is Lang {
  return value === 'es' || value === 'en';
}
