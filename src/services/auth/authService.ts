import {
  createUserWithEmailAndPassword,
  deleteUser,
  GoogleAuthProvider,
  OAuthProvider,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  User,
} from 'firebase/auth';
import { wipeAll } from '../storage/nailexamsStorage';
import { Platform } from 'react-native';
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

/**
 * Permanently deletes the Firebase Auth account and wipes all local data.
 * Firebase's onAuthStateChanged fires with null after this, automatically
 * returning the user to the auth screen.
 *
 * May throw auth/requires-recent-login if the session is stale — in that
 * case tell the user to sign out and sign back in before retrying.
 */
export async function deleteAccount(): Promise<void> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('No authenticated user found.');
  await deleteUser(user);   // permanent — throws auth/requires-recent-login if stale session
  await wipeAll();          // clear all local AsyncStorage data
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
  if (Platform.OS !== 'ios') throw new Error('Apple Sign-In is only available on iOS.');
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
