import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { wipeAll, loadTopics } from '../services/storage/nailexamsStorage';
import { loadAttempts } from '../services/storage/practiceStorage';
import { deleteAccount } from '../services/auth/authService';
import { logEvent } from '../services/logging/logEvent';
import { getAppEnv } from '../firebase/config';
import {
  loadNotifSettings,
  saveNotifSettings,
  type NotifSettings,
} from '../services/storage/notificationStorage';
import { scheduleStudyReminder } from '../services/notifications/notificationService';
import { usePlus } from '../context/PlusContext';
import type { Theme } from '../themes';

const IS_DEV = getAppEnv() === 'development';
import type { SettingsStackParamList } from '../navigation/SettingsNavigator';

type Props = NativeStackScreenProps<SettingsStackParamList, 'SettingsHome'>;

// Chevron icon
function Chevron({ color }: { color: string }) {
  return <Text style={{ fontSize: 18, color, fontWeight: '300' }}>›</Text>;
}

// Single menu row
function MenuRow({
  icon,
  iconBg,
  label,
  destructive,
  muted,
  onPress,
  showChevron = true,
  styles,
}: {
  icon: string;
  iconBg: string;
  label: string;
  destructive?: boolean;
  muted?: boolean;
  onPress: () => void;
  showChevron?: boolean;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}
      onPress={onPress}
    >
      <View style={[styles.menuIcon, { backgroundColor: iconBg }]}>
        <Text style={styles.menuIconText}>{icon}</Text>
      </View>
      <Text
        style={[
          styles.menuLabel,
          destructive && styles.menuLabelDestructive,
          muted && styles.menuLabelMuted,
        ]}
      >
        {label}
      </Text>
      {showChevron && !destructive && <Chevron color={styles.chevronColor} />}
    </Pressable>
  );
}

function createStyles(theme: Theme) {
  return {
    ...StyleSheet.create({
      container: { flex: 1, backgroundColor: theme.colors.screenBg },
      content: { padding: 16, paddingBottom: 40 },

      screenTitle: { fontSize: 22, fontWeight: theme.fonts.headingWeight as any, color: theme.colors.textPrimary, marginBottom: 16, fontFamily: theme.fonts.heading, letterSpacing: theme.fonts.letterSpacingHeading },

      // Profile card
      profileCard: {
        backgroundColor: theme.colors.profileCardBg,
        borderRadius: theme.radii.card,
        padding: 16,
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        gap: 14,
        marginBottom: 10,
      },
      avatar: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: '#333',
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        flexShrink: 0,
      },
      avatarText: { fontSize: 18, fontWeight: '600' as const, color: theme.colors.profileCardText },
      profileInfo: { flex: 1, minWidth: 0 },
      profileEmail: { fontSize: 13, fontWeight: '500' as const, color: theme.colors.profileCardText },
      profileMeta: { fontSize: 11, color: theme.colors.profileCardMeta, marginTop: 3 },
      levelBadge: {
        backgroundColor: theme.colors.profileBadgeBg,
        borderRadius: theme.radii.input,
        paddingHorizontal: 10,
        paddingVertical: 4,
        flexShrink: 0,
      },
      levelBadgeText: { fontSize: 11, fontWeight: '500' as const, color: theme.colors.profileBadgeText },

      // Stats row
      statsRow: { flexDirection: 'row' as const, gap: 8, marginBottom: 20 },
      statCard: {
        flex: 1,
        backgroundColor: theme.colors.cardBg,
        borderRadius: 14,
        padding: 10,
      },
      statVal: { fontSize: 20, fontWeight: '600' as const, color: theme.colors.textPrimary },
      statLabel: { fontSize: 11, color: theme.colors.textMuted, marginTop: 1 },

      // Section label
      sectionLabel: {
        fontSize: 11,
        fontWeight: '500' as const,
        textTransform: 'uppercase' as const,
        letterSpacing: 0.6,
        color: theme.colors.sectionLabel,
        marginBottom: 6,
        marginLeft: 4,
      },

      // Menu group
      menuGroup: {
        backgroundColor: theme.colors.cardBg,
        borderRadius: 16,
        overflow: 'hidden' as const,
        marginBottom: 20,
      },
      menuDivider: {
        height: 0.5,
        backgroundColor: theme.colors.divider,
        marginLeft: 56,
      },
      menuRow: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        paddingHorizontal: 14,
        paddingVertical: 11,
        gap: 12,
      },
      menuRowPressed: { backgroundColor: theme.colors.divider },
      menuIcon: {
        width: 30,
        height: 30,
        borderRadius: 8,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        flexShrink: 0,
      },
      menuIconText: { fontSize: 15 },
      menuLabel: { flex: 1, fontSize: 14, fontWeight: theme.fonts.bodyWeight as any, color: theme.colors.textPrimary, fontFamily: theme.fonts.body },
      menuLabelDestructive: { color: '#E24B4A' },
      menuLabelMuted: { fontSize: 13, fontWeight: '400' as const },

      versionText: {
        textAlign: 'center' as const,
        fontSize: 12,
        color: theme.colors.textMuted,
        marginTop: 4,
      },
    }),
    chevronColor: theme.colors.textMuted,
  };
}

