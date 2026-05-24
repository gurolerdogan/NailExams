import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  AppState,
  Easing,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { usePlus } from '../context/PlusContext';
import type { Topic } from '../types/models';
import { loadTopics, saveTopics } from '../services/storage/nailexamsStorage';
import { appendAttempt, loadAttempts } from '../services/storage/practiceStorage';
import type { PracticeAttempt } from '../types/practice';
import { uuid } from '../utils/id';
import { now } from '../utils/time';
import { logEvent } from '../services/logging/logEvent';
import { PAST_PAPER_LINKS } from '../data/pastPaperLinks';
import { maybePromptOnNailedIt } from '../utils/reviewPrompt';
import { getActiveFastLaneIds } from '../utils/fastLane';
import { computeStreak } from '../utils/streak';
import { loadPlan } from '../services/storage/planStorage';
import { getEstimatedMinutes } from '../utils/catalog';
import { getTipForSession } from '../notifications/revisionTips';
import { getIntentionPlaceholder } from '../utils/intentionPlaceholders';
import { checkForNewBadges, markBadgesSeen } from '../services/badges/badgeService';
import { BADGE_BY_ID, type BadgeId } from '../types/badges';
import TopicNailedCard from '../components/share/TopicNailedCard';
import SubjectClearedCard from '../components/share/SubjectClearedCard';
import BadgeUnlockCard from '../components/share/BadgeUnlockCard';
import { shareCardImage } from '../components/share/shareCard';
import type { AppTabParamList } from '../navigation/TabNavigator';
import type { PracticeStackParamList } from '../navigation/PracticeNavigator';
import type { Theme } from '../themes';

const CONF_BAR_COLORS = ['#E24B4A', '#EF9F27', '#FAC775', '#97C459', '#1D9E75'];

// Height of each digit row in the rolling-column timer display.
// Must match the lineHeight set on digit Text elements.
const DIGIT_H = 34;


type SessionRoute = RouteProp<PracticeStackParamList, 'Session'>;
type SessionNav = NativeStackNavigationProp<PracticeStackParamList, 'Session'>;

