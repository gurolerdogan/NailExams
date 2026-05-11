import { getJson, setJson } from './storage';
import { STORAGE_KEYS } from './keys';
import type { PracticeAttempt } from '../../types/practice';

const MAX_ATTEMPTS = 500;

export async function loadAttempts(): Promise<PracticeAttempt[]> {
  return getJson<PracticeAttempt[]>(STORAGE_KEYS.attemptsV1, []);
}

export async function appendAttempt(attempt: PracticeAttempt): Promise<void> {
  const current = await loadAttempts();
  // Append at the end and keep the newest MAX_ATTEMPTS entries.
  // Avoid prepend+slice(0,N) which reverses the growth direction each time.
  const next = current.length >= MAX_ATTEMPTS
    ? [...current.slice(1), attempt]   // drop oldest, add newest
    : [...current, attempt];
  await setJson(STORAGE_KEYS.attemptsV1, next);
}
