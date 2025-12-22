export interface UserStatistics {
  id: number;
  userId: number;
  totalConversations: number;
  totalVocabularyLearned: number;
  totalGrammarPoints: number;
  totalExercisesCompleted: number;
  totalQuizzesTaken: number;
  averageQuizScore: number;
  bestQuizScore: number;
  fastestQuizTimeSeconds?: number;
  currentStreakDays: number;
  longestStreakDays: number;
  lastActivityDate?: Date;
  updatedAt: Date;
}

export interface DailyActivityLog {
  id: number;
  userId: number;
  activityDate: Date;
  conversationsCount: number;
  vocabularyAdded: number;
  exercisesCompleted: number;
  quizzesTaken: number;
  studyTimeMinutes: number;
  createdAt: Date;
}

export interface StatsOverview {
  statistics: UserStatistics;
  recentActivity: DailyActivityLog[];
  streakInfo: {
    current: number;
    longest: number;
    lastActive: Date | null;
  };
}

export interface PeriodStats {
  period: 'week' | 'month' | 'year';
  startDate: Date;
  endDate: Date;
  conversationsCount: number;
  vocabularyLearned: number;
  exercisesCompleted: number;
  quizzesTaken: number;
  averageQuizScore: number;
  totalStudyTimeMinutes: number;
  dailyBreakdown: DailyActivityLog[];
}

export interface QuizPerformanceStats {
  topScores: {
    quizId: number;
    quizTitle: string;
    score: number;
    attemptDate: Date;
  }[];
  fastestTimes: {
    quizId: number;
    quizTitle: string;
    timeSeconds: number;
    score: number;
    attemptDate: Date;
  }[];
  averageScoreByMonth: {
    month: string;
    averageScore: number;
    quizCount: number;
  }[];
}
