import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { useAuth } from '../context/AuthContext';
import { loadTopics } from '../services/storage/nailexamsStorage';
import { loadPlanConfig, savePlanConfig, savePlan } from '../services/storage/planStorage';
import { generatePlan } from '../services/plan/generateWeeklyPlan';
import { logEvent } from '../services/logging/logEvent';
import type { PlanConfig, TopicOrder } from '../types/plan';
import type { Topic } from '../types/models';
import type { AppTabParamList } from '../navigation/TabNavigator';

const TILE_PALETTE = [
  { bg: '#FAEEDA', dot: '#633806' },
  { bg: '#FBEAF0', dot: '#72243E' },
  { bg: '#E6F1FB', dot: '#0C447C' },
  { bg: '#EEEDFE', dot: '#3C3489' },
  { bg: '#EAF3DE', dot: '#27500A' },
  { bg: '#E1F5EE', dot: '#085041' },
  { bg: '#FEF9C3', dot: '#854D0E' },
  { bg: '#F3E8FF', dot: '#5B21B6' },
  { bg: '#FCEBEB', dot: '#A32D2D' },
  { bg: '#E0F2FE', dot: '#075985' },
  { bg: '#F0FDF4', dot: '#166534' },
  { bg: '#FFF7ED', dot: '#9A3412' },
];

const DURATION_OPTIONS: Array<30 | 60 | 90> = [30, 60, 90];
const TOPICS_OPTIONS: Array<1 | 2 | 3 | 4> = [1, 2, 3, 4];

const TOPIC_ORDER_OPTIONS: Array<{
  value: TopicOrder;
  title: string;
  desc: string;
}> = [
  {
    value: 'subjects-first',
    title: 'Subjects first',
    desc: 'Finish all topics from subject 1, then move on to subject 2.',
  },
  {
    value: 'round-robin',
    title: 'Round-robin',
    desc: 'One topic from each selected subject per day, rotating evenly.',
  },
];

const DEFAULT_CONFIG: PlanConfig = {
  durationDays: 30,
  subjectIds: [],
  topicsPerDay: 2,
  topicOrder: 'round-robin',
};

