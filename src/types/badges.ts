export type BadgeTier = 'Bronze' | 'Silver' | 'Gold' | 'Special' | 'Hidden';

export type BadgeId =
  // First steps
  | 'first_checkin' | 'subject_added' | 'plan_created' | 'exam_set'
  // Consistency
  | 'streak_3' | 'streak_7' | 'streak_30'
  | 'week_complete' | 'four_week_run'
  // Volume
  | 'checkins_10' | 'checkins_50' | 'checkins_200'
  // Mastery
  | 'topic_nailed' | 'subject_cleared' | 'subject_nailed'
  | 'big_jump' | 'comeback' | 'ready_to_go'
  // Social
  | 'progress_shared'
  // Hidden
  | 'hidden_exam_day';

export type BadgeDefinition = {
  id: BadgeId;
  emoji: string;
  name: string;
  description: string;
  tier: BadgeTier;
};

export const BADGE_CATALOG: BadgeDefinition[] = [
  // ── First steps ──────────────────────────────────────────────────────────────
  { id: 'first_checkin',   emoji: '🌱', name: 'First check-in',    description: 'Complete your first practice session on any topic', tier: 'Bronze' },
  { id: 'subject_added',   emoji: '📚', name: 'Subject added',     description: 'Add your first subject and start tracking', tier: 'Bronze' },
  { id: 'plan_created',    emoji: '🗓', name: 'Plan created',      description: 'Generate your first weekly revision plan', tier: 'Bronze' },
  { id: 'exam_set',        emoji: '📅', name: 'Exam set',          description: 'Add your first exam date', tier: 'Bronze' },

  // ── Consistency ───────────────────────────────────────────────────────────────
  { id: 'streak_3',        emoji: '🔥', name: '3-day streak',      description: 'Check in 3 days in a row', tier: 'Bronze' },
  { id: 'streak_7',        emoji: '🔥', name: '7-day streak',      description: 'Check in 7 days in a row', tier: 'Silver' },
  { id: 'streak_30',       emoji: '🔥', name: '30-day streak',     description: 'Check in every day for a full month', tier: 'Gold' },
  { id: 'week_complete',   emoji: '✅', name: 'Week complete',     description: 'All topics checked in across a full plan week', tier: 'Bronze' },
  { id: 'four_week_run',   emoji: '🏅', name: '4-week run',        description: 'Complete all sessions across 4 consecutive weeks', tier: 'Gold' },

  // ── Volume ────────────────────────────────────────────────────────────────────
  { id: 'checkins_10',     emoji: '📖', name: '10 check-ins',      description: 'Complete 10 practice attempts in total', tier: 'Bronze' },
  { id: 'checkins_50',     emoji: '📖', name: '50 check-ins',      description: 'Complete 50 practice attempts in total', tier: 'Silver' },
  { id: 'checkins_200',    emoji: '📖', name: '200 check-ins',     description: 'Complete 200 practice attempts in total', tier: 'Gold' },

  // ── Mastery ───────────────────────────────────────────────────────────────────
  { id: 'topic_nailed',    emoji: '🎯', name: 'First topic nailed', description: 'Rate any topic confidence 5 for the first time', tier: 'Silver' },
  { id: 'subject_cleared', emoji: '🏆', name: 'Subject cleared',   description: 'All topics in a subject reach confidence 4 or above', tier: 'Gold' },
  { id: 'subject_nailed',  emoji: '💎', name: 'Subject nailed',    description: 'All topics in a subject reach confidence 5', tier: 'Special' },
  { id: 'big_jump',        emoji: '📈', name: 'Big jump',          description: 'Improve a topic from confidence 1 to 4+ within one week', tier: 'Silver' },
  { id: 'comeback',        emoji: '💪', name: 'Comeback',          description: 'Recover a topic that had previously dropped back to confidence 1–2', tier: 'Silver' },
  { id: 'ready_to_go',     emoji: '🎓', name: 'Ready to go',       description: 'All subjects above confidence 3 with 7 days until an exam', tier: 'Gold' },

  // ── Social ────────────────────────────────────────────────────────────────────
  { id: 'progress_shared', emoji: '📤', name: 'Progress shared',   description: 'Share your first progress card', tier: 'Bronze' },

  // ── Hidden ────────────────────────────────────────────────────────────────────
  { id: 'hidden_exam_day', emoji: '🤫', name: '???',               description: 'Something unlocks on exam day.', tier: 'Hidden' },
];

export const BADGE_BY_ID = new Map<BadgeId, BadgeDefinition>(
  BADGE_CATALOG.map((b) => [b.id, b]),
);
