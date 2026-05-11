import Constants from 'expo-constants';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { initializeAuth, getAuth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// getReactNativePersistence lives in the React Native build of firebase/auth
// (resolved by Metro at runtime) but is absent from the web TypeScript types.
import type { Persistence } from 'firebase/auth';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getReactNativePersistence } = require('firebase/auth') as {
  getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
};

type FirebaseExtra = {
  appEnv?: string;
  firebase?: {
    apiKey?: string;
    authDomain?: string;
    projectId?: string;
    storageBucket?: string;
    messagingSenderId?: string;
    appId?: string;
  };
};

function getExtra(): FirebaseExtra {
  const expoConfig = Constants.expoConfig ?? (Constants.manifest2?.extra?.expoClient as any) ?? Constants.manifest;
  return ((expoConfig as any)?.extra ?? {}) as FirebaseExtra;
}

function assertFirebaseConfig(cfg: Required<NonNullable<FirebaseExtra['firebase']>>) {
  const missing = Object.entries(cfg)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length) {
    throw new Error(`Missing Firebase config values: ${missing.join(', ')}`);
  }
}

export function getAppEnv(): string {
  return getExtra().appEnv ?? 'development';
}

export function getFirebaseApp(): FirebaseApp {
  const extra = getExtra();
  const firebase = extra.firebase ?? {};

  const cfg = {
    apiKey:            firebase.apiKey            ?? '',
    authDomain:        firebase.authDomain        ?? '',
    projectId:         firebase.projectId         ?? '',
    storageBucket:     firebase.storageBucket     ?? '',
    messagingSenderId: firebase.messagingSenderId ?? '',
    appId:             firebase.appId             ?? '',
  };

  assertFirebaseConfig(cfg);

  if (getApps().length === 0) {
    const app = initializeApp(cfg);
    // Initialise auth with AsyncStorage persistence so sessions survive app restarts
    initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
    if (__DEV__) console.log(`[NailExams] ENV=${getAppEnv()} Firebase initialized`); // eslint-disable-line no-console
    return app;
  }

  if (__DEV__) console.log(`[NailExams] ENV=${getAppEnv()} Firebase already initialized`); // eslint-disable-line no-console
  return getApps()[0]!;
}

export function getFirebaseAuth() {
  const app = getFirebaseApp();
  // getAuth() returns the already-initialised auth instance (with persistence)
  return getAuth(app);
}
