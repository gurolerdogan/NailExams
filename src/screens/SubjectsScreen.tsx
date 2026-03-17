import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';

import PrimaryButton from '../components/PrimaryButton';
import { useAuth } from '../context/AuthContext';
import type { Subject } from '../types/models';
import { loadSubjects, saveSubjects } from '../services/storage/nailexamsStorage';
import { uuid } from '../utils/id';
import { now } from '../utils/time';
import { logEvent } from '../services/logging/logEvent';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/HomeNavigator';



export default function SubjectsScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();

  const { profile, refreshUserData } = useAuth();

  const [items, setItems] = useState<Subject[]>([]);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const level = profile?.examLevel;

  const canAdd = useMemo(() => name.trim().length >= 2 && !busy && !!level, [name, busy, level]);

  const refresh = useCallback(async () => {
    const data = await loadSubjects();
    // stable sort for UI
    data.sort((a, b) => a.name.localeCompare(b.name));
    setItems(data);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const persist = useCallback(
    async (next: Subject[]) => {
      setItems(next);
      await saveSubjects(next);
      await refreshUserData(); // keep Home/Settings in sync
    },
    [refreshUserData],
  );

  const onAdd = async () => {
    if (busy) return;
    if (!level) {
      Alert.alert('Missing profile', 'Your exam level is not available.');
      return;
    }
    const trimmed = name.trim();
    if (trimmed.length < 2) return;

    const exists = items.some((s) => s.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      Alert.alert('Already exists', 'That subject is already in your list.');
      return;
    }

    try {
      setBusy(true);
      const ts = now();
      const created: Subject = {
        id: uuid(),
        name: trimmed,
        examLevel: level,
        createdAt: ts,
        updatedAt: ts,
      };

      const next = [...items, created].sort((a, b) => a.name.localeCompare(b.name));
      await persist(next);
      await logEvent('subject_added', { name: trimmed, level });
      setName('');
    } catch (e: any) {
      Alert.alert('Add failed', String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  const onRename = async (id: string) => {
    if (busy) return;

    const current = items.find((s) => s.id === id);
    if (!current) return;

    Alert.prompt?.(
      'Rename subject',
      'Enter a new name',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: async (value: string | undefined) => {
            const newName = (value ?? '').trim();
            if (newName.length < 2) return;

            const exists = items.some(
              (s) => s.id !== id && s.name.toLowerCase() === newName.toLowerCase(),
            );
            if (exists) {
              Alert.alert('Already exists', 'That subject name already exists.');
              return;
            }

            try {
              setBusy(true);
              const next = items
                .map((s) => (s.id === id ? { ...s, name: newName, updatedAt: now() } : s))
                .sort((a, b) => a.name.localeCompare(b.name));
              await persist(next);
              await logEvent('subject_renamed', { from: current.name, to: newName });
            } catch (e: any) {
              Alert.alert('Rename failed', String(e?.message ?? e));
            } finally {
              setBusy(false);
            }
          },
        },
      ],
      'plain-text',
      current.name,
    );

    // If Alert.prompt is not supported (Android), fall back:
    if (!Alert.prompt) {
      Alert.alert('Rename not supported', 'We will add an inline rename UI in the next step.');
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
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g., French"
          style={styles.input}
          autoCapitalize="words"
          editable={!busy}
        />
        <PrimaryButton title={busy ? 'Adding…' : 'Add'} onPress={onAdd} disabled={!canAdd} />
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

            <View style={styles.actions}>
              <PrimaryButton
                title="Rename"
                onPress={() => void onRename(item.id)}
                disabled={busy}
                style={styles.smallBtn}
              />
              <PrimaryButton
                title="Delete"
                onPress={() => void onDelete(item.id)}
                disabled={busy}
                style={styles.smallBtn}
              />
              <PrimaryButton
                title="Topics"
                onPress={() => navigation.navigate('Topics', { subjectId: item.id, subjectName: item.name })}
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