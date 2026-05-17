import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import OnboardingExamLevelScreen from '../screens/onboarding/OnboardingExamLevelScreen';
import OnboardingSubjectsScreen from '../screens/onboarding/OnboardingSubjectsScreen';
import OnboardingConfirmScreen from '../screens/onboarding/OnboardingConfirmScreen';
import type { ExamLevel } from '../types/models';

export type OnboardingStackParamList = {
  OnboardingExamLevel: undefined;
  OnboardingSubjects: { examLevel: ExamLevel };
  OnboardingConfirm: { examLevel: ExamLevel; subjectNames: string[] };
};

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export default function OnboardingNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="OnboardingExamLevel" component={OnboardingExamLevelScreen} />
      <Stack.Screen name="OnboardingSubjects" component={OnboardingSubjectsScreen} />
      <Stack.Screen name="OnboardingConfirm" component={OnboardingConfirmScreen} />
    </Stack.Navigator>
  );
}
