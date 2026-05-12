import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  OAuthProvider,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  User,
} from 'firebase/auth';
import Constants from 'expo-constants';
import * as AppleAuthentication from 'expo-apple-authentication';
import { getFirebaseAuth } from '../../firebase/config';

// Native Google Sign-In SDK is not available in Expo Go.
// All calls that touch the native module must be gated behind this flag so
// the require() is never executed in Expo Go (TurboModuleRegistry.getEnforcing
// throws at the native level and cannot be caught with try/catch).
const IS_EXPO_GO = Constants.appOwnership === 'expo';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const googleSignin = () =>
  require('@react-native-google-signin/google-signin').GoogleSignin as {
    configure: (opts: { webClientId: string; iosClientId?: string }) => void;
    hasPlayServices: () => Promise<void>;
    signIn: () => Promise<{ data: { idToken: string | null } | null }>;
    revokeAccess: () => Promise<void>;
  };

export type AuthResult = { user: User };

export async function signUp(email: string, password: string): Promise<AuthResult> {
  const auth = getFirebaseAuth();
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  return { user: cred.user };
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const auth = getFirebaseAuth();
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  return { user: cred.user };
}

export async function logout(): Promise<void> {
  const auth = getFirebaseAuth();
  await signOut(auth);
  // Only revoke Google access in builds that have the native module
  if (!IS_EXPO_GO) {
    try { await googleSignin().revokeAccess(); } catch { /* not signed in via Google */ }
  }
}

export async function requestPasswordReset(email: string): Promise<void> {
  const auth = getFirebaseAuth();
  await sendPasswordResetEmail(auth, email.trim());
}

// ─── Social sign-in ───────────────────────────────────────────────────────────

export function configureGoogleSignIn(webClientId: string, iosClientId?: string) {
  if (IS_EXPO_GO) return;
  googleSignin().configure({ webClientId, iosClientId });
}

export async function signInWithGoogle(): Promise<AuthResult> {
  if (IS_EXPO_GO) throw new Error('Google Sign-In is not available in Expo Go.');
  await googleSignin().hasPlayServices();
  const response = await googleSignin().signIn();
  const idToken = response.data?.idToken;
  if (!idToken) throw new Error('Google sign-in returned no ID token.');
  const auth = getFirebaseAuth();
  const credential = GoogleAuthProvider.credential(idToken);
  const cred = await signInWithCredential(auth, credential);
  return { user: cred.user };
}

export async function signInWithApple(): Promise<AuthResult> {
  const appleCredential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });
  const { identityToken } = appleCredential;
  if (!identityToken) throw new Error('Apple sign-in returned no identity token.');
  const auth = getFirebaseAuth();
  const provider = new OAuthProvider('apple.com');
  const firebaseCredential = provider.credential({ idToken: identityToken });
  const cred = await signInWithCredential(auth, firebaseCredential);
  return { user: cred.user };
}