function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.screenBg },
    content: { padding: 20, paddingBottom: 40 },

    sessionTile: {
      backgroundColor: '#085041',
      borderRadius: 20,
      padding: 24,
      marginBottom: 24,
      alignItems: 'center' as const,
      gap: 5,
    },
    sessionTileIconWrap: {
      width: 72, height: 72, borderRadius: 36,
      backgroundColor: 'rgba(255,255,255,0.12)',
      alignItems: 'center' as const, justifyContent: 'center' as const,
      marginBottom: 10,
    },
    sessionTileTag: {
      fontSize: 10, color: 'rgba(255,255,255,0.45)',
      fontWeight: '700' as const, letterSpacing: 1.4,
      textTransform: 'uppercase' as const,
    },
    sessionTileSubject: {
      fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '500' as const,
    },
    sessionTileTopic: {
      fontSize: 20, color: '#FFFFFF', fontWeight: '800' as const,
      textAlign: 'center' as const, lineHeight: 26, marginTop: 2,
    },
    sessionTileProgressRow: {
      marginTop: 16, width: '100%' as const, gap: 5,
    },
    sessionTileTrack: {
      height: 5, backgroundColor: 'rgba(255,255,255,0.18)',
      borderRadius: 3, overflow: 'hidden' as const,
    },
    sessionTileFill: { height: '100%' as const, backgroundColor: 'rgba(255,255,255,0.75)', borderRadius: 3 },
    sessionTileProgressLabel: {
      fontSize: 10, color: 'rgba(255,255,255,0.4)', textAlign: 'right' as const,
    },

    lastCheckin: { fontSize: 11, color: theme.colors.textMuted, marginBottom: 18, fontStyle: 'italic' },
    label: { fontSize: 12, color: theme.colors.textSecondary, marginBottom: 8 },

    intentionInput: {
      borderWidth: 0.5,
      borderColor: theme.colors.inputBorder,
      borderRadius: theme.radii.input,
      padding: 12,
      fontSize: 14,
      color: theme.colors.inputText,
      backgroundColor: theme.colors.inputBg,
      marginBottom: 12,
      minHeight: 90,
      textAlignVertical: 'top',
    },

    startBtn: {
      backgroundColor: theme.colors.buttonPrimaryBg,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
    },
    startBtnText: { color: theme.colors.buttonPrimaryText, fontSize: 14, fontWeight: '600' },

    skipBtn: {
      marginTop: 10,
      borderRadius: 14,
      paddingVertical: 13,
      alignItems: 'center',
      backgroundColor: '#E1F5EE',
    },
    skipBtnText: { fontSize: 14, fontWeight: '600', color: '#085041' },

    intentionDisplay: { fontSize: 11, color: theme.colors.textMuted, marginBottom: 10, fontStyle: 'italic' },

    timerBlock: {
      backgroundColor: '#E1F5EE', borderRadius: 12,
      padding: 14, marginBottom: 10,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    timerDigits: { flexDirection: 'row', alignItems: 'baseline' },
    timerNumber: { fontFamily: 'monospace', fontSize: 28, fontWeight: '500', color: '#085041' },
    timerStatus: { fontSize: 10, color: '#085041', opacity: 0.7 },
    timerPauseBtn: {
      width: 36, height: 36, borderRadius: 10,
      backgroundColor: '#1D9E75', alignItems: 'center', justifyContent: 'center',
    },
    timerPauseBtnText: { color: '#FFF', fontSize: 14 },

    tipBlock: { backgroundColor: '#FAEEDA', borderRadius: 10, padding: 12, marginBottom: 12, flexDirection: 'row', gap: 8 },
    tipText: { fontSize: 12, color: '#633806', lineHeight: 18, flex: 1 },

    bgHint: { fontSize: 10, color: theme.colors.textMuted, textAlign: 'center', marginBottom: 8 },

    finishLink: { alignItems: 'center', paddingVertical: 8 },
    finishLinkText: { fontSize: 12, color: theme.colors.textMuted, textDecorationLine: 'underline' },

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

    pastPaperLink: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 6, paddingVertical: 10, marginBottom: 8,
    },
    pastPaperLinkText: { fontSize: 13, color: theme.colors.accent, fontWeight: '600' },

    saveBtn: {
      backgroundColor: theme.colors.buttonPrimaryBg,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
    },
    saveBtnText: { color: theme.colors.buttonPrimaryText, fontSize: 14, fontWeight: '600' },
    saveHint: { textAlign: 'center', fontSize: 11, color: theme.colors.textMuted, marginTop: 8 },

    exitBtn: {
      marginTop: 10,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center' as const,
      backgroundColor: theme.colors.cardBg,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
    },
    exitBtnText: { fontSize: 14, fontWeight: '500' as const, color: theme.colors.textSecondary },
  });
}

