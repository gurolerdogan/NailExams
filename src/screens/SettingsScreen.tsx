import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { wipeAll, loadTopics } from '../services/storage/nailexamsStorage';
import { loadAttempts } from '../services/storage/practiceStorage';
import { loadPlan } from '../services/storage/planStorage';
import { deleteAccount } from '../services/auth/authService';
import { logEvent } from '../services/logging/logEvent';
import {
  loadNotifSettings,
  saveNotifSettings,
  type NotifSettings,
} from '../services/storage/notificationStorage';
import { scheduleStudyReminder } from '../services/notifications/notificationService';
import { usePlus } from '../context/PlusContext';
import { computeCheckinStreak } from '../utils/streak';
import { loadEarnedBadgeIds } from '../services/badges/badgeService';
import { BADGE_CATALOG, BADGE_BY_ID } from '../types/badges';
import type { Theme } from '../themes';

const TOTAL_VISIBLE_BADGES = BADGE_CATALOG.filter((b) => b.tier !== 'Hidden').length;

const ADMIN_EMAILS = new Set([
  'gurolerdogan@gmail.com',
]);

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

      // Merged profile + stats card (identical to HomeScreen)
      profileCard: {
        backgroundColor: theme.colors.profileCardBg,
        borderRadius: theme.radii.card,
        padding: 16,
        marginBottom: 16,
      },
      profileTopRow: {
        flexDirection: 'row' as const, alignItems: 'center' as const, gap: 14, marginBottom: 14,
      },
      avatar: {
        width: 46, height: 46, borderRadius: 23, backgroundColor: '#333',
        alignItems: 'center' as const, justifyContent: 'center' as const, flexShrink: 0,
      },
      avatarText: { fontSize: 18, fontWeight: '600' as const, color: theme.colors.profileCardText },
      profileInfo: { flex: 1, minWidth: 0 },
      profileEmail: { fontSize: 13, fontWeight: '500' as const, color: theme.colors.profileCardText },
      levelBadge: {
        backgroundColor: theme.colors.profileBadgeBg, borderRadius: theme.radii.input,
        paddingHorizontal: 10, paddingVertical: 6, flexShrink: 0,
        alignItems: 'center' as const, gap: 3,
      },
      levelBadgeText: { fontSize: 11, fontWeight: '600' as const, color: theme.colors.profileBadgeText, textAlign: 'center' as const },
      levelBadgeMeta: { fontSize: 10, color: theme.colors.profileCardMeta, textAlign: 'center' as const },
      statsGrid: { flexDirection: 'row' as const, gap: 8 },
      statCell: {
        flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: 10,
        alignItems: 'center' as const,
      },
      statVal: { fontSize: 18, fontWeight: '700' as const, color: theme.colors.profileCardText, textAlign: 'center' as const },
      statLabel: { fontSize: 10, color: theme.colors.profileCardMeta, marginTop: 2, textAlign: 'center' as const },

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

  const isAdmin = ADMIN_EMAILS.has(user?.email ?? '');

  const styles = useMemo(() => createStyles(theme), [theme]);

  const [topicCount, setTopicCount]           = useState(0);
  const [checkedInTopics, setCheckedInTopics] = useState(0);
  const [streak, setStreak]                   = useState(0);
  const [earnedCount, setEarnedCount]         = useState(0);
  const [notifSettings, setNotifSettings] = useState<NotifSettings>({
    extraEnabled: false, extraHour: 20, extraMinute: 0,
  });
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [draftHour, setDraftHour]     = useState(20);
  const [draftMinute, setDraftMinute] = useState(0);

  const loadStats = useCallback(async () => {
    const [topics, attempts, plan, badgeIds, ns] = await Promise.all([
      loadTopics(), loadAttempts(), loadPlan(), loadEarnedBadgeIds(), loadNotifSettings(),
    ]);
    setTopicCount(topics.length);
    setCheckedInTopics(topics.filter((t) => (t.confidence ?? 0) > 0).length);
    setStreak(computeCheckinStreak(attempts));
    setEarnedCount(badgeIds.filter((id) => BADGE_BY_ID.get(id)?.tier !== 'Hidden').length);
    setNotifSettings(ns);
  }, []);

  useEffect(() => { void loadStats(); }, [loadStats]);
  useFocusEffect(useCallback(() => { void loadStats(); }, [loadStats]));

  const formatTime = (h: number, m: number) => {
    const period = h >= 12 ? 'pm' : 'am';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
  };

  const toggleExtra = async () => {
    const updated: NotifSettings = { ...notifSettings, extraEnabled: !notifSettings.extraEnabled };
    await saveNotifSettings(updated);
    setNotifSettings(updated);
    void scheduleStudyReminder();
  };

  const openTimePicker = () => {
    setDraftHour(notifSettings.extraHour);
    setDraftMinute(notifSettings.extraMinute);
    setTimePickerVisible(true);
  };

  const saveTime = async () => {
    const updated: NotifSettings = {
      ...notifSettings,
      extraHour: draftHour,
      extraMinute: draftMinute,
      extraEnabled: true,
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

      {/* ── Profile + stats card ── */}
      <View style={styles.profileCard}>
        <View style={styles.profileTopRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{avatarLetter}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileEmail} numberOfLines={1}>{email}</Text>
          </View>
          <View style={styles.levelBadge}>
            <Text style={styles.levelBadgeText}>{profile?.examLevel ?? '—'}</Text>
            <Text style={styles.levelBadgeMeta}>
              {subjects.length} subj · {topicCount} topics
            </Text>
          </View>
        </View>
        <View style={styles.statsGrid}>
          <View style={styles.statCell}>
            <Text style={[styles.statVal, { color: '#1D9E75' }]}>{checkedInTopics}</Text>
            <Text style={styles.statLabel}>Checked in</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={[styles.statVal, { color: streak > 0 ? '#EF9F27' : undefined }]}>
              {streak > 0 ? `${streak}🔥` : '—'}
            </Text>
            <Text style={styles.statLabel}>Streak</Text>
          </View>
          <Pressable
            style={styles.statCell}
            onPress={() => navigation.navigate('Badges')}
          >
            <Text style={styles.statVal}>{earnedCount}/{TOTAL_VISIBLE_BADGES}</Text>
            <Text style={styles.statLabel}>Badges</Text>
          </Pressable>
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
        {/* Mandatory 6pm reminder — informational, always on */}
        <View style={[styles.menuRow, { opacity: 0.6 }]} pointerEvents="none">
          <View style={[styles.menuIcon, { backgroundColor: '#FEF9C3' }]}>
            <Text style={styles.menuIconText}>🔔</Text>
          </View>
          <Text style={styles.menuLabel}>Daily reminder · 6:00 pm</Text>
          <Text style={{ fontSize: 11, color: theme.colors.textMuted }}>Always on</Text>
        </View>
        <View style={styles.menuDivider} />
        {/* Extra reminder — user-controlled */}
        <MenuRow
          icon="🔔"
          iconBg="#EAF3DE"
          label={notifSettings.extraEnabled
            ? `Extra reminder · ${formatTime(notifSettings.extraHour, notifSettings.extraMinute)}`
            : 'Extra reminder · Off'}
          onPress={notifSettings.extraEnabled ? openTimePicker : toggleExtra}
          styles={styles}
        />
        {notifSettings.extraEnabled && (
          <>
            <View style={styles.menuDivider} />
            <Pressable
              style={[styles.menuRow]}
              onPress={toggleExtra}
            >
              <View style={{ width: 30 }} />
              <Text style={[styles.menuLabel, { color: '#E24B4A', fontSize: 13 }]}>
                Remove extra reminder
              </Text>
            </Pressable>
          </>
        )}
        <View style={styles.menuDivider} />
        <MenuRow
          icon="📆"
          iconBg="#FAEEDA"
          label="Exam dates"
          onPress={() => navigation.navigate('ExamDates')}
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

      {/* ── Achievements section ── */}
      <Text style={styles.sectionLabel}>Achievements</Text>
      <View style={styles.menuGroup}>
        <MenuRow
          icon="🏅"
          iconBg="#EEEDFE"
          label="Your badges"
          onPress={() => navigation.navigate('Badges')}
          styles={styles}
        />
      </View>

      {/* ── Subscription section ── */}
      <Text style={styles.sectionLabel}>Subscription</Text>
      <View style={styles.menuGroup}>
        <MenuRow
          icon="⭐"
          iconBg="#FEF9C3"
          label={isPlus ? 'Manage plan' : 'Choose a Plan'}
          onPress={() => navigation.navigate('ChoosePlan')}
          styles={styles}
        />
      </View>

      {/* ── Legal section ── */}
      <Text style={styles.sectionLabel}>Legal</Text>
      <View style={styles.menuGroup}>
        <MenuRow
          icon="📄"
          iconBg="#F4F4F6"
          label="Terms of Use"
          onPress={() => void Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/')}
          styles={styles}
        />
        <View style={styles.menuDivider} />
        <MenuRow
          icon="🔒"
          iconBg="#F4F4F6"
          label="Privacy Policy"
          onPress={() => void Linking.openURL('https://gurolerdogan.github.io/NailExams/privacy')}
          styles={styles}
        />
      </View>

      {/* ── Account section ── */}
      <Text style={styles.sectionLabel}>Account</Text>
      <View style={styles.menuGroup}>
        {isAdmin && (
          <>
            <MenuRow
              icon="🪵"
              iconBg="#F5F5F5"
              label="View logs"
              muted
              onPress={() => navigation.navigate('Logs')}
              styles={styles}
            />
            <View style={styles.menuDivider} />
          </>
        )}
        <MenuRow
          icon="⚠️"
          iconBg="#FCEBEB"
          label="Reset onboarding"
          destructive
          muted
          showChevron={false}
          onPress={onReset}
          styles={styles}
        />
        <View style={styles.menuDivider} />
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

      <Text style={styles.versionText}>NailExams · v1.6</Text>
    </ScrollView>

    {/* ── Reminder time picker modal ── */}
    <Modal
      visible={timePickerVisible}
      transparent
      animationType="slide"
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
            paddingTop: 20, paddingHorizontal: 20, paddingBottom: 40,
          }}
          onPress={() => {}}
        >
          <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.textPrimary, marginBottom: 2 }}>
            Extra reminder time
          </Text>
          <Text style={{ fontSize: 12, color: theme.colors.textMuted, marginBottom: 4 }}>
            Added on top of the mandatory 6:00 pm reminder.
          </Text>

          {/* Native time picker — drum roll on iOS, clock dialog on Android */}
          <DateTimePicker
            value={(() => {
              const d = new Date();
              d.setHours(draftHour, draftMinute, 0, 0);
              return d;
            })()}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            minuteInterval={Platform.OS === 'ios' ? 5 : 1}
            onChange={(_event, date) => {
              if (date) {
                setDraftHour(date.getHours());
                // Snap to nearest 5 minutes (iOS already does this via minuteInterval;
                // on Android the wheel shows all minutes so we snap on change)
                setDraftMinute(Math.round(date.getMinutes() / 5) * 5 % 60);
              }
            }}
            style={{ height: Platform.OS === 'ios' ? 180 : undefined }}
            {...(Platform.OS === 'ios' ? { textColor: theme.colors.textPrimary } : {})}
          />

          <Pressable
            onPress={saveTime}
            style={{
              backgroundColor: theme.colors.buttonPrimaryBg, borderRadius: 16,
              paddingVertical: 15, alignItems: 'center', marginTop: 8,
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
