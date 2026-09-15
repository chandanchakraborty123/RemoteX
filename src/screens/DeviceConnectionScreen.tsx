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
import { useApp } from '../context/AppContext';
import type { RootStackProps } from '../navigation/types';
import {
  deviceService,
  type DiscoveredDevice,
} from '../services/deviceService';
import { colors, spacing, typography } from '../theme';
import type { ConnectionMethod } from '../types';
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

  const [scanMessage, setScanMessage] = useState<string | null>(null);

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
      isLanTv ? 'Scanning Wi‑Fi for your TV…' : 'Searching for devices...',
    );
    const found = await deviceService.discover(brand.connectionMethods, {
      platform: brand.platform,
      realScan: isLanTv,
    });
    setDevices(found);
    setScanMessage(
      found.length
        ? `Found ${found.length} device${found.length === 1 ? '' : 's'} nearby`
        : isLanTv
          ? 'No TV found yet. Turn the TV on, stay on the same Wi‑Fi, then Scan Again — or enter IP if you know it.'
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
            {isWebOs ? 'LG webOS pairing' : 'Automatic scan'}
          </Text>
          <Text style={styles.infoText}>
            {isWebOs
              ? 'We find your LG on Wi‑Fi. First connect shows an Accept prompt on the TV — press Yes, then Pair.'
              : 'We find your TV on Wi‑Fi by name — you don’t need to know the IP. Tap Connect, then enter the code shown on the TV.'}
          </Text>
          <Text
            style={[
              styles.backendStatus,
              { color: backendOk ? colors.success : colors.warning },
            ]}
          >
            {backendOk == null
              ? 'Checking backend...'
              : backendOk
                ? 'Backend online · ready to scan'
                : 'Backend offline — start it to enable scanning'}
          </Text>
        </View>
      ) : null}

      {isAc ? (
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>AC remote</Text>
          <Text style={styles.infoText}>
            Power, temp, mode, and fan work now. IR needs a blaster (Broadlink / ESP)
            later; Wi‑Fi brands can plug into the same API.
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
            : scanMessage || 'Discovered devices'}
        </Text>
        {scanning ? <ActivityIndicator color={colors.primary} /> : null}
      </View>

      {!scanning && devices.length === 0 ? (
        <View style={styles.emptyScan}>
          <Ionicons name="wifi-outline" size={28} color={colors.textSecondary} />
          <Text style={styles.emptyScanText}>
            {isAc
              ? 'Choose IR or Wi‑Fi above, then connect your AC.'
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
          onPress={() =>
            void connectTo({
              name: `${brand.name} AC`,
            })
          }
        >
          <Text style={styles.primaryText}>
            {connectingId ? 'Connecting…' : `Connect ${brand.name} AC`}
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
        <ActionLink icon="help-circle-outline" label="Help" onPress={() => {}} />
      </View>
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
});
