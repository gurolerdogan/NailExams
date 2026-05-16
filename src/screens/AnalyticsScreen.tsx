import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ViewShot, { type ViewShotRef } from 'react-native-view-shot';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { usePlus } from '../context/PlusContext';
import { loadAttempts } from '../services/storage/practiceStorage';
import { loadTopics } from '../services/storage/nailexamsStorage';
import { logEvent } from '../services/logging/logEvent';
import { TILE_PALETTE } from '../constants/palette';
import type { PracticeAttempt } from '../types/practice';
import type { Topic } from '../types/models';
import type { Theme } from '../themes';

const CONF_COLORS = ['#E24B4A', '#EF9F27', '#FAC775', '#97C459', '#1D9E75'];
const CONF_LABELS = ['Struggling', 'Getting there', 'Nearly there', 'Confident', 'Nailed it'];

type Range = 30 | 60 | 90;

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Group attempts by calendar week (Mon–Sun), return last N weeks */
function groupByWeek(
  attempts: PracticeAttempt[],
  days: number,
): Array<{ weekLabel: string; avgConf: number; count: number }> {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const filtered = attempts.filter((a) => a.ts >= cutoff);
  if (!filtered.length) return [];

  const byWeek = new Map<string, number[]>();
  for (const a of filtered) {
    const d = new Date(a.ts);
    const dow = (d.getDay() + 6) % 7; // Mon=0
    const mon = new Date(d);
    mon.setDate(d.getDate() - dow);
    mon.setHours(0, 0, 0, 0);
    const key = toISODate(mon);
    const arr = byWeek.get(key) ?? [];
    arr.push(a.confidence);
    byWeek.set(key, arr);
  }

  return Array.from(byWeek.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([iso, confs]) => {
      const d = new Date(iso + 'T00:00:00');
      const weekLabel = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const avgConf = confs.reduce((s, c) => s + c, 0) / confs.length;
      return { weekLabel, avgConf, count: confs.length };
    });
}

function ConfidenceChart({
  weeks,
  accentColor,
  cardBg,
  textMuted,
}: {
  weeks: ReturnType<typeof groupByWeek>;
  accentColor: string;
  cardBg: string;
  textMuted: string;
}) {
  if (!weeks.length) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 32 }}>
        <Text style={{ color: textMuted, fontSize: 13 }}>No check-ins in this period yet.</Text>
      </View>
    );
  }

  const maxCount = Math.max(...weeks.map((w) => w.count), 1);

  return (
    <View style={{ gap: 6 }}>
      {weeks.map((w, i) => {
        const conf     = Math.round(w.avgConf); // 1–5
        const barColor = CONF_COLORS[conf - 1] ?? accentColor;
        const pct      = w.count / maxCount;
        return (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 10, color: textMuted, width: 36, textAlign: 'right' }}>
              {w.weekLabel}
            </Text>
            <View style={{ flex: 1, height: 22, backgroundColor: cardBg, borderRadius: 6, overflow: 'hidden' }}>
              <View
                style={{
                  width: `${Math.max(pct * 100, 4)}%`,
                  height: '100%',
                  backgroundColor: barColor,
                  borderRadius: 6,
                }}
              />
            </View>
            <Text style={{ fontSize: 10, color: barColor, fontWeight: '700', width: 20 }}>
              {conf}/5
            </Text>
          </View>
        );
      })}
      <Text style={{ fontSize: 11, color: textMuted, marginTop: 4 }}>
        Bar width = check-in volume · colour = avg confidence that week
      </Text>
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.screenBg },
    content:   { padding: 16, paddingBottom: 48 },

    screenTitle: {
      fontSize: 22, fontWeight: theme.fonts.headingWeight,
      color: theme.colors.textPrimary, marginBottom: 4,
      fontFamily: theme.fonts.heading, letterSpacing: theme.fonts.letterSpacingHeading,
    },
    screenSub: { fontSize: 13, color: theme.colors.textMuted, marginBottom: 20 },

    rangeRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
    rangeChip: {
      flex: 1, paddingVertical: 8, borderRadius: theme.radii.button,
      alignItems: 'center', borderWidth: 1, borderColor: theme.colors.cardBorder,
      backgroundColor: theme.colors.cardBg,
    },
    rangeChipActive: {
      backgroundColor: theme.colors.buttonPrimaryBg,
      borderColor: theme.colors.buttonPrimaryBg,
    },
    rangeChipText: { fontSize: 13, fontWeight: '500', color: theme.colors.textPrimary },
    rangeChipTextActive: { color: theme.colors.buttonPrimaryText },

    subjectPill: {
      flexDirection: 'row', gap: 8, marginBottom: 20,
    },
    pill: {
      paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
      backgroundColor: theme.colors.cardBg, borderWidth: 1, borderColor: theme.colors.cardBorder,
    },
    pillActive: { backgroundColor: theme.colors.buttonPrimaryBg, borderColor: theme.colors.buttonPrimaryBg },
    pillText: { fontSize: 12, fontWeight: '600', color: theme.colors.textPrimary },
    pillTextActive: { color: theme.colors.buttonPrimaryText },

    card: {
      backgroundColor: theme.colors.cardBg, borderRadius: theme.radii.card,
      padding: 14, marginBottom: 14,
    },
    cardTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 12 },

    statsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
    statCard: { flex: 1, backgroundColor: theme.colors.cardBg, borderRadius: 12, padding: 10 },
    statVal:  { fontSize: 22, fontWeight: '700', color: theme.colors.textPrimary },
    statLabel: { fontSize: 11, color: theme.colors.textMuted, marginTop: 1 },

    topicRow: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingVertical: 9, borderBottomWidth: 0.5, borderBottomColor: theme.colors.divider,
    },
    topicDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
    topicName: { flex: 1, fontSize: 13, color: theme.colors.textPrimary },
    topicConf: { fontSize: 12, fontWeight: '700' },

    shareBtn: {
      backgroundColor: theme.colors.buttonPrimaryBg, borderRadius: theme.radii.button,
      paddingVertical: 14, alignItems: 'center', marginTop: 4,
    },
    shareBtnText: { fontSize: 14, fontWeight: '600', color: theme.colors.buttonPrimaryText },

    lockedBanner: {
      alignItems: 'center', padding: 40, gap: 12,
    },
    lockedEmoji: { fontSize: 40 },
    lockedTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary },
    lockedSub:   { fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 19 },
    lockedBtn: {
      backgroundColor: theme.colors.buttonPrimaryBg, borderRadius: theme.radii.button,
      paddingHorizontal: 24, paddingVertical: 12, marginTop: 4,
    },
    lockedBtnText: { fontSize: 14, fontWeight: '600', color: theme.colors.buttonPrimaryText },
  });
}

