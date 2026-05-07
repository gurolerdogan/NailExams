import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage key — versioned to match the project's pattern
const PLAN_SETTINGS_KEY = 'NE_PLAN_SETTINGS_V1';

type PlanSettings = {
  sessionsPerDay: 1 | 2;
};

const DEFAULT_SETTINGS: PlanSettings = {
  sessionsPerDay: 1,
};

async function loadPlanSettings(): Promise<PlanSettings> {
  try {
    const raw = await AsyncStorage.getItem(PLAN_SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

async function savePlanSettings(s: PlanSettings): Promise<void> {
  await AsyncStorage.setItem(PLAN_SETTINGS_KEY, JSON.stringify(s));
}

// ─── Option row ───────────────────────────────────────────────────────────────
function OptionRow({
  label,
  description,
  selected,
  onPress,
}: {
  label: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.optionRow, pressed && styles.optionRowPressed]}
      onPress={onPress}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.optionLabel}>{label}</Text>
        <Text style={styles.optionDesc}>{description}</Text>
      </View>
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected && <View style={styles.radioDot} />}
      </View>
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function PlanSettingsScreen() {
  const [settings, setSettings] = useState<PlanSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    const s = await loadPlanSettings();
    setSettings(s);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const update = async (patch: Partial<PlanSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    await savePlanSettings(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Sessions per day */}
      <Text style={styles.sectionLabel}>Sessions per day</Text>
      <Text style={styles.sectionHint}>
        How many study sessions to schedule each day when generating a plan.
      </Text>
      <View style={styles.optionGroup}>
        <OptionRow
          label="1 session"
          description="One focused topic per day — good for lighter study schedules."
          selected={settings.sessionsPerDay === 1}
          onPress={() => void update({ sessionsPerDay: 1 })}
        />
        <View style={styles.optionDivider} />
        <OptionRow
          label="2 sessions"
          description="Two topics per day — better for intensive revision periods."
          selected={settings.sessionsPerDay === 2}
          onPress={() => void update({ sessionsPerDay: 2 })}
        />
      </View>

      {saved && (
        <View style={styles.savedBanner}>
          <Text style={styles.savedText}>✓ Saved</Text>
        </View>
      )}

      <Text style={styles.footerNote}>
        Changes apply the next time you generate a plan.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  content: { padding: 16, paddingBottom: 40 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: '#888',
    marginBottom: 4,
    marginLeft: 4,
  },
  sectionHint: {
    fontSize: 12,
    color: '#AAA',
    marginBottom: 10,
    marginLeft: 4,
    lineHeight: 17,
  },

  optionGroup: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
  },
  optionDivider: {
    height: 0.5,
    backgroundColor: '#F0F0F0',
    marginLeft: 16,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  optionRowPressed: { backgroundColor: '#F5F5F5' },
  optionLabel: { fontSize: 14, fontWeight: '500', color: '#1C1C1E', marginBottom: 2 },
  optionDesc: { fontSize: 12, color: '#888', lineHeight: 17 },

  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#C7C7CC',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioSelected: { borderColor: '#185FA5' },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#185FA5',
  },

  savedBanner: {
    backgroundColor: '#EAF3DE',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  savedText: { fontSize: 13, fontWeight: '500', color: '#27500A' },

  footerNote: {
    fontSize: 12,
    color: '#AAA',
    textAlign: 'center',
    lineHeight: 17,
  },
});
