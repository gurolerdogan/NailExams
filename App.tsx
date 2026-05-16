import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';

import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { PlusProvider } from './src/context/PlusContext';
import RootNavigator from './src/navigation/RootNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';
import { configureGoogleSignIn } from './src/services/auth/authService';
import {
  requestNotificationPermissions,
  scheduleStudyReminder,
  scheduleWeeklySummary,
} from './src/services/notifications/notificationService';
import { capture, getPostHog } from './src/services/analytics/posthog';
import {
  isRevenueCatConfigured,
  configureRevenueCat,
} from './src/services/purchases/purchasesService';

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

// Configure RevenueCat early (before any component mounts)
if (isRevenueCatConfigured()) {
  configureRevenueCat();
}


export default function App() {
  // Request permissions + schedule on first launch; track first app open
  useEffect(() => {
    capture('app_open');
    // Force flush so the cold-start event isn't lost before the client warms up
    void getPostHog()?.flush();

    void requestNotificationPermissions().then((granted) => {
      if (granted) {
        void scheduleStudyReminder();
        void scheduleWeeklySummary();
      }
    });
  }, []);

  // Reschedule + track every foreground resume
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        capture('app_open');
        void scheduleStudyReminder();
        void scheduleWeeklySummary();
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <PlusProvider>
            <RootNavigator />
          </PlusProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
