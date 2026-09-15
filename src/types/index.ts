export type ConnectionMethod =
  | 'wifi'
  | 'bluetooth'
  | 'ir'
  | 'local_network'
  | 'manual_ip'
  | 'qr_code'
  | 'pairing_code';

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

export type DeviceCategory =
  | 'tv'
  | 'tv_box'
  | 'ac'
  | 'speaker'
  | 'media_player'
  | 'projector'
  | 'pc'
  | 'smart_home'
  | 'gaming'
  | 'other';

export type RemoteActionType =
  | 'POWER'
  | 'VOLUME_UP'
  | 'VOLUME_DOWN'
  | 'MUTE'
  | 'CHANNEL_UP'
  | 'CHANNEL_DOWN'
  | 'HOME'
  | 'BACK'
  | 'MENU'
  | 'OK'
  | 'NAV_UP'
  | 'NAV_DOWN'
  | 'NAV_LEFT'
  | 'NAV_RIGHT'
  | 'INPUT'
  | 'OPEN_APP'
  | 'SEARCH'
  | 'TEXT_INPUT'
  | 'PLAY'
  | 'PAUSE'
  | 'NEXT'
  | 'PREVIOUS'
  | 'GUIDE'
  | 'APPS'
  | 'RECENT'
  | 'LIVE_TV'
  | 'SETTINGS'
  | 'TEMP_UP'
  | 'TEMP_DOWN'
  | 'MODE'
  | 'FAN'
  | 'CUSTOM';

export interface DeviceTypeConfig {
  id: DeviceCategory;
  name: string;
  description: string;
  icon: string;
  connectionHints: ConnectionMethod[];
}

export interface DeviceBrand {
  id: string;
  name: string;
  platform: string;
  deviceType: DeviceCategory;
  connectionMethods: ConnectionMethod[];
  features: string[];
}

export type DeviceDriver = 'mock' | 'androidtv';

export interface Device {
  id: string;
  name: string;
  type: DeviceCategory;
  brand: string;
  platform: string;
  connectionType: ConnectionMethod;
  ipAddress?: string;
  status: ConnectionStatus;
  favorite?: boolean;
  /** Protocol driver used for this device */
  driver?: DeviceDriver;
}

export interface RemoteAction {
  type: RemoteActionType;
  payload?: Record<string, string | number | boolean>;
  label?: string;
}

export interface AppShortcut {
  id: string;
  name: string;
  packageHint: string;
  color: string;
  /** MaterialCommunityIcons glyph name */
  icon: string;
}

export interface MacroAction {
  type: RemoteActionType;
  payload?: Record<string, string | number | boolean>;
  delayMs?: number;
}

export interface Macro {
  id: string;
  name: string;
  icon: string;
  actions: MacroAction[];
  favorite?: boolean;
}

export interface FavoriteItem {
  id: string;
  kind: 'device' | 'app' | 'macro' | 'action';
  title: string;
  subtitle?: string;
  refId: string;
}

export interface AppSettings {
  hapticFeedback: boolean;
  soundFeedback: boolean;
  buttonSize: 'compact' | 'normal' | 'large';
  touchpadSensitivity: number;
  darkMode: boolean;
  /** FastAPI base URL for Android TV bridge, e.g. http://192.168.1.10:8000 */
  apiBaseUrl?: string;
  /** Where the gesture pad sits on the remote screen */
  touchpadPosition?: 'top' | 'center' | 'bottom';
}

export interface RecentAction {
  id: string;
  label: string;
  timestamp: number;
}
