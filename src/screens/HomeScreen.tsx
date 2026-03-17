import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import PrimaryButton from '../components/PrimaryButton';
import { useAuth } from '../context/AuthContext';

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/HomeNavigator';




export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();

  const { profile, subjects, refreshUserData } = useAuth();

  useEffect(() => {
    void refreshUserData();
  }, [refreshUserData]);

  const level = profile?.examLevel ?? '—';
  const subjectNames = subjects.map((s) => s.name);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>NailExams</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Your setup</Text>
        <Text style={styles.meta}>Level: {level}</Text>
        <Text style={styles.meta}>Subjects: {subjects.length}</Text>
        <Text style={styles.metaSmall}>
          {subjects.length ? subjectNames.join(', ') : 'No subjects yet'}
        </Text>
        <PrimaryButton title="Manage subjects" onPress={() => navigation.navigate('Subjects')} />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Next</Text>
        <Text style={styles.metaSmall}>
          Plan and Progress are placeholders for Phase 0+1. Next milestone is the plan engine later.
        </Text>
        <PrimaryButton title="Create plan (placeholder)" onPress={() => {}} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 12 },
  card: { padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  meta: { fontSize: 15, marginBottom: 4 },
  metaSmall: { fontSize: 13 },
});