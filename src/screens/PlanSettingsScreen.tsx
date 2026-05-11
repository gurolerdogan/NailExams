import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const SHEET_HEIGHT = Dimensions.get('window').height * 0.72;
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { useAuth } from '../context/AuthContext';
import { loadTopics } from '../services/storage/nailexamsStorage';
import { loadPlanConfig, savePlanConfig, savePlan } from '../services/storage/planStorage';
import { generatePlan } from '../services/plan/generateWeeklyPlan';
import { logEvent } from '../services/logging/logEvent';
import { uuid } from '../utils/id';
import { now } from '../utils/time';
import type { PlanConfig, PlanSession, TopicOrder, WeeklyPlan } from '../types/plan';
import type { Topic } from '../types/models';
import type { AppTabParamList } from '../navigation/TabNavigator';
import { TILE_PALETTE } from '../constants/palette';

// ─── Constants ────────────────────────────────────────────────────────────────

const DURATION_OPTIONS: Array<30 | 60 | 90> = [30, 60, 90];
const TOPICS_OPTIONS: Array<1 | 2 | 3 | 4> = [1, 2, 3, 4];

const TOPIC_ORDER_OPTIONS: Array<{ value: TopicOrder; title: string; desc: string }> = [
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

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_HEADERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dayOfWeekMon(date: Date): number {
  return (date.getDay() + 6) % 7; // Mon=0 … Sun=6
}

// ─── Component ────────────────────────────────────────────────────────────────

type PlanMode = 'auto' | 'manual';

export default function PlanSettingsScreen() {
  const { subjects } = useAuth();
  const tabNav = useNavigation<BottomTabNavigationProp<AppTabParamList>>();

  // ── shared ───────────────────────────────────────────────────────────────────
  const [planMode, setPlanMode] = useState<PlanMode>('auto');
  const [topics, setTopics]     = useState<Topic[]>([]);
  const [busy, setBusy]         = useState(false);

  // ── auto-generate ────────────────────────────────────────────────────────────
  const [config, setConfig] = useState<PlanConfig>(DEFAULT_CONFIG);

  // ── manual plan ──────────────────────────────────────────────────────────────
  const [manualDuration, setManualDuration]   = useState<30 | 60 | 90>(30);
  const [manualSessions, setManualSessions]   = useState<PlanSession[]>([]);
  const [calMonth, setCalMonth]               = useState(() => new Date().getMonth());
  const [calYear, setCalYear]                 = useState(() => new Date().getFullYear());

  // sheet
  const [sheetDay, setSheetDay]         = useState<string | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(500)).current;

  // ── load ─────────────────────────────────────────────────────────────────────
  // Keep a ref to subjects so the load function can read the latest value without
  // being a dependency of it. This prevents the useEffect from re-firing (and
  // resetting user selections) every time AuthContext emits a new subjects reference.
  const subjectsRef = useRef(subjects);
  subjectsRef.current = subjects;

  const load = useCallback(async () => {
    const [savedConfig, allTopics] = await Promise.all([loadPlanConfig(), loadTopics()]);
    setTopics(allTopics);
    const currentSubjects = subjectsRef.current;
    const subjectIds =
      savedConfig.subjectIds.length > 0
        ? savedConfig.subjectIds.filter((id) => currentSubjects.some((s) => s.id === id))
        : currentSubjects.map((s) => s.id);
    setConfig({ ...savedConfig, subjectIds });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — uses subjectsRef to avoid reset on context re-renders

  useEffect(() => { void load(); }, [load]);

  // ── date anchors ─────────────────────────────────────────────────────────────
  const today = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
  }, []);

  const planStartISO = useMemo(() => toISODate(today), [today]);

  const planEndDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(today.getDate() + manualDuration - 1);
    return d;
  }, [today, manualDuration]);

  const planEndISO = useMemo(() => toISODate(planEndDate), [planEndDate]);

  // ── auto-generate derived ────────────────────────────────────────────────────
  const topicCountFor = (subjectId: string) =>
    topics.filter((t) => t.subjectId === subjectId).length;

  const totalTopics = config.subjectIds.reduce((acc, id) => acc + topicCountFor(id), 0);
  const estimatedSessions = Math.min(config.durationDays * config.topicsPerDay, totalTopics);
  const canGenerate = config.subjectIds.length > 0 && totalTopics > 0;

  const toggleSubject = (id: string) =>
    setConfig((prev) => ({
      ...prev,
      subjectIds: prev.subjectIds.includes(id)
        ? prev.subjectIds.filter((x) => x !== id)
        : [...prev.subjectIds, id],
    }));

  // ── manual calendar ──────────────────────────────────────────────────────────
  const canGoPrev =
    calYear > today.getFullYear() ||
    (calYear === today.getFullYear() && calMonth > today.getMonth());

  const canGoNext =
    calYear < planEndDate.getFullYear() ||
    (calYear === planEndDate.getFullYear() && calMonth < planEndDate.getMonth());

  const changeCalMonth = (dir: 1 | -1) => {
    let m = calMonth + dir;
    let y = calYear;
    if (m > 11) { m = 0; y++; }
    if (m < 0)  { m = 11; y--; }
    setCalMonth(m);
    setCalYear(y);
  };

  const calendarCells = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1);
    const offset   = dayOfWeekMon(firstDay);
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const cells: Array<{ day: number | null }> = [];
    for (let i = 0; i < offset; i++) cells.push({ day: null });
    for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d });
    return cells;
  }, [calYear, calMonth]);

  const sessionDotsByDate = useMemo(() => {
    const idxOf = new Map(subjects.map((s, i) => [s.id, i]));
    const map   = new Map<string, string[]>();
    for (const s of manualSessions) {
      const dots = map.get(s.date) ?? [];
      if (dots.length < 3) {
        const idx = idxOf.get(s.subjectId) ?? 0;
        dots.push(TILE_PALETTE[idx % TILE_PALETTE.length].text);
      }
      map.set(s.date, dots);
    }
    return map;
  }, [manualSessions, subjects]);

  // ── sheet ────────────────────────────────────────────────────────────────────
  const openSheet = (dayISO: string) => {
    setSheetDay(dayISO);
    setSheetVisible(true);
    slideAnim.setValue(500);
    Animated.spring(slideAnim, {
      toValue: 0, useNativeDriver: true, damping: 22, stiffness: 180,
    }).start();
  };

  const closeSheet = () => {
    Animated.timing(slideAnim, {
      toValue: 500, duration: 220, useNativeDriver: true,
    }).start(() => { setSheetVisible(false); setSheetDay(null); });
  };

  const isTopicInDay = (topicId: string) =>
    manualSessions.some((s) => s.date === sheetDay && s.topicId === topicId);

  const toggleTopic = (subjectId: string, topicId: string) => {
    if (!sheetDay) return;
    if (isTopicInDay(topicId)) {
      setManualSessions((prev) =>
        prev.filter((s) => !(s.date === sheetDay && s.topicId === topicId)),
      );
    } else {
      const subject = subjects.find((s) => s.id === subjectId)!;
      const topic   = topics.find((t) => t.id === topicId)!;
      if (!subject || !topic) return;
      const ts = now();
      setManualSessions((prev) => [
        ...prev,
        {
          id: uuid(),
          date: sheetDay,
          subjectId,
          topicId,
          title: `${subject.name} — ${topic.name}`,
          status: 'PLANNED',
          createdAt: ts,
          updatedAt: ts,
        },
      ]);
    }
  };

  // ── actions ──────────────────────────────────────────────────────────────────
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
      tabNav.goBack();      // pop PlanSettings so Settings tab shows SettingsHome on return
      tabNav.navigate('Plan');
    } catch (e: any) {
      Alert.alert('Failed to generate plan', String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  const onFinishManual = async () => {
    if (manualSessions.length === 0) {
      Alert.alert('No sessions yet', 'Tap calendar days and choose topics to build your plan.');
      return;
    }
    try {
      setBusy(true);
      const ts = now();
      const uniqueSubjectIds = [...new Set(manualSessions.map((s) => s.subjectId))];
      const plan: WeeklyPlan = {
        id: uuid(),
        planStart: planStartISO,
        weekStart: planStartISO,
        durationDays: manualDuration,
        subjectIds: uniqueSubjectIds,
        topicsPerDay: 0,
        topicOrder: 'subjects-first',
        sessionsPerDay: 0,
        sessions: manualSessions,
        createdAt: ts,
        updatedAt: ts,
      };
      await savePlan(plan);
      await logEvent('plan_manual_created', {
        sessions: manualSessions.length,
        durationDays: manualDuration,
      });
      tabNav.goBack();      // pop PlanSettings so Settings tab shows SettingsHome on return
      tabNav.navigate('Plan');
    } catch (e: any) {
      Alert.alert('Failed to save plan', String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  // ── render: auto section ──────────────────────────────────────────────────────
  const renderAutoSection = () => (
    <>
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
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{d} days</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionLabel}>Subjects</Text>
      <View style={styles.card}>
        {subjects.length === 0 ? (
          <Text style={styles.emptyHint}>No subjects yet. Add some in Settings → Edit Subjects.</Text>
        ) : (
          subjects.map((subject, idx) => {
            const checked  = config.subjectIds.includes(subject.id);
            const palette  = TILE_PALETTE[idx % TILE_PALETTE.length];
            const count    = topicCountFor(subject.id);
            const isLast   = idx === subjects.length - 1;
            return (
              <Pressable
                key={subject.id}
                style={[styles.subjectRow, isLast && styles.subjectRowLast]}
                onPress={() => toggleSubject(subject.id)}
              >
                <View style={[styles.subjectDot, { backgroundColor: palette.bg }]}>
                  <View style={[styles.subjectDotInner, { backgroundColor: palette.text }]} />
                </View>
                <Text style={styles.subjectName} numberOfLines={1}>{subject.name}</Text>
                <Text style={styles.subjectCount}>{count} topics</Text>
                <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                  {checked && <Text style={styles.checkmark}>✓</Text>}
                </View>
              </Pressable>
            );
          })
        )}
      </View>

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

      {canGenerate ? (
        <Text style={styles.estimate}>
          ~{estimatedSessions} sessions across {config.durationDays} days
          {estimatedSessions < config.durationDays * config.topicsPerDay
            ? ' (topics run out before the end)' : ''}
        </Text>
      ) : (
        <Text style={styles.warning}>Select at least one subject to continue.</Text>
      )}

      <Pressable
        style={[styles.primaryBtn, (!canGenerate || busy) && styles.primaryBtnDisabled]}
        onPress={onGenerate}
        disabled={!canGenerate || busy}
      >
        <Text style={styles.primaryBtnText}>{busy ? 'Generating…' : 'Generate plan'}</Text>
      </Pressable>
    </>
  );

  // ── render: manual section ────────────────────────────────────────────────────
  const renderManualSection = () => {
    const todayISO = planStartISO;
    const uniqueDays = new Set(manualSessions.map((s) => s.date)).size;

    return (
      <>
        <Text style={styles.sectionLabel}>Plan duration</Text>
        <View style={styles.chipRow}>
          {DURATION_OPTIONS.map((d) => {
            const active = manualDuration === d;
            return (
              <Pressable
                key={d}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => {
                  setManualDuration(d);
                  const newEnd = new Date(today);
                  newEnd.setDate(today.getDate() + d - 1);
                  const newEndISO = toISODate(newEnd);
                  setManualSessions((prev) => prev.filter((s) => s.date <= newEndISO));
                  if (
                    calYear > newEnd.getFullYear() ||
                    (calYear === newEnd.getFullYear() && calMonth > newEnd.getMonth())
                  ) {
                    setCalMonth(newEnd.getMonth());
                    setCalYear(newEnd.getFullYear());
                  }
                }}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{d} days</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>Tap days to schedule topics</Text>
        <View style={styles.calendarCard}>
          {/* Month navigation */}
          <View style={styles.monthHeader}>
            <Pressable
              style={[styles.monthNavBtn, !canGoPrev && { opacity: 0.25 }]}
              onPress={() => canGoPrev && changeCalMonth(-1)}
            >
              <Text style={styles.monthNavText}>‹</Text>
            </Pressable>
            <Text style={styles.monthLabel}>{MONTH_NAMES[calMonth]} {calYear}</Text>
            <Pressable
              style={[styles.monthNavBtn, !canGoNext && { opacity: 0.25 }]}
              onPress={() => canGoNext && changeCalMonth(1)}
            >
              <Text style={styles.monthNavText}>›</Text>
            </Pressable>
          </View>

          {/* Day-of-week headers */}
          <View style={styles.calGrid}>
            {DAY_HEADERS.map((h, i) => (
              <Text key={i} style={styles.calDayHeader}>{h}</Text>
            ))}

            {/* Day cells */}
            {calendarCells.map((cell, i) => {
              if (!cell.day) return <View key={`e-${i}`} style={styles.calDayCell} />;
              const iso = toISODate(new Date(calYear, calMonth, cell.day));
              const inRange  = iso >= planStartISO && iso <= planEndISO;
              const isToday  = iso === todayISO;
              const isActive = iso === sheetDay;
              const dots     = sessionDotsByDate.get(iso) ?? [];
              const hasSessions = dots.length > 0;
              return (
                <Pressable
                  key={cell.day}
                  style={[
                    styles.calDayCell,
                    !inRange          && styles.calDayCellOut,
                    inRange && isToday   && styles.calDayCellToday,
                    inRange && isActive && !isToday && styles.calDayCellActive,
                    inRange && hasSessions && !isToday && !isActive && styles.calDayCellHas,
                  ]}
                  disabled={!inRange}
                  onPress={() => openSheet(iso)}
                >
                  <Text style={[
                    styles.calDayCellText,
                    !inRange             && styles.calDayCellTextOut,
                    inRange && isToday   && styles.calDayCellTextToday,
                    inRange && isActive && !isToday && styles.calDayCellTextActive,
                  ]}>
                    {cell.day}
                  </Text>
                  {dots.length > 0 && (
                    <View style={styles.dotRow}>
                      {dots.map((color, di) => (
                        <View key={di} style={[styles.dot, { backgroundColor: color }]} />
                      ))}
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        <Text style={styles.manualCount}>
          {manualSessions.length === 0
            ? 'No sessions added yet — tap any date in the plan range.'
            : `${manualSessions.length} session${manualSessions.length !== 1 ? 's' : ''} across ${uniqueDays} day${uniqueDays !== 1 ? 's' : ''}`}
        </Text>

        <Pressable
          style={[styles.primaryBtn, (busy || manualSessions.length === 0) && styles.primaryBtnDisabled]}
          onPress={onFinishManual}
          disabled={busy || manualSessions.length === 0}
        >
          <Text style={styles.primaryBtnText}>{busy ? 'Saving…' : 'Finish planning'}</Text>
        </Pressable>
      </>
    );
  };

  // ── render: topic picker sheet ────────────────────────────────────────────────
  const renderSheet = () => {
    const dayLabel = sheetDay
      ? new Date(sheetDay + 'T00:00:00').toLocaleDateString(undefined, {
          weekday: 'long', day: 'numeric', month: 'short',
        })
      : '';

    const hasAnyTopics = subjects.some(
      (s) => topics.some((t) => t.subjectId === s.id),
    );

    return (
      <Modal visible={sheetVisible} transparent animationType="none" onRequestClose={closeSheet}>
        <View style={styles.sheetOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeSheet} />
          <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.sheetHandle} />

            {/* Header */}
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Add topics</Text>
                <Text style={styles.sheetSubtitle}>{dayLabel}</Text>
              </View>
              <Pressable style={styles.sheetDoneBtn} onPress={closeSheet}>
                <Text style={styles.sheetDoneBtnText}>Done</Text>
              </Pressable>
            </View>

            {/* Topic list */}
            <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
              {!hasAnyTopics ? (
                <Text style={styles.sheetEmpty}>No topics yet. Add subjects with topics first.</Text>
              ) : (
                subjects.map((subject, idx) => {
                  const palette = TILE_PALETTE[idx % TILE_PALETTE.length];
                  const subjectTopics = topics
                    .filter((t) => t.subjectId === subject.id)
                    .sort((a, b) => a.name.localeCompare(b.name));
                  if (subjectTopics.length === 0) return null;
                  return (
                    <View key={subject.id}>
                      <View style={[styles.sheetSubjectHeader, { backgroundColor: palette.bg }]}>
                        <View style={[styles.sheetSubjectDot, { backgroundColor: palette.text }]} />
                        <Text style={[styles.sheetSubjectName, { color: palette.text }]}>
                          {subject.name}
                        </Text>
                      </View>
                      {subjectTopics.map((topic, tidx) => {
                        const selected = isTopicInDay(topic.id);
                        const isLast   = tidx === subjectTopics.length - 1;
                        return (
                          <Pressable
                            key={topic.id}
                            style={[
                              styles.sheetTopicRow,
                              selected && styles.sheetTopicRowSelected,
                              isLast   && styles.sheetTopicRowLast,
                            ]}
                            onPress={() => toggleTopic(subject.id, topic.id)}
                          >
                            <Text
                              style={[styles.sheetTopicName, selected && styles.sheetTopicNameSelected]}
                              numberOfLines={1}
                            >
                              {topic.name}
                            </Text>
                            {selected && <Text style={styles.sheetTopicCheck}>✓</Text>}
                          </Pressable>
                        );
                      })}
                    </View>
                  );
                })
              )}
              <View style={{ height: 40 }} />
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    );
  };

  // ── root render ───────────────────────────────────────────────────────────────
  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Mode selector */}
        <View style={styles.modePill}>
          {(['auto', 'manual'] as PlanMode[]).map((m) => (
            <Pressable
              key={m}
              style={[styles.modeOption, planMode === m && styles.modeOptionActive]}
              onPress={() => setPlanMode(m)}
            >
              <Text style={[styles.modeOptionText, planMode === m && styles.modeOptionTextActive]}>
                {m === 'auto' ? 'Auto-generate' : 'Plan manually'}
              </Text>
            </Pressable>
          ))}
        </View>

        {planMode === 'auto' ? renderAutoSection() : renderManualSection()}
      </ScrollView>

      {renderSheet()}
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  content: { padding: 16, paddingBottom: 48 },

  // Mode pill
  modePill: {
    flexDirection: 'row',
    backgroundColor: '#E0E0E8',
    borderRadius: 12,
    padding: 3,
    marginBottom: 4,
  },
  modeOption: {
    flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center',
  },
  modeOptionActive: { backgroundColor: '#1C1C1E' },
  modeOptionText: { fontSize: 13, fontWeight: '500', color: '#888' },
  modeOptionTextActive: { color: '#FFF' },

  // Section label
  sectionLabel: {
    fontSize: 11, fontWeight: '600', textTransform: 'uppercase',
    letterSpacing: 0.6, color: '#888',
    marginTop: 24, marginBottom: 8, marginLeft: 2,
  },

  // Chips
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: {
    flex: 1, backgroundColor: '#FFF', borderRadius: 12, paddingVertical: 11,
    alignItems: 'center', borderWidth: 1, borderColor: '#E0E0E6',
  },
  chipSquare: {
    width: 60, height: 48, backgroundColor: '#FFF', borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E0E0E6',
  },
  chipActive: { backgroundColor: '#1C1C1E', borderColor: '#1C1C1E' },
  chipText: { fontSize: 14, fontWeight: '500', color: '#1C1C1E' },
  chipTextActive: { color: '#FFF' },

  // Auto — subjects card
  card: { backgroundColor: '#FFF', borderRadius: 16, overflow: 'hidden' },
  subjectRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12, gap: 10,
    borderBottomWidth: 0.5, borderBottomColor: '#F0F0F0',
  },
  subjectRowLast: { borderBottomWidth: 0 },
  subjectDot: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  subjectDotInner: { width: 8, height: 8, borderRadius: 4 },
  subjectName: { flex: 1, fontSize: 14, fontWeight: '500', color: '#1C1C1E' },
  subjectCount: { fontSize: 12, color: '#AAA' },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: '#C7C7CC',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  checkboxChecked: { backgroundColor: '#1C1C1E', borderColor: '#1C1C1E' },
  checkmark: { fontSize: 12, color: '#FFF', fontWeight: '700' },
  emptyHint: { padding: 16, fontSize: 13, color: '#AAA', textAlign: 'center' },

  // Auto — topic order cards
  orderCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginBottom: 8,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  orderCardActive: { borderColor: '#1C1C1E' },
  orderTitle: { fontSize: 14, fontWeight: '600', color: '#1C1C1E', marginBottom: 3 },
  orderDesc: { fontSize: 12, color: '#888', lineHeight: 18 },
  radio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: '#C7C7CC',
    alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0,
  },
  radioSelected: { borderColor: '#1C1C1E' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#1C1C1E' },

  estimate: {
    textAlign: 'center', fontSize: 12, color: '#888',
    marginTop: 16, marginBottom: 8, lineHeight: 18,
  },
  warning: { textAlign: 'center', fontSize: 12, color: '#E24B4A', marginTop: 16, marginBottom: 8 },

  // Shared primary button
  primaryBtn: {
    backgroundColor: '#1C1C1E', borderRadius: 16, paddingVertical: 15,
    alignItems: 'center', marginTop: 8,
  },
  primaryBtnDisabled: { opacity: 0.4 },
  primaryBtnText: { fontSize: 15, fontWeight: '600', color: '#FFF' },

  // Manual — calendar
  calendarCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 14 },
  monthHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 10,
  },
  monthNavBtn: { padding: 6 },
  monthNavText: { fontSize: 22, color: '#185FA5', fontWeight: '300' },
  monthLabel: { fontSize: 14, fontWeight: '600', color: '#1C1C1E' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calDayHeader: {
    width: '14.28%', textAlign: 'center', fontSize: 10,
    fontWeight: '500', color: '#AAA', paddingBottom: 6,
  },
  calDayCell: {
    width: '14.28%', aspectRatio: 1,
    alignItems: 'center', justifyContent: 'center', borderRadius: 8,
  },
  calDayCellOut: { opacity: 0.2 },
  calDayCellToday: { backgroundColor: '#1C1C1E' },
  calDayCellActive: { backgroundColor: '#185FA5' },
  calDayCellHas: { backgroundColor: '#F0F0F5' },
  calDayCellText: { fontSize: 11, fontWeight: '500', color: '#1C1C1E' },
  calDayCellTextOut: { color: '#AAA' },
  calDayCellTextToday: { color: '#FFF' },
  calDayCellTextActive: { color: '#FFF' },
  dotRow: { flexDirection: 'row', gap: 2, marginTop: 1 },
  dot: { width: 4, height: 4, borderRadius: 2 },

  manualCount: {
    textAlign: 'center', fontSize: 12, color: '#888',
    marginTop: 14, marginBottom: 4, lineHeight: 18,
  },

  // Sheet
  sheetOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 12, height: SHEET_HEIGHT,
  },
  sheetHandle: {
    width: 36, height: 4, backgroundColor: '#DDD', borderRadius: 2,
    alignSelf: 'center', marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 0.5, borderBottomColor: '#F0F0F0',
  },
  sheetTitle: { fontSize: 16, fontWeight: '600', color: '#1C1C1E' },
  sheetSubtitle: { fontSize: 12, color: '#888', marginTop: 2 },
  sheetDoneBtn: {
    backgroundColor: '#1C1C1E', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 7, marginTop: 2,
  },
  sheetDoneBtnText: { fontSize: 13, fontWeight: '600', color: '#FFF' },
  sheetScroll: { flex: 1 },
  sheetEmpty: {
    textAlign: 'center', color: '#AAA', fontSize: 13, padding: 32,
  },
  sheetSubjectHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 8, marginTop: 6,
  },
  sheetSubjectDot: { width: 8, height: 8, borderRadius: 4 },
  sheetSubjectName: {
    fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5,
  },
  sheetTopicRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 13,
    backgroundColor: '#FFF',
    borderBottomWidth: 0.5, borderBottomColor: '#F5F5F5',
  },
  sheetTopicRowSelected: { backgroundColor: '#F0FDF4' },
  sheetTopicRowLast: { borderBottomWidth: 0 },
  sheetTopicName: { flex: 1, fontSize: 14, color: '#1C1C1E' },
  sheetTopicNameSelected: { color: '#1D9E75', fontWeight: '500' },
  sheetTopicCheck: { fontSize: 15, color: '#1D9E75', fontWeight: '700', marginLeft: 8 },
});
