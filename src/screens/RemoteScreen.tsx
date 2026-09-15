import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheet } from '../components/BottomSheet';
import { AcRemotePanel } from '../components/AcRemotePanel';
import { AppShortcutIcon } from '../components/AppShortcutIcon';
import { TouchPad } from '../components/TouchPad';
import { useApp } from '../context/AppContext';
import { DEFAULT_APP_SHORTCUTS } from '../data/mockDevices';
import type { RootStackParamList } from '../navigation/types';
import { deviceService } from '../services/deviceService';
import { colors } from '../theme';
import type { AcDeviceState, RemoteActionType } from '../types';

type PadPosition = 'top' | 'center' | 'bottom';

const BTN = 68;
const BTN_SM = 60;
const MIC = 84;

const SAMPLE_VOICE = ['Open YouTube', 'Set volume to 30', 'Go to Netflix', 'Mute'];

const POSITIONS: { id: PadPosition; label: string }[] = [
  { id: 'top', label: 'Top' },
  { id: 'center', label: 'Center' },
  { id: 'bottom', label: 'Bottom' },
];

function Rocker({
  title,
  onUp,
  onDown,
}: {
  title: string;
  onUp: () => void;
  onDown: () => void;
}) {
  return (
    <View style={styles.rocker}>
      <Pressable
        onPress={onUp}
        style={({ pressed }) => [styles.rockerHalf, styles.rockerTop, pressed && styles.rockerPressed]}
      >
        <Text style={styles.rockerPlus}>+</Text>
      </Pressable>
      <View style={styles.rockerMid}>
        <Text style={styles.rockerTitle}>{title}</Text>
      </View>
      <Pressable
        onPress={onDown}
        style={({ pressed }) => [styles.rockerHalf, styles.rockerBottom, pressed && styles.rockerPressed]}
      >
        <Text style={styles.rockerMinus}>−</Text>
      </Pressable>
    </View>
  );
}

