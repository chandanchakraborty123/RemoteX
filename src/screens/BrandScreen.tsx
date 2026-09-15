import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { getBrandsForType } from '../data/brands';
import type { RootStackProps } from '../navigation/types';
import { colors, spacing, typography } from '../theme';

export function BrandScreen({ navigation, route }: RootStackProps<'Brand'>) {
  const { deviceType } = route.params;
  const [query, setQuery] = useState('');
  const brands = useMemo(() => getBrandsForType(deviceType), [deviceType]);

  const filtered = brands.filter(
    (b) =>
      b.name.toLowerCase().includes(query.toLowerCase()) ||
      b.platform.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Select your {deviceType === 'tv' ? 'TV' : 'device'} brand
      </Text>

      <View style={styles.search}>
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search brands"
          placeholderTextColor={colors.textSecondary}
          style={styles.input}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
            onPress={() =>
              navigation.navigate('Connection', { deviceType, brand: item })
            }
          >
            <View style={styles.left}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.platform}>{item.platform}</Text>
              <Text style={styles.features}>{item.features.slice(0, 4).join(' · ')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </Pressable>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No brands match your search.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  title: {
    ...typography.title,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
    height: 48,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  left: { flex: 1 },
  name: { ...typography.body, color: colors.text, fontWeight: '700' },
  platform: { ...typography.caption, color: colors.primary, marginTop: 2 },
  features: { ...typography.caption, color: colors.textSecondary, marginTop: 6 },
  empty: { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xxl },
});
