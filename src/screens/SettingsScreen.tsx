import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getAuth } from 'firebase/auth';

import { useAuth } from '../context/AuthContext';
import { wipeAll, loadTopics } from '../services/storage/nailexamsStorage';
import { loadAttempts } from '../services/storage/practiceStorage';
import { logEvent } from '../services/logging/logEvent';
import type { SettingsStackParamList } from '../navigation/SettingsNavigator';

type Props = NativeStackScreenProps<SettingsStackParamList, 'SettingsHome'>;

// Chevron icon
function Chevron() {
  return <Text style={styles.chevron}>›</Text>;
}

// Single menu row
function MenuRow({
  icon,
  iconBg,
  label,
  destructive,
  muted,
  onPress,
  showChevron = true,
}: {
  icon: string;
  iconBg: string;
  label: string;
  destructive?: boolean;
  muted?: boolean;
  onPress: () => void;
  showChevron?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}
      onPress={onPress}
    >
      <View style={[styles.menuIcon, { backgroundColor: iconBg }]}>
        <Text style={styles.menuIconText}>{icon}</Text>
      </View>
      <Text
        style={[
          styles.menuLabel,
          destructive && styles.menuLabelDestructive,
          muted && styles.menuLabelMuted,
        ]}
      >
        {label}
      </Text>
      {showChevron && !destructive && <Chevron />}
    </Pressable>
  );
}

export default function SettingsScreen({ navigation }: Props) {
  const { profile, subjects, logout, refreshOnboarding, refreshUserData } = useAuth();

  const [topicCount, setTopicCount]     = useState(0);
  const [checkinCount, setCheckinCount] = useState(0);

  const loadStats = useCallback(async () => {
    const [topics, attempts] = await Promise.all([loadTopics(), loadAttempts()]);
    setTopicCount(topics.length);
    setCheckinCount(attempts.length);
  }, []);

  useEffect(() => { void loadStats(); }, [loadStats]);
  useFocusEffect(useCallback(() => { void loadStats(); }, [loadStats]));

  // Firebase current user email (falls back gracefully if not available)
const email = getAuth().currentUser?.email ?? '—';

  // Avatar initial from email
  const avatarLetter = email !== '—' ? email[0].toUpperCase() : '?';

  const onReset = () => {
    Alert.alert(
      'Reset onboarding?',
      'This will wipe all NailExams data on this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await wipeAll();
            await refreshUserData();
            await refreshOnboarding();
            await logEvent('local_wipe', {});
          },
        },
      ],
    );
  };

  const onLogout = () => {
    Alert.alert('Log out?', 'You will return to the login screen.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          await logEvent('logout', {});
          void logout();
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.screenTitle}>Settings</Text>

      {/* ── Profile card ── */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{avatarLetter}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileEmail} numberOfLines={1}>{email}</Text>
          <Text style={styles.profileMeta}>
            {subjects.length} subject{subjects.length !== 1 ? 's' : ''} · {profile?.examLevel ?? '—'}
          </Text>
        </View>
        <View style={styles.levelBadge}>
          <Text style={styles.levelBadgeText}>{profile?.examLevel ?? '—'}</Text>
        </View>
      </View>

      {/* ── Stats row ── */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statVal}>{subjects.length}</Text>
          <Text style={styles.statLabel}>Subjects</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statVal}>{topicCount}</Text>
          <Text style={styles.statLabel}>Topics</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statVal, { color: '#1D9E75' }]}>{checkinCount}</Text>
          <Text style={styles.statLabel}>Check-ins</Text>
        </View>
      </View>

      {/* ── Study section ── */}
      <Text style={styles.sectionLabel}>Study</Text>
      <View style={styles.menuGroup}>
        <MenuRow
          icon="📚"
          iconBg="#EAF3DE"
          label="Edit subjects"
          onPress={() => navigation.navigate('EditSubjects')}
        />
        <View style={styles.menuDivider} />
        <MenuRow
          icon="📅"
          iconBg="#E6F1FB"
          label="Plan settings"
          onPress={() => navigation.navigate('PlanSettings')}
        />
      </View>

      {/* ── Account section ── */}
      <Text style={styles.sectionLabel}>Account</Text>
      <View style={styles.menuGroup}>
        <MenuRow
          icon="🚪"
          iconBg="#FBEAF0"
          label="Log out"
          destructive
          showChevron={false}
          onPress={onLogout}
        />
      </View>

      {/* ── Developer section ── */}
      <Text style={styles.sectionLabel}>Developer</Text>
      <View style={styles.menuGroup}>
        <MenuRow
          icon="🪵"
          iconBg="#F5F5F5"
          label="View logs"
          muted
          onPress={() => navigation.navigate('Logs')}
        />
        <View style={styles.menuDivider} />
        <MenuRow
          icon="⚠️"
          iconBg="#FCEBEB"
          label="Reset onboarding (wipe data)"
          destructive
          muted
          showChevron={false}
          onPress={onReset}
        />
      </View>

      <Text style={styles.versionText}>NailExams · v1.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  content: { padding: 16, paddingBottom: 40 },

  screenTitle: { fontSize: 22, fontWeight: '600', color: '#1C1C1E', marginBottom: 16 },

  // Profile card
  profileCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 10,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: { fontSize: 18, fontWeight: '600', color: '#FFF' },
  profileInfo: { flex: 1, minWidth: 0 },
  profileEmail: { fontSize: 13, fontWeight: '500', color: '#FFF' },
  profileMeta: { fontSize: 11, color: '#AAA', marginTop: 3 },
  levelBadge: {
    backgroundColor: '#2C2C2E',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexShrink: 0,
  },
  levelBadgeText: { fontSize: 11, fontWeight: '500', color: '#98D7C2' },

  // Stats row
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 10,
  },
  statVal: { fontSize: 20, fontWeight: '600', color: '#1C1C1E' },
  statLabel: { fontSize: 11, color: '#888', marginTop: 1 },

  // Section label
  sectionLabel: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: '#888',
    marginBottom: 6,
    marginLeft: 4,
  },

  // Menu group
  menuGroup: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
  },
  menuDivider: {
    height: 0.5,
    backgroundColor: '#F0F0F0',
    marginLeft: 56, // aligns with label, not icon
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 12,
  },
  menuRowPressed: { backgroundColor: '#F5F5F5' },
  menuIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  menuIconText: { fontSize: 15 },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: '#1C1C1E' },
  menuLabelDestructive: { color: '#E24B4A' },
  menuLabelMuted: { fontSize: 13, fontWeight: '400' },
  chevron: { fontSize: 18, color: '#C7C7CC', fontWeight: '300' },

  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#C7C7CC',
    marginTop: 4,
  },
});
