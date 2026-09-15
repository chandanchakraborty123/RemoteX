import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { AppShortcut } from '../types';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export function AppShortcutIcon({
  app,
  size = 18,
}: {
  app: AppShortcut;
  size?: number;
}) {
  const box = Math.max(28, size + 12);

  return (
    <View style={[styles.wrap, { width: box, height: box, borderRadius: box / 3, backgroundColor: app.color }]}>
      <MaterialCommunityIcons
        name={(app.icon || 'application') as IconName}
        size={size}
        color="#fff"
      />
    </View>
  );
}

/** Compact logo-only chip used in remote app row */
export function AppShortcutBadge({
  app,
  size = 36,
}: {
  app: AppShortcut;
  size?: number;
}) {
  return (
    <View
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: size * 0.28,
          backgroundColor: app.color,
        },
      ]}
    >
      <MaterialCommunityIcons
        name={(app.icon || 'application') as IconName}
        size={size * 0.55}
        color="#fff"
      />
    </View>
  );
}

export function AppShortcutFallbackLetter({
  name,
  color,
  size = 28,
}: {
  name: string;
  color: string;
  size?: number;
}) {
  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: size / 3,
          backgroundColor: color,
        },
      ]}
    >
      <Text style={[styles.letter, { fontSize: size * 0.45 }]}>{name.charAt(0).toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    color: '#fff',
    fontWeight: '800',
  },
});
