export function uuid(): string {
  // Phase 0 simple UUID-ish. Replace later with expo-crypto or uuid if needed.
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
