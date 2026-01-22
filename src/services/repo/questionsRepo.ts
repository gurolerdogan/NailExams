import { Question } from '../../types/domain';
import { getJson, setJson } from '../storage/storage';
import { STORAGE_KEYS } from '../storage/storageKeys';

const DEFAULT: Question[] = [];

export async function listQuestions(): Promise<Question[]> {
  return getJson<Question[]>(STORAGE_KEYS.questions, DEFAULT);
}

export async function saveQuestions(questions: Question[]): Promise<void> {
  await setJson(STORAGE_KEYS.questions, questions);
}
