import type { AppShortcut, Device, Macro } from '../types';

export const MOCK_DEVICES: Device[] = [
  {
    id: 'dev-lg-1',
    name: 'Living Room TV',
    type: 'tv',
    brand: 'LG',
    platform: 'webOS',
    connectionType: 'wifi',
    ipAddress: '192.168.1.42',
    status: 'connected',
    favorite: true,
  },
  {
    id: 'dev-samsung-1',
    name: 'Bedroom TV',
    type: 'tv',
    brand: 'Samsung',
    platform: 'Tizen',
    connectionType: 'wifi',
    ipAddress: '192.168.1.55',
    status: 'disconnected',
    favorite: true,
  },
  {
    id: 'dev-android-1',
    name: 'Android TV',
    type: 'tv',
    brand: 'Sony',
    platform: 'Android TV / Google TV',
    connectionType: 'local_network',
    ipAddress: '192.168.1.60',
    status: 'disconnected',
    driver: 'androidtv',
  },
  {
    id: 'dev-xstream-1',
    name: 'Xstream Box',
    type: 'tv_box',
    brand: 'Airtel Xstream',
    platform: 'Xstream Box',
    connectionType: 'wifi',
    ipAddress: '192.168.1.70',
    status: 'disconnected',
  },
  {
    id: 'dev-ac-1',
    name: 'Bedroom AC',
    type: 'ac',
    brand: 'Daikin',
    platform: 'IR / Wi-Fi',
    connectionType: 'ir',
    status: 'disconnected',
  },
  {
    id: 'dev-speaker-1',
    name: 'Soundbar',
    type: 'speaker',
    brand: 'Sony',
    platform: 'Bluetooth / Wi-Fi',
    connectionType: 'bluetooth',
    status: 'disconnected',
  },
];

export const DEFAULT_APP_SHORTCUTS: AppShortcut[] = [
  { id: 'netflix', name: 'Netflix', packageHint: 'netflix', color: '#E50914', icon: 'netflix' },
  { id: 'youtube', name: 'YouTube', packageHint: 'youtube', color: '#FF0000', icon: 'youtube' },
  { id: 'prime', name: 'Prime Video', packageHint: 'prime', color: '#00A8E1', icon: 'amazon' },
  { id: 'hotstar', name: 'JioHotstar', packageHint: 'hotstar', color: '#1A1F71', icon: 'play-box' },
  { id: 'live', name: 'Live TV', packageHint: 'live_tv', color: '#5865F2', icon: 'television-classic' },
  { id: 'assistant', name: 'Assistant', packageHint: 'assistant', color: '#7C3AED', icon: 'google-assistant' },
];

export const DEFAULT_MACROS: Macro[] = [
  {
    id: 'macro-movie',
    name: 'Movie Mode',
    icon: 'film-outline',
    favorite: true,
    actions: [
      { type: 'POWER', payload: { state: 'on' } },
      { type: 'INPUT', payload: { source: 'HDMI 1' }, delayMs: 800 },
      { type: 'VOLUME_UP', payload: { level: 30 }, delayMs: 400 },
      { type: 'OPEN_APP', payload: { app: 'netflix' }, delayMs: 600 },
    ],
  },
  {
    id: 'macro-sleep',
    name: 'Sleep Mode',
    icon: 'moon-outline',
    actions: [
      { type: 'POWER', payload: { state: 'off' } },
      { type: 'CUSTOM', payload: { target: 'speaker', action: 'off' }, delayMs: 500 },
    ],
  },
];

export const QUICK_ACTIONS = [
  { id: 'home', label: 'Home', action: 'HOME' as const, icon: 'home-outline' },
  { id: 'guide', label: 'Guide', action: 'GUIDE' as const, icon: 'list-outline' },
  { id: 'input', label: 'Input', action: 'INPUT' as const, icon: 'swap-horizontal-outline' },
  { id: 'settings', label: 'Settings', action: 'SETTINGS' as const, icon: 'settings-outline' },
  { id: 'apps', label: 'Apps', action: 'APPS' as const, icon: 'grid-outline' },
  { id: 'recent', label: 'Recent', action: 'RECENT' as const, icon: 'time-outline' },
  { id: 'live', label: 'Live TV', action: 'LIVE_TV' as const, icon: 'tv-outline' },
  { id: 'search', label: 'Search', action: 'SEARCH' as const, icon: 'search-outline' },
];
