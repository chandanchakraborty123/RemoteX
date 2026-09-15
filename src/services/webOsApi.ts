import { apiRequest } from './api';

export interface WebOsResult {
  ok: boolean;
  host?: string;
  name?: string;
  status?: string;
  message?: string;
  error?: string;
  connected?: boolean;
  paired?: boolean;
}

export const webOsApi = {
  probe(host: string) {
    return apiRequest<WebOsResult>('/webos/probe', {
      method: 'POST',
      body: JSON.stringify({ host }),
    });
  },

  pair(host: string) {
    return apiRequest<WebOsResult>('/webos/pair', {
      method: 'POST',
      body: JSON.stringify({ host }),
    });
  },

  connect(host: string) {
    return apiRequest<WebOsResult>('/webos/connect', {
      method: 'POST',
      body: JSON.stringify({ host }),
    });
  },

  status(host: string) {
    return apiRequest<WebOsResult>('/webos/status', {
      method: 'POST',
      body: JSON.stringify({ host }),
    });
  },

  disconnect(host: string) {
    return apiRequest<WebOsResult>('/webos/disconnect', {
      method: 'POST',
      body: JSON.stringify({ host }),
    });
  },

  command(host: string, action: string, payload?: Record<string, string | number | boolean>) {
    return apiRequest<WebOsResult>('/webos/command', {
      method: 'POST',
      body: JSON.stringify({ host, action, payload }),
    });
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
    }>('/webos/scan', {
      method: 'POST',
      body: JSON.stringify({ timeout }),
    });
  },
};
