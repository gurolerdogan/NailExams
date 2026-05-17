import { getJson, setJson } from './storage';
import { STORAGE_KEYS } from './keys';

export type NotifSettings = {
  /** Extra reminder on top of the mandatory 6pm one. */
  extraEnabled: boolean;
  extraHour: number;    // 0–23
  extraMinute: number;  // 0–59
};

const DEFAULT: NotifSettings = {
  extraEnabled: false,
  extraHour: 20,   // 8 pm default for extra
  extraMinute: 0,
};

export async function loadNotifSettings(): Promise<NotifSettings> {
  const raw = await getJson<Partial<NotifSettings>>(STORAGE_KEYS.notifSettingsV1, {});
  return {
    extraEnabled: raw.extraEnabled ?? DEFAULT.extraEnabled,
    extraHour:    raw.extraHour    ?? DEFAULT.extraHour,
    extraMinute:  raw.extraMinute  ?? DEFAULT.extraMinute,
  };
}

export async function saveNotifSettings(settings: NotifSettings): Promise<void> {
  await setJson(STORAGE_KEYS.notifSettingsV1, settings);
}
