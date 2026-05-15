import { getJson, setJson } from '../storage/storage';
import { STORAGE_KEYS } from '../storage/keys';
import { now } from '../../utils/time';
import { uuid } from '../../utils/id';
import { capture } from '../analytics/posthog';
import type { LogEvent } from '../../types/logging';

const MAX_LOGS = 200;

export async function logEvent(name: string, payload?: Record<string, any>): Promise<void> {
  const entry: LogEvent = {
    id: uuid(),
    name,
    ts: now(),
    payload,
  };

  if (__DEV__) console.log(`[NailExams] ${name}`, payload ?? {}); // eslint-disable-line no-console

  // Forward to PostHog (no-op until API key is set)
  capture(name, payload);

  // Best-effort local persistence (never block UX)
  try {
    const current = await getJson<LogEvent[]>(STORAGE_KEYS.logsV1, []);
    const next = [entry, ...current].slice(0, MAX_LOGS);
    await setJson(STORAGE_KEYS.logsV1, next);
  } catch {
    // swallow
  }
}

export async function getLogs(): Promise<LogEvent[]> {
  return getJson<LogEvent[]>(STORAGE_KEYS.logsV1, []);
}

export async function clearLogs(): Promise<void> {
  await setJson(STORAGE_KEYS.logsV1, []);
}