import Constants from 'expo-constants';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

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
  // Expo SDK sometimes exposes config via different paths depending on runtime/build.
  const expoConfig = Constants.expoConfig ?? Constants.manifest2?.extra?.expoClient ?? Constants.manifest;
  return (expoConfig?.extra ?? {}) as FirebaseExtra;
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
  const extra = getExtra();
  return extra.appEnv ?? 'development';
}

export function getFirebaseApp(): FirebaseApp {
  const extra = getExtra();
  const firebase = extra.firebase ?? {};

  const cfg = {
    apiKey: firebase.apiKey ?? '',
    authDomain: firebase.authDomain ?? '',
    projectId: firebase.projectId ?? '',
    storageBucket: firebase.storageBucket ?? '',
    messagingSenderId: firebase.messagingSenderId ?? '',
    appId: firebase.appId ?? '',
  };

  assertFirebaseConfig(cfg);

  if (getApps().length === 0) {
    // Initialize once
    const app = initializeApp(cfg);
    // Minimal boot log (SafeCube-style discipline)
    // eslint-disable-next-line no-console
    console.log(`[NailExams] ENV=${getAppEnv()} Firebase initialized`);
    return app;
  }

  // eslint-disable-next-line no-console
  console.log(`[NailExams] ENV=${getAppEnv()} Firebase already initialized`);
  return getApps()[0]!;
}

export function getFirebaseAuth() {
  const app = getFirebaseApp();
  return getAuth(app);
}
