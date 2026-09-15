import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../context/AppContext';
import { colors, spacing, typography } from '../theme';

export function MacrosScreen() {
  const { macros, runMacro } = useApp();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.subtitle}>Automate multi-step remote sequences.</Text>

      {macros.map((macro) => (
        <View key={macro.id} style={styles.card}>
          <View style={styles.row}>
            <View style={styles.icon}>
              <Ionicons
                name={macro.icon as keyof typeof Ionicons.glyphMap}
                size={22}
                color={colors.secondary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{macro.name}</Text>
              <Text style={styles.meta}>{macro.actions.length} actions</Text>
            </View>
            <Pressable style={styles.run} onPress={() => void runMacro(macro)}>
              <Text style={styles.runText}>Run</Text>
            </Pressable>
          </View>
          <View style={styles.steps}>
            {macro.actions.map((action, index) => (
              <Text key={`${macro.id}-${index}`} style={styles.step}>
                {index + 1}. {action.type.replace(/_/g, ' ')}
                {action.payload?.app ? ` · ${action.payload.app}` : ''}
                {action.payload?.source ? ` · ${action.payload.source}` : ''}
              </Text>
            ))}
          </View>
        </View>
      ))}

      <Pressable style={styles.create}>
        <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
        <Text style={styles.createText}>Create Macro</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  subtitle: { color: colors.textSecondary, marginBottom: spacing.xl },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.secondaryBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { color: colors.text, fontWeight: '700', fontSize: 16 },
  meta: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  run: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  runText: { color: '#fff', fontWeight: '700' },
  steps: { marginTop: spacing.md, gap: 4 },
  step: { color: colors.textSecondary, fontSize: 13, textTransform: 'capitalize' },
  create: {
    marginTop: spacing.md,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  createText: { color: colors.primary, fontWeight: '700' },
});
