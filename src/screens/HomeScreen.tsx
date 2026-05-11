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
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { useAuth } from '../context/AuthContext';
import { loadPlan } from '../services/storage/planStorage';
import { loadTopics } from '../services/storage/nailexamsStorage';
import type { WeeklyPlan } from '../types/plan';
import type { Topic } from '../types/models';
import type { AppTabParamList } from '../navigation/TabNavigator';
import EmptyState from '../components/EmptyState';
import { TILE_PALETTE } from '../constants/palette';

const CONF_BAR_COLORS = ['#E24B4A', '#EF9F27', '#FAC775', '#97C459', '#1D9E75'];

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}


function dayShortLabel(iso: string): string {
  const dt = new Date(iso + 'T00:00:00');
  return dt.toLocaleDateString(undefined, { weekday: 'short' });
}

function dayNum(iso: string) {
  return String(Number(iso.slice(-2)));
}

function ConfidenceBars({ bars }: { bars: number[] }) {
  const max = Math.max(...bars, 1);
  return (
    <View style={styles.barsRow}>
      {bars.map((count, i) => (
        <View
          key={i}
          style={[
            styles.bar,
            {
              height: Math.max(4, Math.round((Math.max(0.15, count / max)) * 20)),
              backgroundColor: CONF_BAR_COLORS[i],
              opacity: count === 0 ? 0.2 : 1,
            },
          ]}
        />
      ))}
    </View>
  );
}

type HomeMode = 'subjects' | 'plan';

