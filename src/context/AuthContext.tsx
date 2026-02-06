import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';

import { getFirebaseAuth } from '../firebase/config';
import { logout as firebaseLogout } from '../services/auth/authService';
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

  // Profile/subjects are hydrated on login for convenience.
  // Task 10/11 will make these first-class and editable via onboarding/settings.
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
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  const [onboardingComplete, setOnboardingComplete] = useState(false);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const refreshOnboarding = async () => {
    const done = await getOnboardingDone();
    setOnboardingComplete(done);
  };

  const refreshUserData = async () => {
    // For Phase 0/1: local-first hydration.
    // Later: could merge with Firestore/remote.
    const [p, s] = await Promise.all([loadProfile(), loadSubjects()]);
    setProfile(p);
    setSubjects(s);
  };

  useEffect(() => {
    const auth = getFirebaseAuth();

    const unsub = onAuthStateChanged(auth, async (u) => {
      try {
        setUser(u ?? null);

        if (u) {
          // Ensure storage version/migrations are applied before reading data
          await ensureStorageVersion();

          // Hydrate onboarding + basic user data
          await Promise.all([refreshOnboarding(), refreshUserData()]);
        } else {
          // Clear local in-memory state when logged out
          setOnboardingComplete(false);
          setProfile(null);
          setSubjects([]);
        }
      } finally {
        setInitializing(false);
      }
    });

    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = async () => {
    await firebaseLogout();
    // onAuthStateChanged will fire and clear local in-memory state
  };

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
    [user, initializing, onboardingComplete, profile, subjects],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
