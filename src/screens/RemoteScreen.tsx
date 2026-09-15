import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheet } from '../components/BottomSheet';
import { ConnectionBadge } from '../components/ConnectionBadge';
import { RemoteButton } from '../components/RemoteButton';
import { TouchPad } from '../components/TouchPad';
import { VoiceButton } from '../components/VoiceButton';
import { useApp } from '../context/AppContext';
import { DEFAULT_APP_SHORTCUTS, QUICK_ACTIONS } from '../data/mockDevices';
import type { RootStackParamList } from '../navigation/types';
import { deviceService } from '../services/deviceService';
import { colors, spacing, typography } from '../theme';
import type { RemoteActionType } from '../types';

const SAMPLE_VOICE = [
  'Open YouTube',
  'Set volume to 30',
  'Search Arijit Singh',
  'Go to Netflix',
  'Switch to HDMI 2',
];

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
    setFeedback,
    upsertDevice,
    disconnectDevice,
  } = useApp();

  const [listening, setListening] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [voiceResult, setVoiceResult] = useState<string | null>(null);

  useEffect(() => {
    if (!lastFeedback) return;
    const t = setTimeout(() => setFeedback(null), 2200);
    return () => clearTimeout(t);
  }, [lastFeedback, setFeedback]);

  if (!activeDevice) {
    return (
      <View style={[styles.container, styles.empty, { paddingTop: insets.top }]}>
        <Text style={styles.emptyTitle}>No device selected</Text>
        <Pressable style={styles.cta} onPress={() => navigation.navigate('DeviceType')}>
          <Text style={styles.ctaText}>Add a device</Text>
        </Pressable>
      </View>
    );
  }

  const fire = (type: RemoteActionType, payload?: Record<string, string | number | boolean>) => {
    void sendAction({ type, payload });
  };

  const handleVoice = async () => {
    setListening(true);
    setVoiceResult('Listening...');
    await new Promise((r) => setTimeout(r, 900));
    const phrase = SAMPLE_VOICE[Math.floor(Math.random() * SAMPLE_VOICE.length)];
    setVoiceResult(phrase);
    const action = deviceService.parseVoiceCommand(phrase);
    await sendAction(action);
    setListening(false);
  };

  const reconnect = async () => {
    const result = await deviceService.connect({
      ...activeDevice,
      status: 'connecting',
    });
    if (result.status === 'connected') {
      await upsertDevice(result.device);
      setFeedback('Reconnected');
      return;
    }
    if (result.status === 'needs_pairing') {
      setFeedback('Pairing required — open Connect and enter the TV code');
      return;
    }
    setFeedback(result.message);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.navigate('MainTabs')} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.deviceName}>{activeDevice.name}</Text>
          <ConnectionBadge status={activeDevice.status} />
        </View>
        <View style={styles.headerActions}>
          <Pressable onPress={() => void toggleFavoriteDevice(activeDevice.id)} hitSlop={8}>
            <Ionicons
              name={activeDevice.favorite ? 'star' : 'star-outline'}
              size={20}
              color={activeDevice.favorite ? colors.warning : colors.textSecondary}
            />
          </Pressable>
          {activeDevice.status === 'connected' ? (
            <Pressable onPress={() => void disconnectDevice(activeDevice.id)} hitSlop={8}>
              <Ionicons name="unlink-outline" size={20} color={colors.danger} />
            </Pressable>
          ) : (
            <Pressable onPress={() => void reconnect()} hitSlop={8}>
              <Ionicons name="refresh-outline" size={20} color={colors.textSecondary} />
            </Pressable>
          )}
          <Pressable onPress={() => navigation.navigate('MainTabs')} hitSlop={8}>
            <Ionicons name="settings-outline" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      {activeDevice.status === 'disconnected' ? (
        <View style={styles.lostBanner}>
          <Text style={styles.lostText}>Disconnected</Text>
          <Pressable onPress={() => void reconnect()}>
            <Text style={styles.reconnect}>Reconnect</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.connectedBar}>
          <Text style={styles.connectedHint}>Session active</Text>
          <Pressable onPress={() => void disconnectDevice(activeDevice.id)}>
            <Text style={styles.disconnectLink}>Disconnect</Text>
          </Pressable>
        </View>
      )}

      {lastFeedback || voiceResult ? (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{lastFeedback ?? voiceResult}</Text>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.rowBetween}>
          <RemoteButton icon="power" variant="danger" size="lg" onPress={() => fire('POWER')} />
          <RemoteButton label="Input" size="md" onPress={() => fire('INPUT', { source: 'HDMI 1' })} />
          <RemoteButton icon="volume-mute" size="lg" onPress={() => fire('MUTE')} />
        </View>

        <View style={styles.section}>
          <TouchPad onAction={(type) => fire(type)} />
        </View>

        <View style={styles.rowBetween}>
          <RemoteButton label="Back" icon="arrow-back" onPress={() => fire('BACK')} />
          <RemoteButton label="Home" icon="home" onPress={() => fire('HOME')} />
          <RemoteButton label="Menu" icon="menu" onPress={() => fire('MENU')} />
          <RemoteButton label="OK" variant="primary" onPress={() => fire('OK')} />
        </View>

        <View style={styles.volumeChannel}>
          <View style={styles.controlCol}>
            <RemoteButton label="VOL +" size="lg" onPress={() => fire('VOLUME_UP')} />
            <RemoteButton label="Mute" size="sm" onPress={() => fire('MUTE')} />
            <RemoteButton label="VOL -" size="lg" onPress={() => fire('VOLUME_DOWN')} />
          </View>
          <View style={styles.controlCol}>
            <RemoteButton label="CH +" size="lg" onPress={() => fire('CHANNEL_UP')} />
            <View style={{ height: 48 }} />
            <RemoteButton label="CH -" size="lg" onPress={() => fire('CHANNEL_DOWN')} />
          </View>
        </View>

        <Text style={styles.sectionTitle}>App shortcuts</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.apps}>
          {DEFAULT_APP_SHORTCUTS.map((app) => (
            <Pressable
              key={app.id}
              style={[styles.appChip, { borderColor: app.color }]}
              onPress={() => fire('OPEN_APP', { app: app.packageHint })}
            >
              <View style={[styles.appDot, { backgroundColor: app.color }]} />
              <Text style={styles.appName}>{app.name}</Text>
            </Pressable>
          ))}
          <Pressable style={styles.addChip}>
            <Ionicons name="add" size={18} color={colors.textSecondary} />
            <Text style={styles.addText}>Add</Text>
          </Pressable>
        </ScrollView>

        <Text style={styles.sectionTitle}>Quick actions</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.apps}>
          {QUICK_ACTIONS.map((item) => (
            <Pressable
              key={item.id}
              style={styles.quickChip}
              onPress={() => fire(item.action)}
            >
              <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={16} color={colors.primary} />
              <Text style={styles.quickText}>{item.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.tools}>
          <Pressable style={styles.toolBtn} onPress={() => navigation.navigate('Keyboard')}>
            <Ionicons name="keypad-outline" size={20} color={colors.text} />
            <Text style={styles.toolText}>Keyboard</Text>
          </Pressable>
          <Pressable style={styles.toolBtn} onPress={() => setAiOpen(true)}>
            <Ionicons name="sparkles-outline" size={20} color={colors.text} />
            <Text style={styles.toolText}>AI Remote</Text>
          </Pressable>
          <Pressable style={styles.toolBtn} onPress={() => navigation.navigate('Macros')}>
            <Ionicons name="flash-outline" size={20} color={colors.text} />
            <Text style={styles.toolText}>Macros</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Scenes</Text>
        <View style={styles.macroRow}>
          {macros.slice(0, 2).map((macro) => (
            <Pressable
              key={macro.id}
              style={styles.macroCard}
              onPress={() => void runMacro(macro)}
            >
              <Ionicons
                name={macro.icon as keyof typeof Ionicons.glyphMap}
                size={20}
                color={colors.secondary}
              />
              <Text style={styles.macroName}>{macro.name}</Text>
              <Text style={styles.macroMeta}>{macro.actions.length} actions</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.fab, { bottom: insets.bottom + 18 }]}>
        <VoiceButton listening={listening} onPress={() => void handleVoice()} />
      </View>

      <BottomSheet visible={aiOpen} title="AI Remote" onClose={() => setAiOpen(false)}>
        <Text style={styles.aiHint}>
          Natural language commands will route through an LLM later. Try a sample:
        </Text>
        {['Open Netflix', 'Set volume to 25', 'Turn off the TV in 30 minutes', 'Go to HDMI 2'].map(
          (cmd) => (
            <Pressable
              key={cmd}
              style={styles.aiCmd}
              onPress={async () => {
                setAiOpen(false);
                const action = deviceService.parseVoiceCommand(cmd);
                await sendAction(action);
              }}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.primary} />
              <Text style={styles.aiCmdText}>{cmd}</Text>
            </Pressable>
          ),
        )}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  empty: { alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  emptyTitle: { ...typography.title, color: colors.text },
  cta: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 14,
  },
  ctaText: { color: '#fff', fontWeight: '700' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  headerCenter: { flex: 1, alignItems: 'center', gap: 4 },
  deviceName: { ...typography.body, color: colors.text, fontWeight: '700' },
  headerActions: { flexDirection: 'row', gap: spacing.md, minWidth: 96, justifyContent: 'flex-end' },
  lostBanner: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.danger,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  connectedBar: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  connectedHint: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  disconnectLink: { color: colors.danger, fontWeight: '700', fontSize: 13 },
  lostText: { color: colors.danger, fontWeight: '600' },
  reconnect: { color: colors.primary, fontWeight: '700' },
  toast: {
    alignSelf: 'center',
    backgroundColor: colors.card,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  toastText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  content: { paddingHorizontal: spacing.lg, gap: spacing.lg },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  section: { marginTop: spacing.xs },
  volumeChannel: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.sm,
  },
  controlCol: { alignItems: 'center', gap: spacing.md },
  sectionTitle: {
    ...typography.label,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  apps: { gap: spacing.sm, paddingVertical: spacing.xs },
  appChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  appDot: { width: 10, height: 10, borderRadius: 5 },
  appName: { color: colors.text, fontWeight: '600', fontSize: 13 },
  addChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  addText: { color: colors.textSecondary, fontWeight: '600', fontSize: 13 },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.secondaryBackground,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  quickText: { color: colors.text, fontSize: 12, fontWeight: '600' },
  tools: { flexDirection: 'row', gap: spacing.sm },
  toolBtn: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    alignItems: 'center',
    gap: 6,
  },
  toolText: { color: colors.text, fontSize: 12, fontWeight: '600' },
  macroRow: { flexDirection: 'row', gap: spacing.md },
  macroCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: 6,
  },
  macroName: { color: colors.text, fontWeight: '700' },
  macroMeta: { color: colors.textSecondary, fontSize: 12 },
  fab: {
    position: 'absolute',
    right: spacing.xl,
  },
  aiHint: {
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  aiCmd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  aiCmdText: { color: colors.text, fontWeight: '500' },
});
