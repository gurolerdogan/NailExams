import type { Subject, Topic } from '../../types/models';
import type { WeeklyPlan, PlanSession } from '../../types/plan';
import { uuid } from '../../utils/id';
import { now } from '../../utils/time';

function toISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Monday as week start
function startOfWeekMonday(date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 Sun, 1 Mon
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function topicPriority(t: Topic): number {
  // Lower score = higher priority
  const confidence = t.confidence ?? 0; // unknown treated as 0 (high priority)
  const last = t.lastPracticedAt ?? 0;

  // confidence weight dominates; lastPracticedAt breaks ties
  // recent practice => higher last => slightly lower priority
  return confidence * 1_000_000_000 + (last === 0 ? 0 : last);
}

export function generateWeeklyPlan(params: {
  subjects: Subject[];
  topics: Topic[];
  sessionsPerDay: number; // 1 or 2
}): WeeklyPlan {
  const { subjects, topics, sessionsPerDay } = params;

  const ts = now();
  const weekStartDate = startOfWeekMonday();
  const weekStart = toISODate(weekStartDate);

  const subjectById = new Map(subjects.map((s) => [s.id, s]));

  // Only include topics whose subject exists
  const candidates = topics
    .filter((t) => subjectById.has(t.subjectId))
    .sort((a, b) => topicPriority(a) - topicPriority(b));

  const totalSessions = 7 * sessionsPerDay;
  const chosen = candidates.slice(0, totalSessions);

  const sessions: PlanSession[] = [];

  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    for (let s = 0; s < sessionsPerDay; s++) {
      const idx = dayIndex * sessionsPerDay + s;
      const topic = chosen[idx];
      if (!topic) break;

      const day = new Date(weekStartDate);
      day.setDate(weekStartDate.getDate() + dayIndex);

      const subject = subjectById.get(topic.subjectId)!;

      sessions.push({
        id: uuid(),
        date: toISODate(day),
        subjectId: subject.id,
        topicId: topic.id,
        title: `${subject.name} — ${topic.name}`,
        status: 'PLANNED',
        createdAt: ts,
        updatedAt: ts,
      });
    }
  }

  return {
    id: uuid(),
    weekStart,
    sessionsPerDay,
    sessions,
    createdAt: ts,
    updatedAt: ts,
  };
}