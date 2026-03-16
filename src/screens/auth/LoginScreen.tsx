import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import AuthInput from '../../components/AuthInput';
import PrimaryButton from '../../components/PrimaryButton';
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
    if (busy) return;
    try {
      setBusy(true);
      await signIn(email, password);
      // Task 8 will route based on auth state. For now just show success.
      
      await logEvent('login_success', { email: email.trim() });
      Alert.alert('Logged in', 'Auth succeeded. Task 8 will enable app routing.');
    } catch (e) {
      Alert.alert('Login failed', mapError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome back</Text>

      <AuthInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="name@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <AuthInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
        secureTextEntry
        autoCapitalize="none"
      />

      <PrimaryButton title={busy ? 'Signing in…' : 'Sign in'} onPress={onLogin} disabled={!canSubmit || busy} />

      <View style={styles.links}>
        <Text style={styles.link} onPress={() => !busy && navigation.navigate('ForgotPassword')}>
          Forgot password?
        </Text>
        <Text style={styles.link} onPress={() => !busy && navigation.navigate('SignUp')}>
          Create account
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  links: { marginTop: 14, gap: 10, alignItems: 'center' },
  link: { textDecorationLine: 'underline', fontSize: 15 },
});
