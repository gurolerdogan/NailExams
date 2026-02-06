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
    <Stack.Navigator screenOptions={{ headerTitleAlign: 'center' }}>
      <Stack.Screen name="OnboardingExamLevel" component={OnboardingExamLevelScreen} options={{ title: 'Onboarding' }} />
      <Stack.Screen name="OnboardingSubjects" component={OnboardingSubjectsScreen} options={{ title: 'Subjects' }} />
      <Stack.Screen name="OnboardingConfirm" component={OnboardingConfirmScreen} options={{ title: 'Confirm' }} />
    </Stack.Navigator>
  );
}
