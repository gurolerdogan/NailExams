import React, { useState } from 'react';
import { Image, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import type { ExamLevel } from '../../types/models';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingExamLevel'>;

const LEVELS: { label: string; value: ExamLevel; age: string; subjects: string; topics: string; desc: string }[] = [
  {
    label: 'GCSE',
    value: 'GCSE',
    age: 'Ages 14–16 · Year 10 & 11',
    subjects: '61 subjects',
    topics: '1,200+ revision topics',
    desc: 'AQA · Edexcel · OCR — Maths, Sciences, English, Languages, Humanities and more',
  },
  {
    label: 'A Level',
    value: 'A_LEVEL',
    age: 'Ages 16–18 · Year 12 & 13',
    subjects: '74 subjects',
    topics: '1,600+ revision topics',
    desc: 'AQA · Edexcel · OCR — Sciences, Maths, Humanities, Languages, Social Sciences and more',
  },
];

export default function OnboardingExamLevelScreen({ navigation }: Props) {
  const [selected, setSelected] = useState<ExamLevel | null>(null);

  const onNext = () => {
    if (!selected) return;
    navigation.navigate('OnboardingSubjects', { examLevel: selected });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        {/* Hero */}
        <View style={styles.hero}>
          <Image
            source={require('../../../assets/icon.png')}
            style={styles.logo}
            resizeMode="cover"
          />
          <Text style={styles.title}>Welcome to NailExams</Text>
          <Text style={styles.subtitle}>
            Let's get your revision set up.{'\n'}What are you studying for?
          </Text>
        </View>

        {/* Step dots — step 1 of 4 */}
        <View style={styles.dots}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>

        {/* Level cards */}
        <View style={styles.cards}>
          {LEVELS.map((level) => {
            const isSelected = selected === level.value;
            return (
              <Pressable
                key={level.value}
                style={[styles.card, isSelected && styles.cardSelected]}
                onPress={() => setSelected(level.value)}
              >
                <View style={styles.cardRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, isSelected && styles.cardTitleSelected]}>
                      {level.label}
                    </Text>
                    <Text style={styles.cardAge}>{level.age}</Text>
                  </View>
                  <View style={[styles.radio, isSelected && styles.radioSelected]}>
                    {isSelected && <View style={styles.radioDot} />}
                  </View>
                </View>

                <View style={styles.cardDivider} />

                <Text style={styles.cardDesc}>{level.desc}</Text>

                <View style={styles.statsRow}>
                  <View style={styles.statPill}>
                    <Text style={styles.statPillText}>📚 {level.subjects}</Text>
                  </View>
                  <View style={styles.statPill}>
                    <Text style={styles.statPillText}>🎯 {level.topics}</Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.footer}>
          <Pressable
            style={[styles.nextBtn, !selected && { opacity: 0.4 }]}
            onPress={onNext}
            disabled={!selected}
          >
            <Text style={styles.nextBtnText}>Continue →</Text>
          </Pressable>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1, paddingHorizontal: 20 },

  hero: { alignItems: 'center', paddingTop: 40, paddingBottom: 28 },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 18,
    marginBottom: 18,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#1C1C1E', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 21 },

  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 28 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#E0E0E0' },
  dotActive: { width: 20, backgroundColor: '#1C1C1E', borderRadius: 3 },

  cards: { gap: 12 },
  card: {
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
    padding: 16,
    backgroundColor: '#FFF',
  },
  cardSelected: { borderColor: '#1C1C1E', backgroundColor: '#FAFAFA' },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#1C1C1E', marginBottom: 3 },
  cardTitleSelected: { color: '#1C1C1E' },
  cardAge: { fontSize: 12, color: '#888' },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#CCC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: '#1C1C1E', backgroundColor: '#1C1C1E' },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFF' },
  cardDivider: { height: 0.5, backgroundColor: '#EBEBEB', marginVertical: 12 },
  cardDesc: { fontSize: 12, color: '#888', lineHeight: 17, marginBottom: 10 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statPill: {
    backgroundColor: '#F4F4F6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statPillText: { fontSize: 12, fontWeight: '600', color: '#3C3C43' },

  footer: { position: 'absolute', bottom: 32, left: 20, right: 20 },
  nextBtn: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextBtnText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
});
