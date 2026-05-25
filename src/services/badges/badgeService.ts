import type { Subject, Topic, UserProfile } from '../../types/models';
import type { PracticeAttempt } from '../../types/practice';
import type { WeeklyPlan } from '../../types/plan';
import type { BadgeId } from '../../types/badges';
import { getJson, setJson } from '../storage/storage';
import { STORAGE_KEYS } from '../storage/keys';
import { loadAttempts } from '../storage/practiceStorage';
import { loadTopics, loadSubjects, loadProfile } from '../storage/nailexamsStorage';
import { loadPlan } from '../storage/planStorage';
import { computeCheckinStreak } from '../../utils/streak';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// ── Helpers ───────────────────────────────────────────────────────────────────

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function mondayOfWeek(d: Date): Date {
  const m = new Date(d);
  m.setHours(0, 0, 0, 0);
  m.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return m;
}

function weekCheckedIn(
  plan: WeeklyPlan,
  topics: Topic[],
  weekStart: Date,
): boolean {
  const weekEnd = new Date(weekStart.getTime() + WEEK_MS);
  const weekSessions = plan.sessions.filter((s) => {
    const d = new Date(s.date + 'T00:00:00');
    return d >= weekStart && d < weekEnd;
  });
  if (weekSessions.length === 0) return false;
  const confMap = new Map(topics.map((t) => [t.id, t.confidence ?? 0]));
  return weekSessions.every((s) => (confMap.get(s.topicId) ?? 0) > 0);
}

// ── Core computation ─────────────────────────────────────────────────────────

export function computeEarnedBadges(
  subjects: Subject[],
  topics: Topic[],
  attempts: PracticeAttempt[],
  plan: WeeklyPlan | null,
  streak: number,
  profile: UserProfile | null,
): Set<BadgeId> {
  const earned = new Set<BadgeId>();
  const now = Date.now();

  // First steps
  if (attempts.length >= 1) earned.add('first_checkin');
  if (subjects.length >= 1) earned.add('subject_added');
  if (plan !== null)        earned.add('plan_created');
  if ((profile?.examDates ?? []).length >= 1) earned.add('exam_set');

  // Streak
  if (streak >= 3)  earned.add('streak_3');
  if (streak >= 7)  earned.add('streak_7');
  if (streak >= 30) earned.add('streak_30');

  // Volume (total attempts)
  if (attempts.length >= 10)  earned.add('checkins_10');
  if (attempts.length >= 50)  earned.add('checkins_50');
  if (attempts.length >= 200) earned.add('checkins_200');

  // Week complete
  if (plan) {
    const today = new Date();
    // Check last 8 weeks
    for (let w = 0; w < 8; w++) {
      const weekStart = new Date(today.getTime() - w * WEEK_MS);
      if (weekCheckedIn(plan, topics, mondayOfWeek(weekStart))) {
        earned.add('week_complete');
        // Check 4-week run
        if (w === 0) {
          let consecutiveWeeks = 1;
          for (let prev = 1; prev <= 3; prev++) {
            const prevWeek = new Date(today.getTime() - prev * WEEK_MS);
            if (weekCheckedIn(plan, topics, mondayOfWeek(prevWeek))) consecutiveWeeks++;
            else break;
          }
          if (consecutiveWeeks >= 4) earned.add('four_week_run');
        }
        break;
      }
    }
  }

  // Mastery
  const confByTopic = new Map(topics.map((t) => [t.id, t.confidence ?? 0]));
  if ([...confByTopic.values()].some((c) => c === 5)) earned.add('topic_nailed');

  for (const s of subjects) {
    const subTopics = topics.filter((t) => t.subjectId === s.id);
    if (subTopics.length === 0) continue;
    if (subTopics.every((t) => (t.confidence ?? 0) >= 4)) earned.add('subject_cleared');
    if (subTopics.every((t) => (t.confidence ?? 0) === 5)) earned.add('subject_nailed');
  }

  // Big jump: topic went from conf 1 → 4+ within 7 days
  const attemptsByTopic = new Map<string, PracticeAttempt[]>();
  for (const a of attempts) {
    const arr = attemptsByTopic.get(a.topicId) ?? [];
    arr.push(a);
    attemptsByTopic.set(a.topicId, arr);
  }
  for (const [, tAttempts] of attemptsByTopic) {
    const sorted = [...tAttempts].sort((a, b) => a.ts - b.ts);
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].confidence !== 1) continue;
      const base = sorted[i].ts;
      for (let j = i + 1; j < sorted.length; j++) {
        if (sorted[j].ts - base > WEEK_MS) break;
        if (sorted[j].confidence >= 4) { earned.add('big_jump'); break; }
      }
    }
  }

  // Comeback: topic had conf 1-2 AFTER previously being higher, now recovered
  for (const [, tAttempts] of attemptsByTopic) {
    const sorted = [...tAttempts].sort((a, b) => a.ts - b.ts);
    let hadHighConf = false;
    let droppedLow = false;
    for (const a of sorted) {
      if (a.confidence >= 3) { if (droppedLow) { earned.add('comeback'); break; } hadHighConf = true; }
      if (a.confidence <= 2 && hadHighConf) droppedLow = true;
    }
  }

  // Ready to go: all subjects above conf 3 with exam in ≤7 days
  if ((profile?.examDates ?? []).length > 0) {
    const upcoming = (profile!.examDates!).filter((ed) => {
      const days = Math.round((new Date(ed.date + 'T00:00:00').getTime() - now) / 86400000);
      return days >= 0 && days <= 7;
    });
    if (upcoming.length > 0 && upcoming.every((ed) => {
      const subTopics = topics.filter((t) => t.subjectId === ed.subjectId);
      return subTopics.length > 0 && subTopics.every((t) => (t.confidence ?? 0) >= 3);
    })) {
      earned.add('ready_to_go');
    }
  }

  // Progress shared (tracked via storage flag)
  // checked separately in checkForNewBadges

  // Hidden: check in on exam day
  const examToday = (profile?.examDates ?? []).some((ed) => ed.date === toISODate(new Date()));
  const checkedInToday = attempts.some((a) => {
    const d = new Date(a.ts);
    return toISODate(d) === toISODate(new Date());
  });
  if (examToday && checkedInToday) earned.add('hidden_exam_day');

  return earned;
}

