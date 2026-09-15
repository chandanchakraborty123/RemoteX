import { Ionicons } from '@expo/vector-icons';
import type { DeviceCategory } from '../types';

type IoniconName = keyof typeof Ionicons.glyphMap;

/** Icon for device category (TV, AC, speaker, …). */
export function iconForDeviceType(type: DeviceCategory | string | undefined): IoniconName {
  switch (type) {
    case 'tv':
      return 'tv-outline';
    case 'tv_box':
      return 'cube-outline';
    case 'ac':
      return 'snow-outline';
    case 'speaker':
      return 'volume-high-outline';
    case 'media_player':
      return 'play-circle-outline';
    case 'projector':
      return 'videocam-outline';
    case 'pc':
      return 'desktop-outline';
    case 'smart_home':
      return 'home-outline';
    case 'gaming':
      return 'game-controller-outline';
    default:
      return 'hardware-chip-outline';
  }
}
