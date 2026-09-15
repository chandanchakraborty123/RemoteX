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
  reconnectDevice: (id: string) => Promise<boolean>;
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
  const [devices, setDevices] = useState<Device[]>([]);
  const [activeDevice, setActiveDeviceState] = useState<Device | null>(null);
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

      // Prefer saved devices (incl. paired TVs). Seed mocks only on first launch.
      const nextDevices = storedDevices ?? MOCK_DEVICES.map((d) => ({
        ...d,
        status: 'disconnected' as const,
        paired: false,
      }));
      const normalized = nextDevices.map((d) => ({
        ...d,
        // Never boot as connected — reconnect explicitly
        status: d.status === 'connected' ? ('disconnected' as const) : d.status,
      }));

      const apiBaseUrl = resolveApiBaseUrl(storedSettings.apiBaseUrl);
      const nextSettings = {
        ...DEFAULT_SETTINGS,
        ...storedSettings,
        apiBaseUrl,
      };
      setApiBaseUrl(apiBaseUrl);
      setDevices(normalized);
      setSettings(nextSettings);
      setMacros(storedMacros?.length ? storedMacros : DEFAULT_MACROS);
      setFavorites(
        storedFavorites.length
          ? storedFavorites
          : normalized
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
      const active =
        normalized.find((d) => d.id === activeId) ??
        normalized.find((d) => d.paired) ??
        normalized[0] ??
        null;
      setActiveDeviceState(active);
      setReady(true);

      // One-tap: auto-reconnect ready LAN devices (Android TV / LG webOS)
      const targets = normalized.filter(
        (d) =>
          d.paired &&
          ((d.driver === 'androidtv' && d.ipAddress) ||
            (d.driver === 'webos' && d.ipAddress)),
      );
      for (const device of targets.slice(0, 3)) {
        if (!mounted) break;
        try {
          const result = await deviceService.connect(device);
          if (!mounted) break;
          if (result.status === 'connected') {
            setDevices((prev) => {
              const next = prev.map((d) => (d.id === device.id ? result.device : d));
              void storageService.saveDevices(next);
              return next;
            });
            setActiveDeviceState((current) =>
              current?.id === device.id || current?.id === active?.id
                ? result.device
                : current,
            );
          }
        } catch {
          // stay offline
        }
      }
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

  const reconnectDevice = useCallback(
    async (id: string) => {
      let target: Device | undefined;
      setDevices((prev) => {
        target = prev.find((d) => d.id === id);
        if (!target) return prev;
        const next = prev.map((d) =>
          d.id === id ? { ...d, status: 'connecting' as const } : d,
        );
        void storageService.saveDevices(next);
        return next;
      });
      setActiveDeviceState((current) =>
        current?.id === id ? { ...current, status: 'connecting' } : current,
      );

      if (!target) {
        setFeedback('Device not found');
        return false;
      }

      const result = await deviceService.connect(target);
      if (result.status === 'connected') {
        setDevices((prev) => {
          const next = prev.map((d) => (d.id === id ? result.device : d));
          void storageService.saveDevices(next);
          return next;
        });
        setActiveDeviceState(result.device);
        await storageService.setActiveDeviceId(result.device.id);
        setFeedback(`Connected · ${result.device.name}`);
        pushRecent(`Reconnected ${result.device.name}`);
        return true;
      }

      setDevices((prev) => {
        const next = prev.map((d) =>
          d.id === id ? { ...d, status: 'disconnected' as const } : d,
        );
        void storageService.saveDevices(next);
        return next;
      });
      setActiveDeviceState((current) =>
        current?.id === id ? { ...current, status: 'disconnected' } : current,
      );

      if (result.status === 'needs_pairing') {
        setFeedback('Need pairing code — use Scan');
      } else {
        setFeedback(result.message);
      }
      return false;
    },
    [pushRecent],
  );

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
      let device = activeDevice;
      if (!device) {
        setFeedback('No device connected');
        return;
      }
      if (device.status !== 'connected') {
        const canAuto =
          !!device.paired || device.type === 'ac' || device.driver === 'ac';
        if (!canAuto) {
          setFeedback('Device disconnected');
          return;
        }
        const ok = await reconnectDevice(device.id);
        if (!ok) return;
        device = { ...device, status: 'connected', paired: true };
      }
      const result = await deviceService.sendCommand(device, action);
      setFeedback(result.message);
      if (result.ok) pushRecent(result.message);
      if (result.ok && result.acState) {
        setDevices((prev) => {
          const next = prev.map((d) =>
            d.id === device!.id ? { ...d, acState: result.acState, status: 'connected' as const } : d,
          );
          void storageService.saveDevices(next);
          return next;
        });
        setActiveDeviceState((current) =>
          current?.id === device!.id
            ? { ...current, acState: result.acState, status: 'connected' }
            : current,
        );
      }
      if (!result.ok && /disconnect|connection lost|not connected/i.test(result.message)) {
        setDevices((prev) => {
          const next = prev.map((d) =>
            d.id === device!.id ? { ...d, status: 'disconnected' as const } : d,
          );
          void storageService.saveDevices(next);
          return next;
        });
        setActiveDeviceState((current) =>
          current?.id === device!.id ? { ...current, status: 'disconnected' } : current,
        );
      }
    },
    [activeDevice, pushRecent, reconnectDevice, settings.hapticFeedback],
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
      reconnectDevice,
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
      reconnectDevice,
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
