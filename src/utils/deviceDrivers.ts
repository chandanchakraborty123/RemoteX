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

export function usesAndroidTvDriver(device: {
  driver?: string;
  platform?: string;
} | null): boolean {
  if (!device) return false;
  if (device.driver === 'androidtv') return true;
  if (device.driver === 'mock') return false;
  return isAndroidTvPlatform(device.platform);
}
