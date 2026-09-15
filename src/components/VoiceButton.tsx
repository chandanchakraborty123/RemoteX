import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../theme';

interface VoiceButtonProps {
  listening: boolean;
  onPress: () => void;
}

export function VoiceButton({ listening, onPress }: VoiceButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() =>
        Animated.spring(scale, { toValue: 0.94, useNativeDriver: true }).start()
      }
      onPressOut={() =>
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()
      }
      style={styles.wrap}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <LinearGradient
          colors={listening ? ['#7C3AED', '#5865F2'] : ['#5865F2', '#4338CA']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.button}
        >
          <Ionicons name={listening ? 'radio-outline' : 'mic'} size={26} color="#fff" />
        </LinearGradient>
      </Animated.View>
      <Text style={styles.label}>{listening ? 'Listening...' : 'Voice'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  button: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
