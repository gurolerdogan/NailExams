import type { Subject, Topic } from '../../types/models';
import type { WeeklyPlan, PlanSession, PlanConfig } from '../../types/plan';
import type { PracticeAttempt } from '../../types/practice';
import { uuid } from '../../utils/id';
import { now } from '../../utils/time';
import { getTopicWeight } from '../../utils/catalog';
import { getActiveFastLaneIds } from '../../utils/fastLane';

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Spaced-repetition priority score — lower = higher priority (scheduled sooner).
 *
 * Resurfacing intervals by confidence:
 *   0 (never checked in): treat as overdue immediately
 *   1–2: resurface every 3 days
 *   3:   resurface every 7 days
 *   4–5: resurface every 14 days
 *
 * Topics overdue for their interval get a strong priority boost; topics that
 * were recently practised within their interval are deprioritised.
 */
function topicSortKey(
  t: Topic,
  fastLaneIds: Set<string>,
  phase?: 'normal' | 'crunch' | 'final',
): number {
  const conf = t.confidence ?? 0;
  if (conf === 0) return -9999; // never checked in — always first

  // Exam-pressure tightens intervals
  const intervalMultiplier = phase === 'final' ? 0.4 : phase === 'crunch' ? 0.6 : 1;

  const intervalDays = (conf <= 2 ? 3 : conf === 3 ? 7 : 14) * intervalMultiplier;
  const lastPracticed = t.lastPracticedAt ?? 0;
  const daysSince = (Date.now() - lastPracticed) / (24 * 60 * 60 * 1000);
  const overdueDays = daysSince - intervalDays;

  const base = conf * 1000;
  const overdueBoost = Math.max(overdueDays, 0) * 10;
  let score = base - overdueBoost;

  // Weight multiplier: heavier topics surface more when at low confidence
  const weight = getTopicWeight(t.name);
  score = score / weight; // heavier → lower score → higher priority

  // Fast-lane: 3× priority boost (lower score = higher priority)
  if (fastLaneIds.has(t.id)) score = score / 3;

  return score;
}

/** Converts a JS Date to Mon=0…Sun=6 */
function dayOfWeekMon(d: Date): number {
  return (d.getDay() + 6) % 7;
}

