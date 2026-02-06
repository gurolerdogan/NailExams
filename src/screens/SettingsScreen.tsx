import React from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import PrimaryButton from '../components/PrimaryButton';
import { useAuth } from '../context/AuthContext';


import { wipeAll } from '../services/storage/nailexamsStorage';






export default function SettingsScreen() {


  const { refreshOnboarding, refreshUserData } = useAuth();

  const onResetOnboarding = async () => {
    Alert.alert('Reset onboarding?', 'This will wipe local NailExams data on this device.', [
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
  };



  const { logout } = useAuth();

  const onLogout = async () => {
    Alert.alert('Logout?', 'You will return to the login screen.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => void logout() },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <PrimaryButton title="Logout" onPress={onLogout} />

      <PrimaryButton title="Reset onboarding (wipe local)" onPress={onResetOnboarding} />

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
});
