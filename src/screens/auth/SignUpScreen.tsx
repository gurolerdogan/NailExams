import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import AuthInput from '../../components/AuthInput';
import PrimaryButton from '../../components/PrimaryButton';
import { signUp } from '../../services/auth/authService';
import { useFirebaseError } from '../../hooks/useFirebaseError';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';
import { logEvent } from '../../services/logging/logEvent';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignUp'>;

export default function SignUpScreen({ navigation }: Props) {
  const mapError = useFirebaseError();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [busy, setBusy] = useState(false);
  const canSubmit = useMemo(
    () => email.trim().length > 3 && password.length >= 6 && !busy,
    [email, password, busy],
  );

  const onSignUp = async () => {
     if (busy) return;
    try {
      setBusy(true);
      await signUp(email, password);

      await logEvent('signup_success', { email: email.trim() });
      Alert.alert('Account created', 'You can now proceed. Task 8 will enable routing.');
      navigation.popToTop();
    } catch (e) {
      Alert.alert('Sign up failed', mapError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create your account</Text>

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
        placeholder="At least 6 characters"
        secureTextEntry
        autoCapitalize="none"
      />

      <PrimaryButton title={busy ? 'Creating…' : 'Create account'} onPress={onSignUp} disabled={!canSubmit  || busy} />

      <View style={styles.links}>
        <Text style={styles.link} onPress={() => navigation.popToTop()}>
          Already have an account? Sign in
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  links: { marginTop: 14, alignItems: 'center' },
  link: { textDecorationLine: 'underline', fontSize: 15 },
});
