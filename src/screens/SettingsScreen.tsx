import React from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import PrimaryButton from '../components/PrimaryButton';
import { useAuth } from '../context/AuthContext';
import { wipeAll } from '../services/storage/nailexamsStorage';
import { logEvent } from '../services/logging/logEvent';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SettingsStackParamList } from '../navigation/SettingsNavigator';

type Props = NativeStackScreenProps<SettingsStackParamList, 'SettingsHome'>;

export default function SettingsScreen({ navigation }: Props) {
  const { profile, subjects, logout, refreshOnboarding, refreshUserData } = useAuth();

  const onReset = async () => {
    Alert.alert('Reset onboarding?', 'This will wipe NailExams local data on this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          await wipeAll();
          await refreshUserData();
          await refreshOnboarding();
          
        },
      },
    ]);

    await logEvent('local_wipe', {});
  };

  const onLogout = async () => {
    Alert.alert('Logout?', 'You will return to the login screen.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => void logout() },
    ]);
    await logEvent('logout', {});
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Profile</Text>
        <Text style={styles.meta}>Level: {profile?.examLevel ?? '—'}</Text>
        <Text style={styles.meta}>Subjects: {subjects.length}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Actions</Text>
        <PrimaryButton title="Edit subjects" onPress={() => navigation.navigate('EditSubjects')} />
        <View style={{ height: 10 }} />
        <PrimaryButton title="Reset onboarding (wipe local)" onPress={onReset} />
        <View style={{ height: 10 }} />
        <PrimaryButton title="View logs" onPress={() => navigation.navigate('Logs')} />
        <View style={{ height: 10 }} />
        <PrimaryButton title="Logout" onPress={onLogout} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  card: { padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  meta: { fontSize: 15, marginBottom: 4 },
});