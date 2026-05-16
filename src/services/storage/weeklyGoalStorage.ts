import { getJson, setJson, removeKey } from './storage';
import { STORAGE_KEYS } from './keys';

export type WeeklyGoal = 5 | 10 | 15 | 20;

export async function loadWeeklyGoal(): Promise<WeeklyGoal | null> {
  return getJson<WeeklyGoal | null>(STORAGE_KEYS.weeklyGoalV1, null);
}

export async function saveWeeklyGoal(goal: WeeklyGoal | null): Promise<void> {
  if (goal === null) {
    await removeKey(STORAGE_KEYS.weeklyGoalV1);
  } else {
    await setJson(STORAGE_KEYS.weeklyGoalV1, goal);
  }
}
