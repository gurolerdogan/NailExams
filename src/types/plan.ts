export type PlanSession = {
  id: string;
  date: string; // YYYY-MM-DD (local)
  subjectId: string;
  topicId: string;
  title: string; // e.g., "Physics — Kinematics"
  status: 'PLANNED' | 'DONE';
  createdAt: number;
  updatedAt: number;
};

export type TopicOrder = 'subjects-first' | 'round-robin';

export type PlanConfig = {
  durationDays: 30 | 60 | 90;
  subjectIds: string[];
  topicsPerDay: 1 | 2 | 3 | 4;
  topicOrder: TopicOrder;
  /** Mon=0 … Sun=6 */
  studyDays: number[];
};

export type WeeklyPlan = {
  id: string;
  planStart: string;    // YYYY-MM-DD — today when generated
  weekStart: string;    // kept for calendar compat, equals planStart
  durationDays: number;
  subjectIds: string[];
  topicsPerDay: number;
  topicOrder: TopicOrder;
  sessionsPerDay: number; // mirrors topicsPerDay, kept for compat
  sessions: PlanSession[];
  createdAt: number;
  updatedAt: number;
};