// ── Public API ────────────────────────────────────────────────────────────────

async function loadSeen(): Promise<BadgeId[]> {
  return getJson<BadgeId[]>(STORAGE_KEYS.badgesSeenV1, []);
}

export async function markBadgesSeen(ids: BadgeId[]): Promise<void> {
  const current = await loadSeen();
  const next = [...new Set([...current, ...ids])];
  await setJson(STORAGE_KEYS.badgesSeenV1, next);
}

export async function loadEarnedBadgeIds(): Promise<BadgeId[]> {
  const [subjects, topics, attempts, plan, profile] = await Promise.all([
    loadSubjects(), loadTopics(), loadAttempts(), loadPlan(), loadProfile(),
  ]);
  const streak = computeCheckinStreak(attempts);

  const earned = computeEarnedBadges(subjects, topics, attempts, plan, streak, profile);

  // Check progress_shared flag
  const shared = await getJson<boolean>(STORAGE_KEYS.progressShared, false);
  if (shared) earned.add('progress_shared');

  return [...earned];
}

/**
 * Computes newly earned badges not yet seen. Call after every check-in or plan event.
 * Returns the new badge IDs — caller is responsible for showing toasts and calling markBadgesSeen.
 */
export async function checkForNewBadges(): Promise<BadgeId[]> {
  const [earned, seen] = await Promise.all([loadEarnedBadgeIds(), loadSeen()]);
  const seenSet = new Set(seen);
  return earned.filter((id) => !seenSet.has(id));
}

export async function markProgressShared(): Promise<void> {
  await setJson(STORAGE_KEYS.progressShared, true);
}
