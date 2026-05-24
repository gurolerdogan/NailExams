import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import PracticeScreen from '../screens/PracticeScreen';
import SessionScreen from '../screens/SessionScreen';

export type PracticeStackParamList = {
  PracticeHome: { subjectId?: string } | undefined;
  Session: { topicId: string; subjectId: string; returnTo?: 'Plan' | 'Home' };
};

const Stack = createNativeStackNavigator<PracticeStackParamList>();

export default function PracticeNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="PracticeHome"
        component={PracticeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Session"
        component={SessionScreen}
        options={{ headerShown: true }}
      />
    </Stack.Navigator>
  );
}
