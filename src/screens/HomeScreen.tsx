import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { useAuth } from '../context/AuthContext';
import { loadPlan } from '../services/storage/planStorage';
import { loadTopics } from '../services/storage/nailexamsStorage';
import type { WeeklyPlan } from '../types/plan';
import type { Topic } from '../types/models';
import type { HomeStackParamList } from '../navigation/HomeNavigator';
import type { AppTabParamList } from '../navigation/TabNavigator';

// ─── Colour palette — one per subject slot, cycles if more than 8 subjects ───
const TILE_PALETTE = [
  { bg: '#FAEEDA', text: '#633806' },
  { bg: '#FBEAF0', text: '#72243E' },
  { bg: '#E6F1FB', text: '#0C447C' },
  { bg: '#EEEDFE', text: '#3C3489' },
  { bg: '#EAF3DE', text: '#27500A' },
  { bg: '#E1F5EE', text: '#085041' },
  { bg: '#FEF9C3', text: '#854D0E' },
  { bg: '#F3E8FF', text: '#5B21B6' },
];

// Confidence level bar colours — red (1) → green (5)
const CONF_BAR_COLORS = ['#E24B4A', '#EF9F27', '#FAC775', '#97C459', '#1D9E75'];

// ─── Date helpers ─────────────────────────────────────────────────────────────
function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfWeekMonday(date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function weekDates(weekStartIso: string): string[] {
  const [y, m, d] = weekStartIso.split('-').map(Number);
  const base = new Date(y, m - 1, d);
  base.setHours(0, 0, 0, 0);
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    const dt = new Date(base);
    dt.setDate(base.getDate() + i);
    out.push(toISODate(dt));
  }
  return out;
}

function dayShortLabel(iso: string): string {
  const dt = new Date(iso + 'T00:00:00');
  return dt.toLocaleDateString(undefined, { weekday: 'short' });
}

