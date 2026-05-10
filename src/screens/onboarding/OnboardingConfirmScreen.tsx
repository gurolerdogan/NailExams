import React, { useMemo, useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAuth } from '../../context/AuthContext';
import { saveProfile, saveSubjects, setOnboardingDone } from '../../services/storage/nailexamsStorage';
import type { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import type { Subject, UserProfile } from '../../types/models';
import { now } from '../../utils/time';
import { uuid } from '../../utils/id';
import { logEvent } from '../../services/logging/logEvent';
import { preloadGcseTopicsForSubjects } from '../../services/seed/preloadGcseTopics';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingConfirm'>;

const TILE_PALETTE = [
  { bg: '#FAEEDA', text: '#633806' },
  { bg: '#FBEAF0', text: '#72243E' },
  { bg: '#E6F1FB', text: '#0C447C' },
  { bg: '#EEEDFE', text: '#3C3489' },
  { bg: '#EAF3DE', text: '#27500A' },
  { bg: '#E1F5EE', text: '#085041' },
  { bg: '#FEF9C3', text: '#854D0E' },
  { bg: '#F3E8FF', text: '#5B21B6' },
  { bg: '#FCEBEB', text: '#A32D2D' },
  { bg: '#E0F2FE', text: '#075985' },
  { bg: '#F0FDF4', text: '#166534' },
  { bg: '#FFF7ED', text: '#9A3412' },
];

export default function OnboardingConfirmScreen({ route, navigation }: Props) {
  const { examLevel, subjectNames } = route.params;
  const { refreshOnboarding, refreshUserData } = useAuth();
  const [busy, setBusy] = useState(false);

  const levelLabel = examLevel === 'A_LEVEL' ? 'A Level' : 'GCSE';

  const onFinish = async () => {
    if (busy) return;
    try {
      setBusy(true);
      const timestamp = now();
      const profile: UserProfile = { examLevel, createdAt: timestamp, updatedAt: timestamp };
      const subjects: Subject[] = subjectNames.map((name) => ({
        id: uuid(), name, examLevel, createdAt: timestamp, updatedAt: timestamp,
      }));
      await saveProfile(profile);
      await saveSubjects(subjects);
      await preloadGcseTopicsForSubjects({ examLevel: profile.examLevel, subjects });
      await setOnboardingDone(true);
      await refreshUserData();
      await refreshOnboarding();
      await logEvent('onboarding_completed', { level: examLevel, subjectsCount: subjects.length });
    } catch {
      Alert.alert('Something went wrong', 'Unable to finish onboarding. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>You're all set!</Text>
          <Text style={styles.subtitle}>
            {levelLabel} · {subjectNames.length} subject{subjectNames.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Step dots */}
        <View style={styles.dots}>
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={[styles.dot, styles.dotActive]} />
        </View>

        {/* Subject tiles (read-only confirmation) */}
        <View style={styles.grid}>
          {subjectNames.map((name, idx) => {
            const palette = TILE_PALETTE[idx % TILE_PALETTE.length];
            return (
              <View
                key={name}
                style={[styles.tile, { backgroundColor: palette.bg }]}
              >
                <View style={styles.checkCircle}>
                  <Text style={styles.checkMark}>✓</Text>
                </View>
                <Text style={[styles.tileName, { color: palette.text }]} numberOfLines={2}>
                  {name}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Topics will be preloaded for your subjects. You can always add or remove subjects later in Settings.
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky footer */}
      <View style={styles.footer}>
        <Pressable
          style={[styles.finishBtn, busy && { opacity: 0.6 }]}
          onPress={onFinish}
          disabled={busy}
        >
          <Text style={styles.finishBtnText}>
            {busy ? 'Setting up…' : 'Start revising →'}
          </Text>
        </Pressable>
        <Pressable onPress={() => navigation.goBack()} style={styles.backLink}>
          <Text style={styles.backLinkText}>← Change subjects</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },

  header: { marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#1C1C1E', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#888' },

  dots: { flexDirection: 'row', gap: 6, marginBottom: 24 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#E0E0E0' },
  dotActive: { width: 20, backgroundColor: '#1C1C1E', borderRadius: 3 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  tile: {
    width: '30.5%',
    borderRadius: 16,
    padding: 10,
    paddingBottom: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1C1C1E',
    minHeight: 80,
    justifyContent: 'flex-start',
    gap: 6,
  },
  checkCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { fontSize: 10, color: '#FFF', fontWeight: '700' },
  tileName: { fontSize: 11, fontWeight: '600', textAlign: 'center', lineHeight: 15 },

  infoBox: {
    backgroundColor: '#F8F8F8',
    borderRadius: 14,
    padding: 14,
  },
  infoText: { fontSize: 12, color: '#888', lineHeight: 18, textAlign: 'center' },

  footer: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 0.5,
    borderTopColor: '#F0F0F0',
    gap: 10,
  },
  finishBtn: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  finishBtnText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  backLink: { alignItems: 'center', paddingVertical: 4 },
  backLinkText: { fontSize: 13, color: '#888' },
});
