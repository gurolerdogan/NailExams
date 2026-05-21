import React, { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import type { ExamLevel } from '../../types/models';
import {
  GCSE_SUBJECT_GROUPS,
  ALEVEL_SUBJECT_GROUPS,
} from '../../data/gcseTopicCatalog';
import { TILE_PALETTE } from '../../constants/palette';
import {
  MAX_SUBJECTS_GCSE,
  MAX_SUBJECTS_ALEVEL,
  WARN_SUBJECTS_GCSE,
} from '../../context/PlusContext';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingSubjects'>;

// Provider accent colours for section headers
const PROVIDER_COLORS: Record<string, { bg: string; text: string }> = {
  AQA:     { bg: '#E6F1FB', text: '#0C447C' },
  Edexcel: { bg: '#EAF3DE', text: '#27500A' },
  OCR:     { bg: '#EEEDFE', text: '#3C3489' },
};
const DEFAULT_PROVIDER_COLOR = { bg: '#F4F4F6', text: '#3C3C43' };

export default function OnboardingSubjectsScreen({ navigation, route }: Props) {
  const { examLevel } = route.params;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const isGCSE = examLevel === 'GCSE';

  const activeGroups = isGCSE ? GCSE_SUBJECT_GROUPS : ALEVEL_SUBJECT_GROUPS;

  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(
    () => new Set(activeGroups.map((g) => g.provider)),
  );

  // Palette index across all subjects for consistent colouring
  const allSubjectNames = useMemo(
    () => activeGroups.flatMap((g) => g.subjects),
    [activeGroups],
  );

  const paletteIndexOf = useMemo(() => {
    const map = new Map<string, number>();
    allSubjectNames.forEach((name, i) => map.set(name, i));
    return map;
  }, [allSubjectNames]);

  const hardCap = isGCSE ? MAX_SUBJECTS_GCSE : MAX_SUBJECTS_ALEVEL;

  const toggle = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
        return next;
      }

      // Hard cap (all users)
      if (next.size >= hardCap) {
        Alert.alert(
          `Maximum ${hardCap} subjects`,
          isGCSE
            ? `You can't add more than ${hardCap} GCSE subjects.`
            : `A Level students typically take up to ${hardCap} subjects.`,
          [{ text: 'OK' }],
        );
        return prev;
      }

      // Soft warning at 12 for GCSE
      if (isGCSE && next.size + 1 === WARN_SUBJECTS_GCSE) {
        Alert.alert(
          'That\'s a lot of subjects!',
          `Most students study 8–12 GCSEs. Selecting more than ${WARN_SUBJECTS_GCSE} is highly unusual — make sure these are all exams you're actually sitting.`,
          [{ text: 'Got it' }],
        );
      }

      next.add(name);
      return next;
    });
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

  const toggleProvider = (provider: string) => {
    setExpandedProviders((prev) => {
      const next = new Set(prev);
      if (next.has(provider)) next.delete(provider);
      else next.add(provider);
      return next;
    });
  };

  // ── Render: grouped GCSE ──────────────────────────────────────────────────────
  const renderGCSE = () => (
    <>
      {GCSE_SUBJECT_GROUPS.map((group) => {
        const expanded = expandedProviders.has(group.provider);
        const providerColor = PROVIDER_COLORS[group.provider] ?? DEFAULT_PROVIDER_COLOR;
        const selectedInGroup = group.subjects.filter((s) => selected.has(s)).length;

        return (
          <View key={group.provider} style={styles.providerSection}>
            {/* Provider header */}
            <Pressable
              style={[styles.providerHeader, { backgroundColor: providerColor.bg }]}
              onPress={() => toggleProvider(group.provider)}
            >
              <Text style={[styles.providerName, { color: providerColor.text }]}>
                {group.provider}
              </Text>
              {selectedInGroup > 0 && (
                <View style={[styles.providerBadge, { backgroundColor: providerColor.text }]}>
                  <Text style={styles.providerBadgeText}>{selectedInGroup}</Text>
                </View>
              )}
              <Text style={[styles.providerChevron, { color: providerColor.text }]}>
                {expanded ? '▾' : '▸'}
              </Text>
            </Pressable>

            {/* Subject tiles */}
            {expanded && (
              <View style={styles.grid}>
                {group.subjects.map((name) => {
                  const isSelected = selected.has(name);
                  const idx = paletteIndexOf.get(name) ?? 0;
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
                        {/* Strip provider prefix for display since header shows it */}
                        {name.replace(/^(AQA|Edexcel|OCR)\s+/, '')}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}
    </>
  );


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
            {examLevel === 'GCSE' ? 'GCSE' : 'A Level'} · tap a provider to expand
          </Text>
        </View>

        {/* Step dots — step 2 of 3 */}
        <View style={styles.dots}>
          <View style={styles.dot} />
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
        </View>

        {renderGCSE()}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky footer */}
      <View style={styles.footer}>
        {isGCSE && selected.size >= WARN_SUBJECTS_GCSE && (
          <Text style={[styles.limitHint, { color: '#EF9F27' }]}>
            ⚠️ {selected.size} subjects selected — that's a lot for one student
          </Text>
        )}
        <Pressable
          style={[styles.nextBtn, selected.size === 0 && { opacity: 0.4 }]}
          onPress={onNext}
          disabled={selected.size === 0}
        >
          <Text style={styles.nextBtnText}>
            {selected.size > 0
              ? `Continue with ${selected.size} subject${selected.size !== 1 ? 's' : ''} →`
              : 'Continue →'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 16 },

  header: { marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#1C1C1E', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#888' },

  dots: { flexDirection: 'row', gap: 6, marginBottom: 20 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#E0E0E0' },
  dotActive: { width: 20, backgroundColor: '#1C1C1E', borderRadius: 3 },

  // Provider groups
  providerSection: { marginBottom: 10 },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 8,
  },
  providerName: { fontSize: 13, fontWeight: '700', flex: 1, letterSpacing: 0.3 },
  providerBadge: {
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  providerBadgeText: { fontSize: 11, fontWeight: '700', color: '#FFF' },
  providerChevron: { fontSize: 13, fontWeight: '600' },

  // Tile grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  tile: {
    width: '30.5%',
    borderRadius: 14,
    padding: 10,
    paddingBottom: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: 76,
    justifyContent: 'flex-start',
    gap: 6,
  },
  tileSelected: { borderColor: '#1C1C1E' },
  indicator: {
    width: 18, height: 18, borderRadius: 9, borderWidth: 1.5,
    borderColor: '#CCC', backgroundColor: '#FFF',
    alignItems: 'center', justifyContent: 'center',
  },
  indicatorSelected: { borderColor: '#1C1C1E', backgroundColor: '#1C1C1E' },
  indicatorDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#FFF' },
  tileName: { fontSize: 10, fontWeight: '600', textAlign: 'center', lineHeight: 14 },

  // Footer
  footer: {
    paddingHorizontal: 20, paddingBottom: 32, paddingTop: 12,
    backgroundColor: '#FFFFFF', borderTopWidth: 0.5, borderTopColor: '#F0F0F0',
  },
  limitHint: { textAlign: 'center', fontSize: 12, color: '#888', marginBottom: 8 },
  nextBtn: {
    backgroundColor: '#1C1C1E', borderRadius: 16, paddingVertical: 16, alignItems: 'center',
  },
  nextBtnText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
});
