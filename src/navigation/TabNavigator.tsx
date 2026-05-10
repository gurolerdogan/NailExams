import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { NavigatorScreenParams } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

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

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<
  keyof AppTabParamList,
  { focused: IoniconName; outline: IoniconName }
> = {
  Home:     { focused: 'home',             outline: 'home-outline' },
  Practice: { focused: 'checkmark-circle', outline: 'checkmark-circle-outline' },
  Plan:     { focused: 'calendar',         outline: 'calendar-outline' },
  Settings: { focused: 'settings',         outline: 'settings-outline' },
};

const Tab = createBottomTabNavigator<AppTabParamList>();

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: '#1C1C1E',
        tabBarInactiveTintColor: '#C7C7CC',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#F0F0F0',
          borderTopWidth: 0.5,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
        },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name as keyof AppTabParamList];
          return (
            <Ionicons
              name={focused ? icons.focused : icons.outline}
              size={size}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeNavigator} />
      <Tab.Screen name="Practice" component={PracticeScreen} />
      <Tab.Screen name="Plan" component={PlanScreen} />
      <Tab.Screen name="Settings" component={SettingsNavigator} />
    </Tab.Navigator>
  );
}
