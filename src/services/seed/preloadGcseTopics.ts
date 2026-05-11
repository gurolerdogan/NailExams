import type { Subject, Topic } from '../../types/models';
import { loadTopics, saveTopics } from '../storage/nailexamsStorage';
import { GCSE_TOPIC_CATALOG, ALEVEL_TOPIC_CATALOG } from '../../data/gcseTopicCatalog';
import { uuid } from '../../utils/id';
import { now } from '../../utils/time';
import { logEvent } from '../logging/logEvent';

function normalize(s: string) {
  return s.trim().toLowerCase();
}

export async function preloadTopicsForSubjects(params: {
  examLevel: 'GCSE' | 'A_LEVEL';
  subjects: Subject[];
}): Promise<void> {
  const { examLevel, subjects } = params;

  const catalog = examLevel === 'GCSE' ? GCSE_TOPIC_CATALOG : ALEVEL_TOPIC_CATALOG;

  const existingAll = await loadTopics();

  const existingKey = new Set<string>();
  for (const t of existingAll) {
    existingKey.add(`${t.subjectId}::${normalize(t.name)}`);
  }

  const ts = now();
  const additions: Topic[] = [];

  for (const subj of subjects) {
    const topicNames = catalog[subj.name];
    if (!topicNames || topicNames.length === 0) continue;

    for (const topicName of topicNames) {
      const key = `${subj.id}::${normalize(topicName)}`;
      if (existingKey.has(key)) continue;

      existingKey.add(key);
      additions.push({
        id: uuid(),
        subjectId: subj.id,
        name: topicName,
        confidence: 0,
        createdAt: ts,
        updatedAt: ts,
      });
    }
  }

  if (additions.length > 0) {
    const nextAll = [...existingAll, ...additions];
    await saveTopics(nextAll);
    await logEvent('topics_preloaded', { examLevel, added: additions.length });
  } else {
    await logEvent('topics_preloaded', { examLevel, added: 0 });
  }
}

// Kept for backward compat with any lingering imports
export const preloadGcseTopicsForSubjects = preloadTopicsForSubjects;
