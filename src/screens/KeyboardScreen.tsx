import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { deviceService } from '../services/deviceService';
import { colors, spacing, typography } from '../theme';

export function KeyboardScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const { activeDevice, setFeedback } = useApp();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    const result = await deviceService.sendText(activeDevice, text.trim());
    setFeedback(result.message);
    setSending(false);
    if (result.ok) {
      setText('');
      navigation.goBack();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>Search / Type on TV</Text>
      <Text style={styles.subtitle}>
        Text is sent to {activeDevice?.name ?? 'your device'} when supported.
      </Text>

      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="e.g. Avengers"
        placeholderTextColor={colors.textSecondary}
        style={styles.input}
        autoFocus
        returnKeyType="send"
        onSubmitEditing={() => void send()}
      />

      <Pressable
        style={[styles.sendBtn, (!text.trim() || sending) && { opacity: 0.5 }]}
        disabled={!text.trim() || sending}
        onPress={() => void send()}
      >
        <Text style={styles.sendText}>{sending ? 'Sending...' : 'Send'}</Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  title: { ...typography.title, color: colors.text },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  input: {
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    color: colors.text,
    paddingHorizontal: spacing.lg,
    fontSize: 18,
  },
  sendBtn: {
    marginTop: spacing.lg,
    height: 54,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
