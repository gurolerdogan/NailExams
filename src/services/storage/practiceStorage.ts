import { getJson, setJson } from './storage';
import { STORAGE_KEYS } from './keys';
import type { PracticeAttempt } from '../../types/practice';

const MAX_ATTEMPTS = 500;

export async function loadAttempts(): Promise<PracticeAttempt[]> {
  return getJson<PracticeAttempt[]>(STORAGE_KEYS.attemptsV1, []);
}

export async function appendAttempt(attempt: PracticeAttempt): Promise<void> {
  const current = await loadAttempts();
  const next = [attempt, ...current].slice(0, MAX_ATTEMPTS);
  await setJson(STORAGE_KEYS.attemptsV1, next);
}