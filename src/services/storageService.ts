import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppSettings, Device, FavoriteItem, Macro, RecentAction } from '../types';

const KEYS = {
  devices: '@remotex/devices',
  settings: '@remotex/settings',
  favorites: '@remotex/favorites',
  macros: '@remotex/macros',
  recent: '@remotex/recent',
  activeDeviceId: '@remotex/activeDeviceId',
};

const DEFAULT_SETTINGS: AppSettings = {
  hapticFeedback: true,
  soundFeedback: false,
  buttonSize: 'normal',
  touchpadSensitivity: 1,
  darkMode: true,
  touchpadPosition: 'center',
};

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export const storageService = {
  async getDevices(): Promise<Device[] | null> {
    return readJson<Device[] | null>(KEYS.devices, null);
  },
  async saveDevices(devices: Device[]) {
    await writeJson(KEYS.devices, devices);
  },
  async getSettings(): Promise<AppSettings> {
    return readJson(KEYS.settings, DEFAULT_SETTINGS);
  },
  async saveSettings(settings: AppSettings) {
    await writeJson(KEYS.settings, settings);
  },
  async getFavorites(): Promise<FavoriteItem[]> {
    return readJson(KEYS.favorites, []);
  },
  async saveFavorites(favorites: FavoriteItem[]) {
    await writeJson(KEYS.favorites, favorites);
  },
  async getMacros(): Promise<Macro[] | null> {
    return readJson<Macro[] | null>(KEYS.macros, null);
  },
  async saveMacros(macros: Macro[]) {
    await writeJson(KEYS.macros, macros);
  },
  async getRecent(): Promise<RecentAction[]> {
    return readJson(KEYS.recent, []);
  },
  async saveRecent(recent: RecentAction[]) {
    await writeJson(KEYS.recent, recent.slice(0, 30));
  },
  async getActiveDeviceId(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.activeDeviceId);
  },
  async setActiveDeviceId(id: string | null) {
    if (!id) {
      await AsyncStorage.removeItem(KEYS.activeDeviceId);
      return;
    }
    await AsyncStorage.setItem(KEYS.activeDeviceId, id);
  },
};
