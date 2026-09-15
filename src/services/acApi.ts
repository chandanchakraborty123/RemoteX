import { apiRequest } from './api';

export interface AcState {
  ok: boolean;
  device_id?: string;
  connected?: boolean;
  transport?: 'ir' | 'wifi' | string;
  power?: boolean;
  temp?: number;
  mode?: string;
  fan?: string;
  status?: string;
  paired?: boolean;
  message?: string;
  error?: string;
}

export const acApi = {
  connect(deviceId: string, transport: 'ir' | 'wifi' = 'ir') {
    return apiRequest<AcState>('/ac/connect', {
      method: 'POST',
      body: JSON.stringify({ device_id: deviceId, transport }),
    });
  },

  status(deviceId: string) {
    return apiRequest<AcState>('/ac/status', {
      method: 'POST',
      body: JSON.stringify({ device_id: deviceId }),
    });
  },

  disconnect(deviceId: string) {
    return apiRequest<AcState>('/ac/disconnect', {
      method: 'POST',
      body: JSON.stringify({ device_id: deviceId }),
    });
  },

  command(
    deviceId: string,
    action: string,
    payload?: Record<string, string | number | boolean>,
  ) {
    return apiRequest<AcState>('/ac/command', {
      method: 'POST',
      body: JSON.stringify({ device_id: deviceId, action, payload }),
    });
  },
};
