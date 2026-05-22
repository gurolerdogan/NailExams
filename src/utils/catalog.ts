/**
 * Topic weight & time estimate lookup.
 *
 * Weight 1 = light (~15 min)  — single-concept recall
 * Weight 2 = standard (~25 min) — default for all topics
 * Weight 3 = heavy (~40 min)  — complex, multi-concept
 *
 * The catalog stores topics as plain strings, so we infer weight from
 * well-known keywords rather than storing it per-entry. Everything
 * defaults to weight 2 / 25 min.
 */

export type TopicWeight = 1 | 2 | 3;

export const WEIGHT_MINUTES: Record<TopicWeight, number> = {
  1: 15,
  2: 25,
  3: 40,
};

// Keywords that indicate a lightweight topic (single-concept recall)
const LIGHT_KEYWORDS = [
  'definition', 'definitions', 'units', 'notation', 'symbol', 'symbols',
  'state', 'states of matter', 'ohm', 'atomic number', 'formulae',
  'vocabulary', 'key terms', 'terminology', 'introduction', 'overview',
  'types of', 'naming', 'classification', 'identify',
];

// Keywords that indicate a heavy topic (complex, multi-concept)
const HEAVY_KEYWORDS = [
  'mechanism', 'mechanisms', 'integration', 'differential equation',
  'hardy-weinberg', 'le chatelier', 'equilibrium constant',
  'organic reaction', 'electrochemistry', 'titration calculation',
  'genetic crosses', 'meiosis', 'protein synthesis',
  'thermodynamics', 'entropy', 'gibbs', 'activation energy',
  'waves interference', 'quantum', 'nuclear decay',
  'hypothesis testing', 'confidence interval', 'normal distribution',
  'partial fractions', 'vector calculus', 'complex numbers',
  'proof by induction', 'taylor series', 'fourier',
  'electromagnetic induction', 'capacitor discharge',
];

function matchesKeywords(topicName: string, keywords: string[]): boolean {
  const lower = topicName.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

/**
 * Returns the weight (1|2|3) for a topic based on its name.
 * Defaults to 2 (standard) for all unrecognised topics.
 */
export function getTopicWeight(topicName: string): TopicWeight {
  if (matchesKeywords(topicName, HEAVY_KEYWORDS)) return 3;
  if (matchesKeywords(topicName, LIGHT_KEYWORDS)) return 1;
  return 2;
}

/**
 * Returns the estimated study time in minutes for a topic.
 */
export function getEstimatedMinutes(topicName: string): number {
  return WEIGHT_MINUTES[getTopicWeight(topicName)];
}
