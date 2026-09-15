import { apiRequest } from './api';

export interface AndroidTvResult {
  ok: boolean;
  host?: string;
  name?: string;
  mac?: string;
  status?: string;
  message?: string;
  error?: string;
  is_on?: boolean;
  current_app?: string | null;
  connected?: boolean;
  paired?: boolean;
  device?: AndroidTvResult;
}

export const androidTvApi = {
  probe(host: string) {
    return apiRequest<AndroidTvResult>('/androidtv/probe', {
      method: 'POST',
      body: JSON.stringify({ host }),
    });
  },

  startPairing(host: string) {
    return apiRequest<AndroidTvResult>('/androidtv/pair/start', {
      method: 'POST',
      body: JSON.stringify({ host }),
    });
  },

  finishPairing(host: string, code: string) {
    return apiRequest<AndroidTvResult>('/androidtv/pair/finish', {
      method: 'POST',
      body: JSON.stringify({ host, code }),
    });
  },

  connect(host: string) {
    return apiRequest<AndroidTvResult>('/androidtv/connect', {
      method: 'POST',
      body: JSON.stringify({ host }),
    });
  },

  status(host: string) {
    return apiRequest<AndroidTvResult>('/androidtv/status', {
      method: 'POST',
      body: JSON.stringify({ host }),
    });
  },

  disconnect(host: string) {
    return apiRequest<AndroidTvResult>('/androidtv/disconnect', {
      method: 'POST',
      body: JSON.stringify({ host }),
    });
  },

  command(host: string, action: string, payload?: Record<string, string | number | boolean>) {
    return apiRequest<AndroidTvResult>('/androidtv/command', {
      method: 'POST',
      body: JSON.stringify({ host, action, payload }),
    });
  },

  async health(): Promise<boolean> {
    try {
      const data = await apiRequest<{ ok: boolean }>('/health');
      return !!data.ok;
    } catch {
      return false;
    }
  },

  scan(timeout = 5) {
    return apiRequest<{
      ok: boolean;
      count: number;
      devices: Array<{
        id: string;
        name: string;
        host: string;
        ipAddress: string;
        brand: string;
        platform: string;
        connectionType: string;
        driver: string;
      }>;
      message: string;
    }>('/androidtv/scan', {
      method: 'POST',
      body: JSON.stringify({ timeout }),
    });
  },
};
