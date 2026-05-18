import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import type { Subject, Topic } from '../types/models';
import { loadTopics, saveTopics } from '../services/storage/nailexamsStorage';
import { appendAttempt, loadAttempts } from '../services/storage/practiceStorage';
import type { PracticeAttempt } from '../types/practice';
import { uuid } from '../utils/id';
import { now } from '../utils/time';
import { logEvent } from '../services/logging/logEvent';
import { PAST_PAPER_LINKS } from '../data/pastPaperLinks';
import { Linking } from 'react-native';
import { maybePromptOnNailedIt } from '../utils/reviewPrompt';
import type { AppTabParamList } from '../navigation/TabNavigator';
import EmptyState from '../components/EmptyState';
import { TILE_PALETTE } from '../constants/palette';
import type { Theme, ProgressChartType, CheckedInType } from '../themes';

const CONF_BAR_COLORS = ['#E24B4A', '#EF9F27', '#FAC775', '#97C459', '#1D9E75'];
const CONF_BG         = ['#FCEBEB', '#FAEEDA', '#FEF9C3', '#EAF3DE', '#E1F5EE'];
const CONF_TEXT       = ['#A32D2D', '#633806', '#854D0E', '#27500A', '#085041'];

type PracticeRoute = RouteProp<AppTabParamList, 'Practice'>;

// ─── Small reusable components ────────────────────────────────────────────────

/** Theme-aware progress chart for subject tiles/rows */
function ProgressChart({ type, bars, checkedIn, total, accentColor, trackColor }: {
  type: ProgressChartType;
  bars: number[];
  checkedIn: number;
  total: number;
  accentColor: string;
  trackColor: string;
}) {
  if (type === 'barchart') {
    const max = Math.max(...bars, 1);
    return (
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 24, flex: 1 }}>
        {bars.map((count, i) => (
          <View key={i} style={{ flex: 1, borderRadius: 2, height: Math.max(4, Math.round((Math.max(0.15, count / max)) * 20)), backgroundColor: CONF_BAR_COLORS[i], opacity: count === 0 ? 0.2 : 1 }} />
        ))}
      </View>
    );
  }
  if (type === 'progressline') {
    const pct = total > 0 ? (checkedIn / total) * 100 : 0;
    return (
      <View style={{ height: 5, backgroundColor: trackColor, borderRadius: 3, flex: 1, overflow: 'hidden' }}>
        <View style={{ height: '100%', width: `${pct}%`, backgroundColor: accentColor, borderRadius: 3 }} />
      </View>
    );
  }
  // colordots
  const max = Math.max(...bars, 1);
  return (
    <View style={{ flexDirection: 'row', gap: 3, flex: 1 }}>
      {bars.map((count, i) => (
        <View key={i} style={{ flex: 1, height: 10, borderRadius: 3, backgroundColor: CONF_BAR_COLORS[i], opacity: count === 0 ? 0.12 : 0.25 + (count / max) * 0.75 }} />
      ))}
    </View>
  );
}

function checkedInDisplay(checkedIn: number, total: number, type: CheckedInType): string {
  if (total === 0) return '—';
  return type === 'Percent' ? `${Math.round((checkedIn / total) * 100)}%` : `${checkedIn}/${total}`;
}

/** Stepped bar row used on topic rows — empty (all grey) when confidence is 0 */
function TopicBars({ confidence }: { confidence: number }) {
  return (
    <View style={staticStyles.topicBarsRow}>
      {[0, 1, 2, 3, 4].map((i) => (
        <View
          key={i}
          style={[
            staticStyles.topicBar,
            { height: 4 + i * 3 },
            confidence > 0 && i < confidence
              ? { backgroundColor: CONF_BAR_COLORS[i] }
              : { backgroundColor: '#E0E0E0' },
          ]}
        />
      ))}
    </View>
  );
}

// Static geometry-only styles
const staticStyles = StyleSheet.create({
  barsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 24 },
  tileBar: { flex: 1, borderRadius: 2 },
  topicBarsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, width: 40 },
  topicBar: { width: 6, borderRadius: 1 },
});

