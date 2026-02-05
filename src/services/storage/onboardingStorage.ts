import { getJson, setJson, removeKey } from './storage';
import { NE_KEYS } from './nailexamsKeys';

export async function setOnboardingDone(done: boolean): Promise<void> {
  await setJson(NE_KEYS.onboardingDone, done);
}

export async function getOnboardingDone(): Promise<boolean> {
  return getJson<boolean>(NE_KEYS.onboardingDone, false);
}

export async function clearOnboardingDone(): Promise<void> {
  await removeKey(NE_KEYS.onboardingDone);
}
