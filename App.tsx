import React from 'react';
import Constants from 'expo-constants';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider } from './src/context/ThemeContext';
import RootNavigator from './src/navigation/RootNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';
import { configureGoogleSignIn } from './src/services/auth/authService';

// Social auth requires native modules — not available in Expo Go.
export const SOCIAL_AUTH_ENABLED = Constants.appOwnership !== 'expo';

if (SOCIAL_AUTH_ENABLED) {
  const extra = (Constants.expoConfig?.extra as any) ?? {};
  if (extra.googleWebClientId) {
    configureGoogleSignIn(extra.googleWebClientId, extra.googleIosClientId);
  }
}

export default function App() {
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
