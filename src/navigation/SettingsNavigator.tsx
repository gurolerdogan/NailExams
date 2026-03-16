import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SettingsScreen from '../screens/SettingsScreen';
import EditSubjectsScreen from '../screens/EditSubjectsScreen';
import LogsScreen from '../screens/LogsScreen';
export type SettingsStackParamList = {
  SettingsHome: undefined;
  EditSubjects: undefined;
  Logs: undefined;
};
const Stack = createNativeStackNavigator<SettingsStackParamList>();

export default function SettingsNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerTitleAlign: 'center' }}>
      <Stack.Screen name="SettingsHome" component={SettingsScreen} options={{ title: 'Settings' }} />
      <Stack.Screen name="EditSubjects" component={EditSubjectsScreen} options={{ title: 'Edit subjects' }} />
      <Stack.Screen name="Logs" component={LogsScreen} options={{ title: 'Logs' }} />
    </Stack.Navigator>
  );
}