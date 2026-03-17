import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';


import PlanScreen from '../screens/PlanScreen';
import ProgressScreen from '../screens/ProgressScreen';
import SettingsNavigator from './SettingsNavigator';
import HomeNavigator from './HomeNavigator';

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
      <Tab.Screen name="Home" component={HomeNavigator} />
      <Tab.Screen name="Plan" component={PlanScreen} />
      <Tab.Screen name="Progress" component={ProgressScreen} />
     <Tab.Screen name="Settings" component={SettingsNavigator} />
    </Tab.Navigator>
  );
}
