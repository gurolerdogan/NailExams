import React, { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { usePlus, FREE_SUBJECT_LIMIT } from '../context/PlusContext';
import type { ExamLevel, Subject } from '../types/models';
import { saveSubjects } from '../services/storage/nailexamsStorage';
import { loadPlan } from '../services/storage/planStorage';
import { uuid } from '../utils/id';
import { now } from '../utils/time';
import { logEvent } from '../services/logging/logEvent';
import { preloadGcseTopicsForSubjects } from '../services/seed/preloadGcseTopics';
import { GCSE_SUBJECT_PRESETS } from '../data/gcseTopicCatalog';
import type { SettingsStackParamList } from '../navigation/SettingsNavigator';
import { TILE_PALETTE } from '../constants/palette';
import type { Theme } from '../themes';

type Props = NativeStackScreenProps<SettingsStackParamList, 'EditSubjects'>;

const ALEVEL_PRESETS = [
  'Math', 'Further Math', 'Physics', 'Chemistry',
  'Biology', 'Computer Science', 'Economics',
];

function presetsFor(level: ExamLevel) {
  return level === 'GCSE' ? GCSE_SUBJECT_PRESETS : ALEVEL_PRESETS;
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.screenBg },
    scroll: { flex: 1 },
    content: { padding: 16, paddingBottom: 8 },

    hint: {
      fontSize: 12,
      color: theme.colors.sectionLabel,
      marginBottom: 14,
      fontWeight: '500',
    },

    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    tile: {
      width: '30.5%',
      borderRadius: 16,
      padding: 10,
      paddingBottom: 12,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: 'transparent',
      minHeight: 80,
      justifyContent: 'flex-start',
      gap: 6,
    },
    tileSelected: {
      borderColor: theme.colors.buttonPrimaryBg,
    },
    indicator: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 1.5,
      borderColor: theme.colors.cardBorder,
      backgroundColor: theme.colors.cardBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    indicatorSelected: {
      borderColor: theme.colors.buttonPrimaryBg,
      backgroundColor: theme.colors.buttonPrimaryBg,
    },
    indicatorDot: {
      width: 7,
      height: 7,
      borderRadius: 3.5,
      backgroundColor: theme.colors.buttonPrimaryText,
    },
    tileName: {
      fontSize: 11,
      fontWeight: '600',
      textAlign: 'center',
      lineHeight: 15,
    },

    customSection: {
      marginTop: 24,
      marginBottom: 8,
    },
    customLabel: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.sectionLabel,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    customRow: {
      flexDirection: 'row',
      gap: 8,
    },
    customInput: {
      flex: 1,
      backgroundColor: theme.colors.inputBg,
      borderRadius: theme.radii.input,
      borderWidth: 0.5,
      borderColor: theme.colors.inputBorder,
      paddingHorizontal: 14,
      paddingVertical: 11,
      fontSize: 14,
      color: theme.colors.inputText,
    },
    addBtn: {
      backgroundColor: theme.colors.buttonPrimaryBg,
      borderRadius: theme.radii.button,
      paddingHorizontal: 18,
      justifyContent: 'center',
    },
    addBtnText: {
      color: theme.colors.buttonPrimaryText,
      fontSize: 14,
      fontWeight: '600',
    },

    footer: {
      padding: 16,
      paddingBottom: 24,
      backgroundColor: theme.colors.screenBg,
      borderTopWidth: 0.5,
      borderTopColor: theme.colors.cardBorder,
    },
    saveBtn: {
      backgroundColor: theme.colors.buttonPrimaryBg,
      borderRadius: 16,
      paddingVertical: 15,
      alignItems: 'center',
    },
    saveBtnText: {
      color: theme.colors.buttonPrimaryText,
      fontSize: 15,
      fontWeight: '600',
    },

    emptyText: { flex: 1, textAlign: 'center', marginTop: 40, color: theme.colors.textMuted },
    container: { flex: 1, padding: 16 },
  });
}

