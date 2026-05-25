/**
 * Context-aware revision strategy tips shown during a focus timer session.
 * Tips are about HOW to study — never about subject content.
 * Selection is deterministic per (topicId, confidence, fastLane) tuple.
 */

const TIPS_LOW: string[] = [
  'Close your notes and write out everything you remember about this topic. Then check what you missed.',
  'Can you explain this topic to an imaginary 12-year-old? Start talking and see where you get stuck.',
  'Write the key idea in one sentence without jargon. If you can\'t, that\'s the gap to work on.',
  'Draw a diagram that shows how the parts of this topic connect. No labels allowed at first.',
  'Make a quick mind-map from scratch — don\'t look at your notes until you\'re done.',
  'Write down three questions this topic should answer. Can you answer all three from memory?',
];

const TIPS_MID: string[] = [
  'Cover the page and write out the steps from memory. Look only when stuck — not before.',
  'Try explaining this topic backwards — start with the conclusion and work back to the premise.',
  'What exam question would test this topic? Write the question yourself, then answer it.',
  'Interleave: after this session, do 10 minutes on a completely different subject.',
  'Test yourself with a past paper question on this topic without checking your notes first.',
  'Compare and contrast: how does this topic relate to something you already know well?',
];

const TIPS_FAST_LANE: string[] = [
  'You\'ve studied this several times — try a completely different format. Draw a diagram instead of writing notes.',
  'Teach it out loud to the room. Speaking activates different memory pathways than reading.',
  'Find one past paper question on this topic and do it under timed conditions. Struggle is the signal.',
  'Write down exactly what confuses you about this topic. Naming the confusion is step one.',
  'Try the Feynman technique: explain it simply, find where you get stuck, go back and fill the gap.',
  'Switch to a completely different resource — a YouTube video, a different textbook, anything new.',
];

function hashTopicId(topicId: string): number {
  let h = 0;
  for (let i = 0; i < topicId.length; i++) {
    h = (Math.imul(31, h) + topicId.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * Returns a consistent tip for the given context.
 * The same student always sees the same tip for the same topic
 * at the same confidence level — it only changes when confidence improves.
 */
export function getTipForSession(
  confidence: number,
  isFastLane: boolean,
  topicId: string,
): string {
  const hash = hashTopicId(topicId + String(confidence) + String(isFastLane));

  if (isFastLane) {
    return TIPS_FAST_LANE[hash % TIPS_FAST_LANE.length];
  }
  if (confidence <= 2) {
    return TIPS_LOW[hash % TIPS_LOW.length];
  }
  return TIPS_MID[hash % TIPS_MID.length];
}
