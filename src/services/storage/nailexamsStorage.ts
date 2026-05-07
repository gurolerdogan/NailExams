import { getJson, setJson, removeKey } from './storage';
import { CURRENT_STORAGE_VERSION, STORAGE_KEYS } from './keys';
import type { Subject, Topic, UserProfile } from '../../types/models';

export async function ensureStorageVersion(): Promise<number> {
  const v = await getJson<number>(STORAGE_KEYS.storageVersion, 0);
  if (v !== CURRENT_STORAGE_VERSION) {
    await setJson(STORAGE_KEYS.storageVersion, CURRENT_STORAGE_VERSION);
  }
  return CURRENT_STORAGE_VERSION;
}

// Profile
export async function saveProfile(profile: UserProfile): Promise<void> {
  await setJson<UserProfile>(STORAGE_KEYS.profileV1, profile);
}

export async function loadProfile(): Promise<UserProfile | null> {
  const p = await getJson<UserProfile | null>(STORAGE_KEYS.profileV1, null);
  return p;
}

export async function clearProfile(): Promise<void> {
  await removeKey(STORAGE_KEYS.profileV1);
}

// Subjects
export async function saveSubjects(subjects: Subject[]): Promise<void> {
  await setJson<Subject[]>(STORAGE_KEYS.subjectsV1, subjects);
}

export async function loadSubjects(): Promise<Subject[]> {
  return getJson<Subject[]>(STORAGE_KEYS.subjectsV1, []);
}

export async function clearSubjects(): Promise<void> {
  await removeKey(STORAGE_KEYS.subjectsV1);
}

// Topics (stub)
export async function saveTopics(topics: Topic[]): Promise<void> {
  await setJson<Topic[]>(STORAGE_KEYS.topicsV1, topics);
}

export async function loadTopics(): Promise<Topic[]> {
  return getJson<Topic[]>(STORAGE_KEYS.topicsV1, []);
}

export async function clearTopics(): Promise<void> {
  await removeKey(STORAGE_KEYS.topicsV1);
}

// Onboarding flag (keep aligned with Task 8 usage)
export async function setOnboardingDone(done: boolean): Promise<void> {
  await setJson<boolean>(STORAGE_KEYS.onboardingDone, done);
}

export async function getOnboardingDone(): Promise<boolean> {
  return getJson<boolean>(STORAGE_KEYS.onboardingDone, false);
}

export async function clearOnboardingDone(): Promise<void> {
  await removeKey(STORAGE_KEYS.onboardingDone);
}

// Wipe all NailExams local data (for Settings reset)
export async function wipeAll(): Promise<void> {
  await Promise.all([
    removeKey(STORAGE_KEYS.profileV1),
    removeKey(STORAGE_KEYS.subjectsV1),
    removeKey(STORAGE_KEYS.topicsV1),
    removeKey(STORAGE_KEYS.onboardingDone),
    removeKey(STORAGE_KEYS.storageVersion),
    removeKey(STORAGE_KEYS.attemptsV1),
    removeKey(STORAGE_KEYS.planV1),
  ]);
}
