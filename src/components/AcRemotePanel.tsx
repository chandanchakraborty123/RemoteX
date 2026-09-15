import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../theme';
import type { AcDeviceState, RemoteActionType } from '../types';

const MODES = [
  { id: 'cool', label: 'Cool', icon: 'snow-outline' as const },
  { id: 'heat', label: 'Heat', icon: 'flame-outline' as const },
  { id: 'fan', label: 'Fan', icon: 'leaf-outline' as const },
  { id: 'dry', label: 'Dry', icon: 'water-outline' as const },
  { id: 'auto', label: 'Auto', icon: 'sync-outline' as const },
];

const FANS = [
  { id: 'auto', label: 'Auto' },
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Med' },
  { id: 'high', label: 'High' },
];

interface AcRemotePanelProps {
  state: AcDeviceState;
  transportLabel: string;
  onAction: (type: RemoteActionType, payload?: Record<string, string | number | boolean>) => void;
}

export function AcRemotePanel({ state, transportLabel, onAction }: AcRemotePanelProps) {
  return (
    <View style={styles.root}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>{state.power ? 'On' : 'Off'} · {transportLabel}</Text>
        <Text style={styles.temp}>{state.temp}°</Text>
        <Text style={styles.meta}>
          {state.mode} · Fan {state.fan}
        </Text>
      </View>

      <Pressable
        style={[styles.power, !state.power && styles.powerOff]}
        onPress={() => onAction('POWER')}
      >
        <Ionicons name="power" size={26} color={state.power ? colors.danger : colors.text} />
        <Text style={[styles.powerText, state.power && { color: colors.danger }]}>
          Power
        </Text>
      </Pressable>

      <View style={styles.tempRow}>
        <Pressable style={styles.tempBtn} onPress={() => onAction('TEMP_DOWN')}>
          <Text style={styles.tempBtnText}>−</Text>
        </Pressable>
        <View style={styles.tempMid}>
          <Text style={styles.tempMidLabel}>Temperature</Text>
          <Text style={styles.tempMidValue}>{state.temp}°C</Text>
        </View>
        <Pressable style={styles.tempBtn} onPress={() => onAction('TEMP_UP')}>
          <Text style={styles.tempBtnText}>+</Text>
        </Pressable>
      </View>

      <Text style={styles.section}>Mode</Text>
      <View style={styles.chipRow}>
        {MODES.map((m) => {
          const on = state.mode === m.id;
          return (
            <Pressable
              key={m.id}
              style={[styles.chip, on && styles.chipOn]}
              onPress={() => onAction('MODE', { mode: m.id })}
            >
              <Ionicons name={m.icon} size={16} color={on ? '#fff' : colors.textSecondary} />
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{m.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.section}>Fan</Text>
      <View style={styles.chipRow}>
        {FANS.map((f) => {
          const on = state.fan === f.id;
          return (
            <Pressable
              key={f.id}
              style={[styles.chip, on && styles.chipOn]}
              onPress={() => onAction('FAN', { fan: f.id })}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{f.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.note}>
        IR / Wi‑Fi bridge ready — connect a blaster or brand API later; state is live now.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.lg },
  hero: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    borderRadius: 24,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  eyebrow: { ...typography.caption, color: colors.textSecondary, textTransform: 'capitalize' },
  temp: { fontSize: 72, fontWeight: '200', color: colors.text, marginTop: 4 },
  meta: { ...typography.label, color: colors.textSecondary, textTransform: 'capitalize', marginTop: 4 },
  power: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  powerOff: { opacity: 0.9 },
  powerText: { color: colors.text, fontWeight: '700', fontSize: 15 },
  tempRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  tempBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tempBtnText: { color: colors.text, fontSize: 36, fontWeight: '300', marginTop: -2 },
  tempMid: { flex: 1, alignItems: 'center' },
  tempMidLabel: { ...typography.caption, color: colors.textSecondary },
  tempMidValue: { ...typography.title, color: colors.text, marginTop: 2 },
  section: { ...typography.label, color: colors.textSecondary },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textSecondary, fontWeight: '600', fontSize: 13 },
  chipTextOn: { color: '#fff' },
  note: { ...typography.caption, color: colors.textSecondary, lineHeight: 18 },
});
