import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
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
import { appendAttempt } from '../services/storage/practiceStorage';
import type { PracticeAttempt } from '../types/practice';
import { uuid } from '../utils/id';
import { now } from '../utils/time';
import { logEvent } from '../services/logging/logEvent';
import type { AppTabParamList } from '../navigation/TabNavigator';
import EmptyState from '../components/EmptyState';

// ─── Shared palette (must stay in sync with HomeScreen) ──────────────────────
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
  const { subjects, refreshUserData } = useAuth();
  const route = useRoute<PracticeRoute>();
  const tabNav = useNavigation<BottomTabNavigationProp<AppTabParamList>>();

  const subjectIdFromNav = route.params?.subjectId;
  const topicIdFromNav   = route.params?.topicId;

  const [allTopics, setAllTopics]             = useState<Topic[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [sheetTopic, setSheetTopic]           = useState<Topic | null>(null);
  // null = no button pre-selected; user must pick a confidence level before saving
  const [confidence, setConfidence]           = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [note, setNote]                       = useState('');
  const [busy, setBusy]                       = useState(false);
  const [sheetVisible, setSheetVisible]       = useState(false);

  const slideAnim = useRef(new Animated.Value(300)).current;

  const openSheet = useCallback((topic: Topic) => {
    setSheetTopic(topic);
    // Pre-select existing confidence if topic was previously checked in; otherwise no selection
    const existing = topic.confidence && topic.confidence > 0
      ? (topic.confidence as 1 | 2 | 3 | 4 | 5)
      : null;
    setConfidence(existing);
    setNote('');
    setSheetVisible(true);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      damping: 20,
      stiffness: 180,
    }).start();
  }, [slideAnim]);

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

  // ── Load topics ───────────────────────────────────────────────────────────────
  const refreshTopics = useCallback(async () => {
    const data = await loadTopics();
    setAllTopics(data);
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
    return allTopics
      .filter((t) => t.subjectId === selectedSubject.id)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allTopics, selectedSubject]);

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

      await logEvent('practice_checkin_saved', {
        subjectId: selectedSubject.id,
        topicId: sheetTopic.id,
        confidence,
        noteLen: note.trim().length,
      });

      await refreshUserData();
      closeSheet();
    } catch (e: any) {
      console.error('Check-in save failed', e);
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
  const renderTopicList = () => (
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

      <FlatList
        data={subjectTopics}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.topicListContent}
        ListEmptyComponent={
          <EmptyState
            icon="list-outline"
            title="No topics yet"
            body="Topics for this subject haven't been loaded. Try resetting from Settings."
          />
        }
        renderItem={({ item }) => {
          const isCheckedIn = (item.confidence ?? 0) > 0;
          const ci = isCheckedIn ? (item.confidence as number) - 1 : 0;
          return (
            <Pressable style={styles.topicRow} onPress={() => openSheet(item)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.topicName}>{item.name}</Text>
                {isCheckedIn && item.lastPracticedAt ? (
                  <Text style={styles.topicMeta}>
                    Last: {new Date(item.lastPracticedAt).toLocaleDateString()}
                  </Text>
                ) : (
                  <Text style={[styles.topicMeta, styles.topicMetaUnchecked]}>
                    Not checked in
                  </Text>
                )}
              </View>
              <TopicBars confidence={item.confidence ?? 0} />
              {isCheckedIn ? (
                <View style={[styles.confPill, { backgroundColor: CONF_BG[ci] }]}>
                  <Text style={[styles.confPillText, { color: CONF_TEXT[ci] }]}>
                    {`${item.confidence}/5`}
                  </Text>
                </View>
              ) : (
                <View style={[styles.confPill, styles.confPillUnchecked]}>
                  <Text style={styles.confPillTextUnchecked}>–</Text>
                </View>
              )}
            </Pressable>
          );
        }}
      />
    </View>
  );

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
  topicRow: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#EBEBEB',
  },
  topicName: { fontSize: 13, fontWeight: '500', color: '#1C1C1E' },
  topicMeta: { fontSize: 11, color: '#AAA', marginTop: 2 },
  topicMetaUnchecked: { color: '#C0C0C0', fontStyle: 'italic' },
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
