import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import HomeScreen from '../screens/HomeScreen';
import PlanScreen from '../screens/PlanScreen';
import ProgressScreen from '../screens/ProgressScreen';
import SettingsNavigator from './SettingsNavigator';

export type AppTabParamList = {
  Home: undefined;
  Plan: undefined;
  Progress: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<AppTabParamList>();

export default function TabNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerTitleAlign: 'center', tabBarHideOnKeyboard: true }}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Plan" component={PlanScreen} />
      <Tab.Screen name="Progress" component={ProgressScreen} />
     <Tab.Screen name="Settings" component={SettingsNavigator} />
    </Tab.Navigator>
  );
}
