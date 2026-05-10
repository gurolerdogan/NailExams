import React from 'react';
import { NavigationContainer } from '@react-navigation/native';

import AuthNavigator from './AuthNavigator';
import OnboardingNavigator from './OnboardingNavigator';
import TabNavigator from './TabNavigator';
import { useAuth } from '../context/AuthContext';
import LoadingScreen from '../components/LoadingScreen';


export default function RootNavigator() {
  const { user, initializing, onboardingComplete } = useAuth();


if (initializing) {
  return <LoadingScreen title="Starting NailExams…" />;
}
  return (
    <NavigationContainer>
      {!user ? <AuthNavigator /> : !onboardingComplete ? <OnboardingNavigator /> : <TabNavigator />}
    </NavigationContainer>
  );
}
