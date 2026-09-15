import { Platform } from 'react-native';

/**
 * Backend that speaks Android TV Remote Protocol v2 (via androidtvremote2).
 *
 * Web: API host always follows the address you opened the app with.
 *   Open http://192.168.1.3:8081 on phone → API becomes http://192.168.1.3:8000
 *
 * Native: use Settings / EXPO_PUBLIC_API_URL / emulator defaults.
 */
const ENV_URL = process.env.EXPO_PUBLIC_API_URL;

function fromWindowLocation(): string | null {
  if (Platform.OS !== 'web') return null;
  if (typeof window === 'undefined' || !window.location?.hostname) return null;
  const host = window.location.hostname;
  // Local API is always plain HTTP on port 8000
  return `http://${host}:8000`;
}

function fallbackDefault(): string {
  if (ENV_URL) return ENV_URL.replace(/\/$/, '');
  if (Platform.OS === 'android') return 'http://10.0.2.2:8000';
  return 'http://127.0.0.1:8000';
}

let runtimeApiUrl = fromWindowLocation() || fallbackDefault();

/** Prefer the host used to open the web app; otherwise stored/env/default. */
export function resolveApiBaseUrl(stored?: string | null): string {
  const fromWeb = fromWindowLocation();
  if (fromWeb) return fromWeb;
  if (stored?.trim()) return stored.trim().replace(/\/$/, '');
  return fallbackDefault();
}

export function getApiBaseUrl() {
  // Re-read window host on each call so LAN IP stays correct after navigation
  const fromWeb = fromWindowLocation();
  if (fromWeb) return fromWeb;
  return runtimeApiUrl.replace(/\/$/, '');
}

export function setApiBaseUrl(url: string) {
  runtimeApiUrl = url.trim().replace(/\/$/, '') || fallbackDefault();
}

export function getDefaultApiBaseUrl() {
  return resolveApiBaseUrl();
}

/** URL to open RemoteX from another device on the same Wi‑Fi. */
export function getAppAccessUrl(): string | null {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return null;
}
