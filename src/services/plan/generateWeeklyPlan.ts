import type { Subject, Topic } from '../../types/models';
import type { WeeklyPlan, PlanSession, PlanConfig } from '../../types/plan';
import { uuid } from '../../utils/id';
import { now } from '../../utils/time';

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function topicSortKey(t: Topic): number {
  // confidence 0 first (never checked in), then 1–5; ties broken by oldest practice
  return (t.confidence ?? 0) * 1_000_000_000 + (t.lastPracticedAt ?? 0);
}

export function generatePlan(params: {
  subjects: Subject[];
  topics: Topic[];
  config: PlanConfig;
}): WeeklyPlan {
  const { subjects, topics, config } = params;
  const { durationDays, subjectIds, topicsPerDay, topicOrder } = config;

  const ts = now();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const planStart = toISODate(today);

  const subjectById = new Map(subjects.map((s) => [s.id, s]));
  const selectedSubjects = subjectIds
    .map((id) => subjectById.get(id))
    .filter((s): s is Subject => !!s);

  const sessions: PlanSession[] = [];

  if (topicOrder === 'subjects-first') {
    // Flat list: all topics from S0 (sorted), then S1, then S2 …
    const orderedTopics: Topic[] = [];
    for (const subject of selectedSubjects) {
      topics
        .filter((t) => t.subjectId === subject.id)
        .sort((a, b) => topicSortKey(a) - topicSortKey(b))
        .forEach((t) => orderedTopics.push(t));
    }

    let idx = 0;
    outer: for (let day = 0; day < durationDays; day++) {
      const date = new Date(today);
      date.setDate(today.getDate() + day);
      const dateISO = toISODate(date);

      for (let slot = 0; slot < topicsPerDay; slot++) {
        if (idx >= orderedTopics.length) break outer;
        const topic = orderedTopics[idx++];
        const subject = subjectById.get(topic.subjectId)!;
        sessions.push(makeSession(dateISO, subject, topic, ts));
      }
    }
  } else {
    // Round-robin: cycle through subject queues one slot at a time
    const queues: Topic[][] = selectedSubjects.map((subject) =>
      topics
        .filter((t) => t.subjectId === subject.id)
        .sort((a, b) => topicSortKey(a) - topicSortKey(b)),
    );
    const numSubjects = selectedSubjects.length;
    let globalSlot = 0;

    outer: for (let day = 0; day < durationDays; day++) {
      const date = new Date(today);
      date.setDate(today.getDate() + day);
      const dateISO = toISODate(date);

      for (let slot = 0; slot < topicsPerDay; slot++) {
        // Find next non-exhausted queue, cycling from globalSlot
        let picked = false;
        for (let attempt = 0; attempt < numSubjects; attempt++) {
          const qi = (globalSlot + attempt) % numSubjects;
          if (queues[qi].length > 0) {
            const topic = queues[qi].shift()!;
            const subject = selectedSubjects[qi];
            sessions.push(makeSession(dateISO, subject, topic, ts));
            globalSlot = (qi + 1) % numSubjects;
            picked = true;
            break;
          }
        }
        if (!picked) break outer; // all queues exhausted
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
