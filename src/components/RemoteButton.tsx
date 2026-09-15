import { Ionicons } from '@expo/vector-icons';
import React, { useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';
import { colors, spacing, typography } from '../theme';

interface RemoteButtonProps {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  onLongPress?: () => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'primary' | 'danger' | 'ghost';
  style?: ViewStyle;
  disabled?: boolean;
}

export function RemoteButton({
  label,
  icon,
  onPress,
  onLongPress,
  size = 'md',
  variant = 'default',
  style,
  disabled,
}: RemoteButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const dim =
    size === 'sm' ? 48 : size === 'lg' ? 72 : 58;

  const background =
    variant === 'primary'
      ? colors.primary
      : variant === 'danger'
        ? 'rgba(239,68,68,0.18)'
        : variant === 'ghost'
          ? 'transparent'
          : colors.card;

  const borderColor =
    variant === 'primary'
      ? colors.primary
      : variant === 'danger'
        ? colors.danger
        : colors.border;

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() =>
        Animated.spring(scale, { toValue: 0.92, useNativeDriver: true, speed: 40 }).start()
      }
      onPressOut={() =>
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40 }).start()
      }
    >
      <Animated.View
        style={[
          styles.base,
          {
            width: dim,
            height: dim,
            borderRadius: dim / 2.4,
            backgroundColor: background,
            borderColor,
            opacity: disabled ? 0.4 : 1,
            transform: [{ scale }],
          },
          style,
        ]}
      >
        {icon ? (
          <Ionicons
            name={icon}
            size={size === 'lg' ? 26 : 20}
            color={variant === 'danger' ? colors.danger : colors.text}
          />
        ) : null}
        {label ? (
          <Text
            style={[
              styles.label,
              size === 'sm' && { fontSize: 11 },
              !icon && { marginTop: 0 },
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
  },
  label: {
    ...typography.caption,
    color: colors.text,
    marginTop: 2,
  },
});
