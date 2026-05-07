import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import HomeNavigator from './HomeNavigator';
import PracticeScreen from '../screens/PracticeScreen';
import ProgressScreen from '../screens/ProgressScreen';
import SettingsNavigator from './SettingsNavigator';

export type AppTabParamList = {
  Home: undefined;
  Practice: { subjectId?: string; topicId?: string } | undefined;   // ✅ allow optional subjectId + topicId (Plan → Practice deep-link)
  Progress: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<AppTabParamList>();

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,          // ✅ IMPORTANT (removes extra header)
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen name="Home" component={HomeNavigator} />
      <Tab.Screen name="Practice" component={PracticeScreen} />
      <Tab.Screen name="Progress" component={ProgressScreen} />
      <Tab.Screen name="Settings" component={SettingsNavigator} />
    </Tab.Navigator>
  );
}
