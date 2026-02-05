import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import OnboardingPlaceholderScreen from '../screens/onboarding/OnboardingPlaceholderScreen';

export type OnboardingStackParamList = {
  OnboardingPlaceholder: undefined;
};

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export default function OnboardingNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerTitleAlign: 'center' }}>
      <Stack.Screen
        name="OnboardingPlaceholder"
        component={OnboardingPlaceholderScreen}
        options={{ title: 'Onboarding' }}
      />
    </Stack.Navigator>
  );
}
