import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import PrimaryButton from '../../components/PrimaryButton';
import type { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import type { ExamLevel } from '../../types/models';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingExamLevel'>;

type LevelOption = { label: string; value: ExamLevel };

const LEVELS: LevelOption[] = [
  { label: 'GCSE', value: 'GCSE' },
  { label: 'A Level', value: 'A_LEVEL' },
];

export default function OnboardingExamLevelScreen({ navigation }: Props) {
  const [selectedLevel, setSelectedLevel] = useState<ExamLevel | null>(null);

  const canContinue = useMemo(() => selectedLevel !== null, [selectedLevel]);

  const onSelectLevel = (level: ExamLevel) => {
    setSelectedLevel(level);
    console.log('onboarding_exam_level_selected', { level });
  };

  const onNext = () => {
    if (!selectedLevel) return;
    navigation.navigate('OnboardingSubjects', { examLevel: selectedLevel });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose your exam level</Text>

      <View style={styles.options}>
        {LEVELS.map((level, index) => {
          const selected = selectedLevel === level.value;
          return (
            <Pressable
              key={level.value}
              onPress={() => onSelectLevel(level.value)}
              style={[
                styles.card,
                index < LEVELS.length - 1 && styles.cardSpacing,
                selected && styles.cardSelected,
              ]}
            >
              <Text style={[styles.cardTitle, selected && styles.cardTitleSelected]}>{level.label}</Text>
              <Text style={[styles.cardBody, selected && styles.cardBodySelected]}>
                {level.value === 'GCSE' ? 'Typically ages 14-16' : 'Typically ages 16-18'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <PrimaryButton title="Next" onPress={onNext} disabled={!canContinue} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 18 },
  options: { marginBottom: 18 },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  cardSpacing: { marginBottom: 12 },
  cardSelected: {
    borderWidth: 2,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  cardTitleSelected: { textDecorationLine: 'underline' },
  cardBody: { fontSize: 14 },
  cardBodySelected: { fontWeight: '600' },
});