export default function SettingsScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { user, profile, subjects, logout, refreshOnboarding, refreshUserData } = useAuth();
  const { isPlus } = usePlus();

  const styles = useMemo(() => createStyles(theme), [theme]);

  const [topicCount, setTopicCount]     = useState(0);
  const [checkinCount, setCheckinCount] = useState(0);
  const [notifSettings, setNotifSettings] = useState<NotifSettings>({
    reminderHour: 19, reminderMinute: 0, enabled: true,
  });
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [draftHour, setDraftHour]     = useState(19);
  const [draftMinute, setDraftMinute] = useState(0);

  const loadStats = useCallback(async () => {
    const [topics, attempts, ns] = await Promise.all([
      loadTopics(), loadAttempts(), loadNotifSettings(),
    ]);
    setTopicCount(topics.length);
    setCheckinCount(attempts.length);
    setNotifSettings(ns);
  }, []);

  useEffect(() => { void loadStats(); }, [loadStats]);
  useFocusEffect(useCallback(() => { void loadStats(); }, [loadStats]));

  const formatTime = (h: number, m: number) => {
    const period = h >= 12 ? 'pm' : 'am';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
  };

  const openTimePicker = () => {
    setDraftHour(notifSettings.reminderHour);
    setDraftMinute(notifSettings.reminderMinute);
    setTimePickerVisible(true);
  };

  const saveTime = async () => {
    const updated: NotifSettings = {
      ...notifSettings,
      reminderHour: draftHour,
      reminderMinute: draftMinute,
    };
    await saveNotifSettings(updated);
    setNotifSettings(updated);
    void scheduleStudyReminder();
    setTimePickerVisible(false);
  };

  const email        = user?.email ?? '—';
  const avatarLetter = user?.email ? user.email[0].toUpperCase() : '?';

  const onReset = () => {
    Alert.alert(
      'Reset onboarding?',
      'This will wipe all NailExams data on this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await wipeAll();
            await refreshUserData();
            await refreshOnboarding();
            await logEvent('local_wipe', {});
          },
        },
      ],
    );
  };

  const onLogout = () => {
    Alert.alert('Log out?', 'You will return to the login screen.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          await logEvent('logout', {});
          void logout();
        },
      },
    ]);
  };

  const onDeleteAccount = () => {
    Alert.alert(
      'Delete account?',
      'This will permanently delete your NailExams account and all your revision data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: () => {
            // Second confirmation — extra step required by Apple for destructive action
            Alert.alert(
              'Are you sure?',
              'Your account and all data will be permanently deleted.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, delete',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await logEvent('account_deleted', {});
                      await deleteAccount();
                      // onAuthStateChanged fires with null → app transitions to auth screen
                    } catch (e: any) {
                      const msg = e?.code === 'auth/requires-recent-login'
                        ? 'For security, please sign out and sign back in, then try again.'
                        : 'Could not delete account. Please try again.';
                      Alert.alert('Deletion failed', msg);
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  return (
    <>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.screenTitle}>Settings</Text>

      {/* ── Profile card ── */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{avatarLetter}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileEmail} numberOfLines={1}>{email}</Text>
          <Text style={styles.profileMeta}>
            {subjects.length} subject{subjects.length !== 1 ? 's' : ''} · {profile?.examLevel ?? '—'}
          </Text>
        </View>
        <View style={styles.levelBadge}>
          <Text style={styles.levelBadgeText}>{profile?.examLevel ?? '—'}</Text>
        </View>
      </View>

      {/* ── Stats row ── */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statVal}>{subjects.length}</Text>
          <Text style={styles.statLabel}>Subjects</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statVal}>{topicCount}</Text>
          <Text style={styles.statLabel}>Topics</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statVal, { color: '#1D9E75' }]}>{checkinCount}</Text>
          <Text style={styles.statLabel}>Check-ins</Text>
        </View>
      </View>

      {/* ── Plus upsell / badge ── */}
      {isPlus ? (
        <View style={{
          backgroundColor: '#EAF3DE', borderRadius: 14, padding: 14,
          flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20,
        }}>
          <Text style={{ fontSize: 22 }}>🎉</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#27500A' }}>NailExams Plus</Text>
            <Text style={{ fontSize: 12, color: '#27500A', opacity: 0.8, marginTop: 1 }}>All features unlocked</Text>
          </View>
          <View style={{ backgroundColor: '#27500A', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#EAF3DE' }}>PLUS</Text>
          </View>
        </View>
      ) : (
        <Pressable
          onPress={() => navigation.navigate('Paywall')}
          style={{
            backgroundColor: '#1C1C1E', borderRadius: 14, padding: 16,
            flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20,
          }}
        >
          <Text style={{ fontSize: 24 }}>✨</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>Upgrade to Plus</Text>
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
              Unlimited subjects · all themes · longer plans
            </Text>
          </View>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 18 }}>›</Text>
        </Pressable>
      )}

      {/* ── Study section ── */}
      <Text style={styles.sectionLabel}>Study</Text>
      <View style={styles.menuGroup}>
        <MenuRow
          icon="📚"
          iconBg="#EAF3DE"
          label="Edit subjects"
          onPress={() => navigation.navigate('EditSubjects')}
          styles={styles}
        />
        <View style={styles.menuDivider} />
        <MenuRow
          icon="📅"
          iconBg="#E6F1FB"
          label="Plan settings"
          onPress={() => navigation.navigate('PlanSettings')}
          styles={styles}
        />
        <View style={styles.menuDivider} />
        <MenuRow
          icon="🔔"
          iconBg="#FEF9C3"
          label={`Reminder · ${formatTime(notifSettings.reminderHour, notifSettings.reminderMinute)}`}
          onPress={openTimePicker}
          styles={styles}
        />
        <View style={styles.menuDivider} />
        <MenuRow
          icon="📊"
          iconBg="#E6F1FB"
          label={isPlus ? 'Analytics' : 'Analytics ✦'}
          onPress={() => navigation.navigate('Analytics')}
          styles={styles}
        />
        <View style={styles.menuDivider} />
        <MenuRow
          icon="🎨"
          iconBg="#F3E8FF"
          label="Theme"
          onPress={() => navigation.navigate('ThemeSelector')}
          styles={styles}
        />
      </View>

      {/* ── Account section ── */}
      <Text style={styles.sectionLabel}>Account</Text>
      <View style={styles.menuGroup}>
        <MenuRow
          icon="🚪"
          iconBg="#FBEAF0"
          label="Log out"
          destructive
          showChevron={false}
          onPress={onLogout}
          styles={styles}
        />
        <View style={styles.menuDivider} />
        <MenuRow
          icon="🗑️"
          iconBg="#FCEBEB"
          label="Delete account"
          destructive
          showChevron={false}
          onPress={onDeleteAccount}
          styles={styles}
        />
      </View>

      {/* ── Developer section — dev builds only ── */}
      {IS_DEV && (
        <>
          <Text style={styles.sectionLabel}>Developer</Text>
          <View style={styles.menuGroup}>
            <MenuRow
              icon="🪵"
              iconBg="#F5F5F5"
              label="View logs"
              muted
              onPress={() => navigation.navigate('Logs')}
              styles={styles}
            />
            <View style={styles.menuDivider} />
            <MenuRow
              icon="⚠️"
              iconBg="#FCEBEB"
              label="Reset onboarding (wipe data)"
              destructive
              muted
              showChevron={false}
              onPress={onReset}
              styles={styles}
            />
          </View>
        </>
      )}

      <Text style={styles.versionText}>NailExams · v1.0</Text>
    </ScrollView>

    {/* ── Reminder time picker modal ── */}
    <Modal
      visible={timePickerVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setTimePickerVisible(false)}
    >
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}
        onPress={() => setTimePickerVisible(false)}
      >
        <Pressable
          style={{
            backgroundColor: theme.colors.cardBg,
            borderTopLeftRadius: 24, borderTopRightRadius: 24,
            padding: 24, paddingBottom: 40,
          }}
          onPress={() => {}}
        >
          <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.textPrimary, marginBottom: 20 }}>
            Daily reminder time
          </Text>

          {/* Hour picker */}
          <Text style={{ fontSize: 12, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5, color: theme.colors.textMuted, marginBottom: 8 }}>
            Hour
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {Array.from({ length: 24 }, (_, h) => {
                const active = h === draftHour;
                const label  = h === 0 ? '12 am' : h < 12 ? `${h} am` : h === 12 ? '12 pm' : `${h - 12} pm`;
                return (
                  <Pressable
                    key={h}
                    onPress={() => setDraftHour(h)}
                    style={{
                      paddingHorizontal: 14, paddingVertical: 9,
                      borderRadius: 10,
                      backgroundColor: active ? theme.colors.buttonPrimaryBg : theme.colors.screenBg,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '500', color: active ? theme.colors.buttonPrimaryText : theme.colors.textPrimary }}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          {/* Minute picker */}
          <Text style={{ fontSize: 12, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5, color: theme.colors.textMuted, marginBottom: 8 }}>
            Minute
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
            {[0, 15, 30, 45].map((m) => {
              const active = m === draftMinute;
              return (
                <Pressable
                  key={m}
                  onPress={() => setDraftMinute(m)}
                  style={{
                    flex: 1, paddingVertical: 11, borderRadius: 10, alignItems: 'center',
                    backgroundColor: active ? theme.colors.buttonPrimaryBg : theme.colors.screenBg,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '500', color: active ? theme.colors.buttonPrimaryText : theme.colors.textPrimary }}>
                    :{String(m).padStart(2, '0')}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={saveTime}
            style={{
              backgroundColor: theme.colors.buttonPrimaryBg, borderRadius: 16,
              paddingVertical: 15, alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '600', color: theme.colors.buttonPrimaryText }}>
              Set reminder for {formatTime(draftHour, draftMinute)}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
    </>
  );
}