export default function HomeScreen() {
  const tabNav = useNavigation<BottomTabNavigationProp<AppTabParamList>>();
  const { user, profile, subjects, refreshUserData } = useAuth();

  const [mode, setMode] = useState<HomeMode>('subjects');
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [allTopics, setAllTopics] = useState<Topic[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(toISODate(new Date()));

  const load = useCallback(async () => {
    await refreshUserData();
    const [p, t] = await Promise.all([loadPlan(), loadTopics()]);
    setPlan(p);
    setAllTopics(t);
  }, [refreshUserData]);

  useEffect(() => { void load(); }, [load]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const email        = user?.email ?? '—';
  const avatarLetter = user?.email ? user.email[0].toUpperCase() : '?';
  const level        = profile?.examLevel ?? '—';

  const subjectStats = useMemo(() => {
    const map = new Map<string, { bars: number[]; checkedIn: number; total: number }>();
    for (const s of subjects) {
      const buckets = [0, 0, 0, 0, 0];
      let checkedIn = 0;
      let total = 0;
      for (const t of allTopics) {
        if (t.subjectId !== s.id) continue;
        total++;
        const c = t.confidence ?? 0;
        if (c >= 1 && c <= 5) { buckets[c - 1]++; checkedIn++; }
      }
      map.set(s.id, { bars: buckets, checkedIn, total });
    }
    return map;
  }, [subjects, allTopics]);

  // Sum of unique checked-in topics — same source as the subject tiles so the
  // stats tile number always matches the sum of the X/Y values shown below.
  const checkedInTopics = useMemo(() => {
    let sum = 0;
    for (const stats of subjectStats.values()) sum += stats.checkedIn;
    return sum;
  }, [subjectStats]);

  // Always show a rolling 7-day window starting from today so the strip
  // stays current regardless of when the plan was generated.
  const planWeekDays = useMemo(() => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return toISODate(d);
    });
  }, []);

  const planHasAny = !!plan && plan.sessions.length > 0;

  const sessionsForSelectedDay = useMemo(() => {
    if (!planHasAny || !plan) return [];
    return plan.sessions.filter((s) => s.date === selectedDate);
  }, [plan, planHasAny, selectedDate]);

  const subjectPaletteIdx = useMemo(() => {
    const map = new Map<string, number>();
    subjects.forEach((s, i) => map.set(s.id, i % TILE_PALETTE.length));
    return map;
  }, [subjects]);

  const topicConfidenceMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of allTopics) map.set(t.id, t.confidence ?? 0);
    return map;
  }, [allTopics]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.appTitle}>NailExams</Text>

      {/* ── Profile card ── */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{avatarLetter}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileEmail} numberOfLines={1}>{email}</Text>
          <Text style={styles.profileMeta}>
            {subjects.length} subject{subjects.length !== 1 ? 's' : ''} · {level}
          </Text>
        </View>
        <View style={styles.levelBadge}>
          <Text style={styles.levelBadgeText}>{level}</Text>
        </View>
      </View>

      {/* ── Stats row ── */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statVal}>{subjects.length}</Text>
          <Text style={styles.statLabel}>Subjects</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statVal}>{allTopics.length}</Text>
          <Text style={styles.statLabel}>Topics</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statVal, { color: '#1D9E75' }]}>{checkedInTopics}</Text>
          <Text style={styles.statLabel}>Checked in</Text>
        </View>
      </View>

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

      <Text style={styles.modeHint}>
        {mode === 'subjects'
          ? 'Tap a subject to review topics and check in your confidence.'
          : 'Your scheduled revision sessions — tap a session to start practising.'}
      </Text>

      {/* ── SUBJECTS MODE ── */}
      {mode === 'subjects' && (
        <View>
          {subjects.length === 0 ? (
            <EmptyState
              icon="library-outline"
              title="No subjects yet"
              body="Add your GCSE subjects to start tracking your confidence."
              cta="Edit subjects"
              onCta={() => tabNav.navigate('Settings', { screen: 'EditSubjects' })}
            />
          ) : (
            <View style={styles.subjectGrid}>
              {subjects.map((s, idx) => {
                const palette = TILE_PALETTE[idx % TILE_PALETTE.length];
                const stats = subjectStats.get(s.id) ?? { bars: [0,0,0,0,0], checkedIn: 0, total: 0 };
                return (
                  <Pressable
                    key={s.id}
                    style={[styles.subjectTile, { backgroundColor: palette.bg }]}
                    onPress={() => tabNav.navigate('Practice', { subjectId: s.id })}
                  >
                    <Text style={[styles.tileName, { color: palette.text }]} numberOfLines={2}>
                      {s.name}
                    </Text>
                    <View style={styles.tileFooter}>
                      <ConfidenceBars bars={stats.bars} />
                      <Text style={[styles.tileProgress, { color: palette.text }]}>
                        {stats.checkedIn}/{stats.total}
                      </Text>
                    </View>
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
            <EmptyState
              icon="calendar-outline"
              title="No study plan yet"
              body="Set up your plan in Plan Settings to schedule your revision sessions."
              cta="Set up plan"
              onCta={() => tabNav.navigate('Settings', { screen: 'PlanSettings' })}
            />
          ) : (
            <>
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

              <FlatList
                data={sessionsForSelectedDay}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                ListEmptyComponent={
                  <Text style={styles.emptySmall}>No sessions for this day.</Text>
                }
                renderItem={({ item }) => {
                  const done        = item.status === 'DONE';
                  const paletteIdx  = subjectPaletteIdx.get(item.subjectId) ?? 0;
                  const palette     = TILE_PALETTE[paletteIdx];
                  const conf        = topicConfidenceMap.get(item.topicId) ?? 0;
                  const checkedIn   = conf > 0;
                  return (
                    <View style={styles.sessionCard}>
                      <View style={[styles.sessionIconWrap, { backgroundColor: palette.bg }]}>
                        <View style={[styles.sessionIconDot, { backgroundColor: palette.text }]} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.sessionTitle} numberOfLines={2}>{item.title}</Text>
                        {checkedIn && (
                          <View style={styles.sessionConfRow}>
                            <View style={[styles.sessionConfDot, { backgroundColor: CONF_BAR_COLORS[conf - 1] }]} />
                            <Text style={[styles.sessionConfLabel, { color: CONF_BAR_COLORS[conf - 1] }]}>
                              {conf}/5
                            </Text>
                          </View>
                        )}
                      </View>
                      {done ? (
                        <View style={styles.sessionBadgeDone}>
                          <Text style={styles.sessionBadgeDoneText}>Done</Text>
                        </View>
                      ) : (
                        <Pressable
                          style={styles.sessionStartBtn}
                          onPress={() => tabNav.navigate('Practice', {
                            subjectId: item.subjectId,
                            topicId: item.topicId,
                          })}
                        >
                          <Text style={styles.sessionStartBtnText}>
                            {checkedIn ? 'Mark again' : 'Start →'}
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  );
                }}
              />

              <Pressable style={styles.openPlanBtn} onPress={() => tabNav.navigate('Plan')}>
                <Text style={styles.openPlanBtnText}>Open full plan →</Text>
              </Pressable>
            </>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  content: { padding: 16, paddingBottom: 28 },

  appTitle: { fontSize: 32, fontWeight: '700', color: '#1C1C1E', marginBottom: 12 },

  // Profile card
  profileCard: {
    backgroundColor: '#1C1C1E', borderRadius: 18, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 10,
  },
  avatar: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: '#333',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  avatarText: { fontSize: 18, fontWeight: '600', color: '#FFF' },
  profileInfo: { flex: 1, minWidth: 0 },
  profileEmail: { fontSize: 13, fontWeight: '500', color: '#FFF' },
  profileMeta: { fontSize: 11, color: '#AAA', marginTop: 3 },
  levelBadge: {
    backgroundColor: '#2C2C2E', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4, flexShrink: 0,
  },
  levelBadgeText: { fontSize: 11, fontWeight: '500', color: '#98D7C2' },

  // Stats row
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 14, padding: 10 },
  statVal: { fontSize: 20, fontWeight: '600', color: '#1C1C1E' },
  statLabel: { fontSize: 11, color: '#888', marginTop: 1 },

  pillSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#E0E0E8',
    borderRadius: 10,
    padding: 3,
    marginBottom: 16,
  },
  pill: { flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center' },
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

  modeHint: {
    fontSize: 12,
    color: '#AAA',
    marginBottom: 14,
    lineHeight: 17,
  },

  subjectGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  subjectTile: { width: '47.5%', borderRadius: 16, padding: 12, paddingBottom: 10 },
  tileName: { fontSize: 13, fontWeight: '500', marginBottom: 8, lineHeight: 18 },
  tileFooter: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  barsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 24, flex: 1 },
  bar: { flex: 1, borderRadius: 2 },
  tileProgress: { fontSize: 11, fontWeight: '600', opacity: 0.6, paddingBottom: 2 },

  weekStrip: { flexDirection: 'row', gap: 5, marginBottom: 12 },
  dayPill: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 7,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#DDDDE0',
  },
  dayPillActive: { backgroundColor: '#1C1C1E', borderColor: '#1C1C1E' },
  dayPillToday: { borderColor: '#185FA5', borderWidth: 1.5 },
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
  sessionIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  sessionIconDot: { width: 10, height: 10, borderRadius: 5 },
  sessionTitle: { fontSize: 13, fontWeight: '500', color: '#1C1C1E' },
  sessionConfRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  sessionConfDot: { width: 6, height: 6, borderRadius: 3 },
  sessionConfLabel: { fontSize: 11, fontWeight: '600' },
  sessionBadgeDone: {
    backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20,
  },
  sessionBadgeDoneText: { fontSize: 11, fontWeight: '500', color: '#166534' },
  sessionStartBtn: {
    backgroundColor: '#1C1C1E', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
  },
  sessionStartBtnText: { fontSize: 12, fontWeight: '600', color: '#FFF' },
  emptySmall: { textAlign: 'center', color: '#AAA', marginVertical: 12, fontSize: 13 },

  openPlanBtn: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  openPlanBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '500' },
});
