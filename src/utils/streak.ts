import type { WeeklyPlan } from '../types/plan';

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Counts consecutive days (back from today) where at least one plan session
 * was marked DONE. Returns 0 if there's no streak.
 */
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
