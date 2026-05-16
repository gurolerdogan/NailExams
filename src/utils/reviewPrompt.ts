import * as StoreReview from 'expo-store-review';
import { getJson, setJson } from '../services/storage/storage';
import { STORAGE_KEYS } from '../services/storage/keys';
import { logEvent } from '../services/logging/logEvent';

async function hasBeenPrompted(): Promise<boolean> {
  return getJson<boolean>(STORAGE_KEYS.reviewPrompted, false);
}

async function markPrompted(): Promise<void> {
  await setJson(STORAGE_KEYS.reviewPrompted, true);
}

/**
 * Attempt to show the in-app review dialog.
 * Safe to call speculatively — guards against double-prompting and
 * only fires when the OS allows it.
 */
async function tryRequestReview(trigger: string): Promise<void> {
  if (await hasBeenPrompted()) return;
  const available = await StoreReview.isAvailableAsync();
  if (!available) return;
  await markPrompted();
  await StoreReview.requestReview();
  void logEvent('review_prompted', { trigger });
}

/**
 * Call after streak is computed on HomeScreen.
 * Prompts when the user hits a 7-day streak for the first time.
 */
export async function maybePromptOnStreak(streak: number): Promise<void> {
  if (streak >= 7) await tryRequestReview('streak_7');
}

/**
 * Call after a successful check-in save in PracticeScreen.
 * Prompts when the user rates their 10th topic as 5/5 ("Nailed it").
 */
export async function maybePromptOnNailedIt(
  confidence: number,
  totalAttempts: number,
): Promise<void> {
  if (confidence === 5 && totalAttempts >= 10) await tryRequestReview('nailed_it_10');
}
