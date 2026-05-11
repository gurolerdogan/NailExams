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
import type { Subject, Topic } from '../types/models';
import { loadTopics, saveTopics } from '../services/storage/nailexamsStorage';
import { appendAttempt, loadAttempts } from '../services/storage/practiceStorage';
import type { PracticeAttempt } from '../types/practice';
import { uuid } from '../utils/id';
import { now } from '../utils/time';
import { logEvent } from '../services/logging/logEvent';
import type { AppTabParamList } from '../navigation/TabNavigator';
import EmptyState from '../components/EmptyState';
import { TILE_PALETTE } from '../constants/palette';

const CONF_BAR_COLORS = ['#E24B4A', '#EF9F27', '#FAC775', '#97C459', '#1D9E75'];
const CONF_BG         = ['#FCEBEB', '#FAEEDA', '#FEF9C3', '#EAF3DE', '#E1F5EE'];
const CONF_TEXT       = ['#A32D2D', '#633806', '#854D0E', '#27500A', '#085041'];

type PracticeRoute = RouteProp<AppTabParamList, 'Practice'>;

// ─── Small reusable components ────────────────────────────────────────────────

/** 5-bar confidence chart used on subject tiles — skips topics with confidence === 0 */
function TileBars({ bars }: { bars: number[] }) {
  const max = Math.max(...bars, 1);
  return (
    <View style={styles.barsRow}>
      {bars.map((count, i) => (
        <View
          key={i}
          style={[
            styles.tileBar,
            {
              height: Math.max(4, Math.round((count / max) * 20)),
              backgroundColor: CONF_BAR_COLORS[i],
              opacity: count === 0 ? 0.2 : 1,
            },
          ]}
        />
      ))}
    </View>
  );
}

/** Stepped bar row used on topic rows — empty (all grey) when confidence is 0 */
function TopicBars({ confidence }: { confidence: number }) {
  return (
    <View style={styles.topicBarsRow}>
      {[0, 1, 2, 3, 4].map((i) => (
        <View
          key={i}
          style={[
            styles.topicBar,
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

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function PracticeScreen() {
  const { subjects } = useAuth();
  const route = useRoute<PracticeRoute>();
  const tabNav = useNavigation<BottomTabNavigationProp<AppTabParamList>>();

  const subjectIdFromNav = route.params?.subjectId;
  const topicIdFromNav   = route.params?.topicId;

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

  const slideAnim = useRef(new Animated.Value(300)).current;

  // Keep a ref so openSheet can read the latest notes without being a dep of the
  // topicIdFromNav effect — prevents the sheet from re-opening after every save.
  const lastNoteByTopicRef = useRef(lastNoteByTopic);
  lastNoteByTopicRef.current = lastNoteByTopic;

  const openSheet = useCallback((topic: Topic) => {
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

  useEffect(() => {
    if (!topicIdFromNav || allTopics.length === 0) return;
    const t = allTopics.find((x) => x.id === topicIdFromNav);
    if (t) openSheet(t);
  }, [topicIdFromNav, allTopics, openSheet]);

  // ── Derived data ──────────────────────────────────────────────────────────────
  const confidenceBySubject = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const s of subjects) {
      const buckets = [0, 0, 0, 0, 0];
      for (const t of allTopics) {
        if (t.subjectId !== s.id) continue;
        const c = t.confidence ?? 0;
        // Only count topics that have been checked in (confidence 1-5)
        if (c >= 1 && c <= 5) buckets[c - 1]++;
      }
      map.set(s.id, buckets);
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
      ) : (
        <View style={styles.subjectGrid}>
          {subjects.map((s, idx) => {
            const palette = TILE_PALETTE[idx % TILE_PALETTE.length];
            const bars = confidenceBySubject.get(s.id) ?? [0, 0, 0, 0, 0];
            return (
              <Pressable
                key={s.id}
                style={[styles.subjectTile, { backgroundColor: palette.bg }]}
                onPress={() => setSelectedSubject(s)}
              >
                <Text style={[styles.tileName, { color: palette.text }]} numberOfLines={2}>
                  {s.name}
                </Text>
                <TileBars bars={bars} />
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
            placeholderTextColor="#AAA"
            style={styles.noteInput}
            multiline
            editable={!busy}
          />

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
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  content: { padding: 16, paddingBottom: 28 },

  screenTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 16,
    lineHeight: 30,
  },

  subjectGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  subjectTile: { width: '47.5%', borderRadius: 16, padding: 12, paddingBottom: 10 },
  tileName: { fontSize: 13, fontWeight: '500', marginBottom: 8, lineHeight: 18 },
  barsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 24 },
  tileBar: { flex: 1, borderRadius: 2 },

  topicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#F2F2F7',
  },
  backBtn: { width: 60 },
  backText: { fontSize: 14, fontWeight: '500', color: '#185FA5' },
  topicHeaderTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
  },

  topicListContent: { paddingHorizontal: 16, paddingBottom: 28 },

  // Subject summary tile
  subjectSummaryRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  subjectSummaryCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 14, padding: 10 },
  subjectSummaryVal: { fontSize: 20, fontWeight: '600', color: '#1C1C1E' },
  subjectSummaryValSub: { fontSize: 13, fontWeight: '400', color: '#AAA' },
  subjectSummaryLabel: { fontSize: 11, color: '#888', marginTop: 1 },
  progressTrack: { height: 3, backgroundColor: '#F0F0F0', borderRadius: 2, marginTop: 6, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#1D9E75', borderRadius: 2 },

  // Domain groups
  domainSection: { marginBottom: 8 },
  domainHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 4, paddingVertical: 6,
  },
  domainTitle: {
    flex: 1, fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.6, color: '#888',
  },
  domainMeta: { fontSize: 11, color: '#AAA' },
  domainChevron: { fontSize: 16, color: '#AAA', width: 14, textAlign: 'center' },
  domainCard: { backgroundColor: '#FFF', borderRadius: 14, overflow: 'hidden' },

  topicRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 12, gap: 10,
    borderBottomWidth: 0.5, borderBottomColor: '#EBEBEB',
  },
  topicRowLast: { borderBottomWidth: 0 },
  topicName: { fontSize: 13, fontWeight: '500', color: '#1C1C1E' },
  topicMeta: { fontSize: 11, color: '#AAA', marginTop: 2 },
  topicMetaUnchecked: { color: '#C0C0C0', fontStyle: 'italic' },
  topicNote: { fontSize: 11, color: '#AAA', fontStyle: 'italic', marginTop: 1 },
  topicBarsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, width: 40 },
  topicBar: { width: 6, borderRadius: 1 },

  confPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  confPillText: { fontSize: 11, fontWeight: '500' },
  confPillUnchecked: {
    backgroundColor: '#F0F0F0',
    borderWidth: 0.5,
    borderColor: '#DDD',
  },
  confPillTextUnchecked: { fontSize: 11, fontWeight: '500', color: '#BBB' },

  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#DDD',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTopic: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  sheetSubject: { fontSize: 12, color: '#888', marginBottom: 18 },
  sheetLabel: { fontSize: 12, color: '#888', marginBottom: 8 },

  confSelector: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  confBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  confBtnText: { fontSize: 15, fontWeight: '600', color: '#1C1C1E' },

  noteInput: {
    borderWidth: 0.5,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    color: '#1C1C1E',
    minHeight: 70,
    textAlignVertical: 'top',
    backgroundColor: '#F9F9F9',
    marginBottom: 14,
  },
  saveBtn: {
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  saveHint: {
    textAlign: 'center',
    fontSize: 11,
    color: '#AAA',
    marginTop: 8,
  },
});
