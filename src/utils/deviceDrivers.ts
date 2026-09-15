/** Platforms that use Android TV Remote Protocol v2 via the backend. */
export function isAndroidTvPlatform(platform: string | undefined | null): boolean {
  if (!platform) return false;
  const p = platform.toLowerCase();
  return (
    p.includes('android tv') ||
    p.includes('google tv') ||
    p.includes('androidtv') ||
    p.includes('xstream')
  );
}

export function isWebOsPlatform(platform: string | undefined | null): boolean {
  if (!platform) return false;
  const p = platform.toLowerCase();
  return p.includes('webos') || p === 'lg';
}

export function usesAndroidTvDriver(device: {
  driver?: string;
  platform?: string;
} | null): boolean {
  if (!device) return false;
  if (device.driver === 'androidtv') return true;
  if (device.driver && device.driver !== 'androidtv') return false;
  return isAndroidTvPlatform(device.platform);
}

export function usesWebOsDriver(device: {
  driver?: string;
  platform?: string;
  brand?: string;
} | null): boolean {
  if (!device) return false;
  if (device.driver === 'webos') return true;
  if (device.driver && device.driver !== 'webos') return false;
  return isWebOsPlatform(device.platform) || device.brand?.toLowerCase() === 'lg';
}

export function usesAcDriver(device: {
  driver?: string;
  type?: string;
} | null): boolean {
  if (!device) return false;
  if (device.driver === 'ac') return true;
  return device.type === 'ac';
}
