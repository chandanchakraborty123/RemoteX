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
import { deviceService, type DiscoveredDevice } from '../services/deviceService';
import { colors, spacing, typography } from '../theme';

/**
 * One-tap Wi‑Fi scan for Android TV / Google TV / Xstream / LG webOS.
 * Used from Home and Devices — no IP knowledge required.
 */
export function ScanScreen({ navigation }: RootStackProps<'Scan'>) {
  const { upsertDevice } = useApp();
  const [scanning, setScanning] = useState(true);
  const [devices, setDevices] = useState<DiscoveredDevice[]>([]);
  const [message, setMessage] = useState('Looking for TVs on your Wi‑Fi...');
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pairHost, setPairHost] = useState<string | null>(null);
  const [pairName, setPairName] = useState('');
  const [pairCode, setPairCode] = useState('');
  const [pairMessage, setPairMessage] = useState<string | null>(null);
  const [pairKind, setPairKind] = useState<'code' | 'prompt'>('code');
  const [pairDriver, setPairDriver] = useState<'androidtv' | 'webos'>('androidtv');
  const [showManual, setShowManual] = useState(false);
  const [manualIp, setManualIp] = useState('');
  const [manualKind, setManualKind] = useState<'androidtv' | 'webos'>('androidtv');

  const scan = useCallback(async () => {
    setScanning(true);
    setError(null);
    setPairHost(null);
    setMessage('Looking for TVs on your Wi‑Fi...');
    const result = await deviceService.scanNetwork(5);
    setDevices(result.devices);
    setMessage(result.message);
    setScanning(false);
  }, []);

  useEffect(() => {
    void scan();
  }, [scan]);

  const connectTo = async (
    item: DiscoveredDevice | { name: string; ipAddress: string; driver?: 'androidtv' | 'webos' },
  ) => {
    const host = item.ipAddress;
    const driver: 'androidtv' | 'webos' =
      'driver' in item && item.driver === 'webos' ? 'webos' : 'androidtv';
    setConnectingId('id' in item ? item.id : 'manual');
    setError(null);
    setPairHost(null);

    const result = await deviceService.connect({
      name: item.name,
      brand: 'brand' in item ? item.brand : driver === 'webos' ? 'LG' : 'Android TV',
      platform:
        'platform' in item
          ? item.platform
          : driver === 'webos'
            ? 'webOS'
            : 'Android TV / Google TV',
      type: 'tv',
      connectionType: 'local_network',
      ipAddress: host,
      status: 'connecting',
      driver,
    });

    setConnectingId(null);

    if (result.status === 'connected') {
      await upsertDevice(result.device);
      navigation.replace('Remote');
      return;
    }

    if (result.status === 'needs_pairing') {
      setPairHost(result.host);
      setPairName(item.name);
      setPairMessage(result.message);
      setPairKind(result.pairKind ?? (driver === 'webos' ? 'prompt' : 'code'));
      setPairDriver(driver === 'webos' ? 'webos' : 'androidtv');

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
        setError(finished.error || 'Pairing timed out — try again on the TV');
        setConnectingId(null);
        return;
      }
      const connected = await deviceService.connect({
        name: finished.name || pairName || 'LG webOS TV',
        brand: 'LG',
        platform: 'webOS',
        type: 'tv',
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
          : 'Paired, but connection failed — try again',
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
        name: finished.device?.name || finished.name || pairName || 'Android TV',
        brand: 'Android TV',
        platform: 'Android TV / Google TV',
        type: 'tv',
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
          : 'Paired, but connection failed — try again',
      );
    } catch (e) {
      setConnectingId(null);
      setError(e instanceof Error ? e.message : 'Pairing failed');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Scan for devices</Text>
      <Text style={styles.subtitle}>
        We search your Wi‑Fi for Android TV, Xstream, and LG webOS. You don’t need the IP.
      </Text>

      <View style={styles.scanCard}>
        {scanning ? (
          <>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.scanText}>{message}</Text>
          </>
        ) : (
          <>
            <Ionicons
              name={devices.length ? 'checkmark-circle' : 'search-outline'}
              size={32}
              color={devices.length ? colors.success : colors.primary}
            />
            <Text style={styles.scanText}>{message}</Text>
            <Pressable style={styles.rescanBtn} onPress={() => void scan()}>
              <Ionicons name="refresh-outline" size={18} color="#fff" />
              <Text style={styles.rescanText}>Scan again</Text>
            </Pressable>
          </>
        )}
      </View>

      <View style={styles.list}>
        {devices.map((device) => (
          <View key={device.id} style={styles.deviceRow}>
            <DeviceCard
              title={device.name}
              subtitle={`${device.brand} · ${device.platform} · ${device.ipAddress}`}
              status={connectingId === device.id ? 'connecting' : 'disconnected'}
            />
            <Pressable
              style={styles.connectBtn}
              disabled={!!connectingId || scanning}
              onPress={() => void connectTo(device)}
            >
              <Text style={styles.connectText}>
                {connectingId === device.id ? 'Connecting...' : 'Connect'}
              </Text>
            </Pressable>
          </View>
        ))}
      </View>

      {pairHost ? (
        <View style={styles.pairBox}>
          {pairKind === 'prompt' || pairDriver === 'webos' ? (
            <>
              <Text style={styles.pairTitle}>Allow on your LG TV</Text>
              <Text style={styles.pairHint}>
                {pairMessage ||
                  `A prompt should appear on ${pairName || 'your TV'}. Press Yes / Allow, then tap below.`}
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
                {pairMessage || `Look at ${pairName || 'your TV'} and enter the 6-digit code`}
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

      {showManual ? (
        <View style={styles.manualBox}>
          <Text style={styles.manualLabel}>Or enter IP (advanced)</Text>
          <View style={styles.kindRow}>
            {([
              { id: 'androidtv' as const, label: 'Android / Xstream' },
              { id: 'webos' as const, label: 'LG webOS' },
            ]).map((k) => (
              <Pressable
                key={k.id}
                style={[styles.kindChip, manualKind === k.id && styles.kindChipOn]}
                onPress={() => setManualKind(k.id)}
              >
                <Text style={[styles.kindText, manualKind === k.id && styles.kindTextOn]}>
                  {k.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            value={manualIp}
            onChangeText={setManualIp}
            placeholder="192.168.1.5"
            placeholderTextColor={colors.textSecondary}
            style={styles.ipInput}
            keyboardType="numeric"
          />
          <Pressable
            style={styles.primaryBtn}
            disabled={!manualIp.trim() || !!connectingId}
            onPress={() =>
              void connectTo({
                name: manualKind === 'webos' ? 'LG webOS TV' : 'Android TV',
                ipAddress: manualIp.trim(),
                driver: manualKind,
              })
            }
          >
            <Text style={styles.primaryText}>Connect with IP</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable style={styles.link} onPress={() => setShowManual(true)}>
          <Ionicons name="keypad-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.linkMuted}>Device not listed? Enter IP manually</Text>
        </Pressable>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  title: { ...typography.title, color: colors.text },
  subtitle: {
    color: colors.textSecondary,
    marginTop: 6,
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  scanCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  scanText: {
    color: colors.text,
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 22,
  },
  rescanBtn: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  rescanText: { color: '#fff', fontWeight: '700' },
  list: { gap: spacing.md },
  deviceRow: { gap: spacing.sm },
  connectBtn: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  connectText: { color: '#fff', fontWeight: '700' },
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
  kindRow: { flexDirection: 'row', gap: 8 },
  kindChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.secondaryBackground,
  },
  kindChipOn: { borderColor: colors.primary, backgroundColor: 'rgba(88,101,242,0.15)' },
  kindText: { color: colors.textSecondary, fontWeight: '700', fontSize: 12 },
  kindTextOn: { color: colors.primary },
  ipInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    color: colors.text,
    backgroundColor: colors.secondaryBackground,
    letterSpacing: 1,
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
  link: {
    marginTop: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  linkMuted: { color: colors.textSecondary, fontWeight: '600' },
  error: { marginTop: spacing.lg, color: colors.danger, lineHeight: 20 },
});
