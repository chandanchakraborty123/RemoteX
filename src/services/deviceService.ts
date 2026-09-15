import type { ConnectionMethod, Device, RemoteAction } from '../types';
import { isAndroidTvPlatform, usesAndroidTvDriver } from '../utils/deviceDrivers';
import { androidTvApi } from './androidTvApi';

export interface DiscoveredDevice {
  id: string;
  name: string;
  brand: string;
  platform: string;
  ipAddress: string;
  connectionType: ConnectionMethod;
  driver?: 'mock' | 'androidtv';
}

const MOCK_DISCOVERY: DiscoveredDevice[] = [
  {
    id: 'scan-lg',
    name: 'Living Room TV',
    brand: 'LG',
    platform: 'webOS',
    ipAddress: '192.168.1.42',
    connectionType: 'wifi',
    driver: 'mock',
  },
  {
    id: 'scan-sony',
    name: 'Sony Bravia',
    brand: 'Sony',
    platform: 'Android TV / Google TV',
    ipAddress: '192.168.1.60',
    connectionType: 'local_network',
    driver: 'androidtv',
  },
  {
    id: 'scan-xstream',
    name: 'Xstream Box',
    brand: 'Airtel Xstream',
    platform: 'Xstream Box',
    ipAddress: '192.168.1.70',
    connectionType: 'wifi',
    driver: 'mock',
  },
];

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type ConnectResult =
  | { status: 'connected'; device: Device }
  | { status: 'needs_pairing'; host: string; message: string; deviceDraft: Device }
  | { status: 'error'; message: string };

/** Device driver facade — mock by default, Android TV via backend when applicable. */
export const deviceService = {
  async scanNetwork(timeout = 5): Promise<{
    devices: DiscoveredDevice[];
    message: string;
  }> {
    try {
      const result = await androidTvApi.scan(timeout);
      const devices: DiscoveredDevice[] = (result.devices ?? []).map((d) => ({
        id: d.id,
        name: d.name,
        brand: d.brand || 'Android TV',
        platform: d.platform || 'Android TV / Google TV',
        ipAddress: d.ipAddress || d.host,
        connectionType: 'local_network',
        driver: 'androidtv',
      }));
      return { devices, message: result.message };
    } catch (error) {
      return {
        devices: [],
        message:
          error instanceof Error
            ? error.message
            : 'Scan failed. Is the RemoteX backend running?',
      };
    }
  },

  async discover(
    _methods: ConnectionMethod[],
    opts?: { platform?: string; realScan?: boolean },
  ): Promise<DiscoveredDevice[]> {
    const wantAndroid =
      opts?.realScan !== false &&
      (!opts?.platform || isAndroidTvPlatform(opts.platform));

    if (wantAndroid) {
      const { devices } = await this.scanNetwork(5);
      if (devices.length > 0) return devices;
      // Fall back to empty — UI shows helpful empty state + manual IP
      return [];
    }

    await delay(800);
    return MOCK_DISCOVERY.filter((d) => !isAndroidTvPlatform(d.platform));
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

  async connect(
    device: Partial<Device> & Pick<Device, 'name' | 'brand' | 'platform' | 'type'>,
  ): Promise<ConnectResult> {
    const host = device.ipAddress?.trim();
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

    await delay(900);
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
      },
    };
  },

  async disconnect(device: Device | null): Promise<void> {
    if (device && usesAndroidTvDriver(device) && device.ipAddress) {
      try {
        await androidTvApi.disconnect(device.ipAddress);
      } catch {
        // ignore
      }
      return;
    }
    await delay(300);
  },

  async sendCommand(
    device: Device | null,
    action: RemoteAction,
  ): Promise<{ ok: boolean; message: string }> {
    if (!device) {
      return { ok: false, message: 'No device connected' };
    }

    if (usesAndroidTvDriver(device)) {
      if (!device.ipAddress) {
        return { ok: false, message: 'Missing device IP' };
      }
      try {
        // Auto-reconnect for paired devices if UI still says offline
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
    case 'INPUT':
      return `Switched to ${String(action.payload?.source ?? 'input')}`;
    default:
      return action.type.replace(/_/g, ' ').toLowerCase();
  }
}