export default function SessionScreen() {
  const { subjects } = useAuth();
  const { theme } = useTheme();
  const { isPlus } = usePlus();
  const navigation = useNavigation<SessionNav>();
  const route = useRoute<SessionRoute>();

  const { topicId, subjectId, returnTo } = route.params;

  const styles = useMemo(() => createStyles(theme), [theme]);

  const subject = useMemo(() => subjects.find((s) => s.id === subjectId) ?? null, [subjects, subjectId]);

  const [topic, setTopic] = useState<Topic | null>(null);
  const [allTopics, setAllTopics] = useState<Topic[]>([]);
  const [fastLaneIds, setFastLaneIds] = useState<Set<string>>(new Set());

  const [confidence, setConfidence] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [note, setNote] = useState('');
  const [intention, setIntention] = useState('');
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'running' | 'paused' | 'checkin'>('idle');

  // Synchronous reset when topicId changes — avoids the one-frame flash that
  // useEffect would cause (it fires after the first render with the new topicId).
  const [prevTopicId, setPrevTopicId] = useState(topicId);

  const [celebration, setCelebration] = useState<{
    emoji: string; title: string; sub: string; link?: string;
  } | null>(null);
  const celebrationAnim = useRef(new Animated.Value(0)).current;

  const [badgeToast, setBadgeToast] = useState<BadgeId | null>(null);
  const badgeQueueRef = useRef<BadgeId[]>([]);

  const topicNailedCardRef    = useRef<any>(null);
  const subjectClearedCardRef = useRef<any>(null);
  const badgeCardRef          = useRef<any>(null);
  const [shareCardData, setShareCardData] = useState<{
    type: 'topic_nailed' | 'subject_cleared';
    topicName?: string; subjectName?: string; streak: number;
    startConf?: number; sessionsToNail?: number;
    domainBars?: Array<{ label: string; avgConf: number }>; topicCount?: number;
  } | null>(null);

  // Single Animated.Value that counts from timerDuration down to 0 in real time.
  // Started ONCE per session via Animated.timing — runs entirely on the native/UI thread.
  // Derived digit-column translateY values use Animated math ops (also native-thread),
  // so the display updates at 60 fps with zero JS involvement after start.
  const timerAnim     = useRef(new Animated.Value(25 * 60)).current;
  const timerAnimComp = useRef<Animated.CompositeAnimation | null>(null);

  // Derived translateY for each digit column.
  // Each column holds a stable digit for its full period, then rolls for exactly 1 second
  // *after* the ones-column wrap (matching how a mechanical odometer works).
  const digitYs = useRef((() => {
    const w10  = Animated.modulo(timerAnim, 10);
    const w60  = Animated.modulo(timerAnim, 60);
    const w600 = Animated.modulo(timerAnim, 600);

    // Roll fractions: 0 while stable, ramps 1→0 in the FIRST second after each wrap.
    // The wrap fires when the modulo value jumps from ~0 back to ~period-1 (countdown).
    // So we activate when within is near period-1 and deactivate as it counts down to period-2.
    const roll10  = w10.interpolate({ inputRange: [0, 9, 9.999],   outputRange: [0, 0, 1], extrapolate: 'clamp' });
    const roll60  = w60.interpolate({ inputRange: [0, 59, 59.999],  outputRange: [0, 0, 1], extrapolate: 'clamp' });
    const roll600 = w600.interpolate({ inputRange: [0, 599, 599.999], outputRange: [0, 0, 1], extrapolate: 'clamp' });

    // floor(x) = x - (x % 1)
    const floorOf = (v: Animated.Animated) =>
      Animated.subtract(v as Animated.Value, Animated.modulo(v as Animated.Value, 1));

    // Seconds tens: floor((timerAnim%60)/10)
    // ADD roll so the column starts at oldDigit (floor+1) and animates to newDigit (floor).
    // Clamp to [0,5] to absorb the off-range value at minute boundaries.
    const sTensFloor = floorOf(Animated.divide(w60, 10));
    const sTensRaw   = Animated.add(sTensFloor, roll10);
    const sTens = sTensRaw.interpolate({ inputRange: [0, 5], outputRange: [0, 5], extrapolate: 'clamp' });

    // Minutes ones: floor(timerAnim/60) % 10
    const mOnesFloor = Animated.modulo(floorOf(Animated.divide(timerAnim, 60)), 10);
    const mOnesRaw   = Animated.add(mOnesFloor, roll60);
    const mOnes = mOnesRaw.interpolate({ inputRange: [0, 9], outputRange: [0, 9], extrapolate: 'clamp' });

    // Minutes tens: floor(timerAnim/600) % 10
    const mTensFloor = Animated.modulo(floorOf(Animated.divide(timerAnim, 600)), 10);
    const mTensRaw   = Animated.add(mTensFloor, roll600);
    const mTens = mTensRaw.interpolate({ inputRange: [0, 9], outputRange: [0, 9], extrapolate: 'clamp' });

    // Seconds ones: direct modulo, natural 1-second scroll
    const sOnes = Animated.modulo(timerAnim, 10);

    return [
      Animated.multiply(mTens,  -DIGIT_H as unknown as Animated.Value),
      Animated.multiply(mOnes,  -DIGIT_H as unknown as Animated.Value),
      Animated.multiply(sTens,  -DIGIT_H as unknown as Animated.Value),
      Animated.multiply(sOnes,  -DIGIT_H as unknown as Animated.Value),
    ];
  })()).current;

  // phaseRef / bgTimeRef: let the AppState handler read current phase without stale closures.
  const phaseRef  = useRef<typeof phase>('idle');
  const bgTimeRef = useRef<number | null>(null);

  // Colon opacity: looping native animation while running, static 1 otherwise.
  const colonAnim = useRef(new Animated.Value(1)).current;

  const autoDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Inline timer ──────────────────────────────────────────────────────────
  const timerDuration   = topic ? getEstimatedMinutes(topic.name) * 60 : 25 * 60;
  const startTimeRef    = useRef<number | null>(null);
  const pausedRemaining = useRef<number>(0);
  const currentRemaining = useRef<number>(25 * 60);  // always accurate regardless of React batching
  const tickRef         = useRef<ReturnType<typeof setInterval> | null>(null);

  // Synchronous reset — must come after refs so we can mutate them during render.
  if (prevTopicId !== topicId) {
    setPrevTopicId(topicId);
    setPhase('idle');
    setConfidence(null);
    setNote('');
    setIntention('');
    pausedRemaining.current  = 0;
    currentRemaining.current = 25 * 60;
  }

  function updateTimerDisplay(secs: number) {
    // Snap the native value to the given second (used for resets and background catch-up).
    timerAnim.setValue(Math.max(0, secs));
  }

  function stopTick() {
    if (tickRef.current !== null) { clearInterval(tickRef.current); tickRef.current = null; }
    startTimeRef.current = null;
    // Stop the native Animated.timing so the digit columns freeze.
    if (timerAnimComp.current !== null) { timerAnimComp.current.stop(); timerAnimComp.current = null; }
  }

  function startTickFrom(initialSecs: number) {
    stopTick();
    pausedRemaining.current  = initialSecs;
    currentRemaining.current = initialSecs;
    startTimeRef.current     = Date.now();

    // One continuous native animation drives the digit display for the full duration.
    // It starts once and runs entirely on the UI thread — no JS ticks needed for display.
    timerAnim.setValue(initialSecs);
    timerAnimComp.current = Animated.timing(timerAnim, {
      toValue: 0,
      duration: initialSecs * 1000,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    timerAnimComp.current.start();

    // Interval only tracks wall-clock remaining for background catch-up and done detection.
    tickRef.current = setInterval(() => {
      if (startTimeRef.current === null) return;
      const elapsed   = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const remaining = Math.max(0, pausedRemaining.current - elapsed);
      currentRemaining.current = remaining;
      if (remaining <= 0) { stopTick(); setPhase('checkin'); }
    }, 1000);
  }

  // Clean up on unmount
  useEffect(() => () => { stopTick(); }, []);

  // Side-effects when topicId changes: stop any running tick and reset the display.
  // State is already reset synchronously above (prevTopicId pattern).
  useEffect(() => {
    stopTick();
    updateTimerDisplay(25 * 60);
  }, [topicId]);

  // Keep phaseRef current so the AppState handler below never has a stale closure.
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // When returning from background, stop the native animation and restart it from
  // the wall-clock-accurate remaining time so display stays in sync.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') {
        if (phaseRef.current === 'running') bgTimeRef.current = Date.now();
      } else if (bgTimeRef.current !== null && phaseRef.current === 'running') {
        const elapsed = Math.floor((Date.now() - bgTimeRef.current) / 1000);
        bgTimeRef.current = null;
        if (elapsed > 0) {
          const remaining = Math.max(0, currentRemaining.current - elapsed);
          if (remaining <= 0) { stopTick(); setPhase('checkin'); }
          else startTickFrom(remaining);
        }
      }
    });
    return () => sub.remove();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // ──────────────────────────────────────────────────────────────────────────

  const subjectTopics   = useMemo(() => allTopics.filter((t) => t.subjectId === subjectId), [allTopics, subjectId]);
  const subjectTotal    = subjectTopics.length;
  const subjectCheckedIn = useMemo(() => subjectTopics.filter((t) => (t.confidence ?? 0) > 0).length, [subjectTopics]);

  useEffect(() => {
    if (phase !== 'running') {
      colonAnim.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(colonAnim, { toValue: 0.15, duration: 500, useNativeDriver: true }),
        Animated.timing(colonAnim, { toValue: 1,    duration: 500, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [phase, colonAnim]);

  // Load topic, allTopics, attempts on mount
  useEffect(() => {
    void (async () => {
      const [topics, attempts] = await Promise.all([loadTopics(), loadAttempts()]);
      const found = topics.find((t) => t.id === topicId) ?? null;
      setTopic(found);
      setAllTopics(topics);
      setFastLaneIds(getActiveFastLaneIds(topics, attempts));

      // Pre-fill confidence from existing topic value
      if (found && found.confidence && found.confidence > 0) {
        setConfidence(found.confidence as 1 | 2 | 3 | 4 | 5);
      }

      // Pre-fill note from most recent attempt for this topic
      const topicAttempts = attempts.filter((a) => a.topicId === topicId);
      const lastAttempt = topicAttempts[topicAttempts.length - 1];
      if (lastAttempt?.note) setNote(lastAttempt.note);
    })();
  }, [topicId]);

  // Set header title: topic name at rest, countdown when timer is running/paused
  useEffect(() => {
    if (!topic) return;
    if (phase === 'running' || phase === 'paused') return; // updateTimerDisplay owns the title
    navigation.setOptions({ title: topic.name });
  }, [topic, navigation, phase]);

  // Single exit point: clears the auto-dismiss timer, hides overlay, navigates back.
  const closeAndNavigate = useCallback(() => {
    if (autoDismissRef.current) {
      clearTimeout(autoDismissRef.current);
      autoDismissRef.current = null;
    }
    setCelebration(null);
    if (badgeQueueRef.current.length > 0) {
      setBadgeToast(badgeQueueRef.current[0]);
      badgeQueueRef.current = badgeQueueRef.current.slice(1);
    }
    navigation.goBack();
    if (returnTo) {
      navigation.getParent<BottomTabNavigationProp<AppTabParamList>>()?.navigate(returnTo);
    }
  }, [navigation, returnTo]);

  const showCelebration = useCallback((
    payload: { emoji: string; title: string; sub: string; link?: string },
  ) => {
    setCelebration(payload);
    celebrationAnim.setValue(0);
    Animated.spring(celebrationAnim, { toValue: 1, useNativeDriver: true, damping: 14, stiffness: 160 }).start();
    // Auto-navigate after 3.5 s — setTimeout is reliable; animation callback is not.
    if (autoDismissRef.current) clearTimeout(autoDismissRef.current);
    autoDismissRef.current = setTimeout(closeAndNavigate, 3500);
  }, [celebrationAnim, closeAndNavigate]);

  // Clean up timer on unmount
  useEffect(() => () => {
    if (autoDismissRef.current) clearTimeout(autoDismissRef.current);
  }, []);

  const submit = async () => {
    if (busy || !subject || !topic || confidence === null) return;

    try {
      setBusy(true);
      const ts = now();

      const attempt: PracticeAttempt = {
        id: uuid(),
        subjectId: subject.id,
        topicId: topic.id,
        ts,
        confidence,
        note: note.trim() || undefined,
      };

      await appendAttempt(attempt);

      const idx = allTopics.findIndex((t) => t.id === topic.id);
      let nextAll = allTopics;
      if (idx >= 0) {
        const updated: Topic = {
          ...allTopics[idx],
          confidence,
          lastPracticedAt: ts,
          updatedAt: ts,
        };
        nextAll = [...allTopics];
        nextAll[idx] = updated;
        setAllTopics(nextAll);
        await saveTopics(nextAll);
      }

      await logEvent('practice_checkin_saved', {
        subjectId: subject.id,
        topicId: topic.id,
        confidence,
        noteLen: note.trim().length,
      });

      const [allAttempts, plan] = await Promise.all([loadAttempts(), loadPlan()]);
      void maybePromptOnNailedIt(confidence, allAttempts.length);

      const allSubjectTopics = nextAll.filter((t) => t.subjectId === subject.id);
      const allNowHigh = allSubjectTopics.every((t) =>
        t.id === topic.id ? confidence >= 4 : (t.confidence ?? 0) >= 4,
      );
      const pastPaperLink = PAST_PAPER_LINKS[subject.name];

      void checkForNewBadges().then((newBadges) => {
        if (newBadges.length > 0) {
          void markBadgesSeen(newBadges);
          badgeQueueRef.current = newBadges;
        }
      });

      const currentStreak = computeStreak(plan?.sessions ?? []);

      if (allNowHigh && allSubjectTopics.length > 0 && confidence >= 4) {
        void logEvent('subject_completed', { subjectId: subject.id });
        const domainBars = (() => {
          const map = new Map<string, number[]>();
          for (const t of allSubjectTopics) {
            const ci = t.id === topic.id ? confidence : (t.confidence ?? 0);
            const prefix = t.name.includes(': ') ? t.name.split(': ')[0] : 'General';
            const arr = map.get(prefix) ?? [];
            arr.push(ci);
            map.set(prefix, arr);
          }
          return [...map.entries()].map(([label, confs]) => ({
            label,
            avgConf: confs.reduce((s, c) => s + c, 0) / confs.length,
          }));
        })();
        setShareCardData({
          type: 'subject_cleared',
          subjectName: subject.name,
          topicCount: allSubjectTopics.length,
          domainBars,
          streak: currentStreak,
        });
        showCelebration({ emoji: '🏆', title: `${subject.name} complete!`, sub: 'All topics at confident or above' });
      } else {
        const LEVEL_CONTENT: Record<number, { emoji: string; titles: string[]; sub: string }> = {
          1: { emoji: '💪', titles: ["Keep going!", "You've got this!", "Don't give up!"],       sub: "This one needs work — keep revisiting it." },
          2: { emoji: '📖', titles: ["Getting there!", "Keep at it!", "A bit more to go!"],      sub: "A few more practice sessions will help."    },
          3: { emoji: '👍', titles: ["Way to go!", "Keep revising!", "Good progress!"],          sub: "You're building solid understanding."         },
          4: { emoji: '⭐', titles: ["Almost nailed it!", "So close!", "Nearly there!"],         sub: "One more push and you'll have this."          },
          5: { emoji: '🎯', titles: ["Nailed it!", "Outstanding!", "Brilliant work!"],           sub: topic.name                                    },
        };
        const lvl = LEVEL_CONTENT[confidence]!;
        const title = lvl.titles[Math.floor(Math.random() * lvl.titles.length)];
        const link = (confidence <= 2 && pastPaperLink) ? pastPaperLink : undefined;
        if (confidence === 5) {
          void logEvent('topic_nailed', { topicId: topic.id, subjectId: subject.id });
          const topicAttempts = allAttempts.filter((a) => a.topicId === topic.id).sort((a, b) => a.ts - b.ts);
          const startConf = topicAttempts.length > 0 ? topicAttempts[0].confidence : 1;
          setShareCardData({
            type: 'topic_nailed',
            topicName: topic.name,
            subjectName: subject.name,
            streak: currentStreak,
            startConf,
            sessionsToNail: topicAttempts.length,
          });
        }
        showCelebration({ emoji: lvl.emoji, title, sub: lvl.sub, link });
      }
    } catch {
      Alert.alert('Save failed', 'Your check-in could not be saved. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (!topic) {
    return <View style={styles.container} />;
  }

  return (
    <>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Session context tile ── */}
          <View style={styles.sessionTile}>
            <View style={styles.sessionTileIconWrap}>
              <Text style={{ fontSize: 32 }}>🎯</Text>
            </View>
            <Text style={styles.sessionTileTag}>Study Session</Text>
            {subject && (
              <Text style={styles.sessionTileSubject} numberOfLines={1}>{subject.name}</Text>
            )}
            <Text style={styles.sessionTileTopic} numberOfLines={3}>{topic.name}</Text>
            {subjectTotal > 0 && (
              <View style={styles.sessionTileProgressRow}>
                <View style={styles.sessionTileTrack}>
                  <View style={[styles.sessionTileFill, { width: `${(subjectCheckedIn / subjectTotal) * 100}%` }]} />
                </View>
                <Text style={styles.sessionTileProgressLabel}>
                  {subjectCheckedIn}/{subjectTotal} topics checked in
                </Text>
              </View>
            )}
          </View>

          {/* Phase: idle — intention + start timer */}
          {phase === 'idle' && (
            <>
              {topic.lastPracticedAt ? (
                <Text style={styles.lastCheckin}>
                  Last checked in: {new Date(topic.lastPracticedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
              ) : (
                <Text style={styles.lastCheckin}>Not checked in yet</Text>
              )}

              <Text style={styles.label}>What's your goal for this session?</Text>
              <TextInput
                value={intention}
                onChangeText={setIntention}
                placeholder={getIntentionPlaceholder(topic.name)}
                placeholderTextColor={theme.colors.textMuted}
                style={styles.intentionInput}
                multiline
              />

              <Pressable
                style={styles.startBtn}
                onPress={() => {
                  if (intention.trim()) setNote(`Goal: ${intention.trim()}`);
                  setPhase('running');
                  startTickFrom(Math.max(0, timerDuration - 1));
                }}
              >
                <Text style={styles.startBtnText}>
                  Start {Math.round(timerDuration / 60)}-min session
                </Text>
              </Pressable>

              <Pressable onPress={() => setPhase('checkin')} style={styles.skipBtn}>
                <Text style={styles.skipBtnText}>Skip timer and check in now</Text>
              </Pressable>
            </>
          )}

          {/* Phase: running / paused — timer block */}
          {(phase === 'running' || phase === 'paused') && (
            <>
              {intention.trim() ? (
                <Text style={styles.intentionDisplay}>"{intention}"</Text>
              ) : null}

              <View style={styles.timerBlock}>
                <View>
                  <View style={styles.timerDigits}>
                    {digitYs.map((yAnim, i) => (
                      <React.Fragment key={i}>
                        {i === 2 && (
                          <Animated.Text style={[styles.timerNumber, { opacity: colonAnim }]}>:</Animated.Text>
                        )}
                        <View style={{ height: DIGIT_H, overflow: 'hidden' }}>
                          <Animated.View style={{ transform: [{ translateY: yAnim }] }}>
                            {[0,1,2,3,4,5,6,7,8,9].map(d => (
                              <Text key={d} style={[styles.timerNumber, { lineHeight: DIGIT_H, height: DIGIT_H }]}>{d}</Text>
                            ))}
                          </Animated.View>
                        </View>
                      </React.Fragment>
                    ))}
                  </View>
                  <Text style={styles.timerStatus}>
                    {phase === 'paused' ? 'paused' : 'remaining'}
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    if (phase === 'running') {
                      stopTick();  // also sets startTimeRef.current = null
                      pausedRemaining.current = currentRemaining.current;
                      setPhase('paused');
                    } else {
                      setPhase('running');
                      startTickFrom(currentRemaining.current);
                    }
                  }}
                  style={styles.timerPauseBtn}
                >
                  <Text style={styles.timerPauseBtnText}>{phase === 'running' ? '⏸' : '▶'}</Text>
                </Pressable>
              </View>

              <View style={styles.tipBlock}>
                <Text style={{ fontSize: 14, flexShrink: 0 }}>💡</Text>
                <Text style={styles.tipText}>
                  {getTipForSession(topic.confidence ?? 0, fastLaneIds.has(topic.id), topic.id)}
                </Text>
              </View>

              <Text style={styles.bgHint}>Timer keeps running in the background</Text>

              <Pressable
                onPress={() => { stopTick(); setPhase('checkin'); }}
                style={styles.exitBtn}
              >
                <Text style={styles.exitBtnText}>Finish session and check-in</Text>
              </Pressable>
            </>
          )}

          {/* Phase: checkin — confidence selector */}
          {phase === 'checkin' && (
            <>
              <Text style={styles.label}>How confident are you?</Text>
              <View style={styles.confSelector}>
                {([1, 2, 3, 4, 5] as const).map((v) => {
                  const selected = confidence === v;
                  return (
                    <Pressable
                      key={v}
                      style={[
                        styles.confBtn,
                        selected && { backgroundColor: CONF_BAR_COLORS[v - 1], borderColor: CONF_BAR_COLORS[v - 1] },
                      ]}
                      onPress={() => setConfidence(v)}
                    >
                      <Text style={[styles.confBtnText, selected && { color: '#FFF' }]}>{v}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.label}>Note (optional)</Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="What did you struggle with?"
                placeholderTextColor={theme.colors.textMuted}
                style={styles.noteInput}
                multiline
                editable={!busy}
              />

              {subject && PAST_PAPER_LINKS[subject.name] && (
                <Pressable
                  onPress={() => void Linking.openURL(PAST_PAPER_LINKS[subject!.name])}
                  style={styles.pastPaperLink}
                >
                  <Text style={styles.pastPaperLinkText}>Find past questions →</Text>
                </Pressable>
              )}

              <Pressable
                style={[styles.saveBtn, (busy || confidence === null) && { opacity: 0.4 }]}
                onPress={submit}
                disabled={busy || confidence === null}
              >
                <Text style={styles.saveBtnText}>{busy ? 'Saving…' : 'Save check-in'}</Text>
              </Pressable>
              {confidence === null && (
                <Text style={styles.saveHint}>Pick a confidence level to save</Text>
              )}
              <Pressable
                style={styles.exitBtn}
                onPress={closeAndNavigate}
                disabled={busy}
              >
                <Text style={styles.exitBtnText}>Exit without check-in</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Celebration overlay */}
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
          <Pressable style={StyleSheet.absoluteFillObject} onPress={closeAndNavigate} />
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
            onPress={closeAndNavigate}
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
                  closeAndNavigate();
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

            {isPlus && shareCardData && (
              <Pressable
                onPress={() => {
                  const ref = shareCardData.type === 'topic_nailed' ? topicNailedCardRef : subjectClearedCardRef;
                  void shareCardImage(ref, `I just ${shareCardData.type === 'topic_nailed' ? 'nailed' : 'cleared'} ${shareCardData.subjectName ?? shareCardData.topicName} on NailExams!`, 'share_card', { type: shareCardData.type });
                }}
                style={{
                  marginTop: 10,
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 10,
                  paddingHorizontal: 16, paddingVertical: 8,
                }}
              >
                <Text style={{ fontSize: 14 }}>📤</Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#FFF' }}>Share</Text>
              </Pressable>
            )}
          </Pressable>
        </Animated.View>
      )}

      {/* Off-screen share cards */}
      {shareCardData?.type === 'topic_nailed' && (
        <TopicNailedCard
          cardRef={topicNailedCardRef}
          topicName={shareCardData.topicName ?? ''}
          subjectName={shareCardData.subjectName ?? ''}
          streak={shareCardData.streak}
          startConf={shareCardData.startConf ?? 1}
          sessionsToNail={shareCardData.sessionsToNail ?? 1}
        />
      )}
      {shareCardData?.type === 'subject_cleared' && (
        <SubjectClearedCard
          cardRef={subjectClearedCardRef}
          subjectName={shareCardData.subjectName ?? ''}
          topicCount={shareCardData.topicCount ?? 0}
          domainBars={shareCardData.domainBars ?? []}
          streak={shareCardData.streak}
        />
      )}
      {badgeToast && BADGE_BY_ID.get(badgeToast) && (
        <BadgeUnlockCard
          cardRef={badgeCardRef}
          badge={BADGE_BY_ID.get(badgeToast)!}
          streak={0}
        />
      )}

      {/* Badge toast */}
      {badgeToast && (() => {
        const def = BADGE_BY_ID.get(badgeToast);
        if (!def) return null;
        return (
          <Pressable
            onPress={() => setBadgeToast(null)}
            style={{
              position: 'absolute', bottom: 32, left: 16, right: 16,
              backgroundColor: theme.colors.cardBg,
              borderRadius: 16, padding: 16,
              flexDirection: 'row', alignItems: 'center', gap: 12,
              shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 16,
              shadowOffset: { width: 0, height: 4 }, elevation: 8,
              borderWidth: 1, borderColor: theme.colors.cardBorder,
            }}
          >
            <View style={{
              width: 44, height: 44, borderRadius: 12,
              backgroundColor: '#EEEDFE', alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontSize: 22 }}>{def.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, fontWeight: '600', color: '#7F77DD', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 }}>
                Badge unlocked
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: theme.colors.textPrimary }}>{def.name}</Text>
              <Text style={{ fontSize: 11, color: theme.colors.textMuted, marginTop: 1 }}>{def.description}</Text>
              {isPlus && (
                <Pressable
                  onPress={() => void shareCardImage(badgeCardRef, `I just unlocked the "${def.name}" badge on NailExams! ${def.emoji}`, 'share_badge', { badgeId: badgeToast })}
                  style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                >
                  <Text style={{ fontSize: 11, color: '#7F77DD', fontWeight: '600' }}>📤 Share badge</Text>
                </Pressable>
              )}
            </View>
            <Pressable onPress={() => setBadgeToast(null)}>
              <Text style={{ color: theme.colors.textMuted, fontSize: 18 }}>×</Text>
            </Pressable>
          </Pressable>
        );
      })()}
    </>
  );
}
