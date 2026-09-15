import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { DeviceCard } from '../components/DeviceCard';
import { BottomSheet } from '../components/BottomSheet';
import { useApp } from '../context/AppContext';
import type { RootStackProps } from '../navigation/types';
import {
  deviceService,
  type DiscoveredDevice,
} from '../services/deviceService';
import { colors, spacing, typography } from '../theme';
import type { ConnectionMethod, DeviceCategory } from '../types';
import { isAndroidTvPlatform, isWebOsPlatform } from '../utils/deviceDrivers';

const METHOD_LABELS: Record<ConnectionMethod, string> = {
  wifi: 'Wi-Fi',
  bluetooth: 'Bluetooth',
  ir: 'IR',
  local_network: 'Local Network',
  manual_ip: 'Manual IP',
  qr_code: 'QR Code',
  pairing_code: 'Pairing Code',
};

function helpTips(opts: {
  brandName: string;
  platform: string;
  deviceType: DeviceCategory;
  isAndroidTv: boolean;
  isWebOs: boolean;
  isAc: boolean;
}): string[] {
  const common = [
    'Phone and TV/AC must be on the same Wi‑Fi as this PC.',
    'Keep the device awake (not in deep sleep) while connecting.',
  ];

  if (opts.isAc) {
    return [
      'AC remote control is coming soon.',
      'You can add your AC to My Devices now so it’s ready later.',
      'Real IR needs a blaster; Wi‑Fi brands will plug in when we add them.',
      'Samsung TVs and speakers are also marked Coming soon for now.',
    ];
  }

  if (opts.isWebOs) {
    return [
      ...common,
      'Turn the LG TV on, then tap Scan Again.',
      'When you connect, a prompt appears on the TV — press Yes / Allow.',
      'Then tap Pair & Connect in the app.',
      'If nothing is listed, use Enter IP manually (TV Settings → Network).',
    ];
  }

  if (opts.isAndroidTv) {
    return [
      ...common,
      'Turn the TV / box on, then tap Scan Again.',
      'Tap Connect on your device.',
      'A 6-digit code appears on the TV — type it here.',
      'Next time you can reconnect without a new code.',
      'If scan finds nothing, use Enter IP manually.',
    ];
  }

  // Samsung / other brands — honest but friendly
  if (opts.platform.toLowerCase().includes('tizen') || opts.brandName.toLowerCase() === 'samsung') {
    return [
      ...common,
      'Samsung support is limited for now — you can still add the TV to try the UI.',
      'Make sure Smart Hub / remote access is enabled on the TV.',
      'Try Wi‑Fi or Manual IP, then Connect.',
      'Full Samsung control is coming in a later update.',
    ];
  }

  return [
    ...common,
    `Add your ${opts.brandName} device, then open the remote.`,
    'If scan finds nothing, try Enter IP manually or Scan Again.',
  ];
}

