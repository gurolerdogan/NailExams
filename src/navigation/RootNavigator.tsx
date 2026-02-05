import React from 'react';
import { NavigationContainer } from '@react-navigation/native';

import AuthNavigator from './AuthNavigator';
import OnboardingNavigator from './OnboardingNavigator';
import TabNavigator from './TabNavigator';
import { useAuth } from '../context/AuthContext';

export default function RootNavigator() {
  const { user, initializing, onboardingComplete } = useAuth();

  if (initializing) {
    // keep it simple for now
    return null;
  }

  return (
    <NavigationContainer>
      {!user ? <AuthNavigator /> : !onboardingComplete ? <OnboardingNavigator /> : <TabNavigator />}
    </NavigationContainer>
  );
}
