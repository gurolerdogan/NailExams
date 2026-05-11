import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

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

function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.backBtn} hitSlop={8}>
      <Ionicons name="chevron-back" size={20} color="#1C1C1E" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F0F0F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default function SettingsNavigator() {
  return (
    <Stack.Navigator
      screenOptions={({ navigation }) => ({
        headerTitleAlign: 'center',
        headerBackVisible: false,
        headerLeft: () => <BackButton onPress={navigation.goBack} />,
        headerTitleStyle: { fontSize: 16, fontWeight: '600' },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: '#F2F2F7' },
      })}
    >
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
