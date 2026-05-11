import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import AuthNavigator from './AuthNavigator';
import OnboardingNavigator from './OnboardingNavigator';
import TabNavigator from './TabNavigator';
import { useAuth } from '../context/AuthContext';
import LoadingScreen from '../components/LoadingScreen';
import WalkthroughScreen from '../screens/WalkthroughScreen';

// Stored outside STORAGE_KEYS so wipeAll() never clears it —
// the walkthrough is a one-time device experience, not user data.
const WALKTHROUGH_KEY = 'NE_WALKTHROUGH_DONE';

export default function RootNavigator() {
  const { user, initializing, onboardingComplete } = useAuth();

  const [walkthroughChecked, setWalkthroughChecked] = useState(false);
  const [walkthroughDone, setWalkthroughDone]       = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(WALKTHROUGH_KEY).then((val) => {
      setWalkthroughDone(val === 'true');
      setWalkthroughChecked(true);
    });
  }, []);

  const handleWalkthroughDone = async () => {
    await AsyncStorage.setItem(WALKTHROUGH_KEY, 'true');
    setWalkthroughDone(true);
  };

  if (initializing || !walkthroughChecked) {
    return <LoadingScreen title="Starting NailExams…" />;
  }

  if (!walkthroughDone) {
    return <WalkthroughScreen onDone={handleWalkthroughDone} />;
  }

  return (
    <NavigationContainer>
      {!user
        ? <AuthNavigator />
        : !onboardingComplete
          ? <OnboardingNavigator />
          : <TabNavigator />}
    </NavigationContainer>
  );
}