export function generatePlan(params: {
  subjects: Subject[];
  topics: Topic[];
  config: PlanConfig;
  attempts?: PracticeAttempt[];
  examDates?: Array<{ subjectId: string; date: string }>;
}): WeeklyPlan {
  const { subjects, topics, config, attempts = [], examDates = [] } = params;
  const { durationDays, subjectIds, topicsPerDay, topicOrder } = config;
  const studyDaySet = new Set(config.studyDays ?? [0, 1, 2, 3, 4]);

  // Pre-compute fast-lane topics for 3× priority boost
  const fastLaneIds = getActiveFastLaneIds(topics, attempts);

  // Exam-pressure phase per subject (Plus feature — computed but applied regardless for now)
  const examPressurePhase = new Map<string, 'normal' | 'crunch' | 'final'>();
  const todayTime = Date.now();
  for (const ed of examDates) {
    const daysUntil = Math.round(
      (new Date(ed.date + 'T00:00:00').getTime() - todayTime) / 86400000,
    );
    if (daysUntil < 0) continue;
    examPressurePhase.set(
      ed.subjectId,
      daysUntil <= 7 ? 'final' : daysUntil <= 20 ? 'crunch' : 'normal',
    );
  }

  const ts = now();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const planStart = toISODate(today);

  const subjectById = new Map(subjects.map((s) => [s.id, s]));
  const selectedSubjects = subjectIds
    .map((id) => subjectById.get(id))
    .filter((s): s is Subject => !!s);

  const sessions: PlanSession[] = [];

  // Helper: can this topic be added to today's day given one-heavy-per-day rule?
  function canAddToDay(dayTopics: Topic[], candidate: Topic): boolean {
    if (getTopicWeight(candidate.name) !== 3) return true;
    return !dayTopics.some((t) => getTopicWeight(t.name) === 3);
  }

  // Final-push filter: suppress conf ≥ 4 topics touched within 5 days
  function shouldIncludeInFinalPush(topic: Topic): boolean {
    const conf = topic.confidence ?? 0;
    if (conf < 4) return true;
    const daysSince = topic.lastPracticedAt
      ? (Date.now() - topic.lastPracticedAt) / 86400000
      : 999;
    return daysSince > 5;
  }

  if (topicOrder === 'subjects-first') {
    const orderedTopics: Topic[] = [];
    for (const subject of selectedSubjects) {
      const phase = examPressurePhase.get(subject.id);
      topics
        .filter((t) => t.subjectId === subject.id)
        .filter((t) => phase !== 'final' || shouldIncludeInFinalPush(t))
        .sort((a, b) => topicSortKey(a, fastLaneIds, phase) - topicSortKey(b, fastLaneIds, phase))
        .forEach((t) => orderedTopics.push(t));
    }

    let idx = 0;
    outer: for (let day = 0; day < durationDays; day++) {
      const date = new Date(today);
      date.setDate(today.getDate() + day);
      if (!studyDaySet.has(dayOfWeekMon(date))) continue;
      const dateISO = toISODate(date);
      const dayTopics: Topic[] = [];

      for (let slot = 0; slot < topicsPerDay; slot++) {
        // Find next topic that passes the heavy-per-day rule
        let placed = false;
        for (let skip = idx; skip < orderedTopics.length; skip++) {
          const topic = orderedTopics[skip];
          if (canAddToDay(dayTopics, topic)) {
            orderedTopics.splice(skip, 1);
            const subject = subjectById.get(topic.subjectId)!;
            sessions.push(makeSession(dateISO, subject, topic, ts));
            dayTopics.push(topic);
            placed = true;
            break;
          }
        }
        if (!placed && idx >= orderedTopics.length) break outer;
      }
    }
  } else {
    const queues: Topic[][] = selectedSubjects.map((subject) => {
      const phase = examPressurePhase.get(subject.id);
      return topics
        .filter((t) => t.subjectId === subject.id)
        .filter((t) => phase !== 'final' || shouldIncludeInFinalPush(t))
        .sort((a, b) => topicSortKey(a, fastLaneIds, phase) - topicSortKey(b, fastLaneIds, phase));
    });
    const numSubjects = selectedSubjects.length;
    let globalSlot = 0;

    outer: for (let day = 0; day < durationDays; day++) {
      const date = new Date(today);
      date.setDate(today.getDate() + day);
      if (!studyDaySet.has(dayOfWeekMon(date))) continue;
      const dateISO = toISODate(date);
      const dayTopics: Topic[] = [];

      for (let slot = 0; slot < topicsPerDay; slot++) {
        let picked = false;
        // Try each subject queue, respecting the heavy-per-day rule
        for (let attempt = 0; attempt < numSubjects * 2; attempt++) {
          const qi = (globalSlot + attempt) % numSubjects;
          if (queues[qi].length === 0) continue;
          const candidate = queues[qi][0];
          if (canAddToDay(dayTopics, candidate)) {
            queues[qi].shift();
            const subject = selectedSubjects[qi];
            sessions.push(makeSession(dateISO, subject, candidate, ts));
            dayTopics.push(candidate);
            globalSlot = (qi + 1) % numSubjects;
            picked = true;
            break;
          } else {
            // Skip this queue for this slot — look further
          }
        }
        if (!picked) {
          // All remaining topics are heavy — just pick the next available
          for (let attempt = 0; attempt < numSubjects; attempt++) {
            const qi = (globalSlot + attempt) % numSubjects;
            if (queues[qi].length > 0) {
              const topic = queues[qi].shift()!;
              const subject = selectedSubjects[qi];
              sessions.push(makeSession(dateISO, subject, topic, ts));
              dayTopics.push(topic);
              globalSlot = (qi + 1) % numSubjects;
              picked = true;
              break;
            }
          }
        }
        if (!picked) break outer;
      }
    }
  }

  return {
    id: uuid(),
    planStart,
    weekStart: planStart,
    durationDays,
    subjectIds,
    topicsPerDay,
    topicOrder,
    sessionsPerDay: topicsPerDay,
    sessions,
    createdAt: ts,
    updatedAt: ts,
  };
}

function makeSession(
  date: string,
  subject: Subject,
  topic: Topic,
  ts: number,
): PlanSession {
  return {
    id: uuid(),
    date,
    subjectId: subject.id,
    topicId: topic.id,
    title: `${subject.name} — ${topic.name}`,
    status: 'PLANNED',
    createdAt: ts,
    updatedAt: ts,
  };
}
