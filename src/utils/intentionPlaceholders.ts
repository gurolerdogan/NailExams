/**
 * Returns a contextual placeholder for the pre-session intention field
 * based on keywords in the topic name.
 */

const KEYWORD_PLACEHOLDERS: Array<[string[], string]> = [
  [['mechanism', 'organic'], '"Understand the SN1 vs SN2 mechanisms"'],
  [['equilibrium', 'le chatelier'], '"Explain Le Chatelier\'s principle in my own words"'],
  [['integration', 'integral'], '"Complete integration by parts without looking at notes"'],
  [['quadratic', 'factori'], '"Factorise three quadratics from memory"'],
  [['probability', 'tree'], '"Draw a probability tree diagram for a two-stage event"'],
  [['photosynthesis'], '"Explain the light-dependent reactions step by step"'],
  [['genetic', 'dna', 'protein synthesis'], '"Trace the path from gene to protein"'],
  [['forces', 'newton'], '"Apply Newton\'s second law to a two-body problem"'],
  [['titration', 'acid', 'base'], '"Work through a titration calculation end to end"'],
  [['wave', 'interference', 'diffraction'], '"Explain constructive and destructive interference"'],
  [['electricity', 'circuit'], '"Solve a series-parallel circuit problem"'],
  [['atomic', 'electron', 'bonding'], '"Describe ionic vs covalent bonding from scratch"'],
  [['statistics', 'hypothesis'], '"Set up and test a hypothesis from scratch"'],
  [['history', 'cause', 'consequence'], '"Identify three causes and rank them by importance"'],
  [['geography', 'climate'], '"Explain the water cycle without looking at notes"'],
  [['french', 'spanish', 'german', 'language'], '"Write 5 sentences using this vocabulary from memory"'],
  [['essay', 'analyse', 'evaluate'], '"Write a 4-point analytical paragraph without planning first"'],
  [['business', 'stakeholder', 'finance'], '"Apply this concept to a real company example"'],
];

const FALLBACK = '"What do I want to understand by the end of this session?"';

export function getIntentionPlaceholder(topicName: string): string {
  const lower = topicName.toLowerCase();
  for (const [keywords, placeholder] of KEYWORD_PLACEHOLDERS) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return placeholder;
    }
  }
  return FALLBACK;
}