export default function EditSubjectsScreen({ navigation }: Props) {
  const { profile, subjects, refreshUserData } = useAuth();
  const { theme } = useTheme();
  const { isPlus } = usePlus();
  const level = profile?.examLevel;
  const presets = useMemo(() => (level ? presetsFor(level) : []), [level]);

  const styles = useMemo(() => createStyles(theme), [theme]);

  const [selected, setSelected] = useState<Set<string>>(
    new Set(subjects.map((s) => s.name)),
  );
  const [customInput, setCustomInput] = useState('');
  const [customExtras, setCustomExtras] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const allOptions = useMemo(() => {
    const set = new Set<string>([...presets, ...customExtras]);
    return Array.from(set);
  }, [presets, customExtras]);

  if (!level) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Profile not loaded yet.</Text>
      </View>
    );
  }

  const toggle = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const addCustom = () => {
    const name = customInput.trim();
    if (!name) return;
    if (!customExtras.includes(name) && !presets.includes(name)) {
      setCustomExtras((prev) => [...prev, name]);
    }
    setSelected((prev) => new Set([...prev, name]));
    setCustomInput('');
  };

  const onSave = async () => {
    if (busy) return;
    if (selected.size === 0) {
      Alert.alert('Select at least 1 subject');
      return;
    }
    if (!isPlus && selected.size > FREE_SUBJECT_LIMIT) {
      Alert.alert(
        'Plus required',
        `Free accounts are limited to ${FREE_SUBJECT_LIMIT} subjects. Upgrade to NailExams Plus for unlimited subjects.`,
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Upgrade', onPress: () => navigation.navigate('Paywall') },
        ],
      );
      return;
    }

    // Block removal of any subject that has sessions in the active plan
    const removedSubjects = subjects.filter((s) => !selected.has(s.name));
    if (removedSubjects.length > 0) {
      const plan = await loadPlan();
      if (plan && plan.sessions.length > 0) {
        const planSubjectIds = new Set(plan.sessions.map((s) => s.subjectId));
        const blocked = removedSubjects.filter((s) => planSubjectIds.has(s.id));
        if (blocked.length > 0) {
          const names = blocked.map((s) => s.name).join(', ');
          const plural = blocked.length > 1;
          Alert.alert(
            'Clear your plan first',
            `${names} ${plural ? 'are' : 'is'} included in your active study plan.\n\nGo to the Plan tab and clear it before removing ${plural ? 'these subjects' : 'this subject'}.`,
          );
          return;
        }
      }
    }

    try {
      setBusy(true);
      const ts = now();
      const nextSubjects: Subject[] = Array.from(selected).map((name) => ({
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
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Save failed', String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.hint}>Tap to select · {level}</Text>

        {/* Tile grid */}
        <View style={styles.grid}>
          {allOptions.map((name, idx) => {
            const isSelected = selected.has(name);
            const palette = TILE_PALETTE[idx % TILE_PALETTE.length];
            return (
              <Pressable
                key={name}
                style={[
                  styles.tile,
                  { backgroundColor: palette.bg },
                  isSelected && styles.tileSelected,
                ]}
                onPress={() => toggle(name)}
              >
                {/* Selection indicator */}
                <View style={[styles.indicator, isSelected && styles.indicatorSelected]}>
                  {isSelected && <View style={styles.indicatorDot} />}
                </View>
                <Text
                  style={[styles.tileName, { color: palette.text }]}
                  numberOfLines={2}
                >
                  {name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Custom subject input */}
        <View style={styles.customSection}>
          <Text style={styles.customLabel}>Add custom subject</Text>
          <View style={styles.customRow}>
            <TextInput
              style={styles.customInput}
              value={customInput}
              onChangeText={setCustomInput}
              placeholder="e.g. Psychology"
              placeholderTextColor={theme.colors.textMuted}
              autoCapitalize="words"
              onSubmitEditing={addCustom}
              returnKeyType="done"
            />
            <Pressable
              style={[styles.addBtn, !customInput.trim() && { opacity: 0.4 }]}
              onPress={addCustom}
              disabled={!customInput.trim()}
            >
              <Text style={styles.addBtnText}>Add</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Sticky save button */}
      <View style={styles.footer}>
        <Pressable
          style={[styles.saveBtn, (busy || selected.size === 0) && { opacity: 0.5 }]}
          onPress={onSave}
          disabled={busy || selected.size === 0}
        >
          <Text style={styles.saveBtnText}>
            {busy ? 'Saving…' : `Save ${selected.size} subject${selected.size !== 1 ? 's' : ''}`}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