function dayNum(iso: string) {
  return String(Number(iso.slice(-2)));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** 5 bars showing topic count per confidence level (1–5), coloured red→green */
function ConfidenceBars({ bars }: { bars: number[] }) {
  const max = Math.max(...bars, 1);
  return (
    <View style={styles.barsRow}>
      {bars.map((count, i) => {
        const heightPct = Math.max(0.15, count / max);
        return (
          <View
            key={i}
            style={[
              styles.bar,
              {
                height: Math.max(4, Math.round(heightPct * 20)),
                backgroundColor: CONF_BAR_COLORS[i],
                // grey out bars with zero topics
                opacity: count === 0 ? 0.2 : 1,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

type HomeMode = 'subjects' | 'plan';

export default function HomeScreen() {
  const stackNav = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const tabNav = useNavigation<BottomTabNavigationProp<AppTabParamList>>();

  const { profile, subjects, refreshUserData } = useAuth();

  const [mode, setMode] = useState<HomeMode>('subjects');
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [allTopics, setAllTopics] = useState<Topic[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(toISODate(new Date()));

  const load = useCallback(async () => {
    await refreshUserData();
    const [p, t] = await Promise.all([loadPlan(), loadTopics()]);
    setPlan(p);
    setAllTopics(t);

    if (p) {
      const days = weekDates(p.weekStart);
      if (!days.includes(selectedDate)) setSelectedDate(days[0]);
    }
  }, [refreshUserData, selectedDate]);

  useEffect(() => { void load(); }, [load]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const level = profile?.examLevel ?? '—';

  // ── Confidence bar data per subject ─────────────────────────────────────────
  const confidenceBySubject = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const s of subjects) {
      // [count of conf=1, conf=2, conf=3, conf=4, conf=5]
      const buckets = [0, 0, 0, 0, 0];
      for (const t of allTopics) {
        if (t.subjectId !== s.id) continue;
        const c = t.confidence ?? 3;
        if (c >= 1 && c <= 5) buckets[c - 1]++;
      }
      map.set(s.id, buckets);
    }
    return map;
  }, [subjects, allTopics]);

  // ── Plan helpers ─────────────────────────────────────────────────────────────
  const planWeekDays = useMemo(() => {
    if (plan?.weekStart) return weekDates(plan.weekStart);
    return weekDates(toISODate(startOfWeekMonday()));
  }, [plan]);

  const planHasAny = !!plan && plan.sessions.length > 0;

  const sessionsForSelectedDay = useMemo(() => {
    if (!planHasAny || !plan) return [];
    return plan.sessions.filter((s) => s.date === selectedDate);
  }, [plan, planHasAny, selectedDate]);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <Text style={styles.appTitle}>NailExams</Text>
      <Text style={styles.subTitle}>{level} · {subjects.length} subjects</Text>

      {/* Pill toggle */}
      <View style={styles.pillSwitcher}>
        <Pressable
          style={[styles.pill, mode === 'subjects' && styles.pillActive]}
          onPress={() => setMode('subjects')}
        >
          <Text style={[styles.pillText, mode === 'subjects' && styles.pillTextActive]}>
            Subjects
          </Text>
        </Pressable>
        <Pressable
          style={[styles.pill, mode === 'plan' && styles.pillActive]}
          onPress={() => setMode('plan')}
        >
          <Text style={[styles.pillText, mode === 'plan' && styles.pillTextActive]}>
            Study plan
          </Text>
        </Pressable>
      </View>

      {/* ── SUBJECTS MODE ── */}
      {mode === 'subjects' && (
        <View>
          <View style={styles.modeHeader}>
            <Pressable onPress={() => stackNav.navigate('Subjects')}>
              <Text style={styles.manageLink}>Manage subjects</Text>
            </Pressable>
          </View>

          {subjects.length === 0 ? (
            <Text style={styles.emptyText}>No subjects yet. Tap "Manage subjects" to add some.</Text>
          ) : (
            <View style={styles.subjectGrid}>
              {subjects.map((s, idx) => {
                const palette = TILE_PALETTE[idx % TILE_PALETTE.length];
                const bars = confidenceBySubject.get(s.id) ?? [0, 0, 0, 0, 0];
                return (
                  <Pressable
                    key={s.id}
                    style={[styles.subjectTile, { backgroundColor: palette.bg }]}
                    onPress={() => tabNav.navigate('Practice', { subjectId: s.id })}
                  >
                    <Text style={[styles.tileName, { color: palette.text }]} numberOfLines={2}>
                      {s.name}
                    </Text>
                    <ConfidenceBars bars={bars} />
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* ── PLAN MODE ── */}
      {mode === 'plan' && (
        <View>
          {!planHasAny ? (
            <View style={styles.emptyPlan}>
              <Text style={styles.emptyTitle}>No study plan yet</Text>
              <Text style={styles.emptyBody}>
                Head to the Plan tab to generate your weekly study plan.
              </Text>
              <Pressable
                style={styles.goBtn}
                onPress={() => tabNav.navigate('Plan')}
              >
                <Text style={styles.goBtnText}>Go to Plan</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {/* Week strip */}
              <View style={styles.weekStrip}>
                {planWeekDays.map((d) => {
                  const active = d === selectedDate;
                  const today = d === toISODate(new Date());
                  return (
                    <Pressable
                      key={d}
                      onPress={() => setSelectedDate(d)}
                      style={[
                        styles.dayPill,
                        active && styles.dayPillActive,
                        today && !active && styles.dayPillToday,
                      ]}
                    >
                      <Text style={[styles.dayText, active && styles.dayTextActive]}>
                        {dayShortLabel(d)}
                      </Text>
                      <Text style={[styles.dayNum, active && styles.dayTextActive]}>
                        {dayNum(d)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Sessions for selected day */}
              <FlatList
                data={sessionsForSelectedDay}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                ListEmptyComponent={
                  <Text style={styles.emptySmall}>No sessions for this day.</Text>
                }
                renderItem={({ item }) => {
                  const done = item.status === 'DONE';
                  return (
                    <Pressable
                      style={styles.sessionCard}
                      onPress={() => tabNav.navigate('Plan')}
                    >
                      <Text style={styles.sessionIcon}>{done ? '✅' : '⏳'}</Text>
                      <Text style={styles.sessionTitle} numberOfLines={2}>{item.title}</Text>
                      <Text style={[styles.badge, done ? styles.badgeDone : styles.badgePlanned]}>
                        {done ? 'Done' : 'Planned'}
                      </Text>
                    </Pressable>
                  );
                }}
              />

              <Pressable style={styles.goBtn} onPress={() => tabNav.navigate('Plan')}>
                <Text style={styles.goBtnText}>Open full plan →</Text>
              </Pressable>
            </>
          )}
        </View>
      )}
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  content: { padding: 16, paddingBottom: 28 },

  appTitle: { fontSize: 32, fontWeight: '700', color: '#1C1C1E' },
  subTitle: { marginTop: 2, fontSize: 13, color: '#888', marginBottom: 16 },

  // Pill switcher
  pillSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#E0E0E8',
    borderRadius: 10,
    padding: 3,
    marginBottom: 16,
  },
  pill: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
  },
  pillActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  pillText: { fontSize: 13, fontWeight: '500', color: '#888' },
  pillTextActive: { color: '#1C1C1E' },

  // Subjects mode
  modeHeader: { alignItems: 'flex-end', marginBottom: 8 },
  manageLink: { fontSize: 12, fontWeight: '500', color: '#185FA5', textDecorationLine: 'underline' },

  subjectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  subjectTile: {
    width: '47.5%',
    borderRadius: 16,
    padding: 12,
    paddingBottom: 10,
  },
  tileName: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
    lineHeight: 18,
  },

  // Confidence bars
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 24,
  },
  bar: {
    flex: 1,
    borderRadius: 2,
  },

  emptyText: { textAlign: 'center', color: '#888', marginTop: 20, fontSize: 13 },

  // Plan mode
  emptyPlan: { paddingVertical: 20, alignItems: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: '#1C1C1E', marginBottom: 6 },
  emptyBody: { fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 16, lineHeight: 19 },

  weekStrip: {
    flexDirection: 'row',
    gap: 5,
    marginBottom: 12,
  },
  dayPill: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 7,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#DDDDE0',
  },
  dayPillActive: {
    backgroundColor: '#1C1C1E',
    borderColor: '#1C1C1E',
  },
  dayPillToday: {
    borderColor: '#185FA5',
    borderWidth: 1.5,
  },
  dayText: { fontSize: 10, fontWeight: '500', color: '#888' },
  dayNum: { fontSize: 13, fontWeight: '500', color: '#1C1C1E' },
  dayTextActive: { color: '#FFFFFF' },

  sessionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: '#E0E0E0',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  sessionIcon: { fontSize: 16 },
  sessionTitle: { flex: 1, fontSize: 13, fontWeight: '500', color: '#1C1C1E' },

  badge: {
    fontSize: 10,
    fontWeight: '600',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 20,
  },
  badgeDone: { backgroundColor: '#DCFCE7', color: '#166534' },
  badgePlanned: { backgroundColor: '#FEF9C3', color: '#854D0E' },

  emptySmall: { textAlign: 'center', color: '#AAA', marginVertical: 12, fontSize: 13 },

  goBtn: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  goBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '500' },
});
