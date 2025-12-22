import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface Conversation {
  id: number;
  vietnameseText: string;
  englishTranslation: string;
  topic: string | null;
  difficultyLevel: string;
  vocabularyCount: number;
  grammarCount: number;
  createdAt: string;
}

export interface ConversationDetail extends Conversation {
  aiAnalysis: string | null;
  vocabulary: Vocabulary[];
  grammarPoints: GrammarPoint[];
}

export interface Vocabulary {
  id: number;
  conversationId: number;
  vietnameseWord: string;
  englishWord: string;
  phonetic: string | null;
  partOfSpeech: string | null;
  exampleVi: string | null;
  exampleEn: string | null;
  difficultyLevel: string;
  masteryLevel: number;
  reviewCount: number;
  lastReviewed: string | null;
  createdAt: string;
}

export interface GrammarPoint {
  id: number;
  rule: string;
  explanationVi: string | null;
  explanationEn: string | null;
  exampleVi: string | null;
  exampleEn: string | null;
  difficultyLevel: string;
}

export interface Exercise {
  id: number;
  exerciseType: 'multiple_choice' | 'fill_blank' | 'translation';
  questionText: string;
  options: string[] | null;
  correctAnswer?: string;
  difficultyLevel: string;
}

export interface ExerciseResult {
  isCorrect: boolean;
  correctAnswer: string;
  attempt: {
    id: number;
    exerciseId: number;
    userAnswer: string;
    isCorrect: boolean;
    timeSpentSeconds: number;
  };
}

export interface Quiz {
  id: number;
  title: string;
  description: string | null;
  exerciseIds: number[];
  timeLimitMinutes: number | null;
  maxAttempts: number;
  attemptCount?: number;
  bestScore?: number;
  createdAt: string;
}

export interface QuizStartResponse {
  attemptId: number;
  exercises: Exercise[];
}

export interface QuizSubmitResponse {
  score: number;
  totalQuestions: number;
  results: {
    exerciseId: number;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
  }[];
}

// Exercise Session types
export interface SessionExercise {
  id: number;
  exerciseType: 'multiple_choice' | 'fill_blank' | 'translation';
  questionText: string;
  options: string[] | null;
  difficultyLevel: string;
  questionOrder: number;
}

export interface ExerciseSessionStart {
  sessionId: number;
  exercises: SessionExercise[];
  startedAt: string;
}

export interface SessionAnswer {
  exerciseId: number;
  questionOrder: number;
  exerciseType: string;
  questionText: string;
  options: string[] | null;
  userAnswer: string | null;
  correctAnswer: string;
  isCorrect: boolean;
}

export interface SessionResult {
  sessionId: number;
  score: number;
  total: number;
  percentage: number;
  timeSpent: number;
  results: SessionAnswer[];
}

export interface ExerciseSession {
  id: number;
  totalQuestions: number;
  correctAnswers: number;
  totalTimeSeconds: number;
  scorePercentage: number;
  status: 'in_progress' | 'completed' | 'abandoned';
  exerciseTypes: string[];
  startedAt: string;
  completedAt: string | null;
}

export interface UserStats {
  totalConversations: number;
  totalVocabulary: number;
  totalGrammar: number;
  totalExercises: number;
  totalQuizzes: number;
  correctRate: number;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
}

export interface PeriodReport {
  period: string;
  startDate: string;
  endDate: string;
  summary: {
    totalDaysActive: number;
    totalConversations: number;
    totalVocabulary: number;
    totalExercises: number;
    totalQuizzes: number;
    averageCorrectRate: number;
    totalTimeSpentMinutes: number;
  };
  dailyBreakdown: {
    date: string;
    conversationsAdded: number;
    vocabularyLearned: number;
    exercisesCompleted: number;
    correctAnswers: number;
    quizzesCompleted: number;
    timeSpentMinutes: number;
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Conversations
  getConversations(page = 1, limit = 10): Observable<PaginatedResponse<Conversation>> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<PaginatedResponse<Conversation>>(`${this.baseUrl}/conversations`, { params });
  }

  getConversation(id: number): Observable<ConversationDetail> {
    return this.http.get<ConversationDetail>(`${this.baseUrl}/conversations/${id}`);
  }

