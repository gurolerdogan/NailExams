import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';

import PrimaryButton from '../components/PrimaryButton';
import { useAuth } from '../context/AuthContext';
import type { Subject } from '../types/models';
import { loadSubjects, saveSubjects } from '../services/storage/nailexamsStorage';
import { uuid } from '../utils/id';
import { now } from '../utils/time';
import { logEvent } from '../services/logging/logEvent';
import { GCSE_SUBJECT_PRESETS } from '../data/gcseTopicCatalog';
import { preloadGcseTopicsForSubjects } from '../services/seed/preloadGcseTopics';

export default function SubjectsScreen() {
  const { profile, refreshUserData } = useAuth();

  const [items, setItems] = useState<Subject[]>([]);
  const [busy, setBusy] = useState(false);

  // Dropdown state
  const [selectedPreset, setSelectedPreset] = useState<string>('');

  const level = profile?.examLevel;

  const refresh = useCallback(async () => {
    const data = await loadSubjects();
    data.sort((a, b) => a.name.localeCompare(b.name));
    setItems(data);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const existingNames = useMemo(() => {
    return new Set(items.map((s) => s.name.toLowerCase()));
  }, [items]);

  const availablePresets = useMemo(() => {
    // MVP: only GCSE fixed list. For A_LEVEL later.
    if (level !== 'GCSE') return [];
    return GCSE_SUBJECT_PRESETS.filter((name) => !existingNames.has(name.toLowerCase()));
  }, [level, existingNames]);

  // Ensure dropdown always points to a valid remaining option
  useEffect(() => {
    if (!selectedPreset) {
      setSelectedPreset(availablePresets[0] ?? '');
      return;
    }
    if (selectedPreset && !availablePresets.includes(selectedPreset)) {
      setSelectedPreset(availablePresets[0] ?? '');
    }
  }, [availablePresets, selectedPreset]);

  const persist = useCallback(
    async (next: Subject[]) => {
      setItems(next);
      await saveSubjects(next);
      await refreshUserData();
    },
    [refreshUserData],
  );

  const onAddFromPreset = async () => {
    if (busy) return;

    if (level !== 'GCSE') {
      Alert.alert('Not supported yet', 'Preset add is currently available for GCSE only.');
      return;
    }

    if (!selectedPreset) {
      Alert.alert('No subjects available', 'All preset subjects are already added.');
      return;
    }

    try {
      setBusy(true);
      const ts = now();

      const created: Subject = {
        id: uuid(),
        name: selectedPreset,
        examLevel: level,
        createdAt: ts,
        updatedAt: ts,
      };

      const next = [...items, created].sort((a, b) => a.name.localeCompare(b.name));

      await persist(next);

      // Preload topics for newly added subject (idempotent)
      await preloadGcseTopicsForSubjects({ examLevel: level, subjects: [created] });

      await logEvent('subject_added', { name: created.name, level });
    } catch (e: any) {
      Alert.alert('Add failed', String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (id: string) => {
    if (busy) return;

    const current = items.find((s) => s.id === id);
    if (!current) return;

    Alert.alert('Delete subject?', `This will remove "${current.name}".`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setBusy(true);
            const next = items.filter((s) => s.id !== id);
            await persist(next);
            await logEvent('subject_deleted', { name: current.name });
          } catch (e: any) {
            Alert.alert('Delete failed', String(e?.message ?? e));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Subjects</Text>
      <Text style={styles.meta}>
        Level: {level ?? '—'} • Total: {items.length}
      </Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Add subject</Text>

        {level !== 'GCSE' ? (
          <Text style={styles.help}>
            Preset subject add is currently available for GCSE only (A-Levels coming next).
          </Text>
        ) : availablePresets.length === 0 ? (
          <Text style={styles.help}>All preset subjects are already added.</Text>
        ) : (
          <>
            <View style={styles.pickerWrap}>
              <Picker
                selectedValue={selectedPreset}
                onValueChange={(v) => setSelectedPreset(String(v))}
                enabled={!busy}
              >
                {availablePresets.map((name) => (
                  <Picker.Item key={name} label={name} value={name} />
                ))}
              </Picker>
            </View>

            <PrimaryButton
              title={busy ? 'Adding…' : 'Add'}
              onPress={onAddFromPreset}
              disabled={busy || !selectedPreset}
            />
          </>
        )}
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 16 }}
        ListEmptyComponent={<Text style={styles.empty}>No subjects yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{item.name}</Text>
              <Text style={styles.rowSub}>{item.examLevel}</Text>
            </View>

            <PrimaryButton
              title="Delete"
              onPress={() => void onDelete(item.id)}
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

  card: { padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  help: { fontSize: 13, opacity: 0.85, marginBottom: 10 },

  pickerWrap: { borderWidth: 1, borderRadius: 10, marginBottom: 10, overflow: 'hidden' },

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
  smallBtn: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10 },
});