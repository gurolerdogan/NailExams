import * as Notifications from 'expo-notifications';
import { loadPlan } from '../storage/planStorage';
import { loadTopics } from '../storage/nailexamsStorage';
import { loadAttempts } from '../storage/practiceStorage';
import { loadNotifSettings } from '../storage/notificationStorage';
import { computeStreak } from '../../utils/streak';
import { PLAN_REMINDERS, GENERIC_REMINDERS, STREAK_NUDGES, WEEKLY_SUMMARY } from '../../notifications/messages';
import type { NotificationMessage } from '../../notifications/messages';

// ── Notification identifiers ───────────────────────────────────────────────────
const MANDATORY_ID    = 'ne-mandatory-reminder';   // 6pm daily — always on
const EXTRA_ID        = 'ne-extra-reminder';        // user-chosen extra
const STREAK_NUDGE_ID = 'ne-streak-nudge';          // 9pm streak nudge
const WEEKLY_ID       = 'ne-weekly-summary';        // Sunday 8pm

const MANDATORY_HOUR:   number = 18; // 6pm
const MANDATORY_MINUTE: number = 0;
const STREAK_HOUR:      number = 21; // 9pm

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

/** Returns a Date at the given hour:minute — today if that time hasn't passed, tomorrow if it has. */
function nextOccurrence(hour: number, minute: number): Date {
  const now = new Date();
  const candidate = new Date(now);
  candidate.setHours(hour, minute, 0, 0);
  if (candidate <= now) candidate.setDate(candidate.getDate() + 1);
  return candidate;
}

/** Cancel a specific notification without disturbing others. */
async function cancelById(id: string): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  if (scheduled.some((n) => n.identifier === id)) {
    await Notifications.cancelScheduledNotificationAsync(id);
  }
}

/** Build plan-aware reminder content. */
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
 * Schedules all daily reminders. Safe to call on every app open — idempotent.
 *
 * Always scheduled (non-cancellable in-app):
 *   • 6pm mandatory reminder — plan-aware content
 *   • 9pm streak nudge — only when an active streak exists
 *
 * User-controlled extra:
 *   • Extra reminder at user-chosen time — only when extraEnabled
 */
export async function scheduleStudyReminder(): Promise<void> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    const [settings, plan] = await Promise.all([loadNotifSettings(), loadPlan()]);
    const content = await buildReminderContent();

    // ── Mandatory 6pm reminder ────────────────────────────────────────────────
    await cancelById(MANDATORY_ID);
    await Notifications.scheduleNotificationAsync({
      identifier: MANDATORY_ID,
      content: { title: content.title, body: content.body, sound: true },
      trigger: { date: nextOccurrence(MANDATORY_HOUR, MANDATORY_MINUTE) } as any,
    });

    // ── Extra reminder (user-chosen, optional) ────────────────────────────────
    await cancelById(EXTRA_ID);
    if (settings.extraEnabled) {
      // Don't double-fire if extra is set to the same time as mandatory
      const isDuplicate =
        settings.extraHour === MANDATORY_HOUR && settings.extraMinute === MANDATORY_MINUTE;
      if (!isDuplicate) {
        await Notifications.scheduleNotificationAsync({
          identifier: EXTRA_ID,
          content: { title: content.title, body: content.body, sound: true },
          trigger: { date: nextOccurrence(settings.extraHour, settings.extraMinute) } as any,
        });
      }
    }

    // ── Streak nudge at 9pm ───────────────────────────────────────────────────
    await cancelById(STREAK_NUDGE_ID);
    const streak = plan ? computeStreak(plan.sessions) : 0;
    if (streak > 0) {
      const nudgeDate = nextOccurrence(STREAK_HOUR, 0);
      const nudge = applyTemplate(pickRandom(STREAK_NUDGES), streak);
      // Only schedule if 9pm doesn't clash with mandatory or extra
      const clashsMandatory = MANDATORY_HOUR === STREAK_HOUR;
      const clashsExtra = settings.extraEnabled && settings.extraHour === STREAK_HOUR && settings.extraMinute === 0;
      if (!clashsMandatory && !clashsExtra) {
        await Notifications.scheduleNotificationAsync({
          identifier: STREAK_NUDGE_ID,
          content: { title: nudge.title, body: nudge.body, sound: false },
          trigger: { date: nudgeDate } as any,
        });
      }
    }

    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log(`[NailExams] Mandatory @ 6pm | extra=${settings.extraEnabled ? `${settings.extraHour}:${String(settings.extraMinute).padStart(2,'0')}` : 'off'} | streak=${streak}`);
    }
  } catch (e) {
    if (__DEV__) console.warn('[NailExams] scheduleStudyReminder failed', e); // eslint-disable-line no-console
  }
}

/**
 * Schedules the weekly Sunday 8pm summary. Safe to call on every app open.
 */
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
      trigger: { date: next } as any,
    });
  } catch (e) {
    if (__DEV__) console.warn('[NailExams] scheduleWeeklySummary failed', e); // eslint-disable-line no-console
  }
}
