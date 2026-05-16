import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { saveProfile } from '../services/storage/nailexamsStorage';
import { now } from '../utils/time';
import { TILE_PALETTE } from '../constants/palette';
import type { ExamDate } from '../types/models';
import type { Theme } from '../themes';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_HEADERS = ['M','T','W','T','F','S','S'];

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function daysUntil(iso: string): number {
  const today = new Date(); today.setHours(0,0,0,0);
  const target = new Date(iso + 'T00:00:00');
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function dayOfWeekMon(d: Date): number { return (d.getDay() + 6) % 7; }

function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.screenBg },
    content: { padding: 16, paddingBottom: 40 },
    hint: { fontSize: 13, color: theme.colors.textMuted, marginBottom: 20, lineHeight: 19 },

    subjectRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: theme.colors.cardBg, borderRadius: 12,
      padding: 14, marginBottom: 8,
    },
    dot: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    dotInner: { width: 9, height: 9, borderRadius: 4 },
    subjectName: { flex: 1, fontSize: 14, fontWeight: '500', color: theme.colors.textPrimary },
    dateLabel: { fontSize: 13, color: theme.colors.textMuted },
    dateLabelSet: { fontSize: 13, color: theme.colors.accent, fontWeight: '600' },
    clearBtn: { padding: 4 },
    clearBtnText: { fontSize: 16, color: theme.colors.textMuted },

    // Picker modal
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    picker: {
      backgroundColor: theme.colors.cardBg,
      borderTopLeftRadius: 24, borderTopRightRadius: 24,
      padding: 20, paddingBottom: 40,
    },
    pickerTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.textPrimary, marginBottom: 16 },
    monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    monthNav: { padding: 6 },
    monthNavText: { fontSize: 22, color: '#185FA5', fontWeight: '300' },
    monthLabel: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary },
    calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    dayHeader: { width: '14.28%', textAlign: 'center', fontSize: 10, fontWeight: '500', color: theme.colors.textMuted, paddingBottom: 6 },
    dayCell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
    dayCellToday: { backgroundColor: theme.colors.divider },
    dayCellSelected: { backgroundColor: theme.colors.buttonPrimaryBg },
    dayCellPast: { opacity: 0.25 },
    dayText: { fontSize: 12, fontWeight: '500', color: theme.colors.textPrimary },
    dayTextSelected: { color: theme.colors.buttonPrimaryText },
    doneBtn: {
      backgroundColor: theme.colors.buttonPrimaryBg, borderRadius: 14,
      paddingVertical: 14, alignItems: 'center', marginTop: 16,
    },
    doneBtnText: { fontSize: 15, fontWeight: '600', color: theme.colors.buttonPrimaryText },
  });
}

