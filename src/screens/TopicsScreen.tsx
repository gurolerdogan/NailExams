import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';

import PrimaryButton from '../components/PrimaryButton';
import type { Topic } from '../types/models';
import { loadTopics, saveTopics } from '../services/storage/nailexamsStorage';
import { uuid } from '../utils/id';
import { now } from '../utils/time';
import { logEvent } from '../services/logging/logEvent';
import type { HomeStackParamList } from '../navigation/HomeNavigator';

type TopicsRoute = RouteProp<HomeStackParamList, 'Topics'>;

export default function TopicsScreen() {
  const route = useRoute<TopicsRoute>();
  const { subjectId, subjectName } = route.params;

  const [allTopics, setAllTopics] = useState<Topic[]>([]);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const topics = useMemo(
    () => allTopics.filter((t) => t.subjectId === subjectId).sort((a, b) => a.name.localeCompare(b.name)),
    [allTopics, subjectId],
  );

  const canAdd = useMemo(() => name.trim().length >= 2 && !busy, [name, busy]);

  const refresh = useCallback(async () => {
    const data = await loadTopics();
    setAllTopics(data);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const persistAll = useCallback(
    async (nextAll: Topic[]) => {
      setAllTopics(nextAll);
      await saveTopics(nextAll);
    },
    [],
  );

  const onAdd = async () => {
    if (busy) return;
    const trimmed = name.trim();
    if (trimmed.length < 2) return;

    const exists = topics.some((t) => t.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      Alert.alert('Already exists', 'That topic is already in this subject.');
      return;
    }

    try {
      setBusy(true);
      const ts = now();

      const created: Topic = {
        id: uuid(),
        subjectId,
        name: trimmed,
        confidence: 3,
        createdAt: ts,
        updatedAt: ts,
      };

      await persistAll([...allTopics, created]);
      await logEvent('topic_added', { subjectId, name: trimmed });
      setName('');
    } catch (e: any) {
      Alert.alert('Add failed', String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (topicId: string) => {
    if (busy) return;
    const current = allTopics.find((t) => t.id === topicId);
    if (!current) return;

    Alert.alert('Delete topic?', `This will remove "${current.name}".`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setBusy(true);
            const nextAll = allTopics.filter((t) => t.id !== topicId);
            await persistAll(nextAll);
            await logEvent('topic_deleted', { subjectId, name: current.name });
          } catch (e: any) {
            Alert.alert('Delete failed', String(e?.message ?? e));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const onCycleConfidence = async (topicId: string) => {
    if (busy) return;
    const idx = allTopics.findIndex((t) => t.id === topicId);
    if (idx < 0) return;

    try {
      setBusy(true);
      const current = allTopics[idx];
      const cur = current.confidence ?? 3;
      const nextConfidence = (cur % 5) + 1 as 1 | 2 | 3 | 4 | 5;

      const updated: Topic = {
        ...current,
        confidence: nextConfidence,
        updatedAt: now(),
      };

      const nextAll = [...allTopics];
      nextAll[idx] = updated;

      await persistAll(nextAll);
      await logEvent('topic_confidence_changed', {
        subjectId,
        topicId,
        from: cur,
        to: nextConfidence,
      });
    } catch (e: any) {
      Alert.alert('Update failed', String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{subjectName}</Text>
      <Text style={styles.meta}>Topics: {topics.length}</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Add topic</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g., Kinematics"
          style={styles.input}
          autoCapitalize="words"
          editable={!busy}
        />
        <PrimaryButton title={busy ? 'Adding…' : 'Add'} onPress={onAdd} disabled={!canAdd} />
      </View>

      <FlatList
        data={topics}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 16 }}
        ListEmptyComponent={<Text style={styles.empty}>No topics yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{item.name}</Text>
              <Text style={styles.rowSub}>Confidence: {item.confidence ?? '—'}</Text>
            </View>

            <View style={styles.actions}>
              <PrimaryButton
                title="Confidence"
                onPress={() => void onCycleConfidence(item.id)}
                disabled={busy}
                style={styles.smallBtn}
              />
              <PrimaryButton
                title="Delete"
                onPress={() => void onDelete(item.id)}
                disabled={busy}
                style={styles.smallBtn}
              />
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 24, fontWeight: '700' },
  meta: { fontSize: 13, marginTop: 6, marginBottom: 12 },

  card: { padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 10, fontSize: 16 },

  empty: { marginTop: 20, textAlign: 'center' },

  row: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  rowTitle: { fontSize: 16, fontWeight: '700' },
  rowSub: { marginTop: 2, fontSize: 12, opacity: 0.8 },

  actions: { flexDirection: 'row', gap: 8 },
  smallBtn: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10 },
});