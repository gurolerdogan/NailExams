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
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    plugins: [
      'expo-web-browser',
      ['@react-native-google-signin/google-signin', {
        iosUrlScheme: 'com.googleusercontent.apps.948483076530-npmq65i0lqnk6cah7trig8aainjgknmt',
      }],
    ],
    splash: {
      image: './assets/splash.png',
      resizeMode: 'cover',
      backgroundColor: '#1C1C1E',
    },
    ios: {
      bundleIdentifier: 'com.gurolerdogan.nailexams',
      buildNumber: '1',
      supportsTablet: false,
      usesAppleSignIn: true,
      googleServicesFile: './GoogleService-Info.plist',
      infoPlist: {
        NSCameraUsageDescription: 'NailExams does not use the camera.',
        CFBundleDisplayName: 'NailExams',
      },
    },
    android: {
      package: 'com.gurolerdogan.nailexams',
      versionCode: 1,
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#1C1C1E',
      },
      edgeToEdgeEnabled: true,
    },
    web: {
      favicon: './assets/favicon.png',
    },
    extra: {
      appEnv,
      eas: {
        projectId: 'fba1e4ba-2205-48fe-8740-18afb390b1c3', // ← paste your ID from expo.dev
      },
      firebase: {
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID,
      },
      googleIosClientId:     process.env.GOOGLE_IOS_CLIENT_ID,
      googleWebClientId:     process.env.GOOGLE_WEB_CLIENT_ID,
    },
  };
};