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
import * as AppleAuthentication from 'expo-apple-authentication';

// Lazy helper — avoids importing the native module at module load time,
// which crashes Expo Go before SOCIAL_AUTH_ENABLED can gate anything.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const googleSignin = () => require('@react-native-google-signin/google-signin').GoogleSignin;
import { getFirebaseAuth } from '../../firebase/config';

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
  try { await googleSignin().revokeAccess(); } catch { /* not signed in via Google */ }
}

export async function requestPasswordReset(email: string): Promise<void> {
  const auth = getFirebaseAuth();
  await sendPasswordResetEmail(auth, email.trim());
}

// ─── Social sign-in ───────────────────────────────────────────────────────────

export function configureGoogleSignIn(webClientId: string, iosClientId?: string) {
  googleSignin().configure({ webClientId, iosClientId });
}

export async function signInWithGoogle(): Promise<AuthResult> {
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
