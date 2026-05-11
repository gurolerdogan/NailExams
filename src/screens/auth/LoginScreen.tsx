import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { signIn } from '../../services/auth/authService';
import { useFirebaseError } from '../../hooks/useFirebaseError';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';
import { logEvent } from '../../services/logging/logEvent';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const mapError = useFirebaseError();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const canSubmit = useMemo(
    () => email.trim().length > 3 && password.length >= 6 && !busy,
    [email, password, busy],
  );

  const onLogin = async () => {
    if (!canSubmit) return;
    try {
      setBusy(true);
      await signIn(email.trim(), password);
      await logEvent('login_success', {});
    } catch (e) {
      Alert.alert('Login failed', mapError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>

          {/* Wordmark */}
          <View style={styles.hero}>
            <Text style={styles.wordmark}>NailExams</Text>
            <Text style={styles.tagline}>Revise smarter, not harder.</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>EMAIL</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="name@example.com"
                placeholderTextColor="#BBBBBB"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!busy}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>PASSWORD</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#BBBBBB"
                secureTextEntry
                autoCapitalize="none"
                editable={!busy}
              />
            </View>

            <Pressable
              style={[styles.signInBtn, !canSubmit && { opacity: 0.45 }]}
              onPress={onLogin}
              disabled={!canSubmit}
            >
              <Text style={styles.signInBtnText}>
                {busy ? 'Signing in…' : 'Sign in'}
              </Text>
            </Pressable>

            <View style={styles.links}>
              <Pressable onPress={() => !busy && navigation.navigate('ForgotPassword')}>
                <Text style={styles.link}>Forgot password?</Text>
              </Pressable>
              <Pressable onPress={() => !busy && navigation.navigate('SignUp')}>
                <Text style={[styles.link, styles.linkPrimary]}>Create account →</Text>
              </Pressable>
            </View>
          </View>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  kav: { flex: 1 },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },

  hero: { marginBottom: 36 },
  wordmark: { fontSize: 32, fontWeight: '800', color: '#1C1C1E', letterSpacing: -0.5 },
  tagline: { fontSize: 14, color: '#888', marginTop: 4 },

  form: { gap: 0 },
  field: { marginBottom: 14 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#AAA',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#EBEBEB',
  },

  signInBtn: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  signInBtnText: { color: '#FFF', fontSize: 15, fontWeight: '600' },

  links: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  link: { fontSize: 13, color: '#888' },
  linkPrimary: { color: '#185FA5', fontWeight: '500' },
});
