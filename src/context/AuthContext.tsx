import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';

import { getFirebaseAuth } from '../firebase/config';
import { logout as firebaseLogout } from '../services/auth/authService';
import { identifyUser, resetAnalyticsUser } from '../services/analytics/posthog';
import {
  ensureStorageVersion,
  getOnboardingDone,
  loadProfile,
  loadSubjects,
} from '../services/storage/nailexamsStorage';
import type { Subject, UserProfile } from '../types/models';

type AuthState = {
  user: User | null;
  initializing: boolean;

  onboardingComplete: boolean;
  refreshOnboarding: () => Promise<void>;

  profile: UserProfile | null;
  subjects: Subject[];

  refreshUserData: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]                       = useState<User | null>(null);
  const [initializing, setInitializing]       = useState(true);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [profile, setProfile]                 = useState<UserProfile | null>(null);
  const [subjects, setSubjects]               = useState<Subject[]>([]);

  // Stable callbacks — no deps means they never change reference, preventing
  // useEffect re-fires in screens that depend on them via useCallback.
  const refreshOnboarding = useCallback(async () => {
    const done = await getOnboardingDone();
    setOnboardingComplete(done);
  }, []);

  const refreshUserData = useCallback(async () => {
    const [p, s] = await Promise.all([loadProfile(), loadSubjects()]);
    setProfile(p);
    setSubjects(s);
  }, []);

  const logout = useCallback(async () => {
    await firebaseLogout();
    // onAuthStateChanged will fire and clear local in-memory state
  }, []);

  useEffect(() => {
    const auth = getFirebaseAuth();

    const unsub = onAuthStateChanged(auth, async (u) => {
      try {
        setUser(u ?? null);

        if (u) {
          identifyUser(u.uid, u.email ?? undefined);
          await ensureStorageVersion();
          await Promise.all([refreshOnboarding(), refreshUserData()]);
        } else {
          resetAnalyticsUser();
          setOnboardingComplete(false);
          setProfile(null);
          setSubjects([]);
        }
      } finally {
        setInitializing(false);
      }
    });

    return unsub;
  }, [refreshOnboarding, refreshUserData]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      initializing,
      onboardingComplete,
      refreshOnboarding,
      profile,
      subjects,
      refreshUserData,
      logout,
    }),
    [user, initializing, onboardingComplete, refreshOnboarding, profile, subjects, refreshUserData, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
