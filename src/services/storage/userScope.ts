let activeUserId: string | null = null;

export function setActiveUserId(uid: string | null): void {
  activeUserId = uid;
}

export function scopedKey(key: string): string {
  return activeUserId ? `${key}_${activeUserId}` : key;
}
