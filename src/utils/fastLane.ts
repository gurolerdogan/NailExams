import type { Topic } from '../types/models';
import type { PracticeAttempt } from '../types/practice';

const FAST_LANE_WINDOW_MS  = 14 * 24 * 60 * 60 * 1000; // 14 days
const BURNOUT_REST_MS      = 7  * 24 * 60 * 60 * 1000; // 7 days
const MIN_ATTEMPTS_WINDOW  = 2;   // at least 2 check-ins in the window
const FAST_LANE_MAX_CONF   = 2;   // stuck at confidence ≤ 2
const BURNOUT_ATTEMPTS     = 4;   // failed fast-lane sessions before rest

export type FastLaneInfo = {
  topicId: string;
  stuckDays: number;
  isBurntOut: boolean; // true = in rest phase, should NOT get 3× multiplier
};

/**
 * Detects topics stuck at low confidence and returns their fast-lane status.
 *
 * Entry criteria (all must be true):
 *   ≥2 check-ins for the topic in the past 14 days
 *   Peak confidence during that window ≤ 2
 *   Current topic confidence ≤ 2
 *
 * Burnout rest: if ≥4 fast-lane sessions with no improvement, rests for 7 days.
 */
export function computeFastLane(
  topics: Topic[],
  attempts: PracticeAttempt[],
): Map<string, FastLaneInfo> {
  const now = Date.now();
  const result = new Map<string, FastLaneInfo>();

  // Index attempts by topicId
  const byTopic = new Map<string, PracticeAttempt[]>();
  for (const a of attempts) {
    const arr = byTopic.get(a.topicId) ?? [];
    arr.push(a);
    byTopic.set(a.topicId, arr);
  }

  for (const topic of topics) {
    const conf = topic.confidence ?? 0;
    if (conf === 0 || conf > FAST_LANE_MAX_CONF) continue; // not stuck

    const allAttempts = byTopic.get(topic.id) ?? [];
    const windowAttempts = allAttempts.filter(
      (a) => now - a.ts <= FAST_LANE_WINDOW_MS,
    );

    if (windowAttempts.length < MIN_ATTEMPTS_WINDOW) continue;

    const peakConf = Math.max(...windowAttempts.map((a) => a.confidence));
    if (peakConf > FAST_LANE_MAX_CONF) continue; // showed improvement in window

    // Calculate stuck days
    const oldestInWindow = Math.min(...windowAttempts.map((a) => a.ts));
    const stuckDays = Math.round((now - oldestInWindow) / (24 * 60 * 60 * 1000));

    // Burnout check: ≥4 attempts in the fast-lane window with no improvement
    // AND the most recent attempt was within the rest period
    const mostRecentAttempt = Math.max(...allAttempts.map((a) => a.ts));
    const isBurntOut =
      windowAttempts.length >= BURNOUT_ATTEMPTS &&
      now - mostRecentAttempt <= BURNOUT_REST_MS;

    result.set(topic.id, { topicId: topic.id, stuckDays, isBurntOut });
  }

  return result;
}

/** Returns the set of topicIds currently in the active fast lane (not burnt out). */
export function getActiveFastLaneIds(
  topics: Topic[],
  attempts: PracticeAttempt[],
): Set<string> {
  const map = computeFastLane(topics, attempts);
  const active = new Set<string>();
  for (const [id, info] of map) {
    if (!info.isBurntOut) active.add(id);
  }
  return active;
}
