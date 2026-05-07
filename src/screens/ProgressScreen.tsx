import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../context/AuthContext';
import type { Topic } from '../types/models';
import type { PracticeAttempt } from '../types/practice';
import { loadTopics } from '../services/storage/nailexamsStorage';
import { loadAttempts } from '../services/storage/practiceStorage';
import PrimaryButton from '../components/PrimaryButton';

type RecentItem = {
  id: string;
  ts: number;
  subjectName: string;
  topicName: string;
  confidence: number;
  note?: string;
};

export default function ProgressScreen() {
  const { subjects } = useAuth();

  const [topics, setTopics] = useState<Topic[]>([]);
  const [attempts, setAttempts] = useState<PracticeAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [t, a] = await Promise.all([loadTopics(), loadAttempts()]);
    setTopics(t);
    setAttempts(a);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const subjectById = useMemo(() => {
    const map = new Map(subjects.map((s) => [s.id, s]));
    return map;
  }, [subjects]);

  const topicById = useMemo(() => {
    const map = new Map(topics.map((t) => [t.id, t]));
    return map;
  }, [topics]);

  const confidenceBuckets = useMemo(() => {
    const buckets = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<1 | 2 | 3 | 4 | 5, number>;
    for (const t of topics) {
      const c = (t.confidence ?? 0) as number;
      if (c >= 1 && c <= 5) buckets[c as 1 | 2 | 3 | 4 | 5] += 1;
    }
    return buckets;
  }, [topics]);

  const needsAttention = useMemo(() => {
    // prioritize lowest confidence, then never practiced, then oldest lastPracticedAt
    return [...topics]
      .sort((a, b) => {
        const ac = a.confidence ?? 0;
        const bc = b.confidence ?? 0;
        if (ac !== bc) return ac - bc;

        const al = a.lastPracticedAt ?? 0;
        const bl = b.lastPracticedAt ?? 0;

        // Never practiced first
        if (al === 0 && bl !== 0) return -1;
        if (al !== 0 && bl === 0) return 1;

        // Older first
        return al - bl;
      })
      .slice(0, 10);
  }, [topics]);

  const recent = useMemo<RecentItem[]>(() => {
    const out: RecentItem[] = [];

    for (const a of attempts.slice(0, 30)) {
      const subj = subjectById.get(a.subjectId);
      const topic = topicById.get(a.topicId);

      out.push({
        id: a.id,
        ts: a.ts,
        subjectName: subj?.name ?? 'Unknown subject',
        topicName: topic?.name ?? 'Unknown topic',
        confidence: a.confidence,
        note: a.note,
      });
    }

    return out.sort((x, y) => y.ts - x.ts).slice(0, 15);
  }, [attempts, subjectById, topicById]);

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Progress</Text>
        <PrimaryButton title="Refresh" onPress={() => void refresh()} style={styles.smallBtn} />
      </View>

      {loading ? <Text style={styles.meta}>Loading…</Text> : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Confidence distribution</Text>
        <Text style={styles.meta}>Topics counted: {topics.length}</Text>

        <View style={styles.buckets}>
          
         {([1, 2, 3, 4, 5] as const).map((k) => (
  <View key={k} style={styles.bucketRow}>
    <Text style={styles.bucketLabel}>Level {k}</Text>
    <Text style={styles.bucketValue}>{confidenceBuckets[k]}</Text>
  </View>
))}

        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Needs attention</Text>
        <Text style={styles.meta}>Lowest confidence / least recently practiced</Text>

        {needsAttention.length === 0 ? (
          <Text style={styles.empty}>No topics yet.</Text>
        ) : (
          needsAttention.map((t) => {
            const subj = subjectById.get(t.subjectId);
            return (
              <View key={t.id} style={styles.attentionRow}>
                <Text style={styles.rowTitle}>
                  {t.name} <Text style={styles.rowSub}>({subj?.name ?? '—'})</Text>
                </Text>
                <Text style={styles.rowMeta}>
                  Confidence: {t.confidence ?? '—'} • Last: {t.lastPracticedAt ? new Date(t.lastPracticedAt).toLocaleDateString() : 'Never'}
                </Text>
              </View>
            );
          })
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Recent practice</Text>

        <FlatList
          data={recent}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text style={styles.empty}>No practice attempts yet.</Text>}
          renderItem={({ item }) => (
            <View style={styles.recentRow}>
              <Text style={styles.rowTitle}>
                {item.subjectName} • {item.topicName}
              </Text>
              <Text style={styles.rowMeta}>
                {formatDate(item.ts)} • Confidence: {item.confidence}
              </Text>
              {item.note ? <Text style={styles.note}>“{item.note}”</Text> : null}
            </View>
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 24, fontWeight: '700' },
  smallBtn: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10 },

  card: { padding: 12, borderRadius: 12, borderWidth: 1, marginTop: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  meta: { fontSize: 13, opacity: 0.85 },
  empty: { marginTop: 8, textAlign: 'center' },

  buckets: { marginTop: 10, gap: 6 },
  bucketRow: { flexDirection: 'row', justifyContent: 'space-between' },
  bucketLabel: { fontSize: 14 },
  bucketValue: { fontSize: 14, fontWeight: '700' },

  attentionRow: { marginTop: 10, paddingTop: 10, borderTopWidth: 1 },
  recentRow: { marginTop: 10, paddingTop: 10, borderTopWidth: 1 },

  rowTitle: { fontSize: 14, fontWeight: '700' },
  rowSub: { fontSize: 13, fontWeight: '600', opacity: 0.8 },
  rowMeta: { marginTop: 4, fontSize: 12, opacity: 0.85 },
  note: { marginTop: 6, fontSize: 12 },
});