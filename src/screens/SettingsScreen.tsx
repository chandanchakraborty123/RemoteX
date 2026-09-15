import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDefaultApiBaseUrl } from '../config';
import { useApp } from '../context/AppContext';
import { androidTvApi } from '../services/androidTvApi';
import { colors, spacing, typography } from '../theme';

export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { settings, updateSettings, activeDevice, removeDevice } = useApp();
  const [apiUrl, setApiUrl] = useState(settings.apiBaseUrl || getDefaultApiBaseUrl());
  const [backendStatus, setBackendStatus] = useState<string | null>(null);

  const saveApiUrl = async () => {
    await updateSettings({ apiBaseUrl: apiUrl.trim() });
    setBackendStatus('Saved');
  };

  const testBackend = async () => {
    await updateSettings({ apiBaseUrl: apiUrl.trim() });
    setBackendStatus('Checking...');
    const ok = await androidTvApi.health();
    setBackendStatus(ok ? 'Backend online' : 'Backend offline');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: spacing.xxxl }}
    >
      <Text style={styles.title}>Settings</Text>

      <Text style={styles.section}>Android TV bridge</Text>
      <View style={styles.card}>
        <Text style={styles.meta}>
          On web/mobile browser, the API host follows whatever address you used to
          open the app (your PC IP). Override only if needed.
        </Text>
        <TextInput
          value={apiUrl}
          onChangeText={setApiUrl}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder={getDefaultApiBaseUrl()}
          placeholderTextColor={colors.textSecondary}
          style={styles.input}
        />
        <View style={styles.apiActions}>
          <Pressable style={styles.secondaryBtn} onPress={() => void saveApiUrl()}>
            <Text style={styles.secondaryText}>Save</Text>
          </Pressable>
          <Pressable style={styles.primaryBtn} onPress={() => void testBackend()}>
            <Text style={styles.primaryText}>Test</Text>
          </Pressable>
        </View>
        {backendStatus ? <Text style={styles.status}>{backendStatus}</Text> : null}
      </View>

      <Text style={styles.section}>Remote</Text>
      <SettingRow
        label="Haptic Feedback"
        right={
          <Switch
            value={settings.hapticFeedback}
            onValueChange={(v) => void updateSettings({ hapticFeedback: v })}
            trackColor={{ true: colors.primary, false: colors.muted }}
          />
        }
      />
      <SettingRow
        label="Sound Feedback"
        right={
          <Switch
            value={settings.soundFeedback}
            onValueChange={(v) => void updateSettings({ soundFeedback: v })}
            trackColor={{ true: colors.primary, false: colors.muted }}
          />
        }
      />
      <SettingRow
        label="Button Size"
        right={
          <View style={styles.segment}>
            {(['compact', 'normal', 'large'] as const).map((size) => (
              <Pressable
                key={size}
                onPress={() => void updateSettings({ buttonSize: size })}
                style={[
                  styles.segBtn,
                  settings.buttonSize === size && styles.segBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.segText,
                    settings.buttonSize === size && styles.segTextActive,
                  ]}
                >
                  {size[0].toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>
        }
      />
      <SettingRow
        label="Touchpad Sensitivity"
        right={<Text style={styles.value}>{settings.touchpadSensitivity.toFixed(1)}x</Text>}
      />

      <Text style={styles.section}>Active device</Text>
      <View style={styles.card}>
        <Text style={styles.deviceName}>{activeDevice?.name ?? 'None'}</Text>
        <Text style={styles.meta}>
          {activeDevice
            ? `${activeDevice.brand} · ${activeDevice.platform}${
                activeDevice.driver ? ` · ${activeDevice.driver}` : ''
              }`
            : 'Select a device to manage connection settings'}
        </Text>
        {activeDevice ? (
          <Pressable
            style={styles.dangerBtn}
            onPress={() => void removeDevice(activeDevice.id)}
          >
            <Text style={styles.dangerText}>Remove Device</Text>
          </Pressable>
        ) : null}
      </View>

      <Text style={styles.section}>About</Text>
      <View style={styles.card}>
        <Text style={styles.deviceName}>RemoteX</Text>
        <Text style={styles.meta}>
          Phase 5 — Android TV / Google TV via local FastAPI bridge
        </Text>
      </View>
    </ScrollView>
  );
}

function SettingRow({
  label,
  right,
}: {
  label: string;
  right: React.ReactNode;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  title: { ...typography.title, color: colors.text, marginBottom: spacing.xl },
  section: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  rowLabel: { color: colors.text, fontWeight: '600' },
  value: { color: colors.textSecondary, fontWeight: '600' },
  segment: { flexDirection: 'row', gap: 4 },
  segBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondaryBackground,
  },
  segBtnActive: { backgroundColor: colors.primary },
  segText: { color: colors.textSecondary, fontWeight: '700', fontSize: 12 },
  segTextActive: { color: '#fff' },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  deviceName: { color: colors.text, fontWeight: '700', fontSize: 16 },
  meta: { color: colors.textSecondary, marginTop: 4, lineHeight: 20 },
  input: {
    marginTop: spacing.sm,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    color: colors.text,
    backgroundColor: colors.secondaryBackground,
  },
  apiActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  primaryBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '700' },
  secondaryBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { color: colors.text, fontWeight: '700' },
  status: { color: colors.textSecondary, fontWeight: '600', marginTop: 4 },
  dangerBtn: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    backgroundColor: 'rgba(239,68,68,0.15)',
  },
  dangerText: { color: colors.danger, fontWeight: '700' },
});