export default function ExamDatesScreen() {
  const { profile, subjects, refreshUserData } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const examDates: ExamDate[] = profile?.examDates ?? [];

  const [pickerSubjectId, setPickerSubjectId] = useState<string | null>(null);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear]   = useState(new Date().getFullYear());
  const [draftDate, setDraftDate] = useState<string | null>(null);

  const todayISO = toISODate(new Date());

  const dateFor = useCallback(
    (subjectId: string) => examDates.find((e) => e.subjectId === subjectId)?.date ?? null,
    [examDates],
  );

  const openPicker = (subjectId: string) => {
    const existing = dateFor(subjectId);
    const base = existing ? new Date(existing + 'T00:00:00') : new Date();
    setCalMonth(base.getMonth());
    setCalYear(base.getFullYear());
    setDraftDate(existing);
    setPickerSubjectId(subjectId);
  };

  const save = async (subjectId: string, date: string | null) => {
    if (!profile) return;
    const next: ExamDate[] = [
      ...(profile.examDates ?? []).filter((e) => e.subjectId !== subjectId),
      ...(date ? [{ subjectId, date }] : []),
    ];
    await saveProfile({ ...profile, examDates: next, updatedAt: now() });
    await refreshUserData();
  };

  const calendarCells = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1);
    const offset   = dayOfWeekMon(firstDay);
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const cells: Array<number | null> = [];
    for (let i = 0; i < offset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [calYear, calMonth]);

  const changeMonth = (dir: 1 | -1) => {
    let m = calMonth + dir, y = calYear;
    if (m > 11) { m = 0; y++; }
    if (m < 0)  { m = 11; y--; }
    setCalMonth(m); setCalYear(y);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.hint}>
        Set your exam date for each subject. A countdown will appear on the Home screen.
      </Text>

      {subjects.map((s, idx) => {
        const palette = TILE_PALETTE[idx % TILE_PALETTE.length];
        const date    = dateFor(s.id);
        const days    = date ? daysUntil(date) : null;
        return (
          <Pressable key={s.id} style={styles.subjectRow} onPress={() => openPicker(s.id)}>
            <View style={[styles.dot, { backgroundColor: palette.bg }]}>
              <View style={[styles.dotInner, { backgroundColor: palette.text }]} />
            </View>
            <Text style={styles.subjectName} numberOfLines={1}>{s.name}</Text>
            {date ? (
              <>
                <Text style={[styles.dateLabelSet, days !== null && days < 14 && { color: '#E24B4A' }, days !== null && days >= 14 && days < 30 && { color: '#EF9F27' }]}>
                  {days !== null && days >= 0 ? `${days}d` : 'Passed'}
                </Text>
                <Pressable style={styles.clearBtn} onPress={() => {
                  Alert.alert('Clear date?', `Remove exam date for ${s.name}?`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Remove', style: 'destructive', onPress: () => void save(s.id, null) },
                  ]);
                }}>
                  <Text style={styles.clearBtnText}>×</Text>
                </Pressable>
              </>
            ) : (
              <Text style={styles.dateLabel}>Set date</Text>
            )}
          </Pressable>
        );
      })}

      {/* Calendar picker modal */}
      <Modal visible={!!pickerSubjectId} transparent animationType="slide" onRequestClose={() => setPickerSubjectId(null)}>
        <Pressable style={styles.overlay} onPress={() => setPickerSubjectId(null)}>
          <Pressable style={styles.picker} onPress={() => {}}>
            <Text style={styles.pickerTitle}>
              {subjects.find((s) => s.id === pickerSubjectId)?.name ?? 'Pick exam date'}
            </Text>

            <View style={styles.monthHeader}>
              <Pressable style={styles.monthNav} onPress={() => changeMonth(-1)}>
                <Text style={styles.monthNavText}>‹</Text>
              </Pressable>
              <Text style={styles.monthLabel}>{MONTH_NAMES[calMonth]} {calYear}</Text>
              <Pressable style={styles.monthNav} onPress={() => changeMonth(1)}>
                <Text style={styles.monthNavText}>›</Text>
              </Pressable>
            </View>

            <View style={styles.calGrid}>
              {DAY_HEADERS.map((h, i) => <Text key={i} style={styles.dayHeader}>{h}</Text>)}
              {calendarCells.map((day, i) => {
                if (!day) return <View key={`e${i}`} style={styles.dayCell} />;
                const iso      = toISODate(new Date(calYear, calMonth, day));
                const isToday  = iso === todayISO;
                const selected = iso === draftDate;
                const isPast   = iso < todayISO;
                return (
                  <Pressable
                    key={day}
                    style={[styles.dayCell, isToday && styles.dayCellToday, selected && styles.dayCellSelected, isPast && !selected && styles.dayCellPast]}
                    onPress={() => setDraftDate(iso)}
                  >
                    <Text style={[styles.dayText, selected && styles.dayTextSelected]}>{day}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              style={[styles.doneBtn, !draftDate && { opacity: 0.4 }]}
              disabled={!draftDate}
              onPress={async () => {
                if (!pickerSubjectId || !draftDate) return;
                await save(pickerSubjectId, draftDate);
                setPickerSubjectId(null);
              }}
            >
              <Text style={styles.doneBtnText}>
                {draftDate ? `Set ${MONTH_NAMES[new Date(draftDate + 'T00:00:00').getMonth()]} ${new Date(draftDate + 'T00:00:00').getDate()}` : 'Pick a date'}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}
