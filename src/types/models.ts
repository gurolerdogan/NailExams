export type UUID = string;

export type ExamLevel = 'GCSE' | 'A_LEVEL';

export type UserProfile = {
  examLevel: ExamLevel;
  yearGroup?: string;
  timezone?: string;
  targetGrades?: Record<string, string>;
  createdAt: number;
  updatedAt: number;
};

export type Subject = {
  id: UUID;
  name: string;
  examLevel: ExamLevel;
  createdAt: number;
  updatedAt: number;
};

export type Topic = {
  id: UUID;
  subjectId: UUID;
  name: string;
  confidence?: 0 | 1 | 2 | 3 | 4 | 5; // 0 = never checked in (default), 1-5 = checked in
  lastPracticedAt?: number;
  createdAt: number;
  updatedAt: number;
};
