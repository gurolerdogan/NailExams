import type { Subject, Topic } from '../types/models';
import type { PracticeAttempt } from '../types/practice';
import type { WeeklyPlan } from '../types/plan';

const WEEK_MS   = 7  * 24 * 60 * 60 * 1000;
const NEGLECT_DAYS = 9;

export type BalanceWarning = {
  type: 'neglected' | 'weekly_skew' | 'single_subject_run';
  message: string;
  detail:  string;
  severity: 1 | 2 | 3; // 3 = highest, shown first
};

function startOfWeekMs(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday
  return d.getTime();
}

/**
 * Computes the highest-priority balance warning to show on HomeScreen.
 * Returns null if no warning is needed.
 *
 * Priority: neglected (3) > weekly_skew (2) > single_subject_run (1)
 */
export function computeBalanceWarning(
  subjects: Subject[],
  topics: Topic[],
  attempts: PracticeAttempt[],
  plan: WeeklyPlan | null,
): BalanceWarning | null {
  if (subjects.length < 2) return null; // no imbalance possible with 1 subject

  const now = Date.now();
  const weekStart = startOfWeekMs();

  // Most recent attempt timestamp per subject
  const lastAttemptBySubject = new Map<string, number>();
  for (const a of attempts) {
    const prev = lastAttemptBySubject.get(a.subjectId) ?? 0;
    if (a.ts > prev) lastAttemptBySubject.set(a.subjectId, a.ts);
  }

  // ── Trigger B: neglected subject (highest priority) ─────────────────────────
  const neglectMs = NEGLECT_DAYS * 24 * 60 * 60 * 1000;
  for (const s of subjects) {
    const last = lastAttemptBySubject.get(s.id) ?? 0;
    const daysSince = Math.floor((now - last) / (24 * 60 * 60 * 1000));
    if (daysSince < NEGLECT_DAYS) continue;

    // Only warn if there are low-confidence topics in that subject
    const hasWeakTopics = topics.some(
      (t) => t.subjectId === s.id && (t.confidence ?? 0) < 4,
    );
    if (!hasWeakTopics) continue;

    const daysStr = last === 0 ? 'never' : `${daysSince} days`;
    return {
      type: 'neglected',
      severity: 3,
      message: `${s.name} hasn't been touched in ${daysStr}`,
      detail: 'Topics here still need work — your plan will pick it back up.',
    };
  }

  // ── Trigger A: weekly skew ≥60% one subject ─────────────────────────────────
  if (plan && plan.sessions.length > 0) {
    const weekSessions = plan.sessions.filter((s) => {
      const d = new Date(s.date + 'T00:00:00');
      return d.getTime() >= weekStart && d.getTime() < weekStart + WEEK_MS;
    });
    if (weekSessions.length >= 3) {
      const countBySubject = new Map<string, number>();
      for (const s of weekSessions) {
        countBySubject.set(s.subjectId, (countBySubject.get(s.subjectId) ?? 0) + 1);
      }
      for (const [subjectId, count] of countBySubject) {
        const pct = count / weekSessions.length;
        if (pct >= 0.6) {
          const subj = subjects.find((s) => s.id === subjectId);
          const others = subjects.filter((s) => s.id !== subjectId).map((s) => s.name);
          return {
            type: 'weekly_skew',
            severity: 2,
            message: `Most of this week is ${subj?.name ?? 'one subject'}`,
            detail: `${others.slice(0, 2).join(' and ')} ${others.length > 1 ? 'are' : 'is'} waiting too.`,
          };
        }
      }
    }
  }

  // ── Trigger C: every completed session this week = same subject ──────────────
  const weekAttempts = attempts.filter((a) => a.ts >= weekStart);
  if (weekAttempts.length >= 3) {
    const uniqueSubjects = new Set(weekAttempts.map((a) => a.subjectId));
    if (uniqueSubjects.size === 1) {
      const subjectId = [...uniqueSubjects][0];
      const subj = subjects.find((s) => s.id === subjectId);
      const others = subjects.filter((s) => s.id !== subjectId);
      if (others.length > 0) {
        return {
          type: 'single_subject_run',
          severity: 1,
          message: `Great ${subj?.name ?? 'subject'} focus this week`,
          detail: `${others[0].name} is ready when you want variety.`,
        };
      }
    }
  }

  return null;
}
