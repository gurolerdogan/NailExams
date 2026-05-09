import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { NavigatorScreenParams } from '@react-navigation/native';

import HomeNavigator from './HomeNavigator';
import PracticeScreen from '../screens/PracticeScreen';
import PlanScreen from '../screens/PlanScreen';
import SettingsNavigator from './SettingsNavigator';
import type { SettingsStackParamList } from './SettingsNavigator';

export type AppTabParamList = {
  Home: undefined;
  Practice: { subjectId?: string; topicId?: string } | undefined;
  Plan: undefined;
  Settings: NavigatorScreenParams<SettingsStackParamList> | undefined;
};

const Tab = createBottomTabNavigator<AppTabParamList>();

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen name="Home" component={HomeNavigator} />
      <Tab.Screen name="Practice" component={PracticeScreen} />
      <Tab.Screen name="Plan" component={PlanScreen} />
      <Tab.Screen name="Settings" component={SettingsNavigator} />
    </Tab.Navigator>
  );
}
