import React, { createContext, useCallback, useContext, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, radius, spacing, type } from './theme';
import { accessibilityAmount, formatDisplayAmount } from './lib/format';
import { describeTransaction } from './lib/describe';
import { useStrings } from './lang';
import type { Dict } from './i18n';
import type { Account, Category, Transaction } from '../../src/domain/types.ts';

export type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

export interface Toast {
  readonly id: string;
  readonly message: string;
  readonly kind: 'success' | 'error';
}

const ToastContext = createContext<(message: string, kind: Toast['kind']) => void>(() => {});

export function useToast(): (message: string, kind: Toast['kind']) => void {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [toasts, setToasts] = useState<readonly Toast[]>([]);
  const show = useCallback((message: string, kind: Toast['kind']) => {
    const id = `${Date.now().toString(36)}-${Math.floor(Math.random() * 2176782336).toString(36)}`;
    setToasts((prev) => [...prev, { id, message, kind }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <View style={styles.toastContainer} pointerEvents="box-none">
        {toasts.map((toast) => (
          <View key={toast.id} style={[styles.toast, toast.kind === 'error' ? styles.toastError : styles.toastSuccess]}>
            <Text style={styles.toastText}>{toast.message}</Text>
          </View>
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export function Screen({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.screenContent} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function H1({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <Text style={styles.h1}>{children}</Text>;
}

export function Section({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <Text style={styles.section}>{children}</Text>;
}

export function Body({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <Text style={styles.body}>{children}</Text>;
}

export function Meta({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <Text style={styles.meta}>{children}</Text>;
}

export function Small({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <Text style={styles.small}>{children}</Text>;
}

export function Amount({
  amount,
  currency,
  big,
  words,
}: {
  amount: bigint;
  currency: string;
  big?: boolean;
  words: { minus: string; plus: string; zero: string };
}): React.JSX.Element {
  return (
    <Text
      style={big === true ? styles.amountBig : styles.amount}
      accessibilityRole="text"
      accessibilityLabel={accessibilityAmount(amount, currency, words)}
    >
      {formatDisplayAmount(amount, currency)} {currency}
    </Text>
  );
}

export function Divider(): React.JSX.Element {
  return <View style={styles.divider} />;
}

export function Btn({
  title,
  onPress,
  kind,
  disabled,
  icon,
}: {
  title: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  icon?: IconName;
}): React.JSX.Element {
  const style = [styles.btn, kind === 'secondary' ? styles.btnSecondary : kind === 'danger' ? styles.btnDanger : styles.btnPrimary];
  return (
    <Pressable
      style={({ pressed }) => [...style, pressed && !disabled ? styles.btnPressed : null, disabled === true ? styles.btnDisabled : null]}
      onPress={onPress}
      disabled={disabled === true}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled === true }}
      android_ripple={{ color: 'rgba(255,255,255,0.12)' }}
    >
      {icon !== undefined ? <MaterialIcons name={icon} size={20} color={colors.textPrimary} style={styles.btnIcon} /> : null}
      <Text style={styles.btnText}>{title}</Text>
    </Pressable>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  error,
  maxLength,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'decimal-pad';
  error?: string;
  maxLength?: number;
}): React.JSX.Element {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, error !== undefined && error !== '' ? styles.inputError : null]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType ?? 'default'}
        maxLength={maxLength}
        accessibilityLabel={label}
      />
      {error !== undefined && error !== '' ? (
        <Text style={styles.fieldError} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }): React.JSX.Element {
  return (
    <Pressable
      style={[styles.chip, active ? styles.chipActive : null]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  actionLabel,
  onAction,
}: {
  icon: IconName;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}): React.JSX.Element {
  return (
    <View style={styles.empty}>
      <MaterialIcons name={icon} size={40} color={colors.textMuted} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      {actionLabel !== undefined && onAction !== undefined ? (
        <View style={styles.emptyAction}>
          <Btn title={actionLabel} onPress={onAction} kind="secondary" />
        </View>
      ) : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }): React.JSX.Element {
  const { t } = useStrings();
  return (
    <View style={styles.empty}>
      <MaterialIcons name="error-outline" size={40} color={colors.danger} />
      <Text style={styles.emptyTitle}>{t.couldntLoad}</Text>
      <Text style={styles.emptyBody}>{message}</Text>
      {onRetry !== undefined ? (
        <View style={styles.emptyAction}>
          <Btn title={t.tryAgain} onPress={onRetry} kind="secondary" />
        </View>
      ) : null}
    </View>
  );
}

export function FormError({ message }: { message: string }): React.JSX.Element {
  return (
    <Text style={styles.formError} accessibilityRole="alert">
      {message}
    </Text>
  );
}

export function Fab({ onPress, label }: { onPress: () => void; label: string }): React.JSX.Element {
  return (
    <Pressable
      style={({ pressed }) => [styles.fab, pressed ? styles.fabPressed : null]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
    >
      <MaterialIcons name="add" size={28} color={colors.textPrimary} />
    </Pressable>
  );
}

export function TxRow({
  tx,
  accounts,
  categories,
  t,
  onPress,
}: {
  tx: Transaction;
  accounts: ReadonlyMap<string, Account>;
  categories: ReadonlyMap<string, Category>;
  t: Dict;
  onPress: () => void;
}): React.JSX.Element {
  const view = describeTransaction(tx, accounts, categories, t);
  const icon: IconName =
    view.kind === 'expense'
      ? 'remove'
      : view.kind === 'income'
        ? 'add'
        : view.kind === 'conversion'
          ? 'currency-exchange'
          : view.kind === 'card-payment'
            ? 'credit-card'
            : 'swap-horiz';
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${view.title}, ${view.detail}`}
    >
      <View style={styles.rowIcon}>
        <MaterialIcons name={icon} size={22} color={colors.highlight} />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {view.title}
        </Text>
        <Text style={styles.rowDetail} numberOfLines={1}>
          {tx.date} · {view.detail}
        </Text>
        {view.amounts.map((line, index) => (
          <Text key={`${line.currency}-${String(index)}`} style={styles.rowAmount}>
            {formatDisplayAmount(line.amount, line.currency)} {line.currency}
          </Text>
        ))}
      </View>
      <MaterialIcons name="chevron-right" size={22} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  screenContent: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  h1: { ...type.hero, color: colors.textPrimary, marginBottom: spacing.sm },
  section: { ...type.section, color: colors.textPrimary, marginTop: spacing.md },
  body: { ...type.body, color: colors.textPrimary },
  meta: { ...type.meta, color: colors.textSecondary },
  small: { ...type.small, color: colors.textMuted },
  amount: { ...type.amount, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  amountBig: { ...type.hero, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  btn: {
    minHeight: 48,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  btnPrimary: { backgroundColor: colors.primary },
  btnSecondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  btnDanger: { backgroundColor: colors.danger },
  btnPressed: { opacity: 0.85 },
  btnDisabled: { opacity: 0.45 },
  btnText: { ...type.section, color: colors.textPrimary },
  btnIcon: { marginRight: spacing.sm },
  field: { gap: spacing.xs },
  fieldLabel: { ...type.meta, color: colors.textSecondary },
  input: {
    ...type.body,
    color: colors.textPrimary,
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  inputError: { borderColor: colors.danger },
  fieldError: { ...type.small, color: colors.danger },
  formError: { ...type.body, color: colors.danger },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  chipActive: { borderColor: colors.highlight, backgroundColor: colors.surface },
  chipText: { ...type.meta, color: colors.textSecondary },
  chipTextActive: { color: colors.textPrimary },
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg },
  emptyTitle: { ...type.title, color: colors.textPrimary, textAlign: 'center' },
  emptyBody: { ...type.body, color: colors.textSecondary, textAlign: 'center' },
  emptyAction: { marginTop: spacing.sm },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  fabPressed: { opacity: 0.85 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowPressed: { opacity: 0.7 },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { ...type.section, color: colors.textPrimary },
  rowDetail: { ...type.meta, color: colors.textSecondary },
  rowAmount: { ...type.amount, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  toastContainer: {
    position: 'absolute',
    bottom: spacing.xxl,
    left: spacing.lg,
    right: spacing.lg,
    gap: spacing.sm,
  },
  toast: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    elevation: 4,
  },
  toastSuccess: { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.highlight },
  toastError: { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.danger },
  toastText: { ...type.body, color: colors.textPrimary, textAlign: 'center' },
});