function RoundButton({
  label,
  icon,
  onPress,
  size = BTN,
  tone = 'default',
}: {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  size?: number;
  tone?: 'default' | 'power' | 'ok' | 'dark';
}) {
  const toneStyle =
    tone === 'power'
      ? styles.tonePower
      : tone === 'ok'
        ? styles.toneOk
        : tone === 'dark'
          ? styles.toneDark
          : styles.toneDefault;

  const color =
    tone === 'power' ? colors.danger : tone === 'ok' ? '#fff' : colors.text;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.round,
        toneStyle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          opacity: pressed ? 0.88 : 1,
          transform: [{ scale: pressed ? 0.96 : 1 }],
        },
      ]}
    >
      <View style={styles.roundInner}>
        {icon ? <Ionicons name={icon} size={22} color={color} /> : null}
        <Text
          style={[styles.roundLabel, { color }, !icon && styles.roundLabelOnly]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

export function RemoteScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    activeDevice,
    lastFeedback,
    sendAction,
    runMacro,
    macros,
    toggleFavoriteDevice,
    disconnectDevice,
    reconnectDevice,
    settings,
    updateSettings,
  } = useApp();

  const [listening, setListening] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [reconnecting, setReconnecting] = useState(false);

  const padPos: PadPosition = settings.touchpadPosition ?? 'center';

  useEffect(() => {
    if (!lastFeedback) return;
    setToast(lastFeedback);
    const t = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(t);
  }, [lastFeedback]);

  const fire = (type: RemoteActionType, payload?: Record<string, string | number | boolean>) => {
    void sendAction({ type, payload });
  };

  const handleVoice = async () => {
    setListening(true);
    setToast('Listening...');
    await new Promise((r) => setTimeout(r, 800));
    const phrase = SAMPLE_VOICE[Math.floor(Math.random() * SAMPLE_VOICE.length)];
    setToast(phrase);
    await sendAction(deviceService.parseVoiceCommand(phrase));
    setListening(false);
  };

  const reconnect = async () => {
    if (!activeDevice || reconnecting) return;
    setReconnecting(true);
    try {
      await reconnectDevice(activeDevice.id);
    } finally {
      setReconnecting(false);
    }
  };

  const touchSection = useMemo(
    () => (
      <View style={styles.touchBlock}>
        <View style={styles.moveRow}>
          <Text style={styles.moveLabel}>Move pad</Text>
          <View style={styles.moveChips}>
            {POSITIONS.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => void updateSettings({ touchpadPosition: p.id })}
                style={[styles.moveChip, padPos === p.id && styles.moveChipOn]}
              >
                <Text style={[styles.moveChipText, padPos === p.id && styles.moveChipTextOn]}>
                  {p.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        <TouchPad onAction={(type) => fire(type)} />
      </View>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [padPos],
  );

  if (!activeDevice) {
    return (
      <View style={[styles.root, styles.centerFill, { paddingTop: insets.top }]}>
        <Text style={styles.emptyTitle}>No device selected</Text>
        <Pressable style={styles.pill} onPress={() => navigation.navigate('DeviceType')}>
          <Text style={styles.pillText}>Add a device</Text>
        </Pressable>
      </View>
    );
  }

  const isAc = activeDevice.type === 'ac' || activeDevice.driver === 'ac';
  const acState: AcDeviceState = activeDevice.acState ?? {
    power: false,
    temp: 24,
    mode: 'cool',
    fan: 'auto',
    transport: activeDevice.connectionType === 'wifi' ? 'wifi' : 'ir',
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 4 }]}>
      <LinearGradient colors={['#151B2C', colors.background]} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <Pressable
          style={styles.headerBtn}
          onPress={() => navigation.navigate('MainTabs', { screen: 'Devices' } as never)}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <View style={styles.headerMid}>
          <Text style={styles.title} numberOfLines={1}>
            {activeDevice.name}
          </Text>
          <Text
            style={[
              styles.status,
              {
                color:
                  activeDevice.status === 'connected'
                    ? colors.success
                    : activeDevice.status === 'connecting'
                      ? colors.warning
                      : activeDevice.paired
                        ? colors.primary
                        : colors.danger,
              },
            ]}
          >
            {activeDevice.status === 'connected'
              ? 'Connected'
              : activeDevice.status === 'connecting'
                ? 'Connecting…'
                : activeDevice.paired
                  ? 'Paired · offline'
                  : 'Disconnected'}
          </Text>
        </View>
        <Pressable
          style={styles.headerBtn}
          onPress={() => void toggleFavoriteDevice(activeDevice.id)}
        >
          <Ionicons
            name={activeDevice.favorite ? 'star' : 'star-outline'}
            size={20}
            color={activeDevice.favorite ? colors.warning : colors.textSecondary}
          />
        </Pressable>
      </View>

      {activeDevice.status !== 'connected' ? (
        <Pressable
          style={[styles.reconnect, reconnecting && { opacity: 0.7 }]}
          disabled={reconnecting}
          onPress={() => void reconnect()}
        >
          <Text style={styles.reconnectText}>
            {reconnecting
              ? 'Reconnecting…'
              : activeDevice.paired
                ? 'Tap to reconnect (no code needed)'
                : 'Tap to reconnect'}
          </Text>
        </Pressable>
      ) : null}

      {toast ? (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {isAc ? (
          <>
            <AcRemotePanel
              state={acState}
              transportLabel={
                (acState.transport || activeDevice.connectionType) === 'wifi'
                  ? 'Wi‑Fi'
                  : 'IR'
              }
              onAction={(type, payload) => fire(type, payload)}
            />
            <View style={[styles.tools, { marginTop: 16 }]}>
              {[
                {
                  label: activeDevice.status === 'connected' ? 'Disconnect' : 'Reconnect',
                  icon: (activeDevice.status === 'connected' ? 'unlink' : 'refresh') as keyof typeof Ionicons.glyphMap,
                  onPress: () =>
                    activeDevice.status === 'connected'
                      ? void disconnectDevice(activeDevice.id)
                      : void reconnect(),
                },
              ].map((t) => (
                <Pressable key={t.label} style={styles.tool} onPress={t.onPress}>
                  <Ionicons name={t.icon} size={16} color={colors.primary} />
                  <Text style={styles.toolText}>{t.label}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : (
          <>
        {/* Row 1 — equal 3 columns */}
        <View style={styles.grid3}>
          <View style={styles.cell}>
            <RoundButton label="Power" icon="power" tone="power" onPress={() => fire('POWER')} />
          </View>
          <View style={styles.cell}>
            <RoundButton label="Input" onPress={() => fire('INPUT', { source: 'HDMI 1' })} />
          </View>
          <View style={styles.cell}>
            <RoundButton label="Mute" icon="volume-mute" onPress={() => fire('MUTE')} />
          </View>
        </View>

        {padPos === 'top' ? touchSection : null}
        {padPos === 'center' ? touchSection : null}

        {/* Row 2 — equal 4 columns */}
        <View style={styles.grid4}>
          <View style={styles.cell}>
            <RoundButton label="Back" icon="arrow-back" size={BTN_SM} onPress={() => fire('BACK')} />
          </View>
          <View style={styles.cell}>
            <RoundButton label="Home" icon="home" size={BTN_SM} onPress={() => fire('HOME')} />
          </View>
          <View style={styles.cell}>
            <RoundButton label="Menu" icon="menu" size={BTN_SM} onPress={() => fire('MENU')} />
          </View>
          <View style={styles.cell}>
            <RoundButton label="OK" tone="ok" size={BTN_SM} onPress={() => fire('OK')} />
          </View>
        </View>

        {/* Volume rocker · Voice · Channel rocker */}
        <View style={styles.tri}>
          <View style={styles.triCol}>
            <Rocker
              title="VOL"
              onUp={() => fire('VOLUME_UP')}
              onDown={() => fire('VOLUME_DOWN')}
            />
          </View>

          <View style={styles.triCol}>
            <View style={styles.micSlot}>
              <Pressable
                style={[styles.mic, listening && styles.micLive]}
                onPress={() => void handleVoice()}
              >
                <Ionicons name={listening ? 'radio' : 'mic'} size={28} color="#fff" />
                <Text style={styles.micText}>{listening ? '...' : 'Voice'}</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.triCol}>
            <Rocker
              title="CH"
              onUp={() => fire('CHANNEL_UP')}
              onDown={() => fire('CHANNEL_DOWN')}
            />
          </View>
        </View>

        {padPos === 'bottom' ? touchSection : null}

        <Text style={styles.section}>Apps</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.apps}>
          {DEFAULT_APP_SHORTCUTS.map((app) => (
            <Pressable
              key={app.id}
              style={styles.appBtn}
              onPress={() => fire('OPEN_APP', { app: app.packageHint })}
            >
              <AppShortcutIcon app={app} size={16} />
              <Text style={styles.appName}>{app.name}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.tools}>
          {[
            { label: 'Keyboard', icon: 'keypad' as const, onPress: () => navigation.navigate('Keyboard') },
            { label: 'AI', icon: 'sparkles' as const, onPress: () => setAiOpen(true) },
            { label: 'Macros', icon: 'flash' as const, onPress: () => navigation.navigate('Macros') },
            {
              label: activeDevice.status === 'connected' ? 'Disconnect' : 'Reconnect',
              icon: (activeDevice.status === 'connected' ? 'unlink' : 'refresh') as keyof typeof Ionicons.glyphMap,
              onPress: () =>
                activeDevice.status === 'connected'
                  ? void disconnectDevice(activeDevice.id)
                  : void reconnect(),
            },
          ].map((t) => (
            <Pressable key={t.label} style={styles.tool} onPress={t.onPress}>
              <Ionicons name={t.icon} size={16} color={colors.primary} />
              <Text style={styles.toolText}>{t.label}</Text>
            </Pressable>
          ))}
        </View>

        {macros.length > 0 ? (
          <View style={styles.macroRow}>
            {macros.slice(0, 2).map((m) => (
              <Pressable key={m.id} style={styles.macro} onPress={() => void runMacro(m)}>
                <Text style={styles.macroName}>{m.name}</Text>
                <Text style={styles.macroRun}>Run</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
          </>
        )}
      </ScrollView>

      <BottomSheet visible={aiOpen} title="AI help" onClose={() => setAiOpen(false)}>
        {['Open Netflix', 'Open YouTube', 'Mute'].map((cmd) => (
          <Pressable
            key={cmd}
            style={styles.aiCmd}
            onPress={async () => {
              setAiOpen(false);
              await sendAction(deviceService.parseVoiceCommand(cmd));
            }}
          >
            <Text style={styles.aiCmdText}>{cmd}</Text>
          </Pressable>
        ))}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  centerFill: { alignItems: 'center', justifyContent: 'center', gap: 16 },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  pill: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
  },
  pillText: { color: '#fff', fontWeight: '700' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerMid: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  title: { color: colors.text, fontWeight: '800', fontSize: 16 },
  status: { fontSize: 12, fontWeight: '700', marginTop: 2 },

  reconnect: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: 'rgba(239,68,68,0.1)',
    paddingVertical: 10,
    alignItems: 'center',
  },
  reconnectText: { color: colors.danger, fontWeight: '700' },

  toast: {
    alignSelf: 'center',
    backgroundColor: colors.card,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 8,
  },
  toastText: { color: colors.text, fontWeight: '600', fontSize: 12 },

  body: {
    paddingHorizontal: 16,
    gap: 20,
  },

  grid3: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  grid4: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  round: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 4,
  },
  roundLabel: {
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  roundLabelOnly: {
    fontSize: 13,
  },
  toneDefault: {
    backgroundColor: colors.card,
    borderColor: colors.border,
  },
  tonePower: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderColor: 'rgba(239,68,68,0.4)',
  },
  toneOk: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  toneDark: {
    backgroundColor: '#1C2740',
    borderColor: colors.border,
  },

  tri: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  triCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 168,
  },
  rocker: {
    width: 72,
    height: 168,
    borderRadius: 36,
    backgroundColor: '#171F33',
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  rockerHalf: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rockerTop: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rockerBottom: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  rockerPressed: {
    backgroundColor: 'rgba(88,101,242,0.18)',
  },
  rockerMid: {
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondaryBackground,
  },
  rockerTitle: {
    color: colors.textSecondary,
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 1,
  },
  rockerPlus: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 30,
  },
  rockerMinus: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '300',
    lineHeight: 32,
  },
  micSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mic: {
    width: MIC,
    height: MIC,
    borderRadius: MIC / 2,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  micLive: { backgroundColor: colors.secondary },
  micText: { color: '#fff', fontWeight: '800', fontSize: 12 },

  touchBlock: { gap: 10 },
  moveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 34,
  },
  moveLabel: {
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 12,
    lineHeight: 34,
  },
  moveChips: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  moveChip: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moveChipOn: {
    backgroundColor: 'rgba(88,101,242,0.22)',
    borderColor: colors.primary,
  },
  moveChipText: { color: colors.textSecondary, fontWeight: '700', fontSize: 12 },
  moveChipTextOn: { color: colors.text },

  section: {
    color: colors.textSecondary,
    fontWeight: '800',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  apps: { gap: 8 },
  appBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.card,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  appName: { color: colors.text, fontWeight: '700', fontSize: 13 },

  tools: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tool: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  toolText: { color: colors.text, fontWeight: '700', fontSize: 12 },

  macroRow: { flexDirection: 'row', gap: 8 },
  macro: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  macroName: { color: colors.text, fontWeight: '700' },
  macroRun: { color: colors.primary, fontWeight: '800' },

  aiCmd: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 8,
  },
  aiCmdText: { color: colors.text, fontWeight: '600' },
});
