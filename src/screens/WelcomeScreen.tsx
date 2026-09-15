import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAppAccessUrl } from '../config';
import { useApp } from '../context/AppContext';
import type { RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';

export function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { activeDevice, devices } = useApp();
  const accessUrl = getAppAccessUrl();

  const enter = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 650,
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 2600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 2600, useNativeDriver: true }),
      ]),
    ).start();
  }, [enter, pulse]);

  const rise = enter.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });
  const glowScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.55] });

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#0E1424', '#0B0F19', '#080B14']}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View
        style={[
          styles.glowA,
          { opacity: glowOpacity, transform: [{ scale: glowScale }] },
        ]}
      />
      <View style={styles.glowB} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + spacing.xxl,
            paddingBottom: Math.max(insets.bottom, 16) + 96,
          },
        ]}
        showsVerticalScrollIndicator={false}
        bounces
        nestedScrollEnabled
      >
        <Animated.View style={{ opacity: enter, transform: [{ translateY: rise }] }}>
          <Text style={styles.brand}>RemoteX</Text>

          <Text style={styles.headline}>
            One Remote.{'\n'}
            <Text style={styles.headlineAccent}>Every Device.</Text>
          </Text>

          <Text style={styles.support}>
            Scan your Wi‑Fi, pair once, control everything from your phone.
          </Text>

          <View style={styles.ctaBlock}>
            <Pressable
              onPress={() => navigation.navigate('Scan')}
              style={({ pressed }) => [pressed && styles.pressed]}
            >
              <LinearGradient
                colors={['#6B75F5', '#5865F2', '#4F46E5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryCta}
              >
                <View style={styles.ctaIcon}>
                  <Ionicons name="wifi" size={22} color="#fff" />
                </View>
                <Text style={styles.primaryCtaText}>Scan for devices</Text>
                <Ionicons name="arrow-forward" size={18} color="rgba(255,255,255,0.9)" />
              </LinearGradient>
            </Pressable>

            <View style={styles.secondaryRow}>
              <Pressable
                onPress={() => navigation.navigate('DeviceType')}
                style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
              >
                <Ionicons name="add" size={18} color={colors.text} />
                <Text style={styles.secondaryBtnText}>Add manually</Text>
              </Pressable>
              <Pressable
                onPress={() => navigation.navigate('Devices' as never)}
                style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
              >
                <Ionicons name="grid-outline" size={16} color={colors.text} />
                <Text style={styles.secondaryBtnText}>
                  My devices{devices.length ? ` (${devices.length})` : ''}
                </Text>
              </Pressable>
            </View>
          </View>

          {activeDevice ? (
            <Pressable
              onPress={() => navigation.navigate('Remote')}
              style={({ pressed }) => [styles.continue, pressed && styles.pressed]}
            >
              <View style={styles.continueLeft}>
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor:
                        activeDevice.status === 'connected'
                          ? colors.success
                          : colors.textSecondary,
                    },
                  ]}
                />
                <View>
                  <Text style={styles.continueEyebrow}>Continue</Text>
                  <Text style={styles.continueName} numberOfLines={1}>
                    {activeDevice.name}
                  </Text>
                </View>
              </View>
              <View style={styles.continueAction}>
                <Text style={styles.continueActionText}>Open</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.primary} />
              </View>
            </Pressable>
          ) : (
            <View style={styles.emptyHint}>
              <Ionicons name="tv-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.emptyHintText}>
                Your TVs will show up here after you scan
              </Text>
            </View>
          )}

          {accessUrl ? (
            <Text style={styles.footerNote} selectable>
              Also open on phone · {accessUrl.replace(/^https?:\/\//, '')}
            </Text>
          ) : null}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  glowA: {
    position: 'absolute',
    top: -40,
    left: -40,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(88,101,242,0.28)',
  },
  glowB: {
    position: 'absolute',
    bottom: 120,
    right: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(124,58,237,0.12)',
  },
  scroll: {
    flex: 1,
    ...(Platform.OS === 'web' ? ({ overflow: 'auto' } as object) : null),
  },
  content: {
    paddingHorizontal: 28,
    justifyContent: 'center',
    flexGrow: 1,
  },
  brand: {
    fontSize: 40,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1.2,
    marginBottom: 28,
  },
  headline: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.92)',
    letterSpacing: -0.4,
    marginBottom: 12,
  },
  headlineAccent: {
    color: '#8B93F7',
    fontWeight: '700',
  },
  support: {
    fontSize: 15,
    lineHeight: 23,
    color: colors.textSecondary,
    maxWidth: 300,
    marginBottom: 36,
  },
  ctaBlock: {
    gap: 16,
    marginBottom: 28,
  },
  primaryCta: {
    height: 58,
    borderRadius: 18,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ctaIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryCtaText: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryBtnText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  continue: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(23,32,51,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(38,50,71,0.9)',
  },
  continueLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 12,
  },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  continueEyebrow: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  continueName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  continueAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  continueActionText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  emptyHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  emptyHintText: {
    color: colors.textSecondary,
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  footerNote: {
    marginTop: 28,
    color: 'rgba(148,163,184,0.55)',
    fontSize: 11,
  },
});
