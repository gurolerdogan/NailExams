export type UUID = string;

export type ExamLevel = 'GCSE' | 'A_LEVEL';

export type UserProfile = {
  examLevel: ExamLevel;
  yearGroup?: string; // optional in Phase 0/1
  timezone?: string;  // optional; you can default from device later
  targetGrades?: Record<string, string>; // optional
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
  confidence?: 1 | 2 | 3 | 4 | 5;
  createdAt: number;
  updatedAt: number;
};
