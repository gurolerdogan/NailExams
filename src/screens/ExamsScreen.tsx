import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';

import PrimaryButton from '../components/PrimaryButton';
import { Exam, ExamBoard, ExamLevel, Subject } from '../types/domain';
import { listExams, saveExams } from '../services/repo/examsRepo';
import { now } from '../utils/time';
import { uuid } from '../utils/id';

const SUBJECTS: Subject[] = ['Math', 'Physics', 'ComputerScience', 'Chemistry', 'Biology', 'English'];
const LEVELS: ExamLevel[] = ['GCSE', 'A-Level', 'AP', 'IB', 'Other'];
const BOARDS: ExamBoard[] = ['AQA', 'Edexcel', 'OCR', 'Cambridge', 'IB', 'Other'];

export default function ExamsScreen() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  // Phase 0 simple "create exam" form fields
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState<Subject>('Math');
  const [level, setLevel] = useState<ExamLevel>('GCSE');
  const [board, setBoard] = useState<ExamBoard>('AQA');

  const canCreate = useMemo(() => title.trim().length >= 3, [title]);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await listExams();
    setExams(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const persist = useCallback(
    async (next: Exam[]) => {
      setExams(next);
      await saveExams(next);
    },
    [setExams],
  );

  const onCreate = useCallback(async () => {
    if (!canCreate) return;

    const t = title.trim();
    const ts = now();

    const newExam: Exam = {
      id: uuid(),
      subject,
      level,
      board,
      title: t,
      createdAt: ts,
      updatedAt: ts,
    };

    await persist([newExam, ...exams]);
    setTitle('');
  }, [board, canCreate, exams, level, persist, subject, title]);

  const onDelete = useCallback(
    async (id: string) => {
      Alert.alert('Delete exam?', 'This will remove the exam from local storage.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const next = exams.filter((e) => e.id !== id);
            await persist(next);
          },
        },
      ]);
    },
    [exams, persist],
  );

  const onCycle = useCallback(
    async (id: string) => {
      // Phase 0: quick way to change Subject/Level/Board without building pickers yet
      const idx = exams.findIndex((e) => e.id === id);
      if (idx < 0) return;

      const current = exams[idx];

      const nextSubject = SUBJECTS[(SUBJECTS.indexOf(current.subject) + 1) % SUBJECTS.length];
      const nextLevel = LEVELS[(LEVELS.indexOf(current.level) + 1) % LEVELS.length];
      const nextBoard = BOARDS[(BOARDS.indexOf(current.board) + 1) % BOARDS.length];

      const updated: Exam = {
        ...current,
        subject: nextSubject,
        level: nextLevel,
        board: nextBoard,
        updatedAt: now(),
      };

      const next = [...exams];
      next[idx] = updated;

      await persist(next);
    },
    [exams, persist],
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Exams</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Create exam</Text>

        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="e.g., GCSE Physics Paper 1"
          style={styles.input}
          autoCapitalize="sentences"
        />

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>Subject: {subject}</Text>
          <PrimaryButton
            title="Change"
            onPress={() => setSubject(SUBJECTS[(SUBJECTS.indexOf(subject) + 1) % SUBJECTS.length])}
            style={styles.smallButton}
          />
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>Level: {level}</Text>
          <PrimaryButton
            title="Change"
            onPress={() => setLevel(LEVELS[(LEVELS.indexOf(level) + 1) % LEVELS.length])}
            style={styles.smallButton}
          />
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>Board: {board}</Text>
          <PrimaryButton
            title="Change"
            onPress={() => setBoard(BOARDS[(BOARDS.indexOf(board) + 1) % BOARDS.length])}
            style={styles.smallButton}
          />
        </View>

        <PrimaryButton title="Add Exam" onPress={onCreate} disabled={!canCreate} />
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.sectionTitle}>{loading ? 'Loading…' : `Saved (${exams.length})`}</Text>
        <PrimaryButton title="Refresh" onPress={() => void load()} style={styles.smallButton} />
      </View>

      <FlatList
        data={exams}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>No exams yet. Create one above.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={styles.itemMeta}>
              {item.subject} • {item.level} • {item.board}
            </Text>

            <View style={styles.itemActions}>
              <PrimaryButton title="Cycle Meta" onPress={() => void onCycle(item.id)} style={styles.smallButton} />
              <PrimaryButton title="Delete" onPress={() => void onDelete(item.id)} style={styles.smallButton} />
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { fontSize: 28, fontWeight: '700', marginBottom: 12 },

  card: { padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 10 },

  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  metaText: { fontSize: 14 },

  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  sectionTitle: { fontSize: 16, fontWeight: '600' },

  list: { paddingVertical: 12 },
  empty: { marginTop: 20, textAlign: 'center' },

  item: { padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
  itemTitle: { fontSize: 16, fontWeight: '700' },
  itemMeta: { marginTop: 4, fontSize: 13 },

  itemActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  smallButton: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10 },
});
