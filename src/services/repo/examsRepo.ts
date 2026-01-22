import { Exam } from '../../types/domain';
import { getJson, setJson } from '../storage/storage';
import { STORAGE_KEYS } from '../storage/storageKeys';

const DEFAULT: Exam[] = [];

export async function listExams(): Promise<Exam[]> {
  return getJson<Exam[]>(STORAGE_KEYS.exams, DEFAULT);
}

export async function saveExams(exams: Exam[]): Promise<void> {
  await setJson(STORAGE_KEYS.exams, exams);
}
