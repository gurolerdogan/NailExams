import React, { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: W } = Dimensions.get('window');

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

type Slide = {
  icon: IoniconName;
  iconBg: string;
  iconColor: string;
  title: string;
  body: string;
};

const SLIDES: Slide[] = [
  {
    icon: 'bar-chart-outline',
    iconBg: '#E6F1FB',
    iconColor: '#0C447C',
    title: "Track what you know,\nnot what you're reading",
    body: 'NailExams is not a revision app — there are no notes or flashcards here. Instead, you record how confident you feel in each topic after you study it, so you always know what still needs work.',
  },
  {
    icon: 'library-outline',
    iconBg: '#EAF3DE',
    iconColor: '#27500A',
    title: 'Set up your\nexam subjects',
    body: 'Pick GCSE or A-Level, then choose your subjects. Topics are pre-loaded from the syllabus — nothing to type. You can also add your own subjects and topics freely.',
  },
  {
    icon: 'checkmark-circle-outline',
    iconBg: '#FBEAF0',
    iconColor: '#72243E',
    title: 'Check in after\neach session',
    body: 'After revising a topic, open NailExams and rate your confidence from 1 (shaky) to 5 (solid). That honest snapshot builds a picture of exactly where you stand across every subject.',
  },
  {
    icon: 'calendar-outline',
    iconBg: '#EEEDFE',
    iconColor: '#3C3489',
    title: 'Plan your revision\nyour way',
    body: 'Auto-generate a 30, 60 or 90-day study plan that targets your weakest topics first — or tap individual days on a calendar to schedule your own sessions.',
  },
];

type Props = {
  onDone: () => void;
};

export default function WalkthroughScreen({ onDone }: Props) {
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<Slide>>(null);
  const isLast = index === SLIDES.length - 1;

  const advance = () => {
    if (isLast) {
      onDone();
    } else {
      const next = index + 1;
      listRef.current?.scrollToIndex({ index: next, animated: true });
      setIndex(next);
    }
  };

  const renderSlide = ({ item }: { item: Slide }) => (
    <View style={styles.slide}>
      <View style={styles.illustrationArea}>
        <View style={[styles.iconWrap, { backgroundColor: item.iconBg }]}>
          <Ionicons name={item.icon} size={72} color={item.iconColor} />
        </View>
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.body}>{item.body}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Wordmark */}
      <Text style={styles.wordmark}>NailExams</Text>

      {/* Slides */}
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(_, i) => String(i)}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / W);
          setIndex(i);
        }}
        getItemLayout={(_, i) => ({ length: W, offset: W * i, index: i })}
        style={styles.list}
      />

      {/* Footer */}
      <View style={styles.footer}>
        {/* Dots */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>

        {/* Primary button */}
        <Pressable style={styles.btn} onPress={advance}>
          <Text style={styles.btnText}>{isLast ? 'Get started' : 'Next'}</Text>
        </Pressable>

        {/* Skip */}
        {!isLast && (
          <Pressable onPress={onDone} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip intro</Text>
          </Pressable>
        )}
        {isLast && <View style={styles.skipBtn} />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  wordmark: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1C1C1E',
    textAlign: 'center',
    paddingTop: 16,
    paddingBottom: 4,
  },

  list: { flex: 1 },

  slide: {
    width: W,
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 24,
  },

  illustrationArea: {
    alignItems: 'center',
    marginBottom: 36,
  },
  iconWrap: {
    width: 140,
    height: 140,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1C1C1E',
    lineHeight: 34,
    marginBottom: 14,
  },
  body: {
    fontSize: 15,
    color: '#555',
    lineHeight: 23,
  },

  footer: {
    paddingHorizontal: 32,
    paddingBottom: 24,
    alignItems: 'center',
    gap: 12,
  },

  dots: {
    flexDirection: 'row',
    gap: 7,
    marginBottom: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
  },
  dotActive: {
    backgroundColor: '#1C1C1E',
    width: 20,
  },

  btn: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    width: '100%',
  },
  btnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },

  skipBtn: {
    paddingVertical: 4,
    height: 28,
    justifyContent: 'center',
  },
  skipText: {
    fontSize: 13,
    color: '#AAA',
  },
});
