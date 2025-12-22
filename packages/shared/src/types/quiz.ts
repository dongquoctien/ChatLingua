import { Exercise } from './exercise';

export interface Quiz {
  id: number;
  userId: number;
  title: string;
  description?: string;
  exerciseIds: number[];
  timeLimitSeconds?: number;
  maxAttempts: number;
  passingScore: number; // Percentage
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuizCreateInput {
  userId: number;
  title: string;
  description?: string;
  exerciseIds: number[];
  timeLimitSeconds?: number;
  maxAttempts?: number;
  passingScore?: number;
}

export interface QuizAttempt {
  id: number;
  quizId: number;
  userId: number;
  attemptNumber: number;
  score: number; // Percentage
  totalQuestions: number;
  correctAnswers: number;
  timeTakenSeconds: number;
  answers: Record<number, string>; // exerciseId -> userAnswer
  startedAt: Date;
  completedAt: Date;
  isPassed: boolean;
}

export interface QuizStartResult {
  attemptId: number;
  quiz: Quiz;
  exercises: Exercise[];
  remainingAttempts: number;
}

export interface QuizSubmitInput {
  attemptId: number;
  answers: Record<number, string>;
  timeTakenSeconds: number;
}

export interface QuizResult {
  attempt: QuizAttempt;
  details: {
    exerciseId: number;
    question: string;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    explanation?: string;
  }[];
}