  // Vocabulary
  getVocabulary(page = 1, limit = 20, filters?: {
    difficulty?: string;
    partOfSpeech?: string;
    mastery?: number;
    search?: string;
  }): Observable<PaginatedResponse<Vocabulary>> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (filters?.difficulty) params = params.set('difficulty', filters.difficulty);
    if (filters?.partOfSpeech) params = params.set('partOfSpeech', filters.partOfSpeech);
    if (filters?.mastery !== undefined) params = params.set('mastery', filters.mastery);
    if (filters?.search) params = params.set('search', filters.search);
    return this.http.get<PaginatedResponse<Vocabulary>>(`${this.baseUrl}/vocabulary`, { params });
  }

  getVocabularyForReview(limit = 10): Observable<Vocabulary[]> {
    const params = new HttpParams().set('limit', limit);
    return this.http.get<Vocabulary[]>(`${this.baseUrl}/vocabulary/review`, { params });
  }

  reviewVocabulary(id: number, correct: boolean): Observable<Vocabulary> {
    return this.http.post<Vocabulary>(`${this.baseUrl}/vocabulary/${id}/review`, { correct });
  }

  // Exercises
  getExercises(page = 1, limit = 20, filters?: {
    type?: string;
    difficulty?: string;
  }): Observable<PaginatedResponse<Exercise>> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (filters?.type) params = params.set('type', filters.type);
    if (filters?.difficulty) params = params.set('difficulty', filters.difficulty);
    return this.http.get<PaginatedResponse<Exercise>>(`${this.baseUrl}/exercises`, { params });
  }

  getRandomExercises(count = 10, types?: string[]): Observable<Exercise[]> {
    let params = new HttpParams().set('count', count);
    if (types?.length) params = params.set('types', types.join(','));
    return this.http.get<Exercise[]>(`${this.baseUrl}/exercises/random`, { params });
  }

  submitExercise(id: number, answer: string, timeSpentSeconds: number): Observable<ExerciseResult> {
    return this.http.post<ExerciseResult>(`${this.baseUrl}/exercises/${id}/submit`, {
      answer,
      timeSpentSeconds
    });
  }

  // Exercise Sessions
  startExerciseSession(count = 10, exerciseTypes?: string[]): Observable<ExerciseSessionStart> {
    return this.http.post<ExerciseSessionStart>(`${this.baseUrl}/exercises/sessions`, {
      count,
      exerciseTypes
    });
  }

  submitExerciseSession(sessionId: number, answers: Record<string, string>, totalTimeSeconds: number): Observable<SessionResult> {
    return this.http.post<SessionResult>(`${this.baseUrl}/exercises/sessions/${sessionId}/submit`, {
      answers,
      totalTimeSeconds
    });
  }

  getExerciseSessionHistory(page = 1, limit = 10): Observable<PaginatedResponse<ExerciseSession>> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<PaginatedResponse<ExerciseSession>>(`${this.baseUrl}/exercises/sessions/history`, { params });
  }

  getExerciseSessionDetail(sessionId: number): Observable<SessionResult> {
    return this.http.get<SessionResult>(`${this.baseUrl}/exercises/sessions/${sessionId}/detail`);
  }

  abandonExerciseSession(sessionId: number): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/exercises/sessions/${sessionId}/abandon`, {});
  }

  // Quizzes
  getQuizzes(page = 1, limit = 10): Observable<PaginatedResponse<Quiz>> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<PaginatedResponse<Quiz>>(`${this.baseUrl}/quizzes`, { params });
  }

  getQuiz(id: number): Observable<Quiz> {
    return this.http.get<Quiz>(`${this.baseUrl}/quizzes/${id}`);
  }

  createQuiz(data: {
    title: string;
    description?: string;
    exerciseIds: number[];
    timeLimitMinutes?: number;
    maxAttempts?: number;
  }): Observable<Quiz> {
    return this.http.post<Quiz>(`${this.baseUrl}/quizzes`, data);
  }

  startQuiz(id: number): Observable<QuizStartResponse> {
    return this.http.post<QuizStartResponse>(`${this.baseUrl}/quizzes/${id}/start`, {});
  }

  submitQuiz(id: number, attemptId: number, answers: Record<string, string>, timeSpentSeconds: number): Observable<QuizSubmitResponse> {
    const params = new HttpParams().set('attemptId', attemptId);
    return this.http.post<QuizSubmitResponse>(`${this.baseUrl}/quizzes/${id}/submit`, {
      answers,
      timeSpentSeconds
    }, { params });
  }

  deleteQuiz(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/quizzes/${id}`);
  }

  // Stats
  getStatsOverview(): Observable<UserStats> {
    return this.http.get<UserStats>(`${this.baseUrl}/stats/overview`);
  }

  getWeeklyReport(): Observable<PeriodReport> {
    return this.http.get<PeriodReport>(`${this.baseUrl}/stats/weekly`);
  }

  getMonthlyReport(): Observable<PeriodReport> {
    return this.http.get<PeriodReport>(`${this.baseUrl}/stats/monthly`);
  }
}