function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.screenBg },
    content: { padding: 16, paddingBottom: 28 },

    screenTitle: {
      fontSize: 22,
      fontWeight: theme.fonts.headingWeight,
      color: theme.colors.textPrimary,
      marginBottom: 16,
      lineHeight: 30,
      fontFamily: theme.fonts.heading,
      letterSpacing: theme.fonts.letterSpacingHeading,
    },

    // Tile layout
    subjectGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    subjectTile: { width: '47.5%', borderRadius: theme.radii.tile, padding: 12, paddingBottom: 10 },
    tileName: { fontSize: 13, fontWeight: theme.fonts.bodyWeight, marginBottom: 8, lineHeight: 18, fontFamily: theme.fonts.body },
    tileFoot: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
    tileProgress: { fontSize: 11, fontWeight: '600', opacity: 0.6, paddingBottom: 2 },

    // List layout
    subjectList: { backgroundColor: theme.colors.cardBg, borderRadius: theme.radii.card, overflow: 'hidden' },
    subjectListRow: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 14, paddingVertical: 12, gap: 12,
      borderBottomWidth: 0.5, borderBottomColor: theme.colors.divider,
    },
    subjectListRowLast: { borderBottomWidth: 0 },
    subjectListDot: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    subjectListName: { fontSize: 14, fontWeight: theme.fonts.bodyWeight, color: theme.colors.textPrimary, fontFamily: theme.fonts.body, marginBottom: 5 },
    subjectListBadge: {
      paddingHorizontal: 10, paddingVertical: 4, borderRadius: theme.radii.pill, flexShrink: 0,
      backgroundColor: theme.dark ? theme.colors.cardBorder : theme.colors.screenBg,
    },
    subjectListBadgeText: { fontSize: 12, fontWeight: '700', color: theme.colors.accent, fontFamily: theme.fonts.body },

    topicHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
      backgroundColor: theme.colors.screenBg,
    },
    backBtn: { width: 60 },
    backText: { fontSize: 14, fontWeight: '500', color: '#185FA5' },
    topicHeaderTitle: {
      flex: 1,
      textAlign: 'center',
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.textPrimary,
    },

    topicListContent: { paddingHorizontal: 16, paddingBottom: 28 },

    // Subject summary tile
    subjectSummaryRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    subjectSummaryCard: { flex: 1, backgroundColor: theme.colors.cardBg, borderRadius: 14, padding: 10 },
    subjectSummaryVal: { fontSize: 20, fontWeight: '600', color: theme.colors.textPrimary },
    subjectSummaryValSub: { fontSize: 13, fontWeight: '400', color: theme.colors.textMuted },
    subjectSummaryLabel: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 1 },
    progressTrack: { height: 3, backgroundColor: theme.colors.divider, borderRadius: 2, marginTop: 6, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: '#1D9E75', borderRadius: 2 },

    // Domain groups
    domainSection: { marginBottom: 8 },
    domainHeader: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 4, paddingVertical: 6,
    },
    domainTitle: {
      flex: 1, fontSize: 11, fontWeight: theme.fonts.headingWeight,
      textTransform: 'uppercase', letterSpacing: 0.6, color: theme.colors.sectionLabel,
      fontFamily: theme.fonts.body,
    },
    domainMeta: { fontSize: 11, color: theme.colors.textMuted },
    domainChevron: { fontSize: 16, color: theme.colors.textMuted, width: 14, textAlign: 'center' },
    domainCard: { backgroundColor: theme.colors.cardBg, borderRadius: 14, overflow: 'hidden' },

    topicRow: {
      flexDirection: 'row', alignItems: 'center',
      padding: 12, gap: 10,
      borderBottomWidth: 0.5, borderBottomColor: theme.colors.cardBorder,
    },
    topicRowLast: { borderBottomWidth: 0 },
    topicName: { fontSize: 13, fontWeight: theme.fonts.bodyWeight, color: theme.colors.textPrimary, fontFamily: theme.fonts.body },
    topicMeta: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
    topicMetaUnchecked: { color: theme.colors.textMuted, fontStyle: 'italic' },
    topicNote: { fontSize: 11, color: theme.colors.textMuted, fontStyle: 'italic', marginTop: 1 },

    confPill: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 20,
    },
    confPillText: { fontSize: 11, fontWeight: '500' },
    confPillUnchecked: {
      backgroundColor: theme.colors.divider,
      borderWidth: 0.5,
      borderColor: theme.colors.cardBorder,
    },
    confPillTextUnchecked: { fontSize: 11, fontWeight: '500', color: theme.colors.textMuted },

    sheetOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.35)',
    },
    sheet: {
      backgroundColor: theme.colors.cardBg,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    },
    sheetHandle: {
      width: 36,
      height: 4,
      backgroundColor: theme.colors.cardBorder,
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: 16,
    },
    sheetTopic: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      marginBottom: 2,
    },
    sheetSubject: { fontSize: 12, color: theme.colors.textSecondary, marginBottom: 6 },
    sheetLastCheckin: { fontSize: 11, color: theme.colors.textMuted, marginBottom: 18, fontStyle: 'italic' },
    sheetLabel: { fontSize: 12, color: theme.colors.textSecondary, marginBottom: 8 },

    confSelector: { flexDirection: 'row', gap: 8, marginBottom: 18 },
    confBtn: {
      flex: 1,
      height: 42,
      borderRadius: theme.radii.input,
      borderWidth: 1.5,
      borderColor: theme.colors.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.cardBg,
    },
    confBtnText: { fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary },

    noteInput: {
      borderWidth: 0.5,
      borderColor: theme.colors.inputBorder,
      borderRadius: theme.radii.input,
      padding: 10,
      fontSize: 13,
      color: theme.colors.inputText,
      minHeight: 70,
      textAlignVertical: 'top',
      backgroundColor: theme.colors.inputBg,
      marginBottom: 14,
    },
    saveBtn: {
      backgroundColor: theme.colors.buttonPrimaryBg,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
    },
    saveBtnText: { color: theme.colors.buttonPrimaryText, fontSize: 14, fontWeight: '600' },
    saveHint: {
      textAlign: 'center',
      fontSize: 11,
      color: theme.colors.textMuted,
      marginTop: 8,
    },
  });
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function PracticeScreen() {
  const { subjects } = useAuth();
  const { theme } = useTheme();
  const route = useRoute<PracticeRoute>();
  const tabNav = useNavigation<BottomTabNavigationProp<AppTabParamList>>();

  const styles = useMemo(() => createStyles(theme), [theme]);

  const subjectIdFromNav = route.params?.subjectId;
  const topicIdFromNav   = route.params?.topicId;
  const returnTo         = route.params?.returnTo;

  const [allTopics, setAllTopics]               = useState<Topic[]>([]);
  const [selectedSubject, setSelectedSubject]   = useState<Subject | null>(null);
  const [collapsedDomains, setCollapsedDomains] = useState<Set<string>>(new Set());
  const [lastNoteByTopic, setLastNoteByTopic]   = useState<Map<string, string>>(new Map());
  const [sheetTopic, setSheetTopic]             = useState<Topic | null>(null);
  // null = no button pre-selected; user must pick a confidence level before saving
  const [confidence, setConfidence]             = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [note, setNote]                         = useState('');
  const [busy, setBusy]                         = useState(false);
  const [sheetVisible, setSheetVisible]         = useState(false);
  const [celebration, setCelebration]           = useState<{
    emoji: string;
    title: string;
    sub: string;
    link?: string;
  } | null>(null);

  const slideAnim       = useRef(new Animated.Value(300)).current;
  const celebrationAnim = useRef(new Animated.Value(0)).current;

  // Keep a ref so openSheet can read the latest notes without being a dep of the
  // topicIdFromNav effect — prevents the sheet from re-opening after every save.
  const lastNoteByTopicRef = useRef(lastNoteByTopic);
  lastNoteByTopicRef.current = lastNoteByTopic;

  // True only when the sheet was auto-opened by a plan deep-link in the current session.
  // Manually tapping a topic resets this to false so returnTo is never triggered.
  const openedFromPlanRef = useRef(false);

  const openSheet = useCallback((topic: Topic) => {
    openedFromPlanRef.current = false; // manual open — clear the plan-link flag
    setSheetTopic(topic);
    const existing = topic.confidence && topic.confidence > 0
      ? (topic.confidence as 1 | 2 | 3 | 4 | 5)
      : null;
    setConfidence(existing);
    setNote(lastNoteByTopicRef.current.get(topic.id) ?? '');
    setSheetVisible(true);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      damping: 20,
      stiffness: 180,
    }).start();
  }, [slideAnim]); // stable — no lastNoteByTopic dep

  const closeSheet = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: 300,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setSheetVisible(false);
      setSheetTopic(null);
    });
  }, [slideAnim]);

  // ── Load topics + attempts ────────────────────────────────────────────────────
  const refreshTopics = useCallback(async () => {
    const [data, attempts] = await Promise.all([loadTopics(), loadAttempts()]);
    setAllTopics(data);
    // Build a map of topicId → most recent note (attempts are stored oldest→newest)
    const noteMap = new Map<string, string>();
    for (const a of attempts) {
      if (a.note) noteMap.set(a.topicId, a.note);
    }
    setLastNoteByTopic(noteMap);
  }, []);

  useEffect(() => { void refreshTopics(); }, [refreshTopics]);
  useFocusEffect(useCallback(() => { void refreshTopics(); }, [refreshTopics]));

  // ── Handle inbound nav params (from Home tile or Plan session) ────────────────
  const subjectsKey = useMemo(() => subjects.map((s) => s.id).join('|'), [subjects]);

  useEffect(() => {
    if (!subjectIdFromNav) return;
    const s = subjects.find((x) => x.id === subjectIdFromNav);
    if (!s) return;
    setSelectedSubject((prev) => {
      if (prev?.id === subjectIdFromNav) return prev;
      return s;
    });
  }, [subjectIdFromNav, subjectsKey]);

  // Track which topicId we already opened so allTopics reloads don't re-trigger the sheet.
  // Reset to null when topicIdFromNav clears (user navigated away without a topicId) so a
  // future Plan → Practice navigation for the same topic still works.
  const handledTopicIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!topicIdFromNav) {
      handledTopicIdRef.current = null; // params cleared — ready for next navigation
      return;
    }
    if (allTopics.length === 0) return;
    if (topicIdFromNav === handledTopicIdRef.current) return; // already handled this navigation
    const t = allTopics.find((x) => x.id === topicIdFromNav);
    if (t) {
      handledTopicIdRef.current = topicIdFromNav;
      openSheet(t);
      openedFromPlanRef.current = true; // mark as plan-link open AFTER openSheet resets it
    }
  }, [topicIdFromNav, allTopics, openSheet]);

  // ── Derived data ──────────────────────────────────────────────────────────────
  const subjectStats = useMemo(() => {
    const map = new Map<string, { bars: number[]; checkedIn: number; total: number }>();
    for (const s of subjects) {
      const buckets = [0, 0, 0, 0, 0];
      let checkedIn = 0; let total = 0;
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

  const subjectTopics = useMemo(() => {
    if (!selectedSubject) return [];
    return allTopics.filter((t) => t.subjectId === selectedSubject.id);
  }, [allTopics, selectedSubject]);

  // Group topics by domain prefix ("Domain: topic name" → domain = "Domain").
  // Guard: if the prefix before ': ' is > 25 chars it's likely a user-written topic
  // title, not a catalog domain label — treat it as General to avoid bad grouping.
  const groupedTopics = useMemo(() => {
    const groups = new Map<string, Topic[]>();
    for (const topic of subjectTopics) {
      const colonIdx = topic.name.indexOf(': ');
      const prefix   = colonIdx === -1 ? '' : topic.name.slice(0, colonIdx);
      const domain   = prefix.length > 0 && prefix.length <= 25 ? prefix : 'General';
      const list     = groups.get(domain) ?? [];
      list.push(topic);
      groups.set(domain, list);
    }
    return Array.from(groups.entries()).map(([domain, topics]) => ({
      domain,
      // Sort alphabetically by the short name (after the domain prefix)
      topics: [...topics].sort((a, b) => {
        const aShort = a.name.includes(': ') ? a.name.split(': ').slice(1).join(': ') : a.name;
        const bShort = b.name.includes(': ') ? b.name.split(': ').slice(1).join(': ') : b.name;
        return aShort.localeCompare(bShort);
      }),
    }));
  }, [subjectTopics]);

  const toggleDomain = (domain: string) =>
    setCollapsedDomains((prev) => {
      const next = new Set(prev);
      next.has(domain) ? next.delete(domain) : next.add(domain);
      return next;
    });

  // ── Save check-in ─────────────────────────────────────────────────────────────
  const showCelebration = (
    payload: { emoji: string; title: string; sub: string; link?: string },
    holdMs = 1800,
    onComplete?: () => void,
  ) => {
    setCelebration(payload);
    celebrationAnim.setValue(0);
    Animated.sequence([
      Animated.spring(celebrationAnim, { toValue: 1, useNativeDriver: true, damping: 14, stiffness: 160 }),
      Animated.delay(holdMs),
      Animated.timing(celebrationAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => {
      setCelebration(null);
      onComplete?.();
    });
  };

  const submit = async () => {
    if (busy || !selectedSubject || !sheetTopic || confidence === null) return;

    try {
      setBusy(true);
      const ts = now();

      const attempt: PracticeAttempt = {
        id: uuid(),
        subjectId: selectedSubject.id,
        topicId: sheetTopic.id,
        ts,
        confidence,
        note: note.trim() || undefined,
      };

      await appendAttempt(attempt);

      const idx = allTopics.findIndex((t) => t.id === sheetTopic.id);
      if (idx >= 0) {
        const updated: Topic = {
          ...allTopics[idx],
          confidence,
          lastPracticedAt: ts,
          updatedAt: ts,
        };
        const nextAll = [...allTopics];
        nextAll[idx] = updated;
        setAllTopics(nextAll);
        await saveTopics(nextAll);
      }

      // Keep lastNoteByTopic in sync so the note is shown immediately on reopen
      if (note.trim()) {
        setLastNoteByTopic((prev) => new Map(prev).set(sheetTopic.id, note.trim()));
      }

      await logEvent('practice_checkin_saved', {
        subjectId: selectedSubject.id,
        topicId: sheetTopic.id,
        confidence,
        noteLen: note.trim().length,
      });

      const allAttempts = await loadAttempts();
      void maybePromptOnNailedIt(confidence, allAttempts.length);

      // Celebration for every check-in
      const allSubjectTopics = allTopics.filter((t) => t.subjectId === selectedSubject.id);
      const allNowHigh = allSubjectTopics.every((t) =>
        t.id === sheetTopic.id ? confidence >= 4 : (t.confidence ?? 0) >= 4,
      );
      const pastPaperLink = PAST_PAPER_LINKS[selectedSubject.name];

      // Build the post-celebration callback — navigates back if this was a plan deep-link
      const afterCelebration = (returnTo && openedFromPlanRef.current)
        ? () => {
            openedFromPlanRef.current = false;
            tabNav.navigate(returnTo);
          }
        : undefined;

      if (allNowHigh && allSubjectTopics.length > 0 && confidence >= 4) {
        void logEvent('subject_completed', { subjectId: selectedSubject.id });
        showCelebration({ emoji: '🏆', title: `${selectedSubject.name} complete!`, sub: 'All topics at confident or above' }, 2200, afterCelebration);
      } else {
        const LEVEL_CONTENT: Record<number, { emoji: string; titles: string[]; sub: string; holdMs: number }> = {
          1: { emoji: '💪', titles: ["Keep going!", "You've got this!", "Don't give up!"],       sub: "This one needs work — keep revisiting it.", holdMs: 3000 },
          2: { emoji: '📖', titles: ["Getting there!", "Keep at it!", "A bit more to go!"],      sub: "A few more practice sessions will help.",    holdMs: 3000 },
          3: { emoji: '👍', titles: ["Way to go!", "Keep revising!", "Good progress!"],          sub: "You're building solid understanding.",         holdMs: 2000 },
          4: { emoji: '⭐', titles: ["Almost nailed it!", "So close!", "Nearly there!"],         sub: "One more push and you'll have this.",          holdMs: 2000 },
          5: { emoji: '🎯', titles: ["Nailed it!", "Outstanding!", "Brilliant work!"],           sub: sheetTopic.name,                               holdMs: 1800 },
        };
        const lvl = LEVEL_CONTENT[confidence]!;
        const title = lvl.titles[Math.floor(Math.random() * lvl.titles.length)];
        const link = (confidence <= 2 && pastPaperLink) ? pastPaperLink : undefined;
        if (confidence === 5) void logEvent('topic_nailed', { topicId: sheetTopic.id, subjectId: selectedSubject.id });
        showCelebration({ emoji: lvl.emoji, title, sub: lvl.sub, link }, lvl.holdMs, afterCelebration);
      }

      closeSheet();
    } catch (e: any) {
      Alert.alert('Save failed', 'Your check-in could not be saved. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  // ── Render: subject grid ──────────────────────────────────────────────────────
  const renderSubjectGrid = () => (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.screenTitle}>What are you{'\n'}studying today?</Text>

      {subjects.length === 0 ? (
        <EmptyState
          icon="library-outline"
          title="No subjects yet"
          body="Add your GCSE subjects to see topics and start checking in."
          cta="Edit subjects"
          onCta={() => tabNav.navigate('Settings', { screen: 'EditSubjects' })}
        />
      ) : theme.subjectPanel === 'tile' ? (
        /* ── TILE layout ── */
        <View style={styles.subjectGrid}>
          {subjects.map((s, idx) => {
            const palette = TILE_PALETTE[idx % TILE_PALETTE.length];
            const stats = subjectStats.get(s.id) ?? { bars: [0,0,0,0,0], checkedIn: 0, total: 0 };
            return (
              <Pressable
                key={s.id}
                style={[styles.subjectTile, { backgroundColor: palette.bg }]}
                onPress={() => setSelectedSubject(s)}
              >
                <Text style={[styles.tileName, { color: palette.text }]} numberOfLines={2}>{s.name}</Text>
                <View style={styles.tileFoot}>
                  <ProgressChart type={theme.progressChart} bars={stats.bars} checkedIn={stats.checkedIn} total={stats.total} accentColor={palette.text} trackColor={palette.bg} />
                  <Text style={[styles.tileProgress, { color: palette.text }]}>{checkedInDisplay(stats.checkedIn, stats.total, theme.checkedIn)}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : (
        /* ── LIST layout ── */
        <View style={styles.subjectList}>
          {subjects.map((s, idx) => {
            const palette = TILE_PALETTE[idx % TILE_PALETTE.length];
            const stats = subjectStats.get(s.id) ?? { bars: [0,0,0,0,0], checkedIn: 0, total: 0 };
            const isLast = idx === subjects.length - 1;
            return (
              <Pressable key={s.id} style={[styles.subjectListRow, isLast && styles.subjectListRowLast]} onPress={() => setSelectedSubject(s)}>
                <View style={[styles.subjectListDot, { backgroundColor: palette.bg }]}>
                  <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: palette.text }} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.subjectListName} numberOfLines={1}>{s.name}</Text>
                  <ProgressChart type={theme.progressChart} bars={stats.bars} checkedIn={stats.checkedIn} total={stats.total} accentColor={theme.colors.accent} trackColor={theme.colors.divider} />
                </View>
                <View style={styles.subjectListBadge}>
                  <Text style={styles.subjectListBadgeText}>{checkedInDisplay(stats.checkedIn, stats.total, theme.checkedIn)}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </ScrollView>
  );

  // ── Render: topic list ────────────────────────────────────────────────────────
  const renderTopicList = () => {
    const total     = subjectTopics.length;
    const checkedIn = subjectTopics.filter((t) => (t.confidence ?? 0) > 0).length;
    const showDomainHeaders = groupedTopics.length > 1;

    return (
      <View style={styles.container}>
        <View style={styles.topicHeader}>
          <Pressable onPress={() => setSelectedSubject(null)} style={styles.backBtn}>
            <Text style={styles.backText}>‹ Back</Text>
          </Pressable>
          <Text style={styles.topicHeaderTitle} numberOfLines={1}>
            {selectedSubject?.name}
          </Text>
          <View style={styles.backBtn} />
        </View>

        {total === 0 ? (
          <EmptyState
            icon="list-outline"
            title="No topics yet"
            body="Topics for this subject haven't been loaded. Try resetting from Settings."
          />
        ) : (
          <ScrollView contentContainerStyle={styles.topicListContent}>

            {/* ── Summary tile ── */}
            <View style={styles.subjectSummaryRow}>
              <View style={styles.subjectSummaryCard}>
                <Text style={styles.subjectSummaryVal}>
                  {checkedIn}
                  <Text style={styles.subjectSummaryValSub}>/{total}</Text>
                </Text>
                <Text style={styles.subjectSummaryLabel}>Checked in</Text>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: total > 0 ? `${(checkedIn / total) * 100}%` : '0%' },
                    ]}
                  />
                </View>
              </View>
              <View style={styles.subjectSummaryCard}>
                <Text style={styles.subjectSummaryVal}>{total - checkedIn}</Text>
                <Text style={styles.subjectSummaryLabel}>Remaining</Text>
              </View>
            </View>

            {/* ── Topic groups ── */}
            {groupedTopics.map(({ domain, topics }) => {
              const isCollapsed   = collapsedDomains.has(domain);
              const groupChecked  = topics.filter((t) => (t.confidence ?? 0) > 0).length;

              return (
                <View key={domain} style={styles.domainSection}>
                  {showDomainHeaders && (
                    <Pressable style={styles.domainHeader} onPress={() => toggleDomain(domain)}>
                      <Text style={styles.domainTitle}>{domain}</Text>
                      <Text style={styles.domainMeta}>{groupChecked}/{topics.length}</Text>
                      <Text style={styles.domainChevron}>{isCollapsed ? '›' : '⌄'}</Text>
                    </Pressable>
                  )}

                  {!isCollapsed && (
                    <View style={styles.domainCard}>
                      {topics.map((item, idx) => {
                        const isCheckedIn = (item.confidence ?? 0) > 0;
                        const ci         = isCheckedIn ? (item.confidence as number) - 1 : 0;
                        const colonIdx   = item.name.indexOf(': ');
                        const shortName  = colonIdx === -1 || domain === 'General'
                          ? item.name
                          : item.name.slice(colonIdx + 2);
                        const isLast     = idx === topics.length - 1;

                        return (
                          <Pressable
                            key={item.id}
                            style={[styles.topicRow, isLast && styles.topicRowLast]}
                            onPress={() => openSheet(item)}
                          >
                            <View style={{ flex: 1 }}>
                              <Text style={styles.topicName}>{shortName}</Text>
                              {isCheckedIn && item.lastPracticedAt ? (
                                <Text style={styles.topicMeta}>
                                  Last: {new Date(item.lastPracticedAt).toLocaleDateString()}
                                </Text>
                              ) : (
                                <Text style={[styles.topicMeta, styles.topicMetaUnchecked]}>
                                  Not checked in
                                </Text>
                              )}
                              {lastNoteByTopic.get(item.id) ? (
                                <Text style={styles.topicNote} numberOfLines={1}>
                                  "{lastNoteByTopic.get(item.id)}"
                                </Text>
                              ) : null}
                            </View>
                            <TopicBars confidence={item.confidence ?? 0} />
                            {isCheckedIn ? (
                              <View style={[styles.confPill, { backgroundColor: CONF_BG[ci] }]}>
                                <Text style={[styles.confPillText, { color: CONF_TEXT[ci] }]}>
                                  {item.confidence}/5
                                </Text>
                              </View>
                            ) : (
                              <View style={[styles.confPill, styles.confPillUnchecked]}>
                                <Text style={styles.confPillTextUnchecked}>–</Text>
                              </View>
                            )}
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>
    );
  };

  // ── Render: bottom sheet ──────────────────────────────────────────────────────
  const renderSheet = () => (
    <Modal
      visible={sheetVisible}
      transparent
      animationType="none"
      onRequestClose={closeSheet}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.sheetOverlay}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={closeSheet} />
        <Animated.View
          style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
        >
          <View style={styles.sheetHandle} />

          <Text style={styles.sheetTopic} numberOfLines={2}>
            {sheetTopic?.name}
          </Text>
          <Text style={styles.sheetSubject}>{selectedSubject?.name}</Text>

          {sheetTopic?.lastPracticedAt ? (
            <Text style={styles.sheetLastCheckin}>
              Last checked in: {new Date(sheetTopic.lastPracticedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
          ) : (
            <Text style={styles.sheetLastCheckin}>Not checked in yet</Text>
          )}

          <Text style={styles.sheetLabel}>How confident are you?</Text>
          <View style={styles.confSelector}>
            {([1, 2, 3, 4, 5] as const).map((v) => {
              const selected = confidence === v;
              return (
                <Pressable
                  key={v}
                  style={[
                    styles.confBtn,
                    selected && {
                      backgroundColor: CONF_BAR_COLORS[v - 1],
                      borderColor: CONF_BAR_COLORS[v - 1],
                    },
                  ]}
                  onPress={() => setConfidence(v)}
                >
                  <Text style={[styles.confBtnText, selected && { color: '#FFF' }]}>
                    {v}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.sheetLabel}>Note (optional)</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="What did you struggle with?"
            placeholderTextColor={theme.colors.textMuted}
            style={styles.noteInput}
            multiline
            editable={!busy}
          />

          {selectedSubject && PAST_PAPER_LINKS[selectedSubject.name] && (
            <Pressable
              onPress={() => void Linking.openURL(PAST_PAPER_LINKS[selectedSubject!.name])}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                gap: 6, paddingVertical: 10, marginBottom: 8,
              }}
            >
              <Text style={{ fontSize: 13, color: theme.colors.accent, fontWeight: '600' }}>
                Find past questions →
              </Text>
            </Pressable>
          )}

          <Pressable
            style={[
              styles.saveBtn,
              (busy || confidence === null) && { opacity: 0.4 },
            ]}
            onPress={submit}
            disabled={busy || confidence === null}
          >
            <Text style={styles.saveBtnText}>{busy ? 'Saving…' : 'Save check-in'}</Text>
          </Pressable>
          {confidence === null && (
            <Text style={styles.saveHint}>Pick a confidence level to save</Text>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );

  // ── Root render ───────────────────────────────────────────────────────────────
  return (
    <>
      {!selectedSubject ? renderSubjectGrid() : renderTopicList()}
      {renderSheet()}

      {/* ── Milestone celebration overlay ── */}
      {celebration && (
        <Animated.View
          style={{
            ...StyleSheet.absoluteFillObject,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: celebrationAnim,
            transform: [{ scale: celebrationAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }],
          }}
        >
          {/* Full-screen tap blocker — dismisses on tap outside the card */}
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setCelebration(null)}
          />
          <Pressable
            style={{
              backgroundColor: 'rgba(10,10,12,0.93)',
              borderRadius: 28,
              paddingHorizontal: 32,
              paddingVertical: 28,
              alignItems: 'center',
              gap: 10,
              marginHorizontal: 32,
            }}
            onPress={() => setCelebration(null)}
          >
            <Text style={{ fontSize: 64 }}>{celebration.emoji}</Text>
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', letterSpacing: -0.3 }}>
              {celebration.title}
            </Text>
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', textAlign: 'center', lineHeight: 19 }}>
              {celebration.sub}
            </Text>
            {celebration.link && (
              <Pressable
                onPress={() => {
                  setCelebration(null);
                  void Linking.openURL(celebration.link!);
                }}
                style={{
                  marginTop: 4,
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.2)',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#FAC775', textAlign: 'center' }}>
                  Need more help? Find past questions →
                </Text>
              </Pressable>
            )}
            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 4 }}>tap to dismiss</Text>
          </Pressable>
        </Animated.View>
      )}
    </>
  );
}
