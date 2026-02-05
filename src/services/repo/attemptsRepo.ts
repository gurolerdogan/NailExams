import { Attempt } from '../../types/domain';
import { getJson, setJson } from '../storage/storage';
import { STORAGE_KEYS } from '../storage/storageKeys';

const DEFAULT: Attempt[] = [];

export async function listAttempts(): Promise<Attempt[]> {
  return getJson<Attempt[]>(STORAGE_KEYS.attempts, DEFAULT);
}

export async function saveAttempts(attempts: Attempt[]): Promise<void> {
  await setJson(STORAGE_KEYS.attempts, attempts);
}
