import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import PrimaryButton from '../../components/PrimaryButton';
import { useAuth } from '../../context/AuthContext';
import { saveProfile, saveSubjects, setOnboardingDone } from '../../services/storage/nailexamsStorage';
import type { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import type { Subject, UserProfile } from '../../types/models';
import { now } from '../../utils/time';
import { uuid } from '../../utils/id';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingConfirm'>;

export default function OnboardingConfirmScreen({ route }: Props) {
  const { examLevel, subjectNames } = route.params;
  const { refreshOnboarding, refreshUserData } = useAuth();
  const [busy, setBusy] = useState(false);

  const subjectCountLabel = useMemo(
    () => `${subjectNames.length} subject${subjectNames.length === 1 ? '' : 's'}`,
    [subjectNames.length],
  );

  const onFinish = async () => {
    if (busy) return;

    try {
      setBusy(true);

      const timestamp = now();
      const profile: UserProfile = {
        examLevel,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      const subjects: Subject[] = subjectNames.map((name) => ({
        id: uuid(),
        name,
        examLevel,
        createdAt: timestamp,
        updatedAt: timestamp,
      }));

      await saveProfile(profile);
      await saveSubjects(subjects);
      await setOnboardingDone(true);

      await refreshUserData();
      await refreshOnboarding();

      console.log('onboarding_completed');
    } catch {
      Alert.alert('Something went wrong', 'Unable to finish onboarding. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Confirm your choices</Text>
      <Text style={styles.subtitle}>Exam level: {examLevel === 'A_LEVEL' ? 'A Level' : 'GCSE'}</Text>
      <Text style={styles.subtitle}>Subjects: {subjectCountLabel}</Text>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {subjectNames.map((name) => (
          <View key={name} style={styles.subjectRow}>
            <Text style={styles.subjectText}>{name}</Text>
          </View>
        ))}
      </ScrollView>

      <PrimaryButton title={busy ? 'Saving…' : 'Finish'} onPress={onFinish} disabled={busy} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 15, textAlign: 'center', marginBottom: 6 },
  list: { flex: 1, marginTop: 12 },
  listContent: { paddingBottom: 16 },
  subjectRow: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  subjectText: { fontSize: 16 },
});
