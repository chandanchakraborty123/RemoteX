import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { DEVICE_TYPES } from '../data/deviceTypes';
import type { RootStackProps } from '../navigation/types';
import { colors, spacing, typography } from '../theme';

export function DeviceTypeScreen({ navigation }: RootStackProps<'DeviceType'>) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>What do you want to control?</Text>
      <Text style={styles.subtitle}>Choose a category to continue setup.</Text>

      <FlatList
        data={DEVICE_TYPES}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.88 }]}
            onPress={() => navigation.navigate('Brand', { deviceType: item.id })}
          >
            <View style={styles.iconWrap}>
              <Ionicons
                name={item.icon as keyof typeof Ionicons.glyphMap}
                size={24}
                color={colors.primary}
              />
            </View>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardDesc} numberOfLines={2}>
              {item.description}
            </Text>
            <Text style={styles.hint}>
              {item.connectionHints.slice(0, 2).join(' · ').replace(/_/g, ' ')}
            </Text>
          </Pressable>
        )}
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
    marginTop: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  list: { paddingBottom: spacing.xxl },
  row: { gap: spacing.md },
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
    minHeight: 150,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.secondaryBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '700',
  },
  cardDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 16,
  },
  hint: {
    ...typography.caption,
    color: colors.primary,
    marginTop: 'auto',
    paddingTop: spacing.sm,
    textTransform: 'capitalize',
  },
});
