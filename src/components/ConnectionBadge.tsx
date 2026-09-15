import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, typography } from '../theme';
import type { ConnectionStatus } from '../types';

export function ConnectionBadge({ status }: { status: ConnectionStatus }) {
  const color =
    status === 'connected'
      ? colors.success
      : status === 'connecting'
        ? colors.warning
        : colors.danger;

  const label =
    status === 'connected'
      ? 'Connected'
      : status === 'connecting'
        ? 'Connecting'
        : 'Disconnected';

  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  text: { ...typography.caption, fontWeight: '600' },
});
