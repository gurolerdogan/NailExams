import 'dotenv/config';
import type { ExpoConfig } from 'expo/config';

export default (): ExpoConfig => {
  const appEnv = process.env.APP_ENV ?? 'development';

  return {
    name: 'NailExams',
    slug: 'nailexams',
    scheme: 'nailexams',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: { supportsTablet: true },
    android: {},
    extra: {
      appEnv,
      firebase: {
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID,
      },
    },
  };
};

