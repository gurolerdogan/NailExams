export type UUID = string;

export type Subject = 'Math' | 'Physics' | 'ComputerScience' | 'Chemistry' | 'Biology' | 'English';

export type ExamBoard = 'AQA' | 'Edexcel' | 'OCR' | 'Cambridge' | 'IB' | 'Other';

export type ExamLevel = 'GCSE' | 'A-Level' | 'AP' | 'IB' | 'Other';

export type QuestionType = 'MCQ' | 'ShortAnswer' | 'LongAnswer';

export interface Exam {
  id: UUID;
  subject: Subject;
  level: ExamLevel;
  board: ExamBoard;
  title: string; // e.g., "GCSE Physics Paper 1"
  createdAt: number;
  updatedAt: number;
}

export interface Question {
  id: UUID;
  examId: UUID;
  type: QuestionType;
  prompt: string;
  choices?: string[]; // for MCQ
  answer: string; // plain for Phase 0
  explanation?: string;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Attempt {
  id: UUID;
  examId: UUID;
  questionId: UUID;
  userAnswer: string;
  isCorrect: boolean;
  startedAt: number;
  completedAt: number;
}
