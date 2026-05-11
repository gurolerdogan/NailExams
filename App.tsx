import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';

import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider } from './src/context/ThemeContext';
import RootNavigator from './src/navigation/RootNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';
import { configureGoogleSignIn } from './src/services/auth/authService';
import {
  requestNotificationPermissions,
  scheduleStudyReminder,
} from './src/services/notifications/notificationService';

// Show notifications when the app is in the foreground too
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Social auth requires native modules — not available in Expo Go.
export const SOCIAL_AUTH_ENABLED = Constants.appOwnership !== 'expo';

if (SOCIAL_AUTH_ENABLED) {
  const extra = (Constants.expoConfig?.extra as any) ?? {};
  if (extra.googleWebClientId) {
    configureGoogleSignIn(extra.googleWebClientId, extra.googleIosClientId);
  }
}

export default function App() {
  // Request permissions + schedule on first launch
  useEffect(() => {
    void requestNotificationPermissions().then((granted) => {
      if (granted) void scheduleStudyReminder();
    });
  }, []);

  // Reschedule whenever the app comes back to the foreground so the
  // content always reflects the latest plan / check-in state
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void scheduleStudyReminder();
    });
    return () => sub.remove();
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
