import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DeviceCard } from '../components/DeviceCard';
import { useApp } from '../context/AppContext';
import type { RootStackParamList } from '../navigation/types';
import { colors, spacing, typography } from '../theme';

export function DevicesScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    devices,
    setActiveDevice,
    disconnectDevice,
    disconnectAllDevices,
    reconnectDevice,
    recent,
  } = useApp();
  const [busyId, setBusyId] = useState<string | null>(null);

  const connectedCount = devices.filter((d) => d.status === 'connected').length;

  const openDevice = async (id: string) => {
    const device = devices.find((d) => d.id === id);
    if (!device) return;
    setBusyId(id);
    if (device.status !== 'connected' && device.paired) {
      const ok = await reconnectDevice(id);
      if (!ok) {
        setBusyId(null);
        return;
      }
    } else {
      await setActiveDevice(device);
    }
    setBusyId(null);
    navigation.navigate('Remote');
  };

  const onDisconnect = async (id: string) => {
    setBusyId(id);
    await disconnectDevice(id);
    setBusyId(null);
  };

  const onDisconnectAll = async () => {
    setBusyId('all');
    await disconnectAllDevices();
    setBusyId(null);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: spacing.xxxl }}
    >
      <View style={styles.header}>
        <Text style={styles.title}>My Devices</Text>
        <View style={styles.headerActions}>
          <Pressable
            style={styles.scanHeaderBtn}
            onPress={() => navigation.navigate('Scan')}
          >
            <Ionicons name="search-outline" size={18} color={colors.primary} />
            <Text style={styles.scanHeaderText}>Scan</Text>
          </Pressable>
          {connectedCount > 0 ? (
            <Pressable
              style={[styles.disconnectAll, busyId === 'all' && { opacity: 0.6 }]}
              disabled={!!busyId}
              onPress={() => void onDisconnectAll()}
            >
              {busyId === 'all' ? (
                <ActivityIndicator color={colors.danger} size="small" />
              ) : (
                <>
                  <Ionicons name="unlink-outline" size={16} color={colors.danger} />
                  <Text style={styles.disconnectAllText}>Disconnect all</Text>
                </>
              )}
            </Pressable>
          ) : null}
          <Pressable style={styles.add} onPress={() => navigation.navigate('DeviceType')}>
            <Ionicons name="add" size={20} color="#fff" />
          </Pressable>
        </View>
      </View>

      <Pressable style={styles.scanBanner} onPress={() => navigation.navigate('Scan')}>
        <View style={styles.scanBannerIcon}>
          <Ionicons name="wifi-outline" size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.scanBannerTitle}>Find devices on Wi‑Fi</Text>
          <Text style={styles.scanBannerMeta}>
            No IP needed — we discover TVs and boxes automatically
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
      </Pressable>

      <View style={styles.list}>
        {devices.map((device) => (
          <View key={device.id} style={styles.deviceBlock}>
            <DeviceCard
              title={device.name}
              subtitle={`${device.brand} · ${device.platform}${device.ipAddress ? ` · ${device.ipAddress}` : ''}${
                device.paired && device.status !== 'connected' ? ' · Paired' : ''
              }`}
              status={device.status}
              paired={device.paired}
              onPress={() => void openDevice(device.id)}
            />
            {device.status === 'connected' ? (
              <Pressable
                style={styles.disconnectBtn}
                disabled={!!busyId}
                onPress={() => void onDisconnect(device.id)}
              >
                {busyId === device.id ? (
                  <ActivityIndicator color={colors.danger} size="small" />
                ) : (
                  <>
                    <Ionicons name="unlink-outline" size={16} color={colors.danger} />
                    <Text style={styles.disconnectText}>Disconnect</Text>
                  </>
                )}
              </Pressable>
            ) : device.paired ? (
              <Pressable
                style={styles.reconnectBtn}
                disabled={!!busyId}
                onPress={() => void openDevice(device.id)}
              >
                {busyId === device.id ? (
                  <ActivityIndicator color={colors.primary} size="small" />
                ) : (
                  <>
                    <Ionicons name="refresh-outline" size={16} color={colors.primary} />
                    <Text style={styles.reconnectText}>Reconnect</Text>
                  </>
                )}
              </Pressable>
            ) : null}
          </View>
        ))}
      </View>

      <Text style={styles.section}>Recent actions</Text>
      {recent.length === 0 ? (
        <Text style={styles.empty}>Commands you send will appear here.</Text>
      ) : (
        recent.slice(0, 8).map((item) => (
          <View key={item.id} style={styles.recentRow}>
            <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.recentText}>{item.label}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  title: { ...typography.title, color: colors.text, flexShrink: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap', justifyContent: 'flex-end' },
  scanHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: 'rgba(88,101,242,0.12)',
  },
  scanHeaderText: { color: colors.primary, fontWeight: '700', fontSize: 12 },
  disconnectAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: 'rgba(239,68,68,0.12)',
  },
  disconnectAllText: { color: colors.danger, fontWeight: '700', fontSize: 12 },
  add: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  scanBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.secondaryBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanBannerTitle: { color: colors.text, fontWeight: '700' },
  scanBannerMeta: { color: colors.textSecondary, fontSize: 12, marginTop: 2, lineHeight: 16 },
  list: { gap: spacing.md, marginBottom: spacing.xl },
  deviceBlock: { gap: spacing.sm },
  disconnectBtn: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: 'rgba(239,68,68,0.1)',
    minWidth: 120,
    justifyContent: 'center',
  },
  disconnectText: { color: colors.danger, fontWeight: '700', fontSize: 13 },
  reconnectBtn: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: 'rgba(88,101,242,0.12)',
    minWidth: 120,
    justifyContent: 'center',
  },
  reconnectText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  section: { ...typography.label, color: colors.textSecondary, marginBottom: spacing.md },
  empty: { color: colors.textSecondary },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  recentText: { color: colors.text, flex: 1 },
});