export default function AnalyticsScreen() {
  const { subjects } = useAuth();
  const { theme }    = useTheme();
  const { isPlus }   = usePlus();

  const styles = useMemo(() => createStyles(theme), [theme]);

  const [attempts, setAttempts]       = useState<PracticeAttempt[]>([]);
  const [topics, setTopics]           = useState<Topic[]>([]);
  const [range, setRange]             = useState<Range>(30);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [sharing, setSharing]         = useState(false);
  const cardRef = useRef<ViewShotRef>(null);

  const load = useCallback(async () => {
    const [a, t] = await Promise.all([loadAttempts(), loadTopics()]);
    setAttempts(a);
    setTopics(t);
  }, []);

  useEffect(() => { void load(); }, [load]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  // Auto-select first subject
  useEffect(() => {
    if (subjects.length > 0 && !selectedSubjectId) {
      setSelectedSubjectId(subjects[0].id);
    }
  }, [subjects, selectedSubjectId]);

  const subjectIdx = useMemo(() => {
    const map = new Map<string, number>();
    subjects.forEach((s, i) => map.set(s.id, i));
    return map;
  }, [subjects]);

  const cutoff = useMemo(() => Date.now() - range * 24 * 60 * 60 * 1000, [range]);

  const filteredAttempts = useMemo(
    () => attempts.filter(
      (a) => a.ts >= cutoff && (!selectedSubjectId || a.subjectId === selectedSubjectId),
    ),
    [attempts, cutoff, selectedSubjectId],
  );

  const weeks = useMemo(() => {
    const relevant = selectedSubjectId
      ? attempts.filter((a) => a.subjectId === selectedSubjectId)
      : attempts;
    return groupByWeek(relevant, range);
  }, [attempts, selectedSubjectId, range]);

  const totalCheckIns = filteredAttempts.length;
  const avgConfidence = totalCheckIns > 0
    ? (filteredAttempts.reduce((s, a) => s + a.confidence, 0) / totalCheckIns).toFixed(1)
    : '—';

  // Most-improved topics in the range (last confidence vs first confidence)
  const topicTrend = useMemo(() => {
    const byTopic = new Map<string, PracticeAttempt[]>();
    for (const a of filteredAttempts) {
      const arr = byTopic.get(a.topicId) ?? [];
      arr.push(a);
      byTopic.set(a.topicId, arr);
    }
    return Array.from(byTopic.entries())
      .map(([topicId, atts]) => {
        const sorted = [...atts].sort((a, b) => a.ts - b.ts);
        const delta  = sorted[sorted.length - 1].confidence - sorted[0].confidence;
        const latest = sorted[sorted.length - 1].confidence;
        return { topicId, delta, latest, count: sorted.length };
      })
      .sort((a, b) => b.delta - a.delta || b.count - a.count)
      .slice(0, 5);
  }, [filteredAttempts]);

  const topicMap = useMemo(() => new Map(topics.map((t) => [t.id, t])), [topics]);

  const onShare = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      // Try image card first
      let uri: string | null = null;
      if (cardRef.current?.capture) {
        try { uri = await (cardRef.current as ViewShotRef).capture(); } catch { /* fall through */ }
      }

      if (uri) {
        await Share.share({ url: uri });
      } else {
        // Fallback: plain text (Android or if capture fails)
        const subject = subjects.find((s) => s.id === selectedSubjectId);
        const lines = [
          `📊 NailExams Progress Report`,
          `Period: Last ${range} days${subject ? ` · ${subject.name}` : ''}`,
          ``,
          `Check-ins: ${totalCheckIns}`,
          `Avg confidence: ${avgConfidence}/5`,
          ``,
        ];
        if (topicTrend.length) {
          lines.push(`Most improved topics:`);
          for (const t of topicTrend) {
            const topic = topicMap.get(t.topicId);
            if (!topic) continue;
            const arrow = t.delta > 0 ? `↑${t.delta}` : t.delta < 0 ? `↓${Math.abs(t.delta)}` : '→';
            lines.push(`  ${arrow}  ${topic.name}`);
          }
        }
        lines.push(`\nGenerated with NailExams`);
        await Share.share({ message: lines.join('\n') });
      }
      void logEvent('progress_shared', { range, subjectId: selectedSubjectId, format: uri ? 'image' : 'text' });
    } catch { /* user dismissed */ }
    setSharing(false);
  };

  if (!isPlus) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.lockedBanner}>
        <Text style={styles.lockedEmoji}>📊</Text>
        <Text style={styles.lockedTitle}>Analytics · Plus</Text>
        <Text style={styles.lockedSub}>
          See your confidence trend over time, track your most improved topics,
          and share your progress. Available on NailExams Plus.
        </Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.screenTitle}>Analytics</Text>
      <Text style={styles.screenSub}>Your confidence over time</Text>

      {/* Range selector */}
      <View style={styles.rangeRow}>
        {([30, 60, 90] as Range[]).map((r) => (
          <Pressable
            key={r}
            style={[styles.rangeChip, range === r && styles.rangeChipActive]}
            onPress={() => setRange(r)}
          >
            <Text style={[styles.rangeChipText, range === r && styles.rangeChipTextActive]}>
              {r} days
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Subject filter */}
      {subjects.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
          <View style={styles.subjectPill}>
            <Pressable
              style={[styles.pill, !selectedSubjectId && styles.pillActive]}
              onPress={() => setSelectedSubjectId(null)}
            >
              <Text style={[styles.pillText, !selectedSubjectId && styles.pillTextActive]}>All</Text>
            </Pressable>
            {subjects.map((s) => {
              const palette = TILE_PALETTE[(subjectIdx.get(s.id) ?? 0) % TILE_PALETTE.length];
              const active  = selectedSubjectId === s.id;
              return (
                <Pressable
                  key={s.id}
                  style={[styles.pill, active && { backgroundColor: palette.bg, borderColor: palette.bg }]}
                  onPress={() => setSelectedSubjectId(s.id)}
                >
                  <Text style={[styles.pillText, active && { color: palette.text }]}>{s.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* Summary stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={[styles.statVal, { color: theme.colors.accent }]}>{totalCheckIns}</Text>
          <Text style={styles.statLabel}>Check-ins</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statVal, { color: '#1D9E75' }]}>{avgConfidence}</Text>
          <Text style={styles.statLabel}>Avg confidence</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statVal]}>{weeks.length}</Text>
          <Text style={styles.statLabel}>Active weeks</Text>
        </View>
      </View>

      {/* Weekly chart */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Weekly confidence trend</Text>
        <ConfidenceChart
          weeks={weeks}
          accentColor={theme.colors.accent}
          cardBg={theme.colors.screenBg}
          textMuted={theme.colors.textMuted}
        />
      </View>

      {/* Most improved topics */}
      {topicTrend.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Most improved topics</Text>
          {topicTrend.map((t, i) => {
            const topic   = topicMap.get(t.topicId);
            if (!topic) return null;
            const color   = CONF_COLORS[t.latest - 1];
            const arrow   = t.delta > 0 ? `↑${t.delta}` : t.delta < 0 ? `↓${Math.abs(t.delta)}` : '→';
            const isLast  = i === topicTrend.length - 1;
            return (
              <View key={t.topicId} style={[styles.topicRow, isLast && { borderBottomWidth: 0 }]}>
                <View style={[styles.topicDot, { backgroundColor: color }]} />
                <Text style={styles.topicName} numberOfLines={1}>{topic.name}</Text>
                <Text style={[styles.topicConf, { color }]}>{arrow}</Text>
                <Text style={[styles.topicConf, { color, marginLeft: 4 }]}>{t.latest}/5</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Share */}
      <Pressable style={[styles.shareBtn, sharing && { opacity: 0.5 }]} onPress={onShare} disabled={sharing}>
        <Text style={styles.shareBtnText}>{sharing ? 'Sharing…' : 'Share progress report'}</Text>
      </Pressable>

      {/* Hidden branded card — captured by ViewShot when sharing */}
      <View style={{ position: 'absolute', left: -9999, top: -9999 }}>
        <ViewShot ref={cardRef} options={{ format: 'png', quality: 1 }}>
          <View style={{
            width: 360, backgroundColor: '#0A0A0C',
            borderRadius: 20, padding: 24, gap: 16,
          }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800', letterSpacing: -0.5 }}>
                NailExams
              </Text>
              <View style={{ backgroundColor: '#1C1C22', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ color: '#888', fontSize: 11, fontWeight: '600' }}>
                  {range}-day report
                </Text>
              </View>
            </View>

            {/* Subject name */}
            {selectedSubjectId && (
              <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '700' }}>
                {subjects.find((s) => s.id === selectedSubjectId)?.name ?? ''}
              </Text>
            )}

            {/* Stats row */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {[
                { val: String(totalCheckIns), label: 'Check-ins' },
                { val: `${avgConfidence}/5`, label: 'Avg confidence' },
                { val: String(weeks.length), label: 'Active weeks' },
              ].map(({ val, label }) => (
                <View key={label} style={{ flex: 1, backgroundColor: '#1C1C22', borderRadius: 12, padding: 10 }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '700' }}>{val}</Text>
                  <Text style={{ color: '#666', fontSize: 10, marginTop: 2 }}>{label}</Text>
                </View>
              ))}
            </View>

            {/* Confidence bars */}
            {weeks.length > 0 && (
              <View style={{ gap: 5 }}>
                {weeks.slice(-6).map((w, i) => {
                  const conf  = Math.round(w.avgConf);
                  const color = CONF_COLORS[conf - 1] ?? '#888';
                  const maxC  = Math.max(...weeks.map((x) => x.count), 1);
                  return (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ color: '#555', fontSize: 9, width: 30, textAlign: 'right' }}>{w.weekLabel}</Text>
                      <View style={{ flex: 1, height: 16, backgroundColor: '#1C1C22', borderRadius: 4, overflow: 'hidden' }}>
                        <View style={{ width: `${Math.max((w.count / maxC) * 100, 4)}%`, height: '100%', backgroundColor: color, borderRadius: 4 }} />
                      </View>
                      <Text style={{ color, fontSize: 9, fontWeight: '700', width: 18 }}>{conf}/5</Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Top improved topics */}
            {topicTrend.slice(0, 3).length > 0 && (
              <View style={{ gap: 6 }}>
                <Text style={{ color: '#555', fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Most improved
                </Text>
                {topicTrend.slice(0, 3).map((t) => {
                  const topic = topicMap.get(t.topicId);
                  if (!topic) return null;
                  const color = CONF_COLORS[t.latest - 1];
                  const arrow = t.delta > 0 ? `↑${t.delta}` : '→';
                  return (
                    <View key={t.topicId} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ color, fontWeight: '700', fontSize: 11, width: 24 }}>{arrow}</Text>
                      <Text style={{ color: '#CCC', fontSize: 12, flex: 1 }} numberOfLines={1}>{topic.name}</Text>
                      <Text style={{ color, fontSize: 11, fontWeight: '700' }}>{t.latest}/5</Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Footer */}
            <Text style={{ color: '#333', fontSize: 10, textAlign: 'center', marginTop: 4 }}>
              nailexams.app
            </Text>
          </View>
        </ViewShot>
      </View>
    </ScrollView>
  );
}
