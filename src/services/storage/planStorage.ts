import { getJson, setJson, removeKey } from './storage';
import { STORAGE_KEYS } from './keys';
import type { WeeklyPlan, PlanConfig } from '../../types/plan';

export async function loadPlan(): Promise<WeeklyPlan | null> {
  return getJson<WeeklyPlan | null>(STORAGE_KEYS.planV1, null);
}

export async function savePlan(plan: WeeklyPlan): Promise<void> {
  await setJson(STORAGE_KEYS.planV1, plan);
}

export async function clearPlan(): Promise<void> {
  await removeKey(STORAGE_KEYS.planV1);
}

const DEFAULT_CONFIG: PlanConfig = {
  durationDays: 30,
  subjectIds: [],
  topicsPerDay: 2,
  topicOrder: 'round-robin',
};

export async function loadPlanConfig(): Promise<PlanConfig> {
  return getJson<PlanConfig>(STORAGE_KEYS.planSettingsV1, DEFAULT_CONFIG);
}

export async function savePlanConfig(config: PlanConfig): Promise<void> {
  await setJson(STORAGE_KEYS.planSettingsV1, config);
}
