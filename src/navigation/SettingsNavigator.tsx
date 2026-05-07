import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SettingsScreen from '../screens/SettingsScreen';
import EditSubjectsScreen from '../screens/EditSubjectsScreen';
import LogsScreen from '../screens/LogsScreen';
import PlanSettingsScreen from '../screens/PlanSettingsScreen';

export type SettingsStackParamList = {
  SettingsHome: undefined;
  EditSubjects: undefined;
  Logs: undefined;
  PlanSettings: undefined;
};

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export default function SettingsNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerTitleAlign: 'center' }}>
      <Stack.Screen
        name="SettingsHome"
        component={SettingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EditSubjects"
        component={EditSubjectsScreen}
        options={{ title: 'Edit subjects' }}
      />
      <Stack.Screen
        name="PlanSettings"
        component={PlanSettingsScreen}
        options={{ title: 'Plan settings' }}
      />
      <Stack.Screen
        name="Logs"
        component={LogsScreen}
        options={{ title: 'Logs' }}
      />
    </Stack.Navigator>
  );
}