export default function PlanSettingsScreen() {
  const { subjects } = useAuth();
  const tabNav = useNavigation<BottomTabNavigationProp<AppTabParamList>>();

  const [config, setConfig] = useState<PlanConfig>(DEFAULT_CONFIG);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [savedConfig, allTopics] = await Promise.all([loadPlanConfig(), loadTopics()]);
    setTopics(allTopics);
    const subjectIds =
      savedConfig.subjectIds.length > 0
        ? savedConfig.subjectIds.filter((id) => subjects.some((s) => s.id === id))
        : subjects.map((s) => s.id);
    setConfig({ ...savedConfig, subjectIds });
  }, [subjects]);

  useEffect(() => { void load(); }, [load]);

  const toggleSubject = (id: string) => {
    setConfig((prev) => {
      const checked = prev.subjectIds.includes(id);
      return {
        ...prev,
        subjectIds: checked
          ? prev.subjectIds.filter((x) => x !== id)
          : [...prev.subjectIds, id],
      };
    });
  };

  const topicCountFor = (subjectId: string) =>
    topics.filter((t) => t.subjectId === subjectId).length;

  const totalTopics = config.subjectIds.reduce(
    (acc, id) => acc + topicCountFor(id),
    0,
  );
  const estimatedSessions = Math.min(
    config.durationDays * config.topicsPerDay,
    totalTopics,
  );
  const canGenerate = config.subjectIds.length > 0 && totalTopics > 0;

  const onGenerate = async () => {
    if (busy || !canGenerate) return;
    try {
      setBusy(true);
      await savePlanConfig(config);
      const plan = generatePlan({ subjects, topics, config });
      await savePlan(plan);
      await logEvent('plan_generated', {
        durationDays: config.durationDays,
        topicsPerDay: config.topicsPerDay,
        topicOrder: config.topicOrder,
        sessions: plan.sessions.length,
      });
      tabNav.navigate('Plan');
    } catch (e: any) {
      Alert.alert('Failed to generate plan', String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* ── Duration ─────────────────────────────────────────────── */}
      <Text style={styles.sectionLabel}>Duration</Text>
      <View style={styles.chipRow}>
        {DURATION_OPTIONS.map((d) => {
          const active = config.durationDays === d;
          return (
            <Pressable
              key={d}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setConfig((prev) => ({ ...prev, durationDays: d }))}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {d} days
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* ── Subjects ─────────────────────────────────────────────── */}
      <Text style={styles.sectionLabel}>Subjects</Text>
      <View style={styles.card}>
        {subjects.length === 0 ? (
          <Text style={styles.emptyHint}>
            No subjects yet. Add some in Settings → Edit Subjects.
          </Text>
        ) : (
          subjects.map((subject, idx) => {
            const checked = config.subjectIds.includes(subject.id);
            const palette = TILE_PALETTE[idx % TILE_PALETTE.length];
            const count = topicCountFor(subject.id);
            const isLast = idx === subjects.length - 1;
            return (
              <Pressable
                key={subject.id}
                style={[styles.subjectRow, isLast && styles.subjectRowLast]}
                onPress={() => toggleSubject(subject.id)}
              >
                <View style={[styles.subjectDot, { backgroundColor: palette.bg }]}>
                  <View style={[styles.subjectDotInner, { backgroundColor: palette.dot }]} />
                </View>
                <Text style={styles.subjectName} numberOfLines={1}>
                  {subject.name}
                </Text>
                <Text style={styles.subjectCount}>{count} topics</Text>
                <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                  {checked && <Text style={styles.checkmark}>✓</Text>}
                </View>
              </Pressable>
            );
          })
        )}
      </View>

      {/* ── Topics per day ───────────────────────────────────────── */}
      <Text style={styles.sectionLabel}>Topics per day</Text>
      <View style={styles.chipRow}>
        {TOPICS_OPTIONS.map((n) => {
          const active = config.topicsPerDay === n;
          return (
            <Pressable
              key={n}
              style={[styles.chipSquare, active && styles.chipActive]}
              onPress={() => setConfig((prev) => ({ ...prev, topicsPerDay: n }))}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{n}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* ── Topic order ──────────────────────────────────────────── */}
      <Text style={styles.sectionLabel}>Topic order</Text>
      {TOPIC_ORDER_OPTIONS.map((opt) => {
        const active = config.topicOrder === opt.value;
        return (
          <Pressable
            key={opt.value}
            style={[styles.orderCard, active && styles.orderCardActive]}
            onPress={() => setConfig((prev) => ({ ...prev, topicOrder: opt.value }))}
          >
            <View style={[styles.radio, active && styles.radioSelected]}>
              {active && <View style={styles.radioDot} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.orderTitle}>{opt.title}</Text>
              <Text style={styles.orderDesc}>{opt.desc}</Text>
            </View>
          </Pressable>
        );
      })}

      {/* ── Estimate / warning ───────────────────────────────────── */}
      {canGenerate ? (
        <Text style={styles.estimate}>
          ~{estimatedSessions} sessions across {config.durationDays} days
          {estimatedSessions < config.durationDays * config.topicsPerDay
            ? ' (topics run out before the end)'
            : ''}
        </Text>
      ) : (
        <Text style={styles.warning}>Select at least one subject to continue.</Text>
      )}

      {/* ── Generate ─────────────────────────────────────────────── */}
      <Pressable
        style={[styles.generateBtn, (!canGenerate || busy) && styles.generateBtnDisabled]}
        onPress={onGenerate}
        disabled={!canGenerate || busy}
      >
        <Text style={styles.generateBtnText}>
          {busy ? 'Generating…' : 'Generate plan'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  content: { padding: 16, paddingBottom: 48 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: '#888',
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 2,
  },

  // Duration / topics-per-day chips
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E6',
  },
  chipSquare: {
    width: 60,
    height: 48,
    backgroundColor: '#FFF',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E6',
  },
  chipActive: { backgroundColor: '#1C1C1E', borderColor: '#1C1C1E' },
  chipText: { fontSize: 14, fontWeight: '500', color: '#1C1C1E' },
  chipTextActive: { color: '#FFF' },

  // Subjects card
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F0F0F0',
  },
  subjectRowLast: { borderBottomWidth: 0 },
  subjectDot: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  subjectDotInner: { width: 8, height: 8, borderRadius: 4 },
  subjectName: { flex: 1, fontSize: 14, fontWeight: '500', color: '#1C1C1E' },
  subjectCount: { fontSize: 12, color: '#AAA' },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#C7C7CC',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxChecked: { backgroundColor: '#1C1C1E', borderColor: '#1C1C1E' },
  checkmark: { fontSize: 12, color: '#FFF', fontWeight: '700' },
  emptyHint: {
    padding: 16,
    fontSize: 13,
    color: '#AAA',
    textAlign: 'center',
  },

  // Topic order cards
  orderCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  orderCardActive: { borderColor: '#1C1C1E' },
  orderTitle: { fontSize: 14, fontWeight: '600', color: '#1C1C1E', marginBottom: 3 },
  orderDesc: { fontSize: 12, color: '#888', lineHeight: 18 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#C7C7CC',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  radioSelected: { borderColor: '#1C1C1E' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#1C1C1E' },

  estimate: {
    textAlign: 'center',
    fontSize: 12,
    color: '#888',
    marginTop: 16,
    marginBottom: 8,
    lineHeight: 18,
  },
  warning: {
    textAlign: 'center',
    fontSize: 12,
    color: '#E24B4A',
    marginTop: 16,
    marginBottom: 8,
  },

  generateBtn: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  generateBtnDisabled: { opacity: 0.4 },
  generateBtnText: { fontSize: 15, fontWeight: '600', color: '#FFF' },
});
