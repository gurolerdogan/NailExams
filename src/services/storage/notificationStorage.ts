import { getJson, setJson } from './storage';
import { STORAGE_KEYS } from './keys';

export type NotifSettings = {
  reminderHour: number;   // 0–23
  reminderMinute: number; // 0–59
  enabled: boolean;
};

const DEFAULT: NotifSettings = {
  reminderHour: 19,   // 7 pm default
  reminderMinute: 0,
  enabled: true,
};

export async function loadNotifSettings(): Promise<NotifSettings> {
  const raw = await getJson<Partial<NotifSettings>>(STORAGE_KEYS.notifSettingsV1, {});
  return {
    reminderHour: raw.reminderHour ?? DEFAULT.reminderHour,
    reminderMinute: raw.reminderMinute ?? DEFAULT.reminderMinute,
    enabled: raw.enabled ?? DEFAULT.enabled,
  };
}

export async function saveNotifSettings(settings: NotifSettings): Promise<void> {
  await setJson(STORAGE_KEYS.notifSettingsV1, settings);
}
