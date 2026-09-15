import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../theme';
import type { ConnectionStatus } from '../types';

interface DeviceCardProps {
  title: string;
  subtitle: string;
  icon?: keyof typeof Ionicons.glyphMap;
  status?: ConnectionStatus;
  /** Saved pairing — can reconnect without a new code */
  paired?: boolean;
  /** False = control not shipped yet (show Coming soon instead of Offline) */
  ready?: boolean;
  onPress?: () => void;
  selected?: boolean;
}

export function DeviceCard({
  title,
  subtitle,
  icon = 'tv-outline',
  status,
  paired,
  ready = true,
  onPress,
  selected,
}: DeviceCardProps) {
  const comingSoon = !ready;

  const statusColor = comingSoon
    ? colors.warning
    : status === 'connected'
      ? colors.success
      : status === 'connecting'
        ? colors.warning
        : paired
          ? colors.primary
          : colors.textSecondary;

  const statusLabel = comingSoon
    ? 'Coming soon'
    : status === 'connected'
      ? 'Connected'
      : status === 'connecting'
        ? 'Connecting'
        : paired
          ? 'Tap to reconnect'
          : 'Offline';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        selected && styles.selected,
        comingSoon && styles.comingSoonCard,
        pressed && { opacity: 0.88 },
      ]}
    >
      <View style={[styles.iconWrap, comingSoon && styles.iconWrapMuted]}>
        <Ionicons
          name={icon}
          size={22}
          color={comingSoon ? colors.textSecondary : colors.primary}
        />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      {status ? (
        <View style={styles.statusWrap}>
          <View style={[styles.dot, { backgroundColor: statusColor }]} />
          <Text style={[styles.status, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  comingSoonCard: {
    opacity: 0.92,
  },
  selected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(88,101,242,0.12)',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.secondaryBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapMuted: {
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  content: { flex: 1 },
  title: { ...typography.body, color: colors.text, fontWeight: '600' },
  subtitle: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  statusWrap: { alignItems: 'flex-end', gap: 4, maxWidth: 96 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  status: { ...typography.caption, textAlign: 'right' },
});
