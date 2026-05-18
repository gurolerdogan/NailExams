import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { NavigatorScreenParams } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import HomeNavigator from './HomeNavigator';
import PracticeScreen from '../screens/PracticeScreen';
import PlanScreen from '../screens/PlanScreen';
import SettingsNavigator from './SettingsNavigator';
import type { SettingsStackParamList } from './SettingsNavigator';
import { useTheme } from '../context/ThemeContext';

export type AppTabParamList = {
  Home: undefined;
  Practice: { subjectId?: string; topicId?: string; returnTo?: 'Plan' | 'Home' } | undefined;
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
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: theme.colors.tabBarActiveTint,
        tabBarInactiveTintColor: theme.colors.tabBarInactiveTint,
        tabBarStyle: {
          backgroundColor: theme.colors.tabBarBg,
          borderTopColor: theme.colors.tabBarBorderTop,
          borderTopWidth: 0.5,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: theme.fonts.bodyWeight,
          fontFamily: theme.fonts.body,
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
      <Tab.Screen
        name="Settings"
        component={SettingsNavigator}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            // Always land on SettingsHome regardless of what was last on the stack
            navigation.navigate('Settings', { screen: 'SettingsHome' });
          },
        })}
      />
    </Tab.Navigator>
  );
}
