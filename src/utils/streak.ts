import type { WeeklyPlan } from '../types/plan';
import type { PracticeAttempt } from '../types/practice';

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Counts consecutive days (back from today) where at least one check-in
 * attempt was recorded. Returns 0 if there are no attempts today or yesterday.
 */
export function computeCheckinStreak(attempts: PracticeAttempt[]): number {
  if (!attempts.length) return 0;
  const checkinDates = new Set(attempts.map((a) => toISODate(new Date(a.ts))));
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (checkinDates.has(toISODate(d))) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

/** @deprecated Use computeCheckinStreak instead. */
export function computeStreak(sessions: WeeklyPlan['sessions']): number {
  if (!sessions.length) return 0;
  const doneDates = new Set(
    sessions.filter((s) => s.status === 'DONE').map((s) => s.date),
  );
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < 60; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (doneDates.has(toISODate(d))) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}
