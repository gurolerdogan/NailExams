import { getJson, setJson, removeKey } from './storage';
import { STORAGE_KEYS } from './keys';
import type { WeeklyPlan, PlanConfig } from '../../types/plan';

export async function loadPlan(): Promise<WeeklyPlan | null> {
  const raw = await getJson<WeeklyPlan | null>(STORAGE_KEYS.planV1, null);
  if (!raw) return null;
  // Guard against old schema (pre-refactor plans lack planStart / topicOrder)
  if (!raw.planStart || !raw.topicOrder) return null;
  return raw;
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
  const raw = await getJson<Partial<PlanConfig>>(STORAGE_KEYS.planSettingsV1, {});
  // Guard against old schema (pre-refactor settings only had sessionsPerDay)
  if (
    !raw.durationDays ||
    !Array.isArray(raw.subjectIds) ||
    !raw.topicsPerDay ||
    !raw.topicOrder
  ) {
    return DEFAULT_CONFIG;
  }
  return raw as PlanConfig;
}

export async function savePlanConfig(config: PlanConfig): Promise<void> {
  await setJson(STORAGE_KEYS.planSettingsV1, config);
}
