import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import AuthInput from '../../components/AuthInput';
import PrimaryButton from '../../components/PrimaryButton';
import { requestPasswordReset } from '../../services/auth/authService';
import { useFirebaseError } from '../../hooks/useFirebaseError';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export default function ForgotPasswordScreen({ navigation }: Props) {
  const mapError = useFirebaseError();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const canSubmit = useMemo(() => email.trim().length > 3 && !busy, [email, busy]);

  const onReset = async () => {
    try {
      setBusy(true);
      await requestPasswordReset(email);
      navigation.replace('PasswordResetConfirmation', { email: email.trim() });
    } catch (e) {
      Alert.alert('Reset failed', mapError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reset your password</Text>

      <AuthInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="name@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <PrimaryButton title={busy ? 'Sending…' : 'Send reset email'} onPress={onReset} disabled={!canSubmit} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
});
