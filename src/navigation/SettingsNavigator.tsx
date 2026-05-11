import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import SettingsScreen from '../screens/SettingsScreen';
import EditSubjectsScreen from '../screens/EditSubjectsScreen';
import LogsScreen from '../screens/LogsScreen';
import PlanSettingsScreen from '../screens/PlanSettingsScreen';
import ThemeSelectorScreen from '../screens/ThemeSelectorScreen';
import { useTheme } from '../context/ThemeContext';

export type SettingsStackParamList = {
  SettingsHome: undefined;
  EditSubjects: undefined;
  Logs: undefined;
  PlanSettings: undefined;
  ThemeSelector: undefined;
};

const Stack = createNativeStackNavigator<SettingsStackParamList>();

function BackButton({ onPress, bg, icon }: { onPress: () => void; bg: string; icon: string }) {
  return (
    <Pressable onPress={onPress} style={[styles.backBtn, { backgroundColor: bg }]} hitSlop={8}>
      <Ionicons name="chevron-back" size={20} color={icon} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});

export default function SettingsNavigator() {
  const { theme } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={({ navigation }) => ({
        headerTitleAlign: 'center',
        headerBackVisible: false,
        headerLeft: () => (
          <BackButton
            onPress={navigation.goBack}
            bg={theme.colors.headerBackBg}
            icon={theme.colors.headerBackIcon}
          />
        ),
        headerTitleStyle: {
          fontSize: 16,
          fontWeight: '600',
          color: theme.colors.headerText,
          fontFamily: theme.fonts.body,
        },
        headerShadowVisible: theme.colors.headerBorderBottom !== 'transparent',
        headerStyle: { backgroundColor: theme.colors.headerBg },
      })}
    >
      <Stack.Screen name="SettingsHome" component={SettingsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="EditSubjects" component={EditSubjectsScreen} options={{ title: 'Edit subjects' }} />
      <Stack.Screen name="PlanSettings" component={PlanSettingsScreen} options={{ title: 'Plan settings' }} />
      <Stack.Screen name="ThemeSelector" component={ThemeSelectorScreen} options={{ title: 'Theme' }} />
      <Stack.Screen name="Logs" component={LogsScreen} options={{ title: 'Logs' }} />
    </Stack.Navigator>
  );
}
