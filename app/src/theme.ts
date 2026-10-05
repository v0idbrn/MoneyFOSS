export const palette = {
  belladonna: '#24020E',
  sanctuary: '#4B032A',
  velvet: '#720F50',
  magenta: '#943A79',
  parade: '#B36FA3',
} as const;

export const colors = {
  background: '#24020E',
  backgroundElevated: '#2E0511',
  surface: '#4B032A',
  surfaceElevated: '#571237',
  primary: '#720F50',
  primaryPressed: '#5C0C42',
  secondary: '#943A79',
  highlight: '#B36FA3',
  border: '#5E1E45',
  textPrimary: '#F7EFF3',
  textSecondary: '#C4A3B4',
  textMuted: '#9C7B8E',
  danger: '#E5484D',
  warning: '#E8A33D',
  success: '#46A758',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 10,
} as const;

export const type = {
  hero: { fontSize: 28, fontWeight: '700' as const, lineHeight: 34 },
  title: { fontSize: 20, fontWeight: '700' as const, lineHeight: 26 },
  section: { fontSize: 16, fontWeight: '600' as const, lineHeight: 22 },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 22 },
  amount: { fontSize: 20, fontWeight: '600' as const, lineHeight: 26 },
  meta: { fontSize: 14, fontWeight: '400' as const, lineHeight: 19 },
  small: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
} as const;
