import type { Subject, Topic } from '../../types/models';
import { loadTopics, saveTopics } from '../storage/nailexamsStorage';
import { GCSE_TOPIC_CATALOG } from '../../data/gcseTopicCatalog';
import { uuid } from '../../utils/id';
import { now } from '../../utils/time';
import { logEvent } from '../logging/logEvent';

function normalize(s: string) {
  return s.trim().toLowerCase();
}

export async function preloadGcseTopicsForSubjects(params: {
  examLevel: 'GCSE' | 'A_LEVEL';
  subjects: Subject[];
}): Promise<void> {
  const { examLevel, subjects } = params;
  if (examLevel !== 'GCSE') return;

  const existingAll = await loadTopics();

  const existingKey = new Set<string>();
  for (const t of existingAll) {
    existingKey.add(`${t.subjectId}::${normalize(t.name)}`);
  }

  const ts = now();
  const additions: Topic[] = [];

  for (const subj of subjects) {
    const catalog = GCSE_TOPIC_CATALOG[subj.name];
    if (!catalog || catalog.length === 0) continue;

    for (const topicName of catalog) {
      const key = `${subj.id}::${normalize(topicName)}`;
      if (existingKey.has(key)) continue;

      existingKey.add(key);
      additions.push({
        id: uuid(),
        subjectId: subj.id,
        name: topicName,
        confidence: 0, // topics start unchecked — user must check in to set a level
        createdAt: ts,
        updatedAt: ts,
      });
    }
  }

  if (additions.length > 0) {
    const nextAll = [...existingAll, ...additions];
    await saveTopics(nextAll);
    await logEvent('gcse_topics_preloaded', { added: additions.length });
  } else {
    await logEvent('gcse_topics_preloaded', { added: 0 });
  }
}