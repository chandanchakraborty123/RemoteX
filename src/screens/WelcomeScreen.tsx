import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getApiBaseUrl, getAppAccessUrl } from '../config';
import { useApp } from '../context/AppContext';
import type { RootStackParamList } from '../navigation/types';
import { colors, spacing, typography } from '../theme';

export function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { activeDevice, devices } = useApp();
  const float = useRef(new Animated.Value(0)).current;
  const accessUrl = getAppAccessUrl();
  const apiUrl = getApiBaseUrl();

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 2200, useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 2200, useNativeDriver: true }),
      ]),
    ).start();
  }, [float]);

  const translateY = float.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.xl }]}>
      <LinearGradient
        colors={['rgba(88,101,242,0.22)', 'transparent']}
        style={styles.glow}
      />

      <Text style={styles.brand}>RemoteX</Text>
      <Text style={styles.title}>One Remote.{'\n'}Every Device.</Text>
      <Text style={styles.subtitle}>
        Control your entertainment and smart devices from one powerful remote.
      </Text>

      {accessUrl ? (
        <View style={styles.accessBox}>
          <Text style={styles.accessLabel}>Open on any device (same Wi‑Fi)</Text>
          <Text style={styles.accessUrl} selectable>
            {accessUrl}
          </Text>
          <Text style={styles.accessMeta} selectable>
            API · {apiUrl}
          </Text>
        </View>
      ) : null}

      <Animated.View style={[styles.preview, { transform: [{ translateY }] }]}>
        <LinearGradient
          colors={['#1A2336', '#111827']}
          style={styles.previewInner}
        >
          <View style={styles.previewTop}>
            <View style={styles.powerDot} />
            <Text style={styles.previewLabel}>Smart Remote</Text>
          </View>
          <View style={styles.previewPad} />
          <View style={styles.previewRow}>
            <View style={styles.previewBtn} />
            <View style={[styles.previewBtn, styles.previewBtnAccent]} />
            <View style={styles.previewBtn} />
          </View>
        </LinearGradient>
      </Animated.View>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.scanBtn, pressed && { opacity: 0.9 }]}
          onPress={() => navigation.navigate('Scan')}
        >
          <Ionicons name="search-outline" size={20} color="#fff" />
          <Text style={styles.primaryText}>Scan for devices</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}
          onPress={() => navigation.navigate('DeviceType')}
        >
          <LinearGradient colors={['#5865F2', '#7C3AED']} style={styles.primaryGradient}>
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.primaryText}>Add New Device</Text>
          </LinearGradient>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.9 }]}
          onPress={() => {
            if (activeDevice) {
              navigation.navigate('Remote');
            } else {
              navigation.navigate('MainTabs');
            }
          }}
        >
          <Ionicons name="phone-portrait-outline" size={18} color={colors.text} />
          <Text style={styles.secondaryText}>
            My Devices{devices.length ? ` (${devices.length})` : ''}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
  },
  glow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 280,
  },
  brand: {
    ...typography.label,
    color: colors.primary,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.hero,
    color: colors.text,
    marginBottom: spacing.md,
  },
  subtitle: {
    ...typography.subtitle,
    color: colors.textSecondary,
    maxWidth: 320,
  },
  accessBox: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    gap: 4,
  },
  accessLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  accessUrl: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 16,
  },
  accessMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  preview: {
    marginTop: spacing.xxl,
    alignItems: 'center',
  },
  previewInner: {
    width: 180,
    borderRadius: 28,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  powerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.danger,
  },
  previewLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  previewPad: {
    height: 88,
    borderRadius: 18,
    backgroundColor: colors.touchpad,
    borderWidth: 1,
    borderColor: 'rgba(88,101,242,0.25)',
    marginBottom: spacing.md,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  previewBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.card,
  },
  previewBtnAccent: {
    backgroundColor: colors.primary,
  },
  actions: {
    marginTop: 'auto',
    marginBottom: spacing.xxxl,
    gap: spacing.md,
  },
  scanBtn: {
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  primaryBtn: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  primaryGradient: {
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  primaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  secondaryText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
