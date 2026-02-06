import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import AuthInput from '../../components/AuthInput';
import PrimaryButton from '../../components/PrimaryButton';
import type { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import type { ExamLevel } from '../../types/models';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingSubjects'>;

type PresetMap = Record<ExamLevel, string[]>;

const PRESET_SUBJECTS: PresetMap = {
  GCSE: ['Math', 'English', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'History', 'Geography'],
  A_LEVEL: ['Math', 'Further Math', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Economics'],
};

export default function OnboardingSubjectsScreen({ navigation, route }: Props) {
  const { examLevel } = route.params;
  const [customSubject, setCustomSubject] = useState('');
  const [customSubjects, setCustomSubjects] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<Set<string>>(new Set());

  const presets = PRESET_SUBJECTS[examLevel];
  const allSubjects = useMemo(() => [...presets, ...customSubjects], [presets, customSubjects]);

  const toggleSubject = (name: string) => {
    setSelectedSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const addCustomSubject = () => {
    const trimmed = customSubject.trim();
    if (!trimmed) {
      Alert.alert('Add a subject', 'Enter a subject name first.');
      return;
    }

    const existing = allSubjects.find((subject) => subject.toLowerCase() === trimmed.toLowerCase());
    const nameToUse = existing ?? trimmed;

    if (!existing) {
      setCustomSubjects((prev) => [...prev, trimmed]);
    }

    setSelectedSubjects((prev) => {
      const next = new Set(prev);
      next.add(nameToUse);
      return next;
    });

    setCustomSubject('');
  };

  const onNext = () => {
    if (selectedSubjects.size === 0) {
      Alert.alert('Select at least one subject', 'Choose a subject to continue.');
      return;
    }

    const selectedNames = Array.from(selectedSubjects);
    console.log('onboarding_subjects_saved', { count: selectedNames.length });
    navigation.navigate('OnboardingConfirm', { examLevel, subjectNames: selectedNames });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pick your subjects</Text>
      <Text style={styles.subtitle}>You can add custom subjects too.</Text>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {allSubjects.map((subject) => {
          const selected = selectedSubjects.has(subject);
          return (
            <Pressable
              key={subject}
              onPress={() => toggleSubject(subject)}
              style={[styles.subjectRow, selected && styles.subjectRowSelected]}
            >
              <Text style={[styles.subjectText, selected && styles.subjectTextSelected]}>{subject}</Text>
            </Pressable>
          );
        })}

        <View style={styles.addSection}>
          <AuthInput
            label="Add custom subject"
            value={customSubject}
            onChangeText={setCustomSubject}
            placeholder="e.g. Psychology"
            autoCapitalize="words"
          />
          <PrimaryButton title="Add subject" onPress={addCustomSubject} />
        </View>
      </ScrollView>

      <PrimaryButton title="Next" onPress={onNext} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 14, textAlign: 'center', marginBottom: 12 },
  list: { flex: 1 },
  listContent: { paddingBottom: 16 },
  subjectRow: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  subjectRowSelected: { borderWidth: 2 },
  subjectText: { fontSize: 16 },
  subjectTextSelected: { fontWeight: '700' },
  addSection: { marginTop: 12 },
});
