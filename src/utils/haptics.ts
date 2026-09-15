import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export async function triggerHaptic(enabled: boolean) {
  if (!enabled || Platform.OS === 'web') return;
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // Haptics unavailable on some platforms
  }
}
