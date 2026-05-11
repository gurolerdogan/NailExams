import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export default function ThemeSelectorScreen() {
  const { theme, themes, setThemeId } = useTheme();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.screenBg }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.hint, { color: theme.colors.textMuted }]}>
        Tap a theme to apply it instantly across the whole app.
      </Text>

      {themes.map((t) => {
        const active = t.id === theme.id;
        return (
          <Pressable
            key={t.id}
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.cardBg,
                borderColor: active ? theme.colors.accent : theme.colors.cardBorder,
                borderRadius: theme.radii.card,
                borderWidth: active ? 2 : 1,
              },
            ]}
            onPress={() => void setThemeId(t.id)}
          >
            {/* Swatch strip */}
            <View style={styles.swatchRow}>
              {t.previewSwatches.map((color, i) => (
                <View
                  key={i}
                  style={[
                    styles.swatch,
                    { backgroundColor: color, borderRadius: t.radii.pill / 4 },
                  ]}
                />
              ))}
            </View>

            {/* Info + checkmark */}
            <View style={styles.infoRow}>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.themeName,
                    {
                      color: theme.colors.textPrimary,
                      fontWeight: theme.fonts.headingWeight,
                      fontFamily: theme.fonts.body,
                    },
                  ]}
                >
                  {t.name}
                </Text>
                <Text style={[styles.themeDesc, { color: theme.colors.textMuted }]}>
                  {t.description}
                </Text>
              </View>
              {active && (
                <View style={[styles.check, { backgroundColor: theme.colors.accent }]}>
                  <Ionicons name="checkmark" size={14} color={theme.colors.buttonPrimaryText} />
                </View>
              )}
            </View>

            {/* Mini preview bar using theme's own colors */}
            <View style={[styles.preview, { backgroundColor: t.colors.screenBg, borderRadius: t.radii.card / 2 }]}>
              <View style={[styles.previewCard, { backgroundColor: t.colors.cardBg, borderRadius: t.radii.card / 2 }]}>
                <View style={[styles.previewLine, { backgroundColor: t.colors.textPrimary, opacity: 0.8, width: '60%' }]} />
                <View style={[styles.previewLine, { backgroundColor: t.colors.textMuted, opacity: 0.5, width: '40%', marginTop: 5 }]} />
              </View>
              <View style={[styles.previewAccent, { backgroundColor: t.colors.accent, borderRadius: t.radii.pill }]} />
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 48 },

  hint: { fontSize: 13, marginBottom: 16, lineHeight: 19 },

  card: {
    marginBottom: 12,
    padding: 14,
    overflow: 'hidden',
  },

  swatchRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  swatch: { width: 28, height: 28 },

  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  themeName: { fontSize: 15, marginBottom: 2 },
  themeDesc: { fontSize: 12 },
  check: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },

  preview: { padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  previewCard: { flex: 1, padding: 8 },
  previewLine: { height: 6, borderRadius: 3 },
  previewAccent: { width: 48, height: 24 },
});
