import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Ionicons } from '@expo/vector-icons';

import { signUp, signInWithGoogle, signInWithApple } from '../../services/auth/authService';
import { useFirebaseError } from '../../hooks/useFirebaseError';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';
import { logEvent } from '../../services/logging/logEvent';
import { SOCIAL_AUTH_ENABLED } from '../../../App';
import { useTheme } from '../../context/ThemeContext';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignUp'>;

export default function SignUpScreen({ navigation }: Props) {
  const mapError = useFirebaseError();
  const { theme } = useTheme();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy]         = useState(false);

  const canSubmit = useMemo(
    () => email.trim().length > 3 && password.length >= 6 && !busy,
    [email, password, busy],
  );

  const onSignUp = async () => {
    if (!canSubmit) return;
    try {
      setBusy(true);
      await signUp(email.trim(), password);
      await logEvent('signup_success', {});
      navigation.popToTop();
    } catch (e) {
      Alert.alert('Sign up failed', mapError(e));
    } finally {
      setBusy(false);
    }
  };

  const onGoogleSignIn = async () => {
    try {
      setBusy(true);
      await signInWithGoogle();
      await logEvent('google_signup_success', {});
    } catch (e: any) {
      if (e.code !== 'SIGN_IN_CANCELLED') {
        Alert.alert('Google sign-in failed', mapError(e));
      }
    } finally {
      setBusy(false);
    }
  };

  const onAppleSignIn = async () => {
    try {
      setBusy(true);
      await signInWithApple();
      await logEvent('apple_signup_success', {});
    } catch (e: any) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Apple sign-in failed', mapError(e));
      }
    } finally {
      setBusy(false);
    }
  };

  const T = theme.colors;
  const R = theme.radii;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.screenBg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>

          <View style={{ marginBottom: 32 }}>
            <Text style={{ fontSize: 28, fontWeight: theme.fonts.headingWeight, color: T.textPrimary, letterSpacing: theme.fonts.letterSpacingHeading, fontFamily: theme.fonts.heading }}>Create account</Text>
            <Text style={{ fontSize: 14, color: T.textMuted, marginTop: 4 }}>Join NailExams and start revising.</Text>
          </View>

          <View>
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: T.textMuted, letterSpacing: 0.6, marginBottom: 6 }}>EMAIL</Text>
              <TextInput
                style={{ backgroundColor: T.inputBg, borderRadius: R.input, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: T.inputText, borderWidth: 1, borderColor: T.inputBorder }}
                value={email} onChangeText={setEmail}
                placeholder="name@example.com" placeholderTextColor={T.textMuted}
                keyboardType="email-address" autoCapitalize="none" autoCorrect={false} editable={!busy}
              />
            </View>

            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: T.textMuted, letterSpacing: 0.6, marginBottom: 6 }}>PASSWORD</Text>
              <TextInput
                style={{ backgroundColor: T.inputBg, borderRadius: R.input, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: T.inputText, borderWidth: 1, borderColor: T.inputBorder }}
                value={password} onChangeText={setPassword}
                placeholder="At least 6 characters" placeholderTextColor={T.textMuted}
                secureTextEntry autoCapitalize="none" editable={!busy}
              />
            </View>

            <Pressable
              style={[{ backgroundColor: T.buttonPrimaryBg, borderRadius: R.button, paddingVertical: 16, alignItems: 'center', marginTop: 6, marginBottom: 20 }, !canSubmit && { opacity: 0.45 }]}
              onPress={onSignUp} disabled={!canSubmit}
            >
              <Text style={{ color: T.buttonPrimaryText, fontSize: 15, fontWeight: '600', fontFamily: theme.fonts.body }}>{busy ? 'Creating account…' : 'Create account'}</Text>
            </Pressable>

            {SOCIAL_AUTH_ENABLED && (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                  <View style={{ flex: 1, height: 0.5, backgroundColor: T.divider }} />
                  <Text style={{ fontSize: 12, color: T.textMuted, marginHorizontal: 10 }}>or continue with</Text>
                  <View style={{ flex: 1, height: 0.5, backgroundColor: T.divider }} />
                </View>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
                  <Pressable style={[{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: T.cardBg, borderRadius: R.input, paddingVertical: 14, borderWidth: 1, borderColor: T.cardBorder }, busy && { opacity: 0.45 }]} onPress={onGoogleSignIn} disabled={busy}>
                    <Ionicons name="logo-google" size={18} color={T.textPrimary} />
                    <Text style={{ fontSize: 14, fontWeight: '500', color: T.textPrimary }}>Google</Text>
                  </Pressable>
                  {Platform.OS === 'ios' && (
                    <AppleAuthentication.AppleAuthenticationButton
                      buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                      buttonStyle={theme.dark ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                      cornerRadius={R.input} style={{ flex: 1, height: 50 }} onPress={onAppleSignIn}
                    />
                  )}
                </View>
              </>
            )}

            <Pressable style={{ alignItems: 'center', paddingVertical: 4 }} onPress={() => !busy && navigation.popToTop()}>
              <Text style={{ fontSize: 13, color: T.textMuted }}>← Already have an account? Sign in</Text>
            </Pressable>
          </View>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

