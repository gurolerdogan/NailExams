import AsyncStorage from '@react-native-async-storage/async-storage';
import { scopedKey } from './userScope';

export async function setJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(scopedKey(key), JSON.stringify(value));
}

export async function getJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(scopedKey(key));
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function removeKey(key: string): Promise<void> {
  await AsyncStorage.removeItem(scopedKey(key));
}
