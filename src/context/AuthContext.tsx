import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';

import { getFirebaseAuth } from '../firebase/config';
import { logout as firebaseLogout } from '../services/auth/authService';
import { getOnboardingDone } from '../services/storage/onboardingStorage';

type AuthState = {
  user: User | null;
  initializing: boolean;
  onboardingComplete: boolean;
  refreshOnboarding: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  const refreshOnboarding = async () => {
    const done = await getOnboardingDone();
    setOnboardingComplete(done);
  };

  useEffect(() => {
    const auth = getFirebaseAuth();

    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u ?? null);

      if (u) {
        await refreshOnboarding();
      } else {
        setOnboardingComplete(false);
      }

      setInitializing(false);
    });

    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      initializing,
      onboardingComplete,
      refreshOnboarding,
      logout: async () => {
        await firebaseLogout();
      },
    }),
    [user, initializing, onboardingComplete],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
