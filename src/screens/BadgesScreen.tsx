import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { useTheme } from '../context/ThemeContext';
import { BADGE_CATALOG, BADGE_BY_ID, type BadgeId, type BadgeTier, type BadgeDefinition } from '../types/badges';
import { loadEarnedBadgeIds, markProgressShared } from '../services/badges/badgeService';
import { logEvent } from '../services/logging/logEvent';
import type { Theme } from '../themes';

const TIER_COLORS: Record<BadgeTier, { bg: string; text: string }> = {
  Bronze:  { bg: '#EAF3DE', text: '#27500A' },
  Silver:  { bg: '#F4F4F6', text: '#3C3C43' },
  Gold:    { bg: '#FAEEDA', text: '#633806' },
  Special: { bg: '#EEEDFE', text: '#3C3489' },
  Hidden:  { bg: '#F4F4F6', text: '#888' },
};

function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.screenBg },
    content: { padding: 16, paddingBottom: 48 },

    countRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: 20,
    },
    countText: { fontSize: 22, fontWeight: '700', color: theme.colors.textPrimary },
    countSub:  { fontSize: 13, color: theme.colors.textMuted },

    progressTrack: { height: 4, backgroundColor: theme.colors.divider, borderRadius: 2, marginBottom: 24 },
    progressFill:  { height: 4, borderRadius: 2, backgroundColor: '#1D9E75' },

    sectionLabel: {
      fontSize: 11, fontWeight: '600', textTransform: 'uppercase',
      letterSpacing: 0.5, color: theme.colors.sectionLabel, marginBottom: 10, marginTop: 16,
    },

    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    badgeCard: {
      width: '47%', backgroundColor: theme.colors.cardBg,
      borderRadius: 14, padding: 14, gap: 8,
      borderWidth: 1, borderColor: theme.colors.cardBorder,
    },
    badgeCardLocked: { opacity: 0.45 },
    badgeIconWrap: {
      width: 44, height: 44, borderRadius: 12,
      alignItems: 'center', justifyContent: 'center',
    },
    badgeIconText: { fontSize: 22 },
    badgeName: { fontSize: 13, fontWeight: '600', color: theme.colors.textPrimary },
    badgeDesc: { fontSize: 11, color: theme.colors.textMuted, lineHeight: 15 },
    tierPill: {
      alignSelf: 'flex-start', borderRadius: 8,
      paddingHorizontal: 7, paddingVertical: 2, marginTop: 2,
    },
    tierText: { fontSize: 10, fontWeight: '600' },
    shareBtn: {
      marginTop: 6, borderRadius: 8, paddingVertical: 6,
      backgroundColor: theme.colors.screenBg, alignItems: 'center',
    },
    shareBtnText: { fontSize: 11, fontWeight: '600', color: theme.colors.accent },
  });
}

const SECTION_ORDER: Array<{ label: string; ids: BadgeId[] }> = [
  { label: 'First steps', ids: ['first_checkin', 'subject_added', 'plan_created', 'exam_set'] },
  { label: 'Consistency', ids: ['streak_3', 'streak_7', 'streak_30', 'week_complete', 'four_week_run'] },
  { label: 'Volume',      ids: ['checkins_10', 'checkins_50', 'checkins_200'] },
  { label: 'Mastery',     ids: ['topic_nailed', 'subject_cleared', 'subject_nailed', 'big_jump', 'comeback', 'ready_to_go'] },
  { label: 'Social',      ids: ['progress_shared'] },
  { label: 'Hidden',      ids: ['hidden_exam_day'] },
];

export default function BadgesScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [earnedIds, setEarnedIds] = useState<Set<BadgeId>>(new Set());

  const load = useCallback(async () => {
    const ids = await loadEarnedBadgeIds();
    setEarnedIds(new Set(ids));
  }, []);

  const shareBadge = useCallback(async (def: BadgeDefinition) => {
    try {
      await Share.share({ message: `I just unlocked the "${def.name}" badge ${def.emoji} on NailExams! 📚` });
      void logEvent('badge_shared', { badgeId: def.id });
    } catch { /* dismissed */ }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const total   = BADGE_CATALOG.filter((b) => b.tier !== 'Hidden').length;
  const earned  = [...earnedIds].filter((id) => BADGE_BY_ID.get(id)?.tier !== 'Hidden').length;
  const pct     = total > 0 ? (earned / total) * 100 : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.countRow}>
        <View>
          <Text style={styles.countText}>{earned} / {total}</Text>
          <Text style={styles.countSub}>badges unlocked</Text>
        </View>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct}%` }]} />
      </View>

      {SECTION_ORDER.map(({ label, ids }) => (
        <View key={label}>
          <Text style={styles.sectionLabel}>{label}</Text>
          <View style={styles.grid}>
            {ids.map((id) => {
              const def    = BADGE_BY_ID.get(id);
              if (!def) return null;
              const isEarned = earnedIds.has(id);
              const colors   = TIER_COLORS[def.tier];
              const isHidden = def.tier === 'Hidden' && !isEarned;

              return (
                <View
                  key={id}
                  style={[styles.badgeCard, !isEarned && styles.badgeCardLocked]}
                >
                  <View style={[styles.badgeIconWrap, { backgroundColor: isEarned ? colors.bg : theme.colors.divider }]}>
                    <Text style={styles.badgeIconText}>{isHidden ? '🔒' : def.emoji}</Text>
                  </View>
                  <Text style={styles.badgeName}>{isHidden ? '???' : def.name}</Text>
                  <Text style={styles.badgeDesc} numberOfLines={2}>
                    {isHidden ? 'Unlock to reveal.' : def.description}
                  </Text>
                  {!isHidden && (
                    <View style={[styles.tierPill, { backgroundColor: colors.bg }]}>
                      <Text style={[styles.tierText, { color: colors.text }]}>{def.tier}</Text>
                    </View>
                  )}
                  {isEarned && !isHidden && (
                    <Pressable style={styles.shareBtn} onPress={() => void shareBadge(def)}>
                      <Text style={styles.shareBtnText}>📤 Share</Text>
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
