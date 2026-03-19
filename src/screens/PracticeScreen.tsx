import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';

import PrimaryButton from '../components/PrimaryButton';
import { useAuth } from '../context/AuthContext';
import type { Subject, Topic } from '../types/models';
import { loadTopics, saveTopics } from '../services/storage/nailexamsStorage';
import { appendAttempt } from '../services/storage/practiceStorage';
import type { PracticeAttempt } from '../types/practice';
import { uuid } from '../utils/id';
import { now } from '../utils/time';
import { logEvent } from '../services/logging/logEvent';

export default function PracticeScreen() {
  const { subjects, refreshUserData } = useAuth();

  const [allTopics, setAllTopics] = useState<Topic[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);

  const [confidence, setConfidence] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const refreshTopics = useCallback(async () => {
    const data = await loadTopics();
    setAllTopics(data);
  }, []);

  useEffect(() => {
    void refreshTopics();
  }, [refreshTopics]);

  const subjectTopics = useMemo(() => {
    if (!selectedSubject) return [];
    return allTopics
      .filter((t) => t.subjectId === selectedSubject.id)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allTopics, selectedSubject]);

  const pickSubject = (s: Subject) => {
    setSelectedSubject(s);
    setSelectedTopic(null);
    setNote('');
    setConfidence(3);
  };

  const pickTopic = (t: Topic) => {
    setSelectedTopic(t);
    setNote('');
    setConfidence(t.confidence ?? 3);
  };

  const cycleConfidence = () => {
    setConfidence((c) => ((c % 5) + 1) as 1 | 2 | 3 | 4 | 5);
  };

  const submit = async () => {
    if (busy) return;
    if (!selectedSubject || !selectedTopic) return;

    try {
      setBusy(true);
      const ts = now();

      const attempt: PracticeAttempt = {
        id: uuid(),
        subjectId: selectedSubject.id,
        topicId: selectedTopic.id,
        ts,
        confidence,
        note: note.trim() ? note.trim() : undefined,
      };

      await appendAttempt(attempt);

      // Update topic confidence + lastPracticedAt
      const idx = allTopics.findIndex((t) => t.id === selectedTopic.id);
      if (idx >= 0) {
        const updated: Topic = {
          ...allTopics[idx],
          confidence,
          lastPracticedAt: ts,
          updatedAt: ts,
        };

        const nextAll = [...allTopics];
        nextAll[idx] = updated;
        setAllTopics(nextAll);
        await saveTopics(nextAll);
      }

      await logEvent('practice_checkin_saved', {
        subjectId: selectedSubject.id,
        topicId: selectedTopic.id,
        confidence,
        noteLen: note.trim().length,
      });

      Alert.alert('Saved', 'Practice check-in recorded.');
      setNote('');
      await refreshUserData();
    } catch (e: any) {
      Alert.alert('Save failed', String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Practice</Text>

      {!selectedSubject ? (
        <>
          <Text style={styles.sectionTitle}>Choose a subject</Text>
          <FlatList
            data={[...subjects].sort((a, b) => a.name.localeCompare(b.name))}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={<Text style={styles.empty}>No subjects found.</Text>}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <Text style={styles.rowTitle}>{item.name}</Text>
                <PrimaryButton title="Select" onPress={() => pickSubject(item)} style={styles.smallBtn} />
              </View>
            )}
          />
        </>
      ) : !selectedTopic ? (
        <>
          <View style={styles.headerRow}>
            <Text style={styles.sectionTitle}>Topics — {selectedSubject.name}</Text>
            <PrimaryButton title="Back" onPress={() => setSelectedSubject(null)} style={styles.smallBtn} />
          </View>

          <FlatList
            data={subjectTopics}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={<Text style={styles.empty}>No topics for this subject yet.</Text>}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{item.name}</Text>
                  <Text style={styles.rowSub}>
                    Confidence: {item.confidence ?? '—'} • Last: {item.lastPracticedAt ? new Date(item.lastPracticedAt).toLocaleDateString() : '—'}
                  </Text>
                </View>
                <PrimaryButton title="Start" onPress={() => pickTopic(item)} style={styles.smallBtn} />
              </View>
            )}
          />
        </>
      ) : (
        <>
          <View style={styles.headerRow}>
            <Text style={styles.sectionTitle}>{selectedTopic.name}</Text>
            <PrimaryButton title="Back" onPress={() => setSelectedTopic(null)} style={styles.smallBtn} />
          </View>

          <View style={styles.card}>
            <Text style={styles.meta}>Subject: {selectedSubject.name}</Text>
            <Text style={styles.meta}>Confidence: {confidence}</Text>

            <PrimaryButton title="Cycle confidence (1–5)" onPress={cycleConfidence} disabled={busy} />

            <Text style={[styles.meta, { marginTop: 12 }]}>Note (optional)</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="What did you struggle with?"
              style={styles.input}
              editable={!busy}
              multiline
            />

            <PrimaryButton title={busy ? 'Saving…' : 'Save check-in'} onPress={submit} disabled={busy} />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  empty: { marginTop: 20, textAlign: 'center' },

  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },

  row: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowTitle: { fontSize: 16, fontWeight: '700' },
  rowSub: { marginTop: 4, fontSize: 12, opacity: 0.8 },

  smallBtn: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10 },

  card: { borderWidth: 1, borderRadius: 12, padding: 12 },
  meta: { fontSize: 14, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, padding: 10, fontSize: 14, minHeight: 80, textAlignVertical: 'top', marginBottom: 10 },
});