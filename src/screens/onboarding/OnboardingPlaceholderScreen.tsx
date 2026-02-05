import React from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import PrimaryButton from '../../components/PrimaryButton';
import { setOnboardingDone } from '../../services/storage/onboardingStorage';
import { useAuth } from '../../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';


export default function OnboardingPlaceholderScreen() {
  const { refreshOnboarding } = useAuth();

  const markDone = async () => {
    
    await setOnboardingDone(true);
    await refreshOnboarding();
    Alert.alert('Onboarding marked complete', 'Task 10 will replace this with real onboarding screens.');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Onboarding (Placeholder)</Text>
      <Text style={styles.body}>
        Task 10 will add GCSE/A-level + subjects selection. For now you can mark onboarding as complete.
      </Text>
      <PrimaryButton title="Mark onboarding complete" onPress={markDone} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 10, textAlign: 'center' },
  body: { fontSize: 15, marginBottom: 16, textAlign: 'center' },
});
