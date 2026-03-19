export type PracticeAttempt = {
  id: string;
  subjectId: string;
  topicId: string;
  ts: number;
  confidence: 1 | 2 | 3 | 4 | 5;
  note?: string;
};