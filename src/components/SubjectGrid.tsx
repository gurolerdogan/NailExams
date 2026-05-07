import React, { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text } from 'react-native';
import type { Subject } from '../types/models';

type Props = {
  subjects: Subject[];
  onPressSubject: (subject: Subject) => void;
};

function columnsFor(count: number) {
  if (count <= 4) return 2;
  if (count <= 6) return 3;
  return 4;
}

function subjectVisual(name: string): { emoji: string; tint: string } {
  const n = name.toLowerCase();

  if (n.includes('math')) return { emoji: '➗', tint: '#FDE68A' };
  if (n.includes('english')) return { emoji: '📖', tint: '#BFDBFE' };
  if (n.includes('physics')) return { emoji: '⚛️', tint: '#DDD6FE' };
  if (n.includes('chemistry')) return { emoji: '🧪', tint: '#BBF7D0' };
  if (n.includes('biology')) return { emoji: '🧬', tint: '#FED7AA' };
  if (n.includes('french')) return { emoji: '🇫🇷', tint: '#C7D2FE' };
  if (n.includes('business')) return { emoji: '💼', tint: '#FBCFE8' };
  if (n.includes('drama')) return { emoji: '🎭', tint: '#E9D5FF' };

  return { emoji: '📚', tint: '#E5E7EB' };
}

export default function SubjectGrid({ subjects, onPressSubject }: Props) {
  const sorted = useMemo(
    () => [...subjects].sort((a, b) => a.name.localeCompare(b.name)),
    [subjects],
  );

  const numColumns = columnsFor(sorted.length);

  return (
    <FlatList
      data={sorted}
      key={numColumns}
      numColumns={numColumns}
      keyExtractor={(item) => item.id}
      columnWrapperStyle={numColumns > 1 ? styles.row : undefined}
      contentContainerStyle={styles.grid}
      renderItem={({ item }) => {
        const v = subjectVisual(item.name);

        return (
          <Pressable
            onPress={() => onPressSubject(item)}
            style={[styles.tile, { backgroundColor: v.tint, flex: 1 / numColumns }]}
          >
            <Text style={styles.emoji}>{v.emoji}</Text>
            <Text style={styles.name} numberOfLines={2}>
              {item.name}
            </Text>
          </Pressable>
        );
      }}
      ListEmptyComponent={<Text style={styles.empty}>No subjects yet.</Text>}
      scrollEnabled={false}
    />
  );
}

const styles = StyleSheet.create({
  grid: { paddingTop: 12 },
  row: { gap: 12 },
  tile: {
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 110,

    // subtle shadow like the mock
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  emoji: { fontSize: 38, marginBottom: 10 },
  name: { fontSize: 13.5, fontWeight: '800', textAlign: 'center' },
  empty: { marginTop: 16, textAlign: 'center', opacity: 0.8 },
});