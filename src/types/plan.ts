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

export type WeeklyPlan = {
  id: string;
  weekStart: string; // YYYY-MM-DD for Monday
  sessionsPerDay: number; // 1 or 2 for MVP
  sessions: PlanSession[];
  createdAt: number;
  updatedAt: number;
};