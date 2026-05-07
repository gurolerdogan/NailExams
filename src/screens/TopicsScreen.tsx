import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';

import PrimaryButton from '../components/PrimaryButton';
import type { Topic } from '../types/models';
import { loadTopics, saveTopics } from '../services/storage/nailexamsStorage';
import { now } from '../utils/time';
import { logEvent } from '../services/logging/logEvent';
import type { HomeStackParamList } from '../navigation/HomeNavigator';
import { GCSE_TOPIC_CATALOG } from '../data/gcseTopicCatalog';

type TopicsRoute = RouteProp<HomeStackParamList, 'Topics'>;

function normalize(s: string) {
  return s.trim().toLowerCase();
}

export default function TopicsScreen() {
  const route = useRoute<TopicsRoute>();
  const { subjectId, subjectName } = route.params;

  const [allTopics, setAllTopics] = useState<Topic[]>([]);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const data = await loadTopics();
    setAllTopics(data);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const catalogOrder = useMemo(() => {
    // For GCSE MVP: use catalog order if subject exists in catalog; otherwise fallback to alpha
    const list = GCSE_TOPIC_CATALOG[subjectName] ?? [];
    const idx = new Map<string, number>();
    list.forEach((name, i) => idx.set(normalize(name), i));
    return idx;
  }, [subjectName]);

  const topics = useMemo(() => {
    const scoped = allTopics.filter((t) => t.subjectId === subjectId);

    // If this subject is in catalog: sort by catalog index; unknowns go to bottom alphabetically
    if ((GCSE_TOPIC_CATALOG[subjectName] ?? []).length > 0) {
      return scoped.sort((a, b) => {
        const ai = catalogOrder.get(normalize(a.name));
        const bi = catalogOrder.get(normalize(b.name));
        const aHas = ai !== undefined;
        const bHas = bi !== undefined;

        if (aHas && bHas) return (ai as number) - (bi as number);
        if (aHas && !bHas) return -1;
        if (!aHas && bHas) return 1;
        return a.name.localeCompare(b.name);
      });
    }

    // Fallback: alphabetical
    return scoped.sort((a, b) => a.name.localeCompare(b.name));
  }, [allTopics, subjectId, subjectName, catalogOrder]);

  const persistAll = useCallback(async (nextAll: Topic[]) => {
    setAllTopics(nextAll);
    await saveTopics(nextAll);
  }, []);

  const onCycleConfidence = async (topicId: string) => {
    if (busy) return;

    const idx = allTopics.findIndex((t) => t.id === topicId);
    if (idx < 0) return;

    try {
      setBusy(true);
      const current = allTopics[idx];
      const cur = current.confidence ?? 3;
      const nextConfidence = (((cur as number) % 5) + 1) as 1 | 2 | 3 | 4 | 5;

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

      <FlatList
        data={topics}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 16 }}
        ListEmptyComponent={
          <Text style={styles.empty}>
            No topics found for this subject. (If this is a GCSE catalog subject, reset onboarding
            to preload topics.)
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{item.name}</Text>
              <Text style={styles.rowSub}>
                Confidence: {item.confidence ?? '—'} • Last:{' '}
                {item.lastPracticedAt ? new Date(item.lastPracticedAt).toLocaleDateString() : 'Never'}
              </Text>
            </View>

            <PrimaryButton
              title="Confidence"
              onPress={() => void onCycleConfidence(item.id)}
              disabled={busy}
              style={styles.smallBtn}
            />
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
  rowTitle: { fontSize: 15, fontWeight: '800' },
  rowSub: { marginTop: 4, fontSize: 12, opacity: 0.85 },
  smallBtn: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10 },
});