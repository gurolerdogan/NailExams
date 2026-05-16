import * as Notifications from 'expo-notifications';
import { loadPlan } from '../storage/planStorage';
import { loadTopics } from '../storage/nailexamsStorage';
import { loadNotifSettings } from '../storage/notificationStorage';
import { computeStreak } from '../../utils/streak';
import { PLAN_REMINDERS, GENERIC_REMINDERS, STREAK_NUDGES, WEEKLY_SUMMARY } from '../../notifications/messages';
import { loadAttempts } from '../storage/practiceStorage';
import type { NotificationMessage } from '../../notifications/messages';

const STUDY_REMINDER_ID = 'ne-study-reminder';
const STREAK_NUDGE_ID   = 'ne-streak-nudge';

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function applyTemplate(msg: NotificationMessage, count: number) {
  const s = count === 1 ? '' : 's';
  return {
    title: msg.title,
    body: msg.body
      .replace('{count}', String(count))
      .replace('{s}', s),
  };
}

/** Returns a Date set to the given hour:minute today, or tomorrow if that time has passed. */
function nextOccurrence(hour: number, minute: number): Date {
  const now = new Date();
  const candidate = new Date(now);
  candidate.setHours(hour, minute, 0, 0);
  if (candidate <= now) {
    candidate.setDate(candidate.getDate() + 1);
  }
  return candidate;
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Cancels and reschedules both the study reminder and the streak-nudge.
 * Safe to call on every app open — fast and idempotent.
 */
export async function scheduleStudyReminder(): Promise<void> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    // Cancel existing scheduled notifications by identifier
    await Notifications.cancelAllScheduledNotificationsAsync();

    const [settings, plan, topics] = await Promise.all([
      loadNotifSettings(),
      loadPlan(),
      loadTopics(),
    ]);

    if (!settings.enabled) return;

    const todayISO = toISODate(new Date());

    // ── Study reminder ──────────────────────────────────────────────────────────
    let title: string;
    let body: string;

    if (plan && plan.sessions.length > 0) {
      const topicConf = new Map(topics.map((t) => [t.id, t.confidence ?? 0]));
      const uncheckedToday = plan.sessions.filter(
        (s) => s.date === todayISO && (topicConf.get(s.topicId) ?? 0) === 0,
      );

      if (uncheckedToday.length > 0) {
        const formatted = applyTemplate(pickRandom(PLAN_REMINDERS), uncheckedToday.length);
        title = formatted.title;
        body  = formatted.body;
      } else {
        const msg = pickRandom(GENERIC_REMINDERS);
        title = msg.title;
        body  = msg.body;
      }
    } else {
      const msg = pickRandom(GENERIC_REMINDERS);
      title = msg.title;
      body  = msg.body;
    }

    const reminderDate = nextOccurrence(settings.reminderHour, settings.reminderMinute);

    await Notifications.scheduleNotificationAsync({
      identifier: STUDY_REMINDER_ID,
      content: { title, body, sound: true },
      trigger: { date: reminderDate } as any,
    });

    // ── Streak-nudge at 9 pm (only if the reminder isn't already at 9 pm) ──────
    const streak = plan ? computeStreak(plan.sessions) : 0;
    if (streak > 0) {
      const nudgeHour   = 21;
      const nudgeMinute = 0;
      const nudgeIsDifferentFromReminder =
        settings.reminderHour !== nudgeHour || settings.reminderMinute !== nudgeMinute;

      if (nudgeIsDifferentFromReminder) {
        const nudgeDate = nextOccurrence(nudgeHour, nudgeMinute);
        const nudge = applyTemplate(pickRandom(STREAK_NUDGES), streak);

        await Notifications.scheduleNotificationAsync({
          identifier: STREAK_NUDGE_ID,
          content: { title: nudge.title, body: nudge.body, sound: false },
          trigger: { date: nudgeDate } as any,
        });
      }
    }

    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log(
        `[NailExams] Reminder @ ${reminderDate.toLocaleTimeString()} | streak=${streak}`,
      );
    }
  } catch (e) {
    if (__DEV__) console.warn('[NailExams] scheduleStudyReminder failed', e); // eslint-disable-line no-console
  }
}

const WEEKLY_SUMMARY_ID = 'ne-weekly-summary';

/**
 * Schedules (or reschedules) a weekly summary notification for the next Sunday at 8 pm.
 * Safe to call on every app open — cancels the previous one first.
 */
export async function scheduleWeeklySummary(): Promise<void> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    // Find next Sunday 8pm
    const now  = new Date();
    const next = new Date(now);
    const dow  = now.getDay(); // 0=Sun
    const daysUntilSunday = dow === 0 ? 7 : 7 - dow; // always next Sunday, not today
    next.setDate(now.getDate() + daysUntilSunday);
    next.setHours(20, 0, 0, 0);

    // Compute this week's check-ins (Mon–now)
    const attempts  = await loadAttempts();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Monday
    weekStart.setHours(0, 0, 0, 0);
    const weekCheckins = attempts.filter((a) => a.ts >= weekStart.getTime()).length;

    const [plan] = await Promise.all([loadPlan()]);
    const streak = plan ? computeStreak(plan.sessions) : 0;

    const s   = weekCheckins === 1 ? '' : 's';
    const msg = pickRandom(WEEKLY_SUMMARY);
    const body = msg.body
      .replace('{checkins}', String(weekCheckins))
      .replace('{s}', s)
      .replace('{streak}', String(streak));

    // Cancel existing weekly summary before rescheduling
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const existing  = scheduled.find((n) => n.identifier === WEEKLY_SUMMARY_ID);
    if (existing) await Notifications.cancelScheduledNotificationAsync(WEEKLY_SUMMARY_ID);

    await Notifications.scheduleNotificationAsync({
      identifier: WEEKLY_SUMMARY_ID,
      content: { title: msg.title, body, sound: true },
      trigger: { date: next } as any,
    });
  } catch (e) {
    if (__DEV__) console.warn('[NailExams] scheduleWeeklySummary failed', e); // eslint-disable-line no-console
  }
}
