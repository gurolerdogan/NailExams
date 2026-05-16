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

import type { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import type { ExamLevel } from '../../types/models';
import { GCSE_SUBJECT_PRESETS, ALEVEL_SUBJECT_PRESETS } from '../../data/gcseTopicCatalog';
import { TILE_PALETTE } from '../../constants/palette';
import { usePlus, FREE_SUBJECT_LIMIT } from '../../context/PlusContext';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingSubjects'>;

type PresetMap = Record<ExamLevel, string[]>;

const PRESET_SUBJECTS: PresetMap = {
  GCSE: GCSE_SUBJECT_PRESETS,
  A_LEVEL: ALEVEL_SUBJECT_PRESETS,
};

export default function OnboardingSubjectsScreen({ navigation, route }: Props) {
  const { examLevel } = route.params;
  const { isPlus } = usePlus();
  const presets = PRESET_SUBJECTS[examLevel];

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [customInput, setCustomInput] = useState('');
  const [customExtras, setCustomExtras] = useState<string[]>([]);

  const allOptions = useMemo(
    () => [...presets, ...customExtras],
    [presets, customExtras],
  );

  const toggle = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
        return next;
      }
      // Gate: free users limited to FREE_SUBJECT_LIMIT subjects
      if (!isPlus && next.size >= FREE_SUBJECT_LIMIT) {
        Alert.alert(
          `Free plan: up to ${FREE_SUBJECT_LIMIT} subjects`,
          `You've selected ${FREE_SUBJECT_LIMIT} subjects. Upgrade to NailExams Plus for unlimited subjects — you can do this from Settings after setup.`,
          [{ text: 'OK' }],
        );
        return prev;
      }
      next.add(name);
      return next;
    });
  };

  const addCustom = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    if (!allOptions.find((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setCustomExtras((prev) => [...prev, trimmed]);
    }
    setSelected((prev) => new Set([...prev, trimmed]));
    setCustomInput('');
  };

  const onNext = () => {
    if (selected.size === 0) {
      Alert.alert('Select at least one subject');
      return;
    }
    navigation.navigate('OnboardingConfirm', {
      examLevel,
      subjectNames: Array.from(selected),
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Pick your subjects</Text>
          <Text style={styles.subtitle}>
            {examLevel === 'GCSE' ? 'GCSE' : 'A Level'} · tap to select
          </Text>
        </View>

        {/* Step dots */}
        {/* Step dots — step 2 of 4 */}
        <View style={styles.dots}>
          <View style={styles.dot} />
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>

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
                <View style={[styles.indicator, isSelected && styles.indicatorSelected]}>
                  {isSelected && <View style={styles.indicatorDot} />}
                </View>
                <Text style={[styles.tileName, { color: palette.text }]} numberOfLines={2}>
                  {name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Custom subject */}
        <View style={styles.customSection}>
          <Text style={styles.customLabel}>Add custom subject</Text>
          <View style={styles.customRow}>
            <TextInput
              style={styles.customInput}
              value={customInput}
              onChangeText={setCustomInput}
              placeholder="e.g. Psychology"
              placeholderTextColor="#AAA"
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

        {/* spacer so content clears the footer */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky footer */}
      <View style={styles.footer}>
        {!isPlus && (
          <Text style={{ textAlign: 'center', fontSize: 12, color: '#888', marginBottom: 8 }}>
            {selected.size >= FREE_SUBJECT_LIMIT
              ? `${FREE_SUBJECT_LIMIT}/${FREE_SUBJECT_LIMIT} subjects selected · upgrade for unlimited ✦`
              : `Free plan · ${FREE_SUBJECT_LIMIT - selected.size} subject slot${FREE_SUBJECT_LIMIT - selected.size !== 1 ? 's' : ''} remaining`}
          </Text>
        )}
        <Pressable
          style={[styles.nextBtn, selected.size === 0 && { opacity: 0.4 }]}
          onPress={onNext}
          disabled={selected.size === 0}
        >
          <Text style={styles.nextBtnText}>
            {selected.size > 0 ? `Continue with ${selected.size} subject${selected.size !== 1 ? 's' : ''} →` : 'Continue →'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },

  header: { marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#1C1C1E', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#888' },

  dots: { flexDirection: 'row', gap: 6, marginBottom: 24 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#E0E0E0' },
  dotActive: { width: 20, backgroundColor: '#1C1C1E', borderRadius: 3 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
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
  tileSelected: { borderColor: '#1C1C1E' },
  indicator: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#CCC',
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorSelected: { borderColor: '#1C1C1E', backgroundColor: '#1C1C1E' },
  indicatorDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#FFF' },
  tileName: { fontSize: 11, fontWeight: '600', textAlign: 'center', lineHeight: 15 },

  customSection: { marginTop: 20 },
  customLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  customRow: { flexDirection: 'row', gap: 8 },
  customInput: {
    flex: 1,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: '#DDD',
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#1C1C1E',
  },
  addBtn: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  addBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },

  footer: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 0.5,
    borderTopColor: '#F0F0F0',
  },
  nextBtn: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextBtnText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
});
