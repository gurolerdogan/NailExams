import { useCallback } from 'react';

function mapFirebaseAuthError(code?: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-not-found':
      return 'No account found with that email.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/email-already-in-use':
      return 'This email is already in use. Try logging in instead.';
    case 'auth/weak-password':
      return 'Password is too weak. Use at least 6 characters.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    case 'auth/requires-recent-login':
      return 'For security, please sign out and sign back in before deleting your account.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

export function useFirebaseError() {
  return useCallback((err: unknown) => {
    const code = typeof err === 'object' && err && 'code' in err ? (err as any).code : undefined;
    return mapFirebaseAuthError(code);
  }, []);
}
