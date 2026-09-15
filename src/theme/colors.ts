export const colors = {
  background: '#0B0F19',
  secondaryBackground: '#111827',
  card: '#172033',
  primary: '#5865F2',
  secondary: '#7C3AED',
  text: '#FFFFFF',
  textSecondary: '#94A3B8',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  border: '#263247',
  overlay: 'rgba(0,0,0,0.55)',
  touchpad: '#1A2336',
  muted: '#334155',
} as const;

export type ColorName = keyof typeof colors;
