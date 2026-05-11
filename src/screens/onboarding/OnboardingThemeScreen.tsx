import React, { useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { setOnboardingDone } from '../../services/storage/nailexamsStorage';
import { logEvent } from '../../services/logging/logEvent';
import { THEME_REGISTRY } from '../../themes';
import type { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingTheme'>;

export default function OnboardingThemeScreen({ navigation: _nav }: Props) {
  const { refreshOnboarding } = useAuth();
  const { theme: activeTheme, setThemeId } = useTheme();

  const [selectedId, setSelectedId] = useState(activeTheme.id);
  const [busy, setBusy] = useState(false);

  const onStart = async () => {
    if (busy) return;
    try {
      setBusy(true);
      await setThemeId(selectedId);
      await setOnboardingDone(true);
      await logEvent('onboarding_completed', { theme: selectedId });
      await refreshOnboarding();
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Pick your style</Text>
          <Text style={styles.subtitle}>You can always change this later in Settings.</Text>
        </View>

        {/* Step dots — step 4 of 4 */}
        <View style={styles.dots}>
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={[styles.dot, styles.dotActive]} />
        </View>

        {/* Theme cards */}
        {THEME_REGISTRY.map((t) => {
          const active = t.id === selectedId;
          return (
            <Pressable
              key={t.id}
              style={[styles.card, active && styles.cardActive]}
              onPress={() => setSelectedId(t.id)}
            >
              {/* Swatch row */}
              <View style={styles.swatchRow}>
                {t.previewSwatches.map((color, i) => (
                  <View key={i} style={[styles.swatch, { backgroundColor: color }]} />
                ))}
              </View>

              {/* Info + radio */}
              <View style={styles.infoRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName}>{t.name}</Text>
                  <Text style={styles.cardDesc}>{t.description}</Text>
                </View>
                <View style={[styles.radio, active && styles.radioActive]}>
                  {active && <View style={styles.radioDot} />}
                </View>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Sticky footer */}
      <View style={styles.footer}>
        <Pressable
          style={[styles.startBtn, busy && { opacity: 0.6 }]}
          onPress={onStart}
          disabled={busy}
        >
          <Text style={styles.startBtnText}>
            {busy ? 'Starting…' : 'Start NailExams →'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },

  header: { marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '700', color: '#1C1C1E', letterSpacing: -0.3 },
  subtitle: { fontSize: 14, color: '#888', marginTop: 4 },

  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 24 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#E0E0E0' },
  dotActive: { width: 20, backgroundColor: '#1C1C1E', borderRadius: 3 },

  card: {
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E8E8EC',
    backgroundColor: '#FAFAFA',
    padding: 14,
    marginBottom: 10,
  },
  cardActive: {
    borderColor: '#1C1C1E',
    backgroundColor: '#FFFFFF',
  },

  swatchRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  swatch: { width: 26, height: 26, borderRadius: 8 },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardName: { fontSize: 15, fontWeight: '600', color: '#1C1C1E', marginBottom: 2 },
  cardDesc: { fontSize: 12, color: '#888' },

  radio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.5, borderColor: '#C7C7CC',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  radioActive: { borderColor: '#1C1C1E' },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: '#1C1C1E' },

  footer: {
    padding: 16,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 0.5,
    borderTopColor: '#F0F0F0',
  },
  startBtn: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  startBtnText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
});
