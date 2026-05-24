import { GCSE_TOPIC_CATALOG, ALEVEL_TOPIC_CATALOG } from '../data/gcseTopicCatalog';

export type TopicWeight = 1 | 2 | 3;

export const WEIGHT_MINUTES: Record<TopicWeight, number> = {
  1: 15,
  2: 25,
  3: 40,
};

// Build a name→weight lookup from both catalogs at module load time.
const WEIGHT_MAP = new Map<string, TopicWeight>();
for (const entries of [
  ...Object.values(GCSE_TOPIC_CATALOG),
  ...Object.values(ALEVEL_TOPIC_CATALOG),
]) {
  for (const [name, weight] of entries) {
    WEIGHT_MAP.set(name.toLowerCase(), weight as TopicWeight);
  }
}

export function getTopicWeight(topicName: string): TopicWeight {
  return WEIGHT_MAP.get(topicName.toLowerCase()) ?? 2;
}

export function getEstimatedMinutes(topicName: string): number {
  return WEIGHT_MINUTES[getTopicWeight(topicName)];
}
