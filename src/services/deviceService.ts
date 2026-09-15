import type { AcDeviceState, ConnectionMethod, Device, DeviceDriver, RemoteAction } from '../types';
import {
  isAndroidTvPlatform,
  isWebOsPlatform,
  usesAcDriver,
  usesAndroidTvDriver,
  usesWebOsDriver,
} from '../utils/deviceDrivers';
import { acApi } from './acApi';
import { androidTvApi } from './androidTvApi';
import { webOsApi } from './webOsApi';

export interface DiscoveredDevice {
  id: string;
  name: string;
  brand: string;
  platform: string;
  ipAddress: string;
  connectionType: ConnectionMethod;
  driver?: DeviceDriver;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type ConnectResult =
  | { status: 'connected'; device: Device }
  | { status: 'needs_pairing'; host: string; message: string; deviceDraft: Device; pairKind?: 'code' | 'prompt' }
  | { status: 'error'; message: string };

function mapAcState(result: {
  power?: boolean;
  temp?: number;
  mode?: string;
  fan?: string;
  transport?: string;
}): AcDeviceState {
  return {
    power: !!result.power,
    temp: typeof result.temp === 'number' ? result.temp : 24,
    mode: result.mode || 'cool',
    fan: result.fan || 'auto',
    transport: result.transport === 'wifi' ? 'wifi' : 'ir',
  };
}

/** Device driver facade — Android TV, LG webOS, AC stub, mock fallback. */
export const deviceService = {
  async scanNetwork(timeout = 5): Promise<{
    devices: DiscoveredDevice[];
    message: string;
  }> {
    const [android, webos] = await Promise.allSettled([
      androidTvApi.scan(timeout),
      webOsApi.scan(timeout),
    ]);

    const devices: DiscoveredDevice[] = [];
    const parts: string[] = [];

    if (android.status === 'fulfilled') {
      for (const d of android.value.devices ?? []) {
        devices.push({
          id: d.id,
          name: d.name,
          brand: d.brand || 'Android TV',
          platform: d.platform || 'Android TV / Google TV',
          ipAddress: d.ipAddress || d.host,
          connectionType: 'local_network',
          driver: 'androidtv',
        });
      }
      if (android.value.message) parts.push(android.value.message);
    } else {
      parts.push(
        android.reason instanceof Error
          ? android.reason.message
          : 'Android TV scan failed',
      );
    }

    if (webos.status === 'fulfilled') {
      for (const d of webos.value.devices ?? []) {
        devices.push({
          id: d.id,
          name: d.name,
          brand: d.brand || 'LG',
          platform: d.platform || 'webOS',
          ipAddress: d.ipAddress || d.host,
          connectionType: 'local_network',
          driver: 'webos',
        });
      }
      if (webos.value.count) parts.push(webos.value.message);
    }

    // De-dupe by IP
    const byIp = new Map<string, DiscoveredDevice>();
    for (const d of devices) {
      byIp.set(d.ipAddress, d);
    }
    const unique = [...byIp.values()];

    return {
      devices: unique,
      message:
        unique.length > 0
          ? `Found ${unique.length} device${unique.length === 1 ? '' : 's'} on Wi‑Fi`
          : parts[0] ||
            'No devices found. Make sure TVs are on and on the same network.',
    };
  },

  async discover(
    _methods: ConnectionMethod[],
    opts?: { platform?: string; realScan?: boolean },
  ): Promise<DiscoveredDevice[]> {
    const platform = opts?.platform?.toLowerCase() ?? '';
    const wantReal = opts?.realScan !== false;
    const wantAndroid = wantReal && (!platform || isAndroidTvPlatform(platform));
    const wantWebOs = wantReal && (!platform || isWebOsPlatform(platform) || platform.includes('lg'));

    if (wantAndroid || wantWebOs) {
      const { devices } = await this.scanNetwork(5);
      if (wantWebOs && !wantAndroid) {
        return devices.filter((d) => d.driver === 'webos');
      }
      if (wantAndroid && !wantWebOs) {
        return devices.filter((d) => d.driver === 'androidtv');
      }
      return devices;
    }

    await delay(400);
    return [];
  },

  async probeAndroidTv(host: string) {
    return androidTvApi.probe(host);
  },

  async startAndroidTvPairing(host: string) {
    return androidTvApi.startPairing(host);
  },

  async finishAndroidTvPairing(host: string, code: string) {
    return androidTvApi.finishPairing(host, code);
  },

  async pairWebOs(host: string) {
    return webOsApi.pair(host);
  },

  async connect(
    device: Partial<Device> & Pick<Device, 'name' | 'brand' | 'platform' | 'type'>,
  ): Promise<ConnectResult> {
    const host = device.ipAddress?.trim();

    if (usesAcDriver(device)) {
      const transport =
        device.connectionType === 'wifi' || device.acState?.transport === 'wifi'
          ? 'wifi'
          : 'ir';
      const id = device.id ?? `ac-${Date.now()}`;
      try {
        const result = await acApi.connect(id, transport);
        if (!result.ok && result.error) {
          return { status: 'error', message: result.error };
        }
        return {
          status: 'connected',
          device: {
            id,
            name: device.name,
            type: 'ac',
            brand: device.brand,
            platform: device.platform,
            connectionType: transport,
            ipAddress: device.ipAddress,
            status: 'connected',
            favorite: device.favorite ?? false,
            driver: 'ac',
            paired: true,
            lastConnectedAt: Date.now(),
            acState: mapAcState(result),
          },
        };
      } catch (error) {
        return {
          status: 'error',
          message: error instanceof Error ? error.message : 'Could not connect AC',
        };
      }
    }

    if (usesWebOsDriver(device) && host) {
      try {
        const result = await webOsApi.connect(host);
        if (result.ok) {
          return {
            status: 'connected',
            device: {
              id: device.id ?? `webos-${host}`,
              name: result.name || device.name,
              type: device.type,
              brand: device.brand || 'LG',
              platform: device.platform || 'webOS',
              connectionType: device.connectionType ?? 'local_network',
              ipAddress: host,
              status: 'connected',
              favorite: device.favorite ?? false,
              driver: 'webos',
              paired: true,
              lastConnectedAt: Date.now(),
            },
          };
        }

        if (result.status === 'needs_pairing') {
          return {
            status: 'needs_pairing',
            host,
            pairKind: 'prompt',
            message:
              result.error ||
              'Accept the prompt on your LG TV, then tap Pair & Connect',
            deviceDraft: {
              id: device.id ?? `webos-${host}`,
              name: device.name,
              type: device.type,
              brand: device.brand || 'LG',
              platform: device.platform || 'webOS',
              connectionType: device.connectionType ?? 'local_network',
              ipAddress: host,
              status: 'connecting',
              favorite: device.favorite ?? false,
              driver: 'webos',
              paired: false,
            },
          };
        }

        return {
          status: 'error',
          message: result.error || 'Could not connect to LG TV',
        };
      } catch (error) {
        return {
          status: 'error',
          message: error instanceof Error ? error.message : 'webOS connect failed',
        };
      }
    }

    const useAndroid =
      device.driver === 'androidtv' || isAndroidTvPlatform(device.platform);

    if (useAndroid && host) {
      const result = await androidTvApi.connect(host);
      if (result.ok) {
        return {
          status: 'connected',
          device: {
            id: device.id ?? `atv-${host}`,
            name: result.name || device.name,
            type: device.type,
            brand: device.brand,
            platform: device.platform,
            connectionType: device.connectionType ?? 'local_network',
            ipAddress: host,
            status: 'connected',
            favorite: device.favorite ?? false,
            driver: 'androidtv',
            paired: true,
            lastConnectedAt: Date.now(),
          },
        };
      }

      if (result.status === 'needs_pairing') {
        return {
          status: 'needs_pairing',
          host,
          pairKind: 'code',
          message: result.error || 'Pairing required — enter the code on your TV',
          deviceDraft: {
            id: device.id ?? `atv-${host}`,
            name: device.name,
            type: device.type,
            brand: device.brand,
            platform: device.platform,
            connectionType: device.connectionType ?? 'pairing_code',
            ipAddress: host,
            status: 'connecting',
            favorite: device.favorite ?? false,
            driver: 'androidtv',
            paired: false,
          },
        };
      }

      return {
        status: 'error',
        message: result.error || 'Could not connect to Android TV',
      };
    }

    // Samsung / other brands stay mock until a real driver ships
    await delay(700);
    return {
      status: 'connected',
      device: {
        id: device.id ?? `dev-${Date.now()}`,
        name: device.name,
        type: device.type,
        brand: device.brand,
        platform: device.platform,
        connectionType: device.connectionType ?? 'wifi',
        ipAddress: device.ipAddress ?? '192.168.1.100',
        status: 'connected',
        favorite: device.favorite ?? false,
        driver: 'mock',
        paired: true,
        lastConnectedAt: Date.now(),
      },
    };
  },

  async disconnect(device: Device | null): Promise<void> {
    if (!device) return;

    if (usesAcDriver(device)) {
      try {
        await acApi.disconnect(device.id);
      } catch {
        // ignore
      }
      return;
    }

    if (usesWebOsDriver(device) && device.ipAddress) {
      try {
        await webOsApi.disconnect(device.ipAddress);
      } catch {
        // ignore
      }
      return;
    }

    if (usesAndroidTvDriver(device) && device.ipAddress) {
      try {
        await androidTvApi.disconnect(device.ipAddress);
      } catch {
        // ignore
      }
      return;
    }
    await delay(200);
  },

  async sendCommand(
    device: Device | null,
    action: RemoteAction,
  ): Promise<{ ok: boolean; message: string; acState?: AcDeviceState }> {
    if (!device) {
      return { ok: false, message: 'No device connected' };
    }

    if (usesAcDriver(device)) {
      try {
        if (device.status !== 'connected') {
          const link = await this.connect(device);
          if (link.status !== 'connected') {
            return { ok: false, message: link.status === 'error' ? link.message : 'AC offline' };
          }
        }
        const result = await acApi.command(device.id, action.type, action.payload);
        if (!result.ok) {
          return { ok: false, message: result.error || 'AC command failed' };
        }
        return {
          ok: true,
          message: action.label || result.message || formatAction(action),
          acState: mapAcState(result),
        };
      } catch (error) {
        return {
          ok: false,
          message: error instanceof Error ? error.message : 'AC command failed',
        };
      }
    }

    if (usesWebOsDriver(device)) {
      if (!device.ipAddress) {
        return { ok: false, message: 'Missing device IP' };
      }
      try {
        if (device.status !== 'connected' && device.paired) {
          const link = await this.connect(device);
          if (link.status !== 'connected') {
            return {
              ok: false,
              message:
                link.status === 'needs_pairing'
                  ? 'Accept the prompt on your LG TV again'
                  : link.message,
            };
          }
        } else if (device.status !== 'connected') {
          return { ok: false, message: 'Device disconnected' };
        }

        const result = await webOsApi.command(device.ipAddress, action.type, action.payload);
        if (!result.ok) {
          return { ok: false, message: result.error || 'Command failed' };
        }
        return {
          ok: true,
          message: action.label || result.message || formatAction(action),
        };
      } catch (error) {
        return {
          ok: false,
          message: error instanceof Error ? error.message : 'Command failed',
        };
      }
    }

    if (usesAndroidTvDriver(device)) {
      if (!device.ipAddress) {
        return { ok: false, message: 'Missing device IP' };
      }
      try {
        if (device.status !== 'connected' && device.paired) {
          const link = await this.connect(device);
          if (link.status !== 'connected') {
            return {
              ok: false,
              message:
                link.status === 'needs_pairing'
                  ? 'Pairing expired — scan and pair again'
                  : link.message,
            };
          }
        } else if (device.status !== 'connected') {
          return { ok: false, message: 'Device disconnected' };
        }

        const result = await androidTvApi.command(
          device.ipAddress,
          action.type,
          action.payload,
        );
        if (!result.ok) {
          if (result.status === 'disconnected' || result.status === 'needs_pairing') {
            return {
              ok: false,
              message: result.error || 'Connection lost',
            };
          }
          return {
            ok: false,
            message: result.error || 'Command failed',
          };
        }
        return {
          ok: true,
          message: action.label || result.message || formatAction(action),
        };
      } catch (error) {
        return {
          ok: false,
          message: error instanceof Error ? error.message : 'Command failed',
        };
      }
    }

    await delay(120);
    if (device.status !== 'connected') {
      return { ok: false, message: 'Device disconnected' };
    }
    const label = formatAction(action);
    console.log(`[RemoteX] ${device.name} ← ${label}`, action.payload ?? {});
    return { ok: true, message: label };
  },

  async sendText(device: Device | null, text: string): Promise<{ ok: boolean; message: string }> {
    return this.sendCommand(device, {
      type: 'TEXT_INPUT',
      payload: { text },
      label: `Typed "${text}"`,
    });
  },

  parseVoiceCommand(transcript: string): RemoteAction {
    const text = transcript.trim().toLowerCase();

    if (text.includes('youtube')) {
      return { type: 'OPEN_APP', payload: { app: 'youtube' }, label: 'Opening YouTube' };
    }
    if (text.includes('netflix')) {
      return { type: 'OPEN_APP', payload: { app: 'netflix' }, label: 'Opening Netflix' };
    }
    if (text.includes('volume') && text.match(/\d+/)) {
      const level = Number(text.match(/\d+/)?.[0] ?? 20);
      return { type: 'VOLUME_UP', payload: { level }, label: `Set volume to ${level}` };
    }
    if (text.includes('mute')) {
      return { type: 'MUTE', label: 'Muted' };
    }
    if (text.includes('cooler') || text.includes('temp down')) {
      return { type: 'TEMP_DOWN', label: 'Temperature down' };
    }
    if (text.includes('warmer') || text.includes('temp up')) {
      return { type: 'TEMP_UP', label: 'Temperature up' };
    }
    if (text.includes('hdmi')) {
      const source = text.includes('2') ? 'HDMI 2' : 'HDMI 1';
      return { type: 'INPUT', payload: { source }, label: `Switched to ${source}` };
    }
    if (text.includes('off') || text.includes('power')) {
      return { type: 'POWER', label: 'Power toggled' };
    }
    if (text.startsWith('search')) {
      const query = transcript.replace(/search( for)?/i, '').trim();
      return { type: 'SEARCH', payload: { query }, label: `Searching "${query}"` };
    }

    return { type: 'CUSTOM', payload: { transcript }, label: `Heard: ${transcript}` };
  },
};

function formatAction(action: RemoteAction): string {
  if (action.label) return action.label;
  switch (action.type) {
    case 'OPEN_APP':
      return `Opened ${String(action.payload?.app ?? 'app')}`;
    case 'TEXT_INPUT':
      return `Typed "${String(action.payload?.text ?? '')}"`;
    case 'VOLUME_UP':
      return action.payload?.level != null
        ? `Volume changed to ${action.payload.level}`
        : 'Volume up';
    case 'VOLUME_DOWN':
      return 'Volume down';
    case 'CHANNEL_UP':
      return 'Channel up';
    case 'CHANNEL_DOWN':
      return 'Channel down';
    case 'POWER':
      return 'Power toggled';
    case 'MUTE':
      return 'Muted';
    case 'TEMP_UP':
      return 'Temperature up';
    case 'TEMP_DOWN':
      return 'Temperature down';
    case 'MODE':
      return `Mode ${String(action.payload?.mode ?? '')}`.trim();
    case 'FAN':
      return `Fan ${String(action.payload?.fan ?? '')}`.trim();
    case 'INPUT':
      return `Switched to ${String(action.payload?.source ?? 'input')}`;
    default:
      return action.type.replace(/_/g, ' ').toLowerCase();
  }
}
