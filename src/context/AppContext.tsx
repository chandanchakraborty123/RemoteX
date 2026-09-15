import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { DEFAULT_MACROS, MOCK_DEVICES } from '../data/mockDevices';
import { getDefaultApiBaseUrl, resolveApiBaseUrl, setApiBaseUrl } from '../config';
import { deviceService } from '../services/deviceService';
import { storageService } from '../services/storageService';
import type {
  AppSettings,
  Device,
  FavoriteItem,
  Macro,
  RecentAction,
  RemoteAction,
} from '../types';
import { triggerHaptic } from '../utils/haptics';

interface AppContextValue {
  ready: boolean;
  devices: Device[];
  activeDevice: Device | null;
  settings: AppSettings;
  macros: Macro[];
  favorites: FavoriteItem[];
  recent: RecentAction[];
  lastFeedback: string | null;
  setActiveDevice: (device: Device | null) => Promise<void>;
  upsertDevice: (device: Device) => Promise<void>;
  removeDevice: (id: string) => Promise<void>;
  disconnectDevice: (id: string) => Promise<void>;
  disconnectAllDevices: () => Promise<void>;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  sendAction: (action: RemoteAction) => Promise<void>;
  runMacro: (macro: Macro) => Promise<void>;
  toggleFavoriteDevice: (deviceId: string) => Promise<void>;
  setFeedback: (message: string | null) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const DEFAULT_SETTINGS: AppSettings = {
  hapticFeedback: true,
  soundFeedback: false,
  buttonSize: 'normal',
  touchpadSensitivity: 1,
  darkMode: true,
  apiBaseUrl: getDefaultApiBaseUrl(),
  touchpadPosition: 'center',
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [devices, setDevices] = useState<Device[]>(MOCK_DEVICES);
  const [activeDevice, setActiveDeviceState] = useState<Device | null>(MOCK_DEVICES[0]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [macros, setMacros] = useState<Macro[]>(DEFAULT_MACROS);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [recent, setRecent] = useState<RecentAction[]>([]);
  const [lastFeedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [storedDevices, storedSettings, storedMacros, storedFavorites, storedRecent, activeId] =
        await Promise.all([
          storageService.getDevices(),
          storageService.getSettings(),
          storageService.getMacros(),
          storageService.getFavorites(),
          storageService.getRecent(),
          storageService.getActiveDeviceId(),
        ]);

      if (!mounted) return;

      const nextDevices = storedDevices?.length ? storedDevices : MOCK_DEVICES;
      const apiBaseUrl = resolveApiBaseUrl(storedSettings.apiBaseUrl);
      const nextSettings = {
        ...DEFAULT_SETTINGS,
        ...storedSettings,
        apiBaseUrl,
      };
      setApiBaseUrl(apiBaseUrl);
      setDevices(nextDevices);
      setSettings(nextSettings);
      setMacros(storedMacros?.length ? storedMacros : DEFAULT_MACROS);
      setFavorites(
        storedFavorites.length
          ? storedFavorites
          : nextDevices
              .filter((d) => d.favorite)
              .map((d) => ({
                id: `fav-${d.id}`,
                kind: 'device' as const,
                title: d.name,
                subtitle: `${d.brand} · ${d.platform}`,
                refId: d.id,
              })),
      );
      setRecent(storedRecent);
      setActiveDeviceState(
        nextDevices.find((d) => d.id === activeId) ??
          nextDevices.find((d) => d.status === 'connected') ??
          nextDevices[0] ??
          null,
      );
      setReady(true);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const setActiveDevice = useCallback(async (device: Device | null) => {
    setActiveDeviceState(device);
    await storageService.setActiveDeviceId(device?.id ?? null);
  }, []);

  const upsertDevice = useCallback(async (device: Device) => {
    setDevices((prev) => {
      const exists = prev.some((d) => d.id === device.id);
      const next = exists ? prev.map((d) => (d.id === device.id ? device : d)) : [device, ...prev];
      void storageService.saveDevices(next);
      return next;
    });
    setActiveDeviceState(device);
    await storageService.setActiveDeviceId(device.id);
  }, []);

  const removeDevice = useCallback(async (id: string) => {
    setDevices((prev) => {
      const target = prev.find((d) => d.id === id);
      if (target) void deviceService.disconnect(target);
      const next = prev.filter((d) => d.id !== id);
      void storageService.saveDevices(next);
      return next;
    });
    setActiveDeviceState((current) => (current?.id === id ? null : current));
  }, []);

  const pushRecent = useCallback((label: string) => {
    setRecent((prev) => {
      const next = [
        { id: `r-${Date.now()}`, label, timestamp: Date.now() },
        ...prev,
      ].slice(0, 30);
      void storageService.saveRecent(next);
      return next;
    });
  }, []);

  const disconnectDevice = useCallback(async (id: string) => {
    let target: Device | undefined;
    setDevices((prev) => {
      target = prev.find((d) => d.id === id);
      const next = prev.map((d) =>
        d.id === id ? { ...d, status: 'disconnected' as const } : d,
      );
      void storageService.saveDevices(next);
      return next;
    });
    if (target) {
      await deviceService.disconnect(target);
      setFeedback(`Disconnected ${target.name}`);
      pushRecent(`Disconnected ${target.name}`);
    }
    setActiveDeviceState((current) =>
      current?.id === id ? { ...current, status: 'disconnected' } : current,
    );
  }, [pushRecent]);

  const disconnectAllDevices = useCallback(async () => {
    let connected: Device[] = [];
    setDevices((prev) => {
      connected = prev.filter((d) => d.status === 'connected');
      const next = prev.map((d) =>
        d.status === 'connected' ? { ...d, status: 'disconnected' as const } : d,
      );
      void storageService.saveDevices(next);
      return next;
    });
    await Promise.all(connected.map((d) => deviceService.disconnect(d)));
    setActiveDeviceState((current) =>
      current ? { ...current, status: 'disconnected' } : current,
    );
    const label =
      connected.length > 0
        ? `Disconnected ${connected.length} device${connected.length === 1 ? '' : 's'}`
        : 'No connected devices';
    setFeedback(label);
    if (connected.length > 0) pushRecent(label);
  }, [pushRecent]);

  const updateSettings = useCallback(async (patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      if (patch.apiBaseUrl != null) {
        setApiBaseUrl(patch.apiBaseUrl);
      }
      void storageService.saveSettings(next);
      return next;
    });
  }, []);

  const sendAction = useCallback(
    async (action: RemoteAction) => {
      await triggerHaptic(settings.hapticFeedback);
      const result = await deviceService.sendCommand(activeDevice, action);
      setFeedback(result.message);
      if (result.ok) pushRecent(result.message);
    },
    [activeDevice, pushRecent, settings.hapticFeedback],
  );

  const runMacro = useCallback(
    async (macro: Macro) => {
      setFeedback(`Running ${macro.name}`);
      for (const step of macro.actions) {
        if (step.delayMs) {
          await new Promise((r) => setTimeout(r, step.delayMs));
        }
        await sendAction({ type: step.type, payload: step.payload });
      }
      setFeedback(`${macro.name} complete`);
    },
    [sendAction],
  );

  const toggleFavoriteDevice = useCallback(async (deviceId: string) => {
    setDevices((prev) => {
      const next = prev.map((d) =>
        d.id === deviceId ? { ...d, favorite: !d.favorite } : d,
      );
      void storageService.saveDevices(next);

      const favs: FavoriteItem[] = next
        .filter((d) => d.favorite)
        .map((d) => ({
          id: `fav-${d.id}`,
          kind: 'device' as const,
          title: d.name,
          subtitle: `${d.brand} · ${d.platform}`,
          refId: d.id,
        }));
      setFavorites(favs);
      void storageService.saveFavorites(favs);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      ready,
      devices,
      activeDevice,
      settings,
      macros,
      favorites,
      recent,
      lastFeedback,
      setActiveDevice,
      upsertDevice,
      removeDevice,
      disconnectDevice,
      disconnectAllDevices,
      updateSettings,
      sendAction,
      runMacro,
      toggleFavoriteDevice,
      setFeedback,
    }),
    [
      ready,
      devices,
      activeDevice,
      settings,
      macros,
      favorites,
      recent,
      lastFeedback,
      setActiveDevice,
      upsertDevice,
      removeDevice,
      disconnectDevice,
      disconnectAllDevices,
      updateSettings,
      sendAction,
      runMacro,
      toggleFavoriteDevice,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