export function DeviceConnectionScreen({
  navigation,
  route,
}: RootStackProps<'Connection'>) {
  const { deviceType, brand } = route.params;
  const { upsertDevice } = useApp();
  const isAndroidTv = isAndroidTvPlatform(brand.platform);
  const isWebOs = isWebOsPlatform(brand.platform) || brand.name.toLowerCase() === 'lg';
  const isAc = deviceType === 'ac';
  const isLanTv = isAndroidTv || isWebOs;

  const [scanning, setScanning] = useState(true);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [devices, setDevices] = useState<DiscoveredDevice[]>([]);
  const [manualIp, setManualIp] = useState('');
  const [showManual, setShowManual] = useState(isLanTv);
  const [selectedMethod, setSelectedMethod] = useState<ConnectionMethod>(
    brand.connectionMethods.includes('pairing_code')
      ? 'pairing_code'
      : brand.connectionMethods[0],
  );
  const [error, setError] = useState<string | null>(null);
  const [pairHost, setPairHost] = useState<string | null>(null);
  const [pairCode, setPairCode] = useState('');
  const [pairMessage, setPairMessage] = useState<string | null>(null);
  const [pairKind, setPairKind] = useState<'code' | 'prompt'>('code');
  const [backendOk, setBackendOk] = useState<boolean | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  const [scanMessage, setScanMessage] = useState<string | null>(null);

  const tips = helpTips({
    brandName: brand.name,
    platform: brand.platform,
    deviceType,
    isAndroidTv,
    isWebOs,
    isAc,
  });

  const scan = useCallback(async () => {
    setScanning(true);
    setDevices([]);
    setError(null);
    if (isAc) {
      setScanMessage('AC uses IR or Wi‑Fi — pick a method below, then Connect.');
      setDevices([]);
      setScanning(false);
      return;
    }
      setScanMessage(
        isLanTv ? 'Looking for your TV…' : 'Searching for devices…',
      );
      const found = await deviceService.discover(brand.connectionMethods, {
        platform: brand.platform,
        realScan: isLanTv,
      });
      setDevices(found);
      setScanMessage(
        found.length
          ? `Found ${found.length} nearby`
          : isLanTv
            ? 'Nothing found yet. Keep the TV on, same Wi‑Fi, then try again — or enter the IP if you know it.'
            : 'No devices found.',
      );
    setScanning(false);
  }, [brand.connectionMethods, brand.platform, isAc, isLanTv]);

  useEffect(() => {
    void scan();
  }, [scan]);

  useEffect(() => {
    if (!isLanTv) return;
    let mounted = true;
    (async () => {
      const { androidTvApi } = await import('../services/androidTvApi');
      const ok = await androidTvApi.health();
      if (mounted) setBackendOk(ok);
    })();
    return () => {
      mounted = false;
    };
  }, [isLanTv]);

  const connectTo = async (
    item: DiscoveredDevice | { name: string; ipAddress?: string },
  ) => {
    setConnectingId('id' in item && item.id ? item.id : 'manual');
    setError(null);
    setPairHost(null);
    setPairMessage(null);

    const driver = isAc
      ? 'ac'
      : isWebOs || ('driver' in item && item.driver === 'webos')
        ? 'webos'
        : isAndroidTv
          ? 'androidtv'
          : 'mock';

    const result = await deviceService.connect({
      id: isAc ? `ac-${brand.id}-${Date.now()}` : undefined,
      name: item.name,
      brand: brand.name,
      platform: brand.platform,
      type: deviceType,
      connectionType: selectedMethod,
      ipAddress: item.ipAddress,
      status: 'connecting',
      driver,
      acState: isAc
        ? {
            power: false,
            temp: 24,
            mode: 'cool',
            fan: 'auto',
            transport: selectedMethod === 'wifi' ? 'wifi' : 'ir',
          }
        : undefined,
    });

    setConnectingId(null);

    if (result.status === 'connected') {
      await upsertDevice(result.device);
      navigation.replace('Remote');
      return;
    }

    if (result.status === 'needs_pairing') {
      setPairHost(result.host);
      setPairMessage(result.message);
      setPairKind(result.pairKind ?? (driver === 'webos' ? 'prompt' : 'code'));
      if (driver === 'webos' || result.pairKind === 'prompt') {
        return;
      }
      try {
        const start = await deviceService.startAndroidTvPairing(result.host);
        if (!start.ok) {
          setError(start.error || 'Could not start pairing');
          return;
        }
        setPairMessage(start.message || 'Enter the 6-digit code shown on your TV');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Pairing failed to start');
      }
      return;
    }

    setError(result.message);
  };

  const submitWebOsPair = async () => {
    if (!pairHost) return;
    setConnectingId('pair');
    setError(null);
    setPairMessage('Waiting for Accept on your LG TV…');
    try {
      const finished = await deviceService.pairWebOs(pairHost);
      if (!finished.ok) {
        setError(finished.error || 'Pairing timed out');
        setConnectingId(null);
        return;
      }
      const connected = await deviceService.connect({
        name: finished.name || `${brand.name} TV`,
        brand: brand.name,
        platform: brand.platform,
        type: deviceType,
        connectionType: 'local_network',
        ipAddress: pairHost,
        status: 'connecting',
        driver: 'webos',
      });
      setConnectingId(null);
      if (connected.status === 'connected') {
        await upsertDevice(connected.device);
        navigation.replace('Remote');
        return;
      }
      setError(
        connected.status === 'error'
          ? connected.message
          : 'Paired, but connection failed — try Connect again',
      );
    } catch (e) {
      setConnectingId(null);
      setError(e instanceof Error ? e.message : 'webOS pairing failed');
    }
  };

  const submitPairCode = async () => {
    if (!pairHost || pairCode.trim().length < 4) return;
    setConnectingId('pair');
    setError(null);
    try {
      const finished = await deviceService.finishAndroidTvPairing(
        pairHost,
        pairCode.trim(),
      );
      if (!finished.ok) {
        setError(finished.error || 'Invalid pairing code');
        setConnectingId(null);
        return;
      }

      const connected = await deviceService.connect({
        name: finished.device?.name || finished.name || `${brand.name} TV`,
        brand: brand.name,
        platform: brand.platform,
        type: deviceType,
        connectionType: 'pairing_code',
        ipAddress: pairHost,
        status: 'connecting',
        driver: 'androidtv',
      });

      setConnectingId(null);
      if (connected.status === 'connected') {
        await upsertDevice(connected.device);
        navigation.replace('Remote');
        return;
      }
      setError(
        connected.status === 'error'
          ? connected.message
          : 'Paired, but connection failed — try Connect again',
      );
    } catch (e) {
      setConnectingId(null);
      setError(e instanceof Error ? e.message : 'Pairing failed');
    }
  };

  const probeAndConnect = async () => {
    const host = manualIp.trim();
    if (!host) return;
    setConnectingId('manual');
    setError(null);
    try {
      if (isAndroidTv) {
        const probe = await deviceService.probeAndroidTv(host);
        await connectTo({
          name: probe.name || `${brand.name} TV`,
          ipAddress: host,
        });
        return;
      }
      await connectTo({ name: `${brand.name} Device`, ipAddress: host });
    } catch (e) {
      setConnectingId(null);
      setError(e instanceof Error ? e.message : 'Probe failed');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Connect your device</Text>
      <Text style={styles.subtitle}>
        {brand.name} · {brand.platform}
      </Text>

      {isLanTv ? (
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>
            {isWebOs ? 'Connect your LG TV' : 'Find your TV'}
          </Text>
          <Text style={styles.infoText}>
            {isWebOs
              ? 'Keep your TV on and on the same Wi‑Fi. When you connect, tap Yes on the TV to allow RemoteX.'
              : 'Keep your TV on and on the same Wi‑Fi. Tap Connect on a found TV, then enter the code shown on screen.'}
          </Text>
          <Text
            style={[
              styles.backendStatus,
              { color: backendOk ? colors.success : colors.warning },
            ]}
          >
            {backendOk == null
              ? 'Checking connection…'
              : backendOk
                ? 'Ready to find devices'
                : 'Can’t reach the PC helper — start it, then try again'}
          </Text>
        </View>
      ) : null}

      {isAc ? (
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Air conditioner</Text>
          <Text style={styles.infoText}>
            AC control is coming soon. You can add the device to your list now;
            Power, Temp, Mode, and Fan will work once IR / Wi‑Fi is ready.
          </Text>
        </View>
      ) : null}

      <Text style={styles.section}>Connection method</Text>
      <View style={styles.methods}>
        {brand.connectionMethods.map((method) => (
          <Pressable
            key={method}
            onPress={() => setSelectedMethod(method)}
            style={[
              styles.methodChip,
              selectedMethod === method && styles.methodChipActive,
            ]}
          >
            <Text
              style={[
                styles.methodText,
                selectedMethod === method && styles.methodTextActive,
              ]}
            >
              {METHOD_LABELS[method]}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.scanHeader}>
        <Text style={styles.section}>
          {scanning
            ? scanMessage || 'Searching for devices...'
            : scanMessage || 'Nearby devices'}
        </Text>
        {scanning ? <ActivityIndicator color={colors.primary} /> : null}
      </View>

      {!scanning && devices.length === 0 ? (
        <View style={styles.emptyScan}>
          <Ionicons name="wifi-outline" size={28} color={colors.textSecondary} />
          <Text style={styles.emptyScanText}>
            {isAc
              ? 'AC control is coming soon — you can still add it to your list.'
              : isLanTv
                ? 'Make sure the TV is on and on the same Wi‑Fi as this PC, then tap Scan Again.'
                : 'No devices found for this type yet.'}
          </Text>
        </View>
      ) : null}

      {isAc ? (
        <Pressable
          style={[styles.primaryBtn, { marginBottom: spacing.lg }]}
          disabled={!!connectingId}
          onPress={async () => {
            setConnectingId('ac');
            await upsertDevice({
              id: `ac-${brand.id}-${Date.now()}`,
              name: `${brand.name} AC`,
              type: 'ac',
              brand: brand.name,
              platform: brand.platform,
              connectionType: selectedMethod === 'wifi' ? 'wifi' : 'ir',
              status: 'disconnected',
              driver: 'ac',
              paired: false,
              acState: {
                power: false,
                temp: 24,
                mode: 'cool',
                fan: 'auto',
                transport: selectedMethod === 'wifi' ? 'wifi' : 'ir',
              },
            });
            setConnectingId(null);
            navigation.navigate('MainTabs', { screen: 'Devices' } as never);
          }}
        >
          <Text style={styles.primaryText}>
            {connectingId === 'ac' ? 'Adding…' : `Add ${brand.name} AC`}
          </Text>
        </Pressable>
      ) : null}

      <View style={styles.list}>
        {devices.map((device) => (
          <View key={device.id} style={styles.deviceRow}>
            <View style={{ flex: 1 }}>
              <DeviceCard
                title={device.name}
                subtitle={`${device.brand} · ${device.ipAddress}`}
                status={connectingId === device.id ? 'connecting' : 'disconnected'}
              />
            </View>
            <Pressable
              style={styles.connectBtn}
              disabled={!!connectingId}
              onPress={() => void connectTo(device)}
            >
              <Text style={styles.connectText}>
                {connectingId === device.id ? '...' : 'Connect'}
              </Text>
            </Pressable>
          </View>
        ))}
      </View>

      {showManual ? (
        <View style={styles.manualBox}>
          <Text style={styles.manualLabel}>TV IP address</Text>
          <TextInput
            value={manualIp}
            onChangeText={setManualIp}
            placeholder="192.168.1.60"
            placeholderTextColor={colors.textSecondary}
            style={styles.ipInput}
            keyboardType="numeric"
            autoCapitalize="none"
          />
          <Pressable
            style={styles.primaryBtn}
            disabled={!!connectingId || !manualIp.trim()}
            onPress={() => void probeAndConnect()}
          >
            <Text style={styles.primaryText}>
              {connectingId === 'manual'
                ? isAndroidTv
                  ? 'Connecting...'
                  : 'Connecting...'
                : isAndroidTv
                  ? 'Probe & Connect'
                  : 'Connect with IP'}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {pairHost ? (
        <View style={styles.pairBox}>
          {pairKind === 'prompt' ? (
            <>
              <Text style={styles.pairTitle}>Allow on your LG TV</Text>
              <Text style={styles.pairHint}>
                {pairMessage || 'Press Yes / Allow on the TV, then tap below.'}
              </Text>
              <Pressable
                style={styles.primaryBtn}
                disabled={!!connectingId}
                onPress={() => void submitWebOsPair()}
              >
                <Text style={styles.primaryText}>
                  {connectingId === 'pair' ? 'Waiting for TV…' : 'Pair & Connect'}
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.pairTitle}>Pairing code</Text>
              <Text style={styles.pairHint}>
                {pairMessage || 'Look at your TV and enter the 6-digit code'}
              </Text>
              <TextInput
                value={pairCode}
                onChangeText={setPairCode}
                placeholder="123456"
                placeholderTextColor={colors.textSecondary}
                style={styles.ipInput}
                keyboardType="number-pad"
                maxLength={6}
              />
              <Pressable
                style={styles.primaryBtn}
                disabled={!!connectingId || pairCode.trim().length < 4}
                onPress={() => void submitPairCode()}
              >
                <Text style={styles.primaryText}>
                  {connectingId === 'pair' ? 'Pairing...' : 'Confirm Pairing'}
                </Text>
              </Pressable>
            </>
          )}
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        <ActionLink
          icon="keypad-outline"
          label={showManual ? 'Hide manual IP' : 'Enter IP manually'}
          onPress={() => setShowManual((v) => !v)}
        />
        <ActionLink icon="refresh-outline" label="Scan Again" onPress={() => void scan()} />
        <ActionLink icon="help-circle-outline" label="Help" onPress={() => setHelpOpen(true)} />
      </View>

      <BottomSheet visible={helpOpen} title="How to connect" onClose={() => setHelpOpen(false)}>
        <Text style={styles.helpBrand}>
          {brand.name} · {brand.platform}
        </Text>
        {tips.map((tip, index) => (
          <View key={tip} style={styles.helpRow}>
            <View style={styles.helpNumWrap}>
              <Text style={styles.helpNum}>{index + 1}</Text>
            </View>
            <Text style={styles.helpText}>{tip}</Text>
          </View>
        ))}
        <Pressable style={styles.helpDone} onPress={() => setHelpOpen(false)}>
          <Text style={styles.primaryText}>Got it</Text>
        </Pressable>
      </BottomSheet>
    </ScrollView>
  );
}

function ActionLink({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.link} onPress={onPress}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={styles.linkText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  title: { ...typography.title, color: colors.text },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: spacing.xl,
  },
  infoBox: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  infoTitle: { color: colors.text, fontWeight: '700' },
  infoText: { color: colors.textSecondary, lineHeight: 20, fontSize: 13 },
  backendStatus: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  section: { ...typography.label, color: colors.textSecondary, marginBottom: spacing.sm },
  methods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  methodChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  methodChipActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(88,101,242,0.18)',
  },
  methodText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  methodTextActive: { color: colors.text },
  scanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  list: { gap: spacing.md },
  emptyScan: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  emptyScanText: {
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  deviceRow: { gap: spacing.sm },
  connectBtn: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginTop: -4,
  },
  connectText: { color: '#fff', fontWeight: '700' },
  actions: { marginTop: spacing.xl, gap: spacing.md },
  link: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  linkText: { color: colors.primary, fontWeight: '600' },
  manualBox: {
    marginTop: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  manualLabel: { color: colors.textSecondary, fontWeight: '600', fontSize: 12 },
  pairBox: {
    marginTop: spacing.lg,
    gap: spacing.md,
    backgroundColor: 'rgba(88,101,242,0.12)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primary,
    padding: spacing.lg,
  },
  pairTitle: { color: colors.text, fontWeight: '700', fontSize: 16 },
  pairHint: { color: colors.textSecondary, lineHeight: 20 },
  ipInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    color: colors.text,
    backgroundColor: colors.secondaryBackground,
    letterSpacing: 2,
    fontSize: 18,
    fontWeight: '700',
  },
  primaryBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '700' },
  error: {
    marginTop: spacing.lg,
    color: colors.danger,
    lineHeight: 20,
  },
  helpBrand: {
    color: colors.textSecondary,
    marginTop: -8,
    marginBottom: spacing.lg,
    fontWeight: '600',
  },
  helpRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'flex-start',
  },
  helpNumWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(88,101,242,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  helpNum: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  helpText: {
    flex: 1,
    color: colors.text,
    lineHeight: 22,
  },
  helpDone: {
    marginTop: spacing.md,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
