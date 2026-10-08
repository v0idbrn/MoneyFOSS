import type { SeedCategoryId } from './lib/seed-categories.ts';

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
  readonly accBlockedGoal: string;
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
  readonly needName: string;
  readonly needFrom: string;
  readonly needTo: string;
  readonly needExpenseCat: string;
  readonly needIncomeCat: string;
  readonly needAmount: string;
  readonly needRate: string;
  readonly entryNoCategories: string;
  readonly entryNoLiability: string;
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
  readonly catsConfirmDelete: string;
  readonly catsBlockedDelete: string;
  readonly catsDeletedBudget: string;
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
  readonly langPersistFailed: string;
  readonly moreManageCats: string;
  readonly moreCurrencies: string;
  readonly moreCurrenciesBody: string;
  readonly decimalsLine: (exponent: number, name: string) => string;
  readonly moreDanger: string;
  readonly moreErase: string;
  readonly moreConfirmErase: string;
  readonly moreErased: string;
  readonly moreExport: string;
  readonly moreExportBody: string;
  readonly exportCsv: string;
  readonly exportJson: string;
  readonly exportShared: string;
  readonly exportFailed: string;
  readonly importTitle: string;
  readonly importBody: string;
  readonly importField: string;
  readonly importAnalyze: string;
  readonly importPreview: string;
  readonly importConfirm: string;
  readonly importNew: string;
  readonly importDuplicates: string;
  readonly importConflicts: string;
  readonly importRejected: string;
  readonly importNewAccounts: string;
  readonly importNewCategories: string;
  readonly importNothing: string;
  readonly importDone: string;
  readonly budgetsTitle: string;
  readonly budgetsSubtitle: string;
  readonly budgetsEmpty: string;
  readonly budgetsEmptyBody: string;
  readonly budgetsNewSection: string;
  readonly budgetsCategory: string;
  readonly budgetsCurrency: string;
  readonly budgetsLimit: string;
  readonly budgetsCreate: string;
  readonly budgetsRemaining: string;
  readonly budgetsPickCategory: string;
  readonly budgetsNeedPositive: string;
  readonly reportsTitle: string;
  readonly reportsSubtitle: string;
  readonly reportsPrev: string;
  readonly reportsNext: string;
  readonly reportsIncome: string;
  readonly reportsExpense: string;
  readonly reportsNet: string;
  readonly reportsByCategory: string;
  readonly reportsEmpty: string;
  readonly reportsEmptyBody: string;
  readonly goalsTitle: string;
  readonly goalsSubtitle: string;
  readonly goalsEmpty: string;
  readonly goalsEmptyBody: string;
  readonly goalsNewSection: string;
  readonly goalsName: string;
  readonly goalsNamePh: string;
  readonly goalsCurrency: string;
  readonly goalsTarget: string;
  readonly goalsTargetDate: string;
  readonly goalsAccounts: string;
  readonly goalsCreate: string;
  readonly goalsUpdate: string;
  readonly goalsEdit: string;
  readonly goalsProgress: string;
  readonly goalsRemaining: string;
  readonly goalsPickAccounts: string;
  readonly goalsNeedPositive: string;
  readonly goalsInvalidDate: string;
  readonly goalsNoAccountsForCurrency: string;
  readonly goalsPickAtLeastOne: string;
  readonly a11yMinus: string;
  readonly a11yPlus: string;
  readonly a11yZero: string;
  readonly toastSaved: string;
  readonly toastDeleted: string;
  readonly toastCreated: string;
  readonly toastNameSaved: string;
  readonly rateLabel: string;
  readonly withFee: string;
  readonly rowTransfer: string;
  readonly rowCardPayment: string;
  readonly entryNoAccounts: string;
  readonly entryNoAccountsBody: string;
  readonly seedCategoryNames: Record<SeedCategoryId, string>;
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
  accBlockedGoal: 'Esta cuenta es parte de una meta. Editá o eliminá la meta primero.',
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
  needName: 'Ingresá un nombre.',
  needFrom: 'Elegí la cuenta de origen.',
  needTo: 'Elegí la cuenta de destino.',
  needExpenseCat: 'Elegí una categoría de gasto.',
  needIncomeCat: 'Elegí una categoría de ingreso.',
  needAmount: 'Ingresá un monto.',
  needRate: 'Ingresá la tasa de cambio.',
  entryNoCategories: 'No hay categorías de este tipo. Creá una en Más → Categorías.',
  entryNoLiability: 'No hay cuentas de tarjeta. Creá una en Cuentas.',
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
  catsConfirmDelete: 'Tocá de nuevo para confirmar la eliminación',
  catsBlockedDelete: 'Esta categoría está usada en movimientos y no se puede eliminar. El historial conserva su significado.',
  catsDeletedBudget: 'Categoría y su presupuesto eliminados.',
  catsNewSection: 'Nueva categoría',
  catsName: 'Nombre',
  catsNamePh: 'Comida, Colectivo, …',
  createCategory: (kindLabel) => `Crear categoría de ${kindLabel.toLowerCase()}`,
  moreTitle: 'Más',
  moreAbout: 'Acerca de MoneyFOSS',
  moreAboutBody: 'Finanzas personales offline. Tu registro vive solo en este dispositivo.',
  countsLine: (accounts, txs, categories) => `${accounts} cuentas · ${txs} movimientos · ${categories} categorías`,
  moreVersion: 'Versión 1.1.0 · Sin red · Sin analítica · Sin nube',
  moreLanguage: 'Idioma',
  langPersistFailed: 'No se pudo guardar el idioma.',
  moreManageCats: 'Gestionar categorías',
  moreCurrencies: 'Monedas',
  moreCurrenciesBody: 'Los montos se guardan como enteros en las unidades menores de cada moneda.',
  decimalsLine: (exponent, name) => `${exponent} decimal${exponent === 1 ? '' : 'es'} · ${name}`,
  moreDanger: 'Zona de peligro',
  moreErase: 'Borrar todos los datos',
  moreConfirmErase: 'Tocá de nuevo para borrar todo',
  moreErased: 'Datos borrados. Se restauraron las categorías por defecto.',
  moreExport: 'Exportar datos',
  moreExportBody: 'CSV para hoja de cálculo; JSON con cuentas, categorías, movimientos, presupuestos y metas. No son un backup restaurable.',
  exportCsv: 'Exportar CSV (movimientos)',
  exportJson: 'Exportar JSON (cuentas, categorías, movimientos, presupuestos, metas)',
  exportShared: 'Exportación lista para compartir.',
  exportFailed: 'No se pudo preparar la exportación.',
  importTitle: 'Importar CSV',
  importBody: 'Pegá un CSV exportado por MoneyFOSS. Se analiza primero: nada se escribe hasta que confirmes.',
  importField: 'Contenido CSV',
  importAnalyze: 'Analizar',
  importPreview: 'Vista previa',
  importConfirm: 'Confirmar importación',
  importNew: 'Movimientos nuevos',
  importDuplicates: 'Duplicados (se omiten)',
  importConflicts: 'Conflictos (se conserva lo existente)',
  importRejected: 'Rechazados',
  importNewAccounts: 'Cuentas nuevas',
  importNewCategories: 'Categorías nuevas',
  importNothing: 'Sin movimientos nuevos para importar.',
  importDone: 'Importación completada.',
  budgetsTitle: 'Presupuestos',
  budgetsSubtitle: 'Límite mensual por categoría y moneda. Solo descriptivo: medido desde el ledger.',
  budgetsEmpty: 'Sin presupuestos todavía',
  budgetsEmptyBody: 'Elegí una categoría, una moneda y un límite mensual.',
  budgetsNewSection: 'Nuevo presupuesto (o actualizar el límite)',
  budgetsCategory: 'Categoría',
  budgetsCurrency: 'Moneda',
  budgetsLimit: 'Límite mensual',
  budgetsCreate: 'Guardar presupuesto',
  budgetsRemaining: 'Restante',
  budgetsPickCategory: 'Elegí una categoría.',
  budgetsNeedPositive: 'El límite debe ser mayor a cero.',
  reportsTitle: 'Reportes',
  reportsSubtitle: 'Resumen del mes por moneda. Solo lectura: derivado del ledger.',
  reportsPrev: 'Mes anterior',
  reportsNext: 'Mes siguiente',
  reportsIncome: 'Ingresos',
  reportsExpense: 'Gastos',
  reportsNet: 'Neto',
  reportsByCategory: 'Gastos por categoría',
  reportsEmpty: 'Sin movimientos categorizados en este mes',
  reportsEmptyBody: 'Elegí otro mes o registrá un movimiento.',
  goalsTitle: 'Metas',
  goalsSubtitle: 'Objetivo de ahorro sobre cuentas. Solo descriptivo: progreso derivado del ledger.',
  goalsEmpty: 'Sin metas todavía',
  goalsEmptyBody: 'Elegí un nombre, una moneda, un monto objetivo y una o más cuentas.',
  goalsNewSection: 'Nueva meta (o actualizar)',
  goalsName: 'Nombre',
  goalsNamePh: 'Ej: Vacaciones 2026',
  goalsCurrency: 'Moneda',
  goalsTarget: 'Monto objetivo',
  goalsTargetDate: 'Fecha objetivo (opcional)',
  goalsAccounts: 'Cuentas que aportan',
  goalsCreate: 'Guardar meta',
  goalsUpdate: 'Actualizar meta',
  goalsEdit: 'Editar',
  goalsProgress: 'Progreso',
  goalsRemaining: 'Restante',
  goalsPickAccounts: 'Elegí al menos una cuenta.',
  goalsNeedPositive: 'El monto objetivo debe ser mayor a cero.',
  goalsInvalidDate: 'La fecha objetivo debe tener formato AAAA-MM-DD.',
  goalsNoAccountsForCurrency: 'No hay cuentas en esta moneda.',
  goalsPickAtLeastOne: 'Seleccioná al menos una cuenta.',
  a11yMinus: 'menos',
  a11yPlus: 'más',
  a11yZero: 'cero',
  toastSaved: 'Movimiento guardado',
  toastDeleted: 'Eliminado',
  toastCreated: 'Creado',
  toastNameSaved: 'Nombre guardado',
  rateLabel: 'Tasa',
  withFee: 'con comisión',
  rowTransfer: 'Transferencia entre cuentas',
  rowCardPayment: 'Pago a tarjeta de crédito',
  entryNoAccounts: 'Sin cuentas todavía',
  entryNoAccountsBody: 'Creá una cuenta antes de registrar movimientos. Puede ser efectivo, un banco o una tarjeta.',
  seedCategoryNames: {
    'cat:food': 'Comida',
    'cat:transport': 'Transporte',
    'cat:housing': 'Vivienda',
    'cat:health': 'Salud',
    'cat:education': 'Educación',
    'cat:entertainment': 'Entretenimiento',
    'cat:shopping': 'Compras',
    'cat:other-expense': 'Otro',
    'cat:salary': 'Salario',
    'cat:freelance': 'Freelance',
    'cat:other-income': 'Otro',
  },
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
  accBlockedGoal: 'This account is part of a goal. Edit or delete the goal first.',
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
  needName: 'Enter a name.',
  needFrom: 'Choose the source account.',
  needTo: 'Choose the destination account.',
  needExpenseCat: 'Choose an expense category.',
  needIncomeCat: 'Choose an income category.',
  needAmount: 'Enter an amount.',
  needRate: 'Enter the exchange rate.',
  entryNoCategories: 'No categories of this type yet. Create one in More → Categories.',
  entryNoLiability: 'No card accounts yet. Create one in Accounts.',
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
  catsConfirmDelete: 'Tap again to confirm delete',
  catsBlockedDelete: 'This category is used by transactions and cannot be deleted. History keeps its meaning.',
  catsDeletedBudget: 'Category and its budget deleted.',
  catsNewSection: 'New category',
  catsName: 'Name',
  catsNamePh: 'Groceries, Bus, …',
  createCategory: (kindLabel) => `Create ${kindLabel.toLowerCase()} category`,
  moreTitle: 'More',
  moreAbout: 'About MoneyFOSS',
  moreAboutBody: 'Offline-first personal finance. Your ledger lives on this device only.',
  countsLine: (accounts, txs, categories) => `${accounts} accounts · ${txs} transactions · ${categories} categories`,
  moreVersion: 'Version 1.1.0 · No network · No analytics · No cloud',
  moreLanguage: 'Language',
  langPersistFailed: 'Could not save the language.',
  moreManageCats: 'Manage categories',
  moreCurrencies: 'Currencies',
  moreCurrenciesBody: "Amounts are stored as integers in each currency's minor units.",
  decimalsLine: (exponent, name) => `${exponent} decimal${exponent === 1 ? '' : 's'} · ${name}`,
  moreDanger: 'Danger zone',
  moreErase: 'Erase all data',
  moreConfirmErase: 'Tap again to erase everything',
  moreErased: 'All data erased. Default categories were restored.',
  moreExport: 'Export data',
  moreExportBody: 'CSV for spreadsheets; JSON with accounts, categories, transactions, budgets and goals. Neither is a restorable backup.',
  exportCsv: 'Export CSV (transactions)',
  exportJson: 'Export JSON (accounts, categories, transactions, budgets, goals)',
  exportShared: 'Export ready to share.',
  exportFailed: 'Could not prepare the export.',
  importTitle: 'Import CSV',
  importBody: 'Paste a CSV exported by MoneyFOSS. It is analyzed first: nothing is written until you confirm.',
  importField: 'CSV content',
  importAnalyze: 'Analyze',
  importPreview: 'Preview',
  importConfirm: 'Confirm import',
  importNew: 'New transactions',
  importDuplicates: 'Duplicates (skipped)',
  importConflicts: 'Conflicts (existing kept)',
  importRejected: 'Rejected',
  importNewAccounts: 'New accounts',
  importNewCategories: 'New categories',
  importNothing: 'No new transactions to import.',
  importDone: 'Import finished.',
  budgetsTitle: 'Budgets',
  budgetsSubtitle: 'Monthly limit per category and currency. Descriptive only: measured from the ledger.',
  budgetsEmpty: 'No budgets yet',
  budgetsEmptyBody: 'Pick a category, a currency and a monthly limit.',
  budgetsNewSection: 'New budget (or update the limit)',
  budgetsCategory: 'Category',
  budgetsCurrency: 'Currency',
  budgetsLimit: 'Monthly limit',
  budgetsCreate: 'Save budget',
  budgetsRemaining: 'Remaining',
  budgetsPickCategory: 'Pick a category.',
  budgetsNeedPositive: 'The limit must be greater than zero.',
  reportsTitle: 'Reports',
  reportsSubtitle: 'Monthly summary per currency. Read-only: derived from the ledger.',
  reportsPrev: 'Previous month',
  reportsNext: 'Next month',
  reportsIncome: 'Income',
  reportsExpense: 'Expenses',
  reportsNet: 'Net',
  reportsByCategory: 'Expenses by category',
  reportsEmpty: 'No categorized activity in this month',
  reportsEmptyBody: 'Pick another month or record a transaction.',
  goalsTitle: 'Goals',
  goalsSubtitle: 'Savings goal on accounts. Descriptive only: progress derived from the ledger.',
  goalsEmpty: 'No goals yet',
  goalsEmptyBody: 'Pick a name, a currency, a target amount and one or more accounts.',
  goalsNewSection: 'New goal (or update)',
  goalsName: 'Name',
  goalsNamePh: 'E.g. Vacation 2026',
  goalsCurrency: 'Currency',
  goalsTarget: 'Target amount',
  goalsTargetDate: 'Target date (optional)',
  goalsAccounts: 'Accounts that contribute',
  goalsCreate: 'Save goal',
  goalsUpdate: 'Update goal',
  goalsEdit: 'Edit',
  goalsProgress: 'Progress',
  goalsRemaining: 'Remaining',
  goalsPickAccounts: 'Pick at least one account.',
  goalsNeedPositive: 'The target amount must be greater than zero.',
  goalsInvalidDate: 'Target date must be in YYYY-MM-DD format.',
  goalsNoAccountsForCurrency: 'No accounts in this currency.',
  goalsPickAtLeastOne: 'Select at least one account.',
  a11yMinus: 'minus',
  a11yPlus: 'plus',
  a11yZero: 'zero',
  toastSaved: 'Transaction saved',
  toastDeleted: 'Deleted',
  toastCreated: 'Created',
  toastNameSaved: 'Name saved',
  rateLabel: 'Rate',
  withFee: 'with fee',
  rowTransfer: 'Transfer between accounts',
  rowCardPayment: 'Credit card payment',
  entryNoAccounts: 'No accounts yet',
  entryNoAccountsBody: 'Create an account before recording transactions. It can be cash, a bank, or a card.',
  seedCategoryNames: {
    'cat:food': 'Food',
    'cat:transport': 'Transport',
    'cat:housing': 'Housing',
    'cat:health': 'Health',
    'cat:education': 'Education',
    'cat:entertainment': 'Entertainment',
    'cat:shopping': 'Shopping',
    'cat:other-expense': 'Other',
    'cat:salary': 'Salary',
    'cat:freelance': 'Freelance',
    'cat:other-income': 'Other',
  },
};

export const STRINGS: Record<Lang, Dict> = { es, en };

export function isLang(value: unknown): value is Lang {
  return value === 'es' || value === 'en';
}
