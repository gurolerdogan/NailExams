import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
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
import { useTheme } from '../context/ThemeContext';
import type { Topic } from '../types/models';
import type { WeeklyPlan } from '../types/plan';
import { loadPlan, savePlan, clearPlan } from '../services/storage/planStorage';
import { loadTopics } from '../services/storage/nailexamsStorage';
import { now } from '../utils/time';
import { computeStreak } from '../utils/streak';
import { logEvent } from '../services/logging/logEvent';
import type { AppTabParamList } from '../navigation/TabNavigator';
import EmptyState from '../components/EmptyState';
import { TILE_PALETTE } from '../constants/palette';
import type { Theme } from '../themes';

const CONF_COLORS = ['#E24B4A', '#EF9F27', '#FAC775', '#97C459', '#1D9E75'];

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_HEADERS = ['M','T','W','T','F','S','S'];

// ─── Date helpers ─────────────────────────────────────────────────────────────
function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}


function mondayOfWeek(year: number, month: number, day: number): number {
  const date = new Date(year, month, day);
  const dow = date.getDay();
  return day - (dow === 0 ? 6 : dow - 1);
}

function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function dayOfWeekMon(date: Date): number {
  // Monday=0 … Sunday=6
  return (date.getDay() + 6) % 7;
}


function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.screenBg },
    content: { padding: 16, paddingBottom: 32 },

    screenTitle: { fontSize: 22, fontWeight: theme.fonts.headingWeight, color: theme.colors.textPrimary, marginBottom: 4, fontFamily: theme.fonts.heading, letterSpacing: theme.fonts.letterSpacingHeading },
    screenSubRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    screenSub: { flex: 1, fontSize: 12, color: theme.colors.textSecondary },
    headerActions: { flexDirection: 'row', gap: 12 },
    headerActionBtn: { paddingVertical: 2 },
    headerActionText: { fontSize: 12, fontWeight: '500', color: '#185FA5' },

    // Summary row
    summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    summaryCard: {
      flex: 1,
      backgroundColor: theme.colors.cardBg,
      borderRadius: 14,
      padding: 10,
    },
    summaryVal: { fontSize: 20, fontWeight: '600', color: theme.colors.textPrimary },
    summaryValSub: { fontSize: 13, fontWeight: '400', color: theme.colors.textMuted },
    summaryLabel: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 1 },
    progressTrack: {
      height: 3,
      backgroundColor: theme.colors.divider,
      borderRadius: 2,
      marginTop: 6,
      overflow: 'hidden',
    },
    progressFill: { height: '100%', backgroundColor: '#1D9E75', borderRadius: 2 },

    // Calendar
    calendarCard: {
      backgroundColor: theme.colors.cardBg,
      borderRadius: 16,
      padding: 14,
      marginBottom: 12,
    },
    monthHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    monthNavBtn: { padding: 4 },
    monthNavText: { fontSize: 20, color: '#185FA5', fontWeight: '400' },
    monthLabel: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary },

    calGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    dayHeader: {
      width: '14.28%',
      textAlign: 'center',
      fontSize: 10,
      fontWeight: '500',
      color: theme.colors.textMuted,
      paddingBottom: 6,
    },
    dayCell: {
      width: '14.28%',
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
    },
    dayCellToday: { backgroundColor: theme.colors.buttonPrimaryBg },
    dayCellSelected: { backgroundColor: '#E6F1FB' },
    dayCellText: { fontSize: 11, fontWeight: '500', color: theme.colors.textPrimary },
    dayCellTextToday: { color: theme.colors.buttonPrimaryText },
    dayCellTextSelected: { color: '#185FA5' },
    dotRow: { flexDirection: 'row', gap: 2, marginTop: 1 },
    dot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      borderWidth: 1,
      backgroundColor: 'transparent',
    },

    // Week sessions
    weekSection: {
      backgroundColor: theme.colors.cardBg,
      borderRadius: 16,
      overflow: 'hidden',
    },
    weekSectionHeader: {
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 14,
      borderBottomWidth: 0.5,
      borderBottomColor: theme.colors.divider,
    },
    weekSectionTitle: { fontSize: 16, fontWeight: theme.fonts.headingWeight, color: theme.colors.textPrimary, textAlign: 'center', fontFamily: theme.fonts.heading },

    emptyWeek: {
      textAlign: 'center',
      color: theme.colors.textMuted,
      fontSize: 13,
      padding: 20,
    },

    sessionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 12,
      borderBottomWidth: 0.5,
      borderBottomColor: theme.colors.divider,
    },
    sessionIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    sessionIconDot: { width: 10, height: 10, borderRadius: 5 },
    sessionTitle: { fontSize: 13, fontWeight: theme.fonts.bodyWeight, color: theme.colors.textPrimary, fontFamily: theme.fonts.body },
    sessionMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
    sessionMeta: { fontSize: 11, color: theme.colors.textMuted },
    confDot: { width: 6, height: 6, borderRadius: 3 },
    confLabel: { fontSize: 11, fontWeight: '600' },

    badgeDone: {
      backgroundColor: '#DCFCE7',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 20,
    },
    badgeDoneText: { fontSize: 11, fontWeight: '500', color: '#166534' },

    startBtn: {
      backgroundColor: theme.colors.buttonPrimaryBg,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
    },
    startBtnText: { fontSize: 12, fontWeight: '600', color: theme.colors.buttonPrimaryText },
  });
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function PlanScreen() {
  const { subjects } = useAuth();
  const { theme } = useTheme();
  const tabNav = useNavigation<BottomTabNavigationProp<AppTabParamList>>();

  const styles = useMemo(() => createStyles(theme), [theme]);

  const [plan, setPlan]       = useState<WeeklyPlan | null>(null);
  const [topics, setTopics]   = useState<Topic[]>([]);
  const [busy, setBusy]       = useState(false);

  // Calendar state
  const today = useMemo(() => new Date(), []);
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [calYear, setCalYear]   = useState(today.getFullYear());
  const [selectedWeekMonday, setSelectedWeekMonday] = useState<number>(
    mondayOfWeek(today.getFullYear(), today.getMonth(), today.getDate()),
  );

  // ── Load ─────────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    const [p, t] = await Promise.all([loadPlan(), loadTopics()]);
    setPlan(p);
    setTopics(t);
  }, []);

  useEffect(() => { void load(); }, [load]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  // ── Derived ──────────────────────────────────────────────────────────────────
  const streak = useMemo(() => plan ? computeStreak(plan.sessions) : 0, [plan]);

  const totalCount = plan?.sessions.length ?? 0;

  // topicId → confidence (0 = not checked in)
  const topicConfidence = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of topics) map.set(t.id, t.confidence ?? 0);
    return map;
  }, [topics]);

  const checkedInCount = useMemo(
    () => plan?.sessions.filter((s) => (topicConfidence.get(s.topicId) ?? 0) > 0).length ?? 0,
    [plan, topicConfidence],
  );

  // Sessions for the selected week (Mon–Sun)
  const weekSessions = useMemo(() => {
    if (!plan) return [];
    // Build ISO dates for the selected week
    const weekDates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(calYear, calMonth, selectedWeekMonday + i);
      weekDates.push(toISODate(d));
    }
    return plan.sessions
      .filter((s) => weekDates.includes(s.date))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [plan, calYear, calMonth, selectedWeekMonday]);

  // Map subjectId → palette index (stable, based on subjects array order)
  const subjectPaletteIdx = useMemo(() => {
    const map = new Map<string, number>();
    subjects.forEach((s, i) => map.set(s.id, i % TILE_PALETTE.length));
    return map;
  }, [subjects]);

  // Dot colours per calendar day (up to 3 dots)
  const sessionDotsByDate = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const s of plan?.sessions ?? []) {
      const existing = map.get(s.date) ?? [];
      if (existing.length < 3) {
        const idx = subjectPaletteIdx.get(s.subjectId) ?? 0;
        existing.push(TILE_PALETTE[idx].bg);
      }
      map.set(s.date, existing);
    }
    return map;
  }, [plan, subjectPaletteIdx]);

  // ── Actions ──────────────────────────────────────────────────────────────────
  const goToPlanSettings = useCallback(() => {
    tabNav.navigate('Settings', { screen: 'PlanSettings' });
  }, [tabNav]);

  const onRegenerate = () => {
    Alert.alert('Edit plan?', 'Go to Plan Settings to change your plan configuration and regenerate.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Go to Plan Settings', onPress: goToPlanSettings },
    ]);
  };

  const onClear = () => {
    Alert.alert('Clear plan?', 'This removes the plan from local storage.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await clearPlan();
          setPlan(null);
          await logEvent('plan_cleared', {});
        },
      },
    ]);
  };

  const markDone = useCallback(async (sessionId: string) => {
    if (!plan || busy) return;
    try {
      setBusy(true);
      const ts = now();
      const next: WeeklyPlan = {
        ...plan,
        updatedAt: ts,
        sessions: plan.sessions.map((s) =>
          s.id === sessionId ? { ...s, status: 'DONE', updatedAt: ts } : s,
        ),
      };
      await savePlan(next);
      setPlan(next);
      await logEvent('plan_session_done', { sessionId });
    } finally {
      setBusy(false);
    }
  }, [plan, busy]);

  // Deep-link session → Practice
  const openPractice = useCallback((session: WeeklyPlan['sessions'][number]) => {
    tabNav.navigate('Practice', {
      subjectId: session.subjectId,
      topicId: session.topicId,
    });
  }, [tabNav]);

  // ── Calendar helpers ──────────────────────────────────────────────────────────
  const changeMonth = (dir: 1 | -1) => {
    let m = calMonth + dir;
    let y = calYear;
    if (m > 11) { m = 0; y++; }
    if (m < 0)  { m = 11; y--; }
    setCalMonth(m);
    setCalYear(y);
  };

  const selectWeek = (day: number) => {
    const monday = mondayOfWeek(calYear, calMonth, day);
    setSelectedWeekMonday(monday);
  };

  // Build calendar grid cells
  const calendarCells = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1);
    const offset = dayOfWeekMon(firstDay); // 0=Mon offset
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const cells: Array<{ day: number | null }> = [];
    for (let i = 0; i < offset; i++) cells.push({ day: null });
    for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d });
    return cells;
  }, [calYear, calMonth]);

  const todayISO = toISODate(today);

  // ── Render: empty state ───────────────────────────────────────────────────────
  const renderEmptyState = () => (
    <EmptyState
      icon="calendar-outline"
      title="No plan yet"
      body="Set up your study plan — choose duration, subjects, and how topics are picked."
      cta="Set up plan"
      onCta={goToPlanSettings}
    />
  );

  // ── Render: summary row ───────────────────────────────────────────────────────
  const renderSummary = () => (
    <View style={styles.summaryRow}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryVal}>
          {checkedInCount}<Text style={styles.summaryValSub}>/{totalCount}</Text>
        </Text>
        <Text style={styles.summaryLabel}>Checked in</Text>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: totalCount > 0 ? `${(checkedInCount / totalCount) * 100}%` : '0%' },
            ]}
          />
        </View>
      </View>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryVal}>{totalCount - checkedInCount}</Text>
        <Text style={styles.summaryLabel}>Remaining</Text>
      </View>
      <View style={styles.summaryCard}>
        <Text style={[styles.summaryVal, { color: '#1D9E75' }]}>
          {streak > 0 ? '↑' : '—'}
        </Text>
        <Text style={styles.summaryLabel}>
          {streak > 0 ? `Streak ${streak}d` : 'No streak'}
        </Text>
      </View>
    </View>
  );

  // ── Render: monthly calendar ──────────────────────────────────────────────────
  const renderCalendar = () => (
    <View style={styles.calendarCard}>
      {/* Month navigation */}
      <View style={styles.monthHeader}>
        <Pressable onPress={() => changeMonth(-1)} style={styles.monthNavBtn}>
          <Text style={styles.monthNavText}>‹</Text>
        </Pressable>
        <Text style={styles.monthLabel}>{MONTH_NAMES[calMonth]} {calYear}</Text>
        <Pressable onPress={() => changeMonth(1)} style={styles.monthNavBtn}>
          <Text style={styles.monthNavText}>›</Text>
        </Pressable>
      </View>

      {/* Day-of-week headers */}
      <View style={styles.calGrid}>
        {DAY_HEADERS.map((h, i) => (
          <Text key={i} style={styles.dayHeader}>{h}</Text>
        ))}

        {/* Day cells */}
        {calendarCells.map((cell, i) => {
          if (!cell.day) {
            return <View key={`e-${i}`} style={styles.dayCell} />;
          }

          const iso = toISODate(new Date(calYear, calMonth, cell.day));
          const isToday = iso === todayISO;
          const monday = mondayOfWeek(calYear, calMonth, cell.day);
          const isSelectedWeek = monday === selectedWeekMonday;
          const dots = sessionDotsByDate.get(iso) ?? [];

          return (
            <Pressable
              key={cell.day}
              style={[
                styles.dayCell,
                isToday && styles.dayCellToday,
                isSelectedWeek && !isToday && styles.dayCellSelected,
              ]}
              onPress={() => selectWeek(cell.day!)}
            >
              <Text style={[
                styles.dayCellText,
                isToday && styles.dayCellTextToday,
                isSelectedWeek && !isToday && styles.dayCellTextSelected,
              ]}>
                {cell.day}
              </Text>
              {dots.length > 0 && (
                <View style={styles.dotRow}>
                  {dots.map((color, di) => (
                    <View
                      key={di}
                      style={[styles.dot, { borderColor: color === '#FAEEDA' ? '#BA7517' : color }]}
                    />
                  ))}
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  // ── Render: week session list ─────────────────────────────────────────────────
  const renderWeekSessions = () => {
    const weekStart = new Date(calYear, calMonth, selectedWeekMonday);
    const weekEnd   = new Date(calYear, calMonth, selectedWeekMonday + 6);
    const label = `${weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${weekEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;

    return (
      <View style={styles.weekSection}>
        <View style={styles.weekSectionHeader}>
          <Text style={styles.weekSectionTitle}>Week of {label}</Text>
        </View>

        {weekSessions.length === 0 ? (
          <Text style={styles.emptyWeek}>No sessions for this week.</Text>
        ) : (
          weekSessions.map((session) => {
            const done = session.status === 'DONE';
            const paletteIdx = subjectPaletteIdx.get(session.subjectId) ?? 0;
            const palette = TILE_PALETTE[paletteIdx];
            const sessionDate = isoToDate(session.date);
            const dayLabel = sessionDate.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
            const conf = topicConfidence.get(session.topicId) ?? 0;
            const checkedIn = conf > 0;

            return (
              <Pressable
                key={session.id}
                style={styles.sessionCard}
                onPress={() => !done && openPractice(session)}
              >
                {/* Subject colour indicator */}
                <View style={[styles.sessionIconWrap, { backgroundColor: palette.bg }]}>
                  <View style={[styles.sessionIconDot, { backgroundColor: palette.text }]} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.sessionTitle} numberOfLines={2}>{session.title}</Text>
                  <View style={styles.sessionMetaRow}>
                    <Text style={styles.sessionMeta}>{dayLabel}</Text>
                    {checkedIn && (
                      <>
                        <View style={[styles.confDot, { backgroundColor: CONF_COLORS[conf - 1] }]} />
                        <Text style={[styles.confLabel, { color: CONF_COLORS[conf - 1] }]}>
                          {conf}/5
                        </Text>
                      </>
                    )}
                  </View>
                </View>

                {done ? (
                  <View style={styles.badgeDone}>
                    <Text style={styles.badgeDoneText}>Done</Text>
                  </View>
                ) : (
                  <Pressable
                    style={styles.startBtn}
                    onPress={() => openPractice(session)}
                  >
                    <Text style={styles.startBtnText}>{checkedIn ? 'Mark again' : 'Start →'}</Text>
                  </Pressable>
                )}
              </Pressable>
            );
          })
        )}
      </View>
    );
  };

  // ── Root render ───────────────────────────────────────────────────────────────
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.screenTitle}>Study Plan</Text>
      <View style={styles.screenSubRow}>
        <Text style={styles.screenSub}>
          {MONTH_NAMES[calMonth]} {calYear}
          {plan ? ` · ${checkedInCount} of ${totalCount} checked in` : ''}
        </Text>
        {plan && (
          <View style={styles.headerActions}>
            <Pressable onPress={onRegenerate} style={styles.headerActionBtn}>
              <Text style={styles.headerActionText}>Regenerate</Text>
            </Pressable>
            <Pressable onPress={onClear} style={styles.headerActionBtn}>
              <Text style={[styles.headerActionText, { color: '#E24B4A' }]}>Clear</Text>
            </Pressable>
          </View>
        )}
      </View>

      {!plan ? (
        renderEmptyState()
      ) : (
        <>
          {renderSummary()}
          {renderCalendar()}
          {renderWeekSessions()}
        </>
      )}
    </ScrollView>
  );
}
