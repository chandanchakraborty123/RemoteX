import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import type { RootStackParamList } from '../navigation/types';
import { colors, spacing, typography } from '../theme';

export function FavoritesScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { favorites, devices, macros, setActiveDevice, reconnectDevice, runMacro } = useApp();

  const items =
    favorites.length > 0
      ? favorites
      : [
          ...devices
            .filter((d) => d.favorite)
            .map((d) => ({
              id: `fav-${d.id}`,
              kind: 'device' as const,
              title: d.name,
              subtitle: `${d.brand} · ${d.platform}`,
              refId: d.id,
            })),
          ...macros
            .filter((m) => m.favorite)
            .map((m) => ({
              id: `fav-${m.id}`,
              kind: 'macro' as const,
              title: m.name,
              subtitle: `${m.actions.length} actions`,
              refId: m.id,
            })),
        ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: spacing.xxxl }}
    >
      <Text style={styles.title}>Favorites</Text>
      <Text style={styles.subtitle}>Devices, apps, macros and scenes you use most.</Text>

      {items.length === 0 ? (
        <Text style={styles.empty}>Star a device from the remote to add favorites.</Text>
      ) : (
        items.map((item) => (
          <Pressable
            key={item.id}
            style={styles.card}
            onPress={async () => {
              if (item.kind === 'device') {
                const device = devices.find((d) => d.id === item.refId);
                if (device) {
                  if (device.status !== 'connected' && device.paired) {
                    const ok = await reconnectDevice(device.id);
                    if (!ok) return;
                  } else {
                    await setActiveDevice(device);
                  }
                  navigation.navigate('Remote');
                }
              }
              if (item.kind === 'macro') {
                const macro = macros.find((m) => m.id === item.refId);
                if (macro) void runMacro(macro);
              }
            }}
          >
            <View style={styles.icon}>
              <Ionicons
                name={item.kind === 'macro' ? 'flash-outline' : 'star'}
                size={18}
                color={colors.warning}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.title}</Text>
              {item.subtitle ? <Text style={styles.meta}>{item.subtitle}</Text> : null}
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  title: { ...typography.title, color: colors.text },
  subtitle: { color: colors.textSecondary, marginTop: 4, marginBottom: spacing.xl },
  empty: { color: colors.textSecondary },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.secondaryBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { color: colors.text, fontWeight: '700' },
  meta: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
});
