import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { loadPlan } from '../storage/planStorage';
import { loadTopics } from '../storage/nailexamsStorage';
import { loadAttempts } from '../storage/practiceStorage';
import { loadNotifSettings } from '../storage/notificationStorage';
import { computeStreak } from '../../utils/streak';
import { PLAN_REMINDERS, GENERIC_REMINDERS, STREAK_NUDGES, WEEKLY_SUMMARY } from '../../notifications/messages';
import type { NotificationMessage } from '../../notifications/messages';

// ── Notification identifiers ───────────────────────────────────────────────────
const MANDATORY_ID    = 'ne-mandatory-reminder';
const EXTRA_ID        = 'ne-extra-reminder';
const STREAK_NUDGE_ID = 'ne-streak-nudge';
const WEEKLY_ID       = 'ne-weekly-summary';

const MANDATORY_HOUR:   number = 18;
const MANDATORY_MINUTE: number = 0;
const STREAK_HOUR:      number = 21;

// ── Helpers ───────────────────────────────────────────────────────────────────

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
    body: msg.body.replace('{count}', String(count)).replace('{s}', s),
  };
}

/** Next occurrence of hour:minute — today if not yet passed, otherwise tomorrow. */
function nextOccurrence(hour: number, minute: number): Date {
  const now = new Date();
  const candidate = new Date(now);
  candidate.setHours(hour, minute, 0, 0);
  if (candidate <= now) candidate.setDate(candidate.getDate() + 1);
  return candidate;
}

async function cancelById(id: string): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    if (scheduled.some((n) => n.identifier === id)) {
      await Notifications.cancelScheduledNotificationAsync(id);
    }
  } catch { /* swallow — non-critical */ }
}

async function buildReminderContent(): Promise<{ title: string; body: string }> {
  const [plan, topics] = await Promise.all([loadPlan(), loadTopics()]);
  const todayISO = toISODate(new Date());

  if (plan && plan.sessions.length > 0) {
    const topicConf = new Map(topics.map((t) => [t.id, t.confidence ?? 0]));
    const uncheckedToday = plan.sessions.filter(
      (s) => s.date === todayISO && (topicConf.get(s.topicId) ?? 0) === 0,
    );
    if (uncheckedToday.length > 0) {
      return applyTemplate(pickRandom(PLAN_REMINDERS), uncheckedToday.length);
    }
  }
  const msg = pickRandom(GENERIC_REMINDERS);
  return { title: msg.title, body: msg.body };
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Schedules all daily reminders. Safe to call on every app open.
 *
 * Mandatory 6pm and user extra use DAILY repeating triggers — they fire every
 * day at the set time without requiring the app to reopen and reschedule.
 *
 * Streak nudge and weekly summary remain one-shot (content depends on live data).
 */
export async function scheduleStudyReminder(): Promise<void> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    const [settings, plan] = await Promise.all([loadNotifSettings(), loadPlan()]);
    const content = await buildReminderContent();

    // ── Mandatory 6pm — daily repeating ──────────────────────────────────────
    await cancelById(MANDATORY_ID);
    await Notifications.scheduleNotificationAsync({
      identifier: MANDATORY_ID,
      content: { title: content.title, body: content.body, sound: true },
      trigger: {
        type: SchedulableTriggerInputTypes.DAILY,
        hour: MANDATORY_HOUR,
        minute: MANDATORY_MINUTE,
      },
    });

    // ── Extra reminder — daily repeating at user-chosen time ──────────────────
    await cancelById(EXTRA_ID);
    if (settings.extraEnabled) {
      const isDuplicate =
        settings.extraHour === MANDATORY_HOUR && settings.extraMinute === MANDATORY_MINUTE;
      if (!isDuplicate) {
        await Notifications.scheduleNotificationAsync({
          identifier: EXTRA_ID,
          content: { title: content.title, body: content.body, sound: true },
          trigger: {
            type: SchedulableTriggerInputTypes.DAILY,
            hour: settings.extraHour,
            minute: settings.extraMinute,
          },
        });
      }
    }

    // ── Streak nudge at 9pm — one-shot (only when streak active) ─────────────
    await cancelById(STREAK_NUDGE_ID);
    const streak = plan ? computeStreak(plan.sessions) : 0;
    if (streak > 0) {
      const clashsMandatory = MANDATORY_HOUR === STREAK_HOUR;
      const clashsExtra = settings.extraEnabled &&
        settings.extraHour === STREAK_HOUR && settings.extraMinute === 0;
      if (!clashsMandatory && !clashsExtra) {
        const nudge = applyTemplate(pickRandom(STREAK_NUDGES), streak);
        await Notifications.scheduleNotificationAsync({
          identifier: STREAK_NUDGE_ID,
          content: { title: nudge.title, body: nudge.body, sound: false },
          trigger: {
            type: SchedulableTriggerInputTypes.DATE,
            date: nextOccurrence(STREAK_HOUR, 0),
          },
        });
      }
    }

    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log(
        `[NailExams] Scheduled: mandatory=daily@18:00 | extra=${settings.extraEnabled ? `daily@${settings.extraHour}:${String(settings.extraMinute).padStart(2,'0')}` : 'off'} | streak=${streak}`,
      );
    }
  } catch (e) {
    if (__DEV__) console.warn('[NailExams] scheduleStudyReminder failed', e); // eslint-disable-line no-console
  }
}

export async function scheduleWeeklySummary(): Promise<void> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    const now = new Date();
    const next = new Date(now);
    const dow = now.getDay();
    const daysUntilSunday = dow === 0 ? 7 : 7 - dow;
    next.setDate(now.getDate() + daysUntilSunday);
    next.setHours(20, 0, 0, 0);

    const attempts = await loadAttempts();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    weekStart.setHours(0, 0, 0, 0);
    const weekCheckins = attempts.filter((a) => a.ts >= weekStart.getTime()).length;

    const plan = await loadPlan();
    const streak = plan ? computeStreak(plan.sessions) : 0;

    const s = weekCheckins === 1 ? '' : 's';
    const msg = pickRandom(WEEKLY_SUMMARY);
    const body = msg.body
      .replace('{checkins}', String(weekCheckins))
      .replace('{s}', s)
      .replace('{streak}', String(streak));

    await cancelById(WEEKLY_ID);
    await Notifications.scheduleNotificationAsync({
      identifier: WEEKLY_ID,
      content: { title: msg.title, body, sound: true },
      trigger: {
        type: SchedulableTriggerInputTypes.DATE,
        date: next,
      },
    });
  } catch (e) {
    if (__DEV__) console.warn('[NailExams] scheduleWeeklySummary failed', e); // eslint-disable-line no-console
  }
}
