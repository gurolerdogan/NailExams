import * as Notifications from 'expo-notifications';
import { loadPlan } from '../storage/planStorage';
import { loadTopics } from '../storage/nailexamsStorage';
import { PLAN_REMINDERS, GENERIC_REMINDERS } from '../../notifications/messages';
import type { NotificationMessage } from '../../notifications/messages';

const WINDOW_START = 15; // 3 pm
const WINDOW_END   = 21; // 9 pm

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

/**
 * Returns the next Date that falls inside the [3pm, 9pm) local-time window.
 * - If now is before 3pm  → random time today in the window
 * - If now is in 3pm–9pm  → random time in the remaining portion of today's window
 * - If now is after 9pm   → random time tomorrow in the window
 */
function nextWindowTime(): Date {
  const now   = new Date();
  const h     = now.getHours();
  const span  = WINDOW_END - WINDOW_START; // hours available

  const candidate = new Date(now);

  if (h < WINDOW_START) {
    // Before window — schedule somewhere today
    candidate.setHours(
      WINDOW_START + Math.floor(Math.random() * span),
      Math.floor(Math.random() * 60),
      0, 0,
    );
  } else if (h < WINDOW_END) {
    // Inside window — schedule in the remaining time (at least 30 min ahead)
    const remaining = WINDOW_END - h - 1; // whole hours left
    if (remaining >= 1) {
      candidate.setHours(
        h + 1 + Math.floor(Math.random() * remaining),
        Math.floor(Math.random() * 60),
        0, 0,
      );
    } else {
      // Less than 1 h left today — push to tomorrow
      candidate.setDate(candidate.getDate() + 1);
      candidate.setHours(
        WINDOW_START + Math.floor(Math.random() * span),
        Math.floor(Math.random() * 60),
        0, 0,
      );
    }
  } else {
    // After window — schedule tomorrow
    candidate.setDate(candidate.getDate() + 1);
    candidate.setHours(
      WINDOW_START + Math.floor(Math.random() * span),
      Math.floor(Math.random() * 60),
      0, 0,
    );
  }

  return candidate;
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Cancel any existing scheduled reminder and schedule a fresh one.
 * Safe to call on every app open — it's fast and idempotent.
 */
export async function scheduleStudyReminder(): Promise<void> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    await Notifications.cancelAllScheduledNotificationsAsync();

    const todayISO = toISODate(new Date());
    const [plan, topics] = await Promise.all([loadPlan(), loadTopics()]);

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
        // All today's topics already checked in — use a generic message
        const msg = pickRandom(GENERIC_REMINDERS);
        title = msg.title;
        body  = msg.body;
      }
    } else {
      const msg = pickRandom(GENERIC_REMINDERS);
      title = msg.title;
      body  = msg.body;
    }

    const triggerDate = nextWindowTime();

    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: { date: triggerDate } as any,
    });

    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log(`[NailExams] Reminder scheduled for ${triggerDate.toLocaleTimeString()} — "${body}"`);
    }
  } catch (e) {
    // Notifications are best-effort — never throw up to the caller
    if (__DEV__) console.warn('[NailExams] scheduleStudyReminder failed', e); // eslint-disable-line no-console
  }
}
