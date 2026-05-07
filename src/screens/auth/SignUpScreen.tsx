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
    if (!canSubmit) return;
    try {
      setBusy(true);
      await signUp(email.trim(), password);
      await logEvent('signup_success', { email: email.trim() });
      navigation.popToTop();
    } catch (e) {
      Alert.alert('Sign up failed', mapError(e));
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

          {/* Header */}
          <View style={styles.hero}>
            <Text style={styles.title}>Create account</Text>
            <Text style={styles.subtitle}>Join NailExams and start revising.</Text>
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
                placeholder="At least 6 characters"
                placeholderTextColor="#BBBBBB"
                secureTextEntry
                autoCapitalize="none"
                editable={!busy}
              />
            </View>

            <Pressable
              style={[styles.createBtn, !canSubmit && { opacity: 0.45 }]}
              onPress={onSignUp}
              disabled={!canSubmit}
            >
              <Text style={styles.createBtnText}>
                {busy ? 'Creating account…' : 'Create account'}
              </Text>
            </Pressable>

            <Pressable
              style={styles.backLink}
              onPress={() => !busy && navigation.popToTop()}
            >
              <Text style={styles.backLinkText}>← Already have an account? Sign in</Text>
            </Pressable>
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

  hero: { marginBottom: 32 },
  title: { fontSize: 28, fontWeight: '700', color: '#1C1C1E', letterSpacing: -0.3 },
  subtitle: { fontSize: 14, color: '#888', marginTop: 4 },

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

  createBtn: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  createBtnText: { color: '#FFF', fontSize: 15, fontWeight: '600' },

  backLink: { alignItems: 'center', paddingVertical: 4 },
  backLinkText: { fontSize: 13, color: '#888' },
});
