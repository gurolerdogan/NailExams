import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../context/ThemeContext';
import PrimaryButton from '../components/PrimaryButton';
import { clearLogs, getLogs } from '../services/logging/logEvent';
import type { LogEvent } from '../types/logging';
import type { Theme } from '../themes';

function formatTs(ts: number) {
  const d = new Date(ts);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: theme.colors.screenBg },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { fontSize: 24, fontWeight: '700', color: theme.colors.textPrimary },
    meta: { fontSize: 13, marginTop: 6, marginBottom: 10, color: theme.colors.textSecondary },
    smallBtn: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10 },

    empty: { marginTop: 20, textAlign: 'center', color: theme.colors.textMuted },

    item: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 10,
      marginBottom: 10,
      borderColor: theme.colors.cardBorder,
      backgroundColor: theme.colors.cardBg,
    },
    itemTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary },
    itemTs: { marginTop: 4, fontSize: 12, opacity: 0.8, color: theme.colors.textSecondary },
    payload: { marginTop: 6, fontSize: 12, color: theme.colors.textSecondary },
  });
}

export default function LogsScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const data = await getLogs();
    setLogs(data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onClear = async () => {
    if (busy) return;

    Alert.alert('Clear logs?', 'This will delete locally stored logs.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          try {
            setBusy(true);
            await clearLogs();
            await load();
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Logs</Text>
        <PrimaryButton title="Refresh" onPress={() => void load()} disabled={busy} style={styles.smallBtn} />
      </View>

      <Text style={styles.meta}>Stored: {logs.length}</Text>

      <PrimaryButton title="Clear logs" onPress={onClear} disabled={busy || logs.length === 0} />

      <FlatList
        data={logs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingVertical: 12 }}
        ListEmptyComponent={<Text style={styles.empty}>No logs yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.itemTitle}>{item.name}</Text>
            <Text style={styles.itemTs}>{formatTs(item.ts)}</Text>
            {item.payload ? (
              <Text style={styles.payload}>{JSON.stringify(item.payload)}</Text>
            ) : null}
          </View>
        )}
      />
    </View>
  );
}
