import React, { useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';

import PrimaryButton from '../components/PrimaryButton';
import { useAuth } from '../context/AuthContext';
import type { ExamLevel, Subject } from '../types/models';
import { saveSubjects } from '../services/storage/nailexamsStorage';
import { uuid } from '../utils/id';
import { now } from '../utils/time';
import { logEvent } from '../services/logging/logEvent';
import { preloadGcseTopicsForSubjects } from '../services/seed/preloadGcseTopics';

import { GCSE_SUBJECT_PRESETS } from '../data/gcseTopicCatalog';

const ALEVEL_PRESETS = [
  'Math',
  'Further Math',
  'Physics',
  'Chemistry',
  'Biology',
  'Computer Science',
  'Economics',
];

function presetsFor(level: ExamLevel) {
  return level === 'GCSE' ? GCSE_SUBJECT_PRESETS : ALEVEL_PRESETS;
}

export default function EditSubjectsScreen() {
  const { profile, subjects, refreshUserData } = useAuth();

  const level = profile?.examLevel;
  const presets = useMemo(() => (level ? presetsFor(level) : []), [level]);

  // Start from currently saved subjects
  const [selected, setSelected] = useState<string[]>(subjects.map((s) => s.name));
  const [custom, setCustom] = useState('');
  const [busy, setBusy] = useState(false);

  const allOptions = useMemo(() => {
    const set = new Set<string>([...presets, ...selected]);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [presets, selected]);

  if (!level) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Edit subjects</Text>
        <Text style={styles.body}>Profile not loaded yet.</Text>
      </View>
    );
  }

  const toggle = (name: string) => {
    setSelected((prev) => (prev.includes(name) ? prev.filter((x) => x !== name) : [name, ...prev]));
  };

  const addCustom = () => {
    const name = custom.trim();
    if (!name) return;
    if (selected.includes(name)) {
      setCustom('');
      return;
    }
    setSelected((prev) => [name, ...prev]);
    setCustom('');
  };

  const onSave = async () => {
    if (busy) return;
    if (selected.length === 0) {
      Alert.alert('Select at least 1 subject', 'You cannot save an empty subject list.');
      return;
    }

    try {
      setBusy(true);

      const ts = now();
      const nextSubjects: Subject[] = selected.map((name) => ({
        id: uuid(),
        name,
        examLevel: level,
        createdAt: ts,
        updatedAt: ts,
      }));

      await saveSubjects(nextSubjects);
      await preloadGcseTopicsForSubjects({ examLevel: level, subjects: nextSubjects });

      await refreshUserData();
      await logEvent('subjects_updated', { count: nextSubjects.length });

      Alert.alert('Saved', 'Subjects updated.');
    } catch (e: any) {
      Alert.alert('Save failed', String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Edit subjects</Text>
      <Text style={styles.meta}>Level: {level}</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Add custom</Text>
        <TextInput
          value={custom}
          onChangeText={setCustom}
          placeholder="e.g., French"
          style={styles.input}
          autoCapitalize="words"
        />
        <PrimaryButton title="Add" onPress={addCustom} disabled={busy || custom.trim().length === 0} />
      </View>

      <Text style={styles.sectionTitle}>Select subjects</Text>

      <FlatList
        data={allOptions}
        keyExtractor={(item) => item}
        contentContainerStyle={{ paddingBottom: 16 }}
        renderItem={({ item }) => {
          const isSelected = selected.includes(item);
          return (
            <View style={styles.row}>
              <Text style={styles.rowText}>{item}</Text>
              <PrimaryButton
                title={isSelected ? 'Selected' : 'Select'}
                onPress={() => toggle(item)}
                disabled={busy}
                style={styles.smallButton}
              />
            </View>
          );
        }}
      />

      <PrimaryButton title={busy ? 'Saving…' : `Save (${selected.length})`} onPress={onSave} disabled={busy} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 6 },
  meta: { fontSize: 14, marginBottom: 12 },
  body: { fontSize: 14 },

  card: { padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 10, fontSize: 16 },

  row: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowText: { fontSize: 15 },
  smallButton: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10 },
});