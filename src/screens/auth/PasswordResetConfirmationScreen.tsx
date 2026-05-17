import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import PrimaryButton from '../../components/PrimaryButton';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';

type Props = NativeStackScreenProps<AuthStackParamList, 'PasswordResetConfirmation'>;

export default function PasswordResetConfirmationScreen({ route, navigation }: Props) {
  const { email } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Check your email</Text>
      <Text style={styles.body}>
        We sent a password reset link to:
      </Text>
      <Text style={styles.email}>{email}</Text>

      <PrimaryButton title="Back to login" onPress={() => navigation.navigate('Login')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 10 },
  body: { textAlign: 'center', fontSize: 15 },
  email: { marginTop: 6, marginBottom: 18, fontSize: 15, fontWeight: '600' },
});
