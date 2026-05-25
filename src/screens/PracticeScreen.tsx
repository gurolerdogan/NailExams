import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import type { Subject, Topic } from '../types/models';
import { loadTopics } from '../services/storage/nailexamsStorage';
import { loadAttempts } from '../services/storage/practiceStorage';
import { getActiveFastLaneIds } from '../utils/fastLane';
import type { AppTabParamList } from '../navigation/TabNavigator';
import type { PracticeStackParamList } from '../navigation/PracticeNavigator';
import EmptyState from '../components/EmptyState';
import { TILE_PALETTE } from '../constants/palette';
import type { Theme, ProgressChartType, CheckedInType } from '../themes';

const CONF_BAR_COLORS = ['#E24B4A', '#EF9F27', '#FAC775', '#97C459', '#1D9E75'];
const CONF_BG         = ['#FCEBEB', '#FAEEDA', '#FEF9C3', '#EAF3DE', '#E1F5EE'];
const CONF_TEXT       = ['#A32D2D', '#633806', '#854D0E', '#27500A', '#085041'];

type PracticeRoute = RouteProp<PracticeStackParamList, 'PracticeHome'>;

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
  });
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function PracticeScreen() {
  const { subjects } = useAuth();
  const { theme } = useTheme();
  const route = useRoute<PracticeRoute>();
  const navigation = useNavigation<NativeStackNavigationProp<PracticeStackParamList, 'PracticeHome'>>();

  const styles = useMemo(() => createStyles(theme), [theme]);

  const subjectIdFromNav = route.params?.subjectId;

  const [allTopics, setAllTopics]               = useState<Topic[]>([]);
  const [selectedSubject, setSelectedSubject]   = useState<Subject | null>(null);
  const [collapsedDomains, setCollapsedDomains] = useState<Set<string>>(new Set());
  const [lastNoteByTopic, setLastNoteByTopic]   = useState<Map<string, string>>(new Map());
  const [fastLaneIds, setFastLaneIds]           = useState<Set<string>>(new Set());

  // ── Load topics + attempts ────────────────────────────────────────────────────
  const refreshTopics = useCallback(async () => {
    const [data, attempts] = await Promise.all([loadTopics(), loadAttempts()]);
    setAllTopics(data);
    setFastLaneIds(getActiveFastLaneIds(data, attempts));
    const noteMap = new Map<string, string>();
    for (const a of attempts) {
      if (a.note) noteMap.set(a.topicId, a.note);
    }
    setLastNoteByTopic(noteMap);
  }, []);

  useEffect(() => { void refreshTopics(); }, [refreshTopics]);
  useFocusEffect(useCallback(() => { void refreshTopics(); }, [refreshTopics]));

  // ── Handle inbound subjectId param (from Home tile) ───────────────────────────
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
          onCta={() =>
            navigation
              .getParent<BottomTabNavigationProp<AppTabParamList>>()
              ?.navigate('Settings', { screen: 'EditSubjects' })
          }
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
                        const isFastLane = fastLaneIds.has(item.id);

                        return (
                          <Pressable
                            key={item.id}
                            style={[
                              styles.topicRow,
                              isLast && styles.topicRowLast,
                              isFastLane && { borderLeftWidth: 3, borderLeftColor: '#E24B4A', paddingLeft: 10 },
                            ]}
                            onPress={() => navigation.navigate('Session', { topicId: item.id, subjectId: item.subjectId })}
                          >
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                {isFastLane && (
                                  <Text style={{ fontSize: 11 }}>🚨</Text>
                                )}
                                <Text style={[styles.topicName, isFastLane && { color: '#A32D2D' }]} numberOfLines={1}>
                                  {shortName}
                                </Text>
                              </View>
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

  // ── Root render ───────────────────────────────────────────────────────────────
  return !selectedSubject ? renderSubjectGrid() : renderTopicList();
}
