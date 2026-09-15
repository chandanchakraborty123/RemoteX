import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS, useSharedValue } from 'react-native-reanimated';
import { colors, spacing, typography } from '../theme';
import type { RemoteActionType } from '../types';

interface TouchPadProps {
  onAction: (type: RemoteActionType) => void;
  onTap?: () => void;
}

export function TouchPad({ onAction, onTap }: TouchPadProps) {
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  const emit = (type: RemoteActionType) => {
    onAction(type);
  };

  const emitTap = () => {
    onTap?.();
    onAction('OK');
  };

  const pan = Gesture.Pan()
    .minDistance(18)
    .onBegin((e) => {
      startX.value = e.x;
      startY.value = e.y;
    })
    .onEnd((e) => {
      const dx = e.x - startX.value;
      const dy = e.y - startY.value;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      if (absX < 24 && absY < 24) {
        return;
      }

      if (absX > absY) {
        runOnJS(emit)(dx > 0 ? 'NAV_RIGHT' : 'NAV_LEFT');
      } else {
        runOnJS(emit)(dy > 0 ? 'NAV_DOWN' : 'NAV_UP');
      }
    });

  const singleTap = Gesture.Tap()
    .maxDuration(250)
    .onEnd(() => {
      runOnJS(emitTap)();
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      runOnJS(emit)('HOME');
    });

  // Long-press (~450ms) opens Menu — like holding OK/options on many remotes
  const longPress = Gesture.LongPress()
    .minDuration(450)
    .onStart(() => {
      runOnJS(emit)('MENU');
    });

  const composed = Gesture.Exclusive(doubleTap, longPress, singleTap, pan);

  return (
    <GestureDetector gesture={composed}>
      <View style={styles.pad}>
        <View style={styles.ring} />
        <Text style={styles.hint}>Swipe to move</Text>
        <Text style={styles.subHint}>Tap OK · Hold Menu · Double-tap Home</Text>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  pad: {
    height: 180,
    borderRadius: 28,
    backgroundColor: colors.touchpad,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  ring: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1,
    borderColor: 'rgba(88,101,242,0.35)',
  },
  hint: {
    ...typography.label,
    color: colors.text,
  },
  subHint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
