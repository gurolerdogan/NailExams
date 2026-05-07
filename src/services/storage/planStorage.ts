import { getJson, setJson, removeKey } from './storage';
import { STORAGE_KEYS } from './keys';
import type { WeeklyPlan } from '../../types/plan';

export async function loadPlan(): Promise<WeeklyPlan | null> {
  return getJson<WeeklyPlan | null>(STORAGE_KEYS.planV1, null);
}

export async function savePlan(plan: WeeklyPlan): Promise<void> {
  await setJson(STORAGE_KEYS.planV1, plan);
}

export async function clearPlan(): Promise<void> {
  await removeKey(STORAGE_KEYS.planV1);
}